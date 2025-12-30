/**
 * AudioEngine - Manages Web Audio API and AudioWorklet for sample playback
 *
 * Handles:
 * - AudioContext lifecycle (init on user gesture, resume if suspended)
 * - Loading and decoding audio samples
 * - Transferring decoded PCM to the AudioWorklet
 * - Triggering sounds via the worklet
 */

export type AudioEngineState = "uninitialized" | "initializing" | "ready" | "error";

export interface LoadProgress {
  loaded: number;
  total: number;
  currentSound: string | null;
}

type ProgressCallback = (progress: LoadProgress) => void;

export class AudioEngine {
  private context: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private loadedSamples: Set<string> = new Set();
  private state: AudioEngineState = "uninitialized";
  private initPromise: Promise<void> | null = null;

  /**
   * Get current engine state
   */
  getState(): AudioEngineState {
    return this.state;
  }

  /**
   * Check if a specific sound is loaded
   */
  isSoundLoaded(soundId: string): boolean {
    return this.loadedSamples.has(soundId);
  }

  /**
   * Initialize the audio engine
   * Must be called from a user gesture (click, touch, etc.)
   */
  async init(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already ready
    if (this.state === "ready") {
      return;
    }

    this.state = "initializing";

    this.initPromise = this.doInit();
    try {
      await this.initPromise;
      this.state = "ready";
    } catch (err) {
      this.state = "error";
      throw err;
    }

    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    // Create AudioContext
    this.context = new AudioContext();

    // Resume if suspended (browser autoplay policy)
    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    // Load the AudioWorklet module
    await this.context.audioWorklet.addModule("/audio-worklet.js");

    // Create the worklet node
    this.workletNode = new AudioWorkletNode(this.context, "mixer-processor");

    // Connect to destination (speakers)
    this.workletNode.connect(this.context.destination);
  }

  /**
   * Load a sound from URL and transfer to the worklet
   */
  async loadSound(soundId: string, url: string): Promise<void> {
    if (!this.context || !this.workletNode) {
      throw new Error("AudioEngine not initialized");
    }

    // Skip if already loaded
    if (this.loadedSamples.has(soundId)) {
      return;
    }

    // Fetch the audio file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch sound: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Decode the audio data
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

    // Extract PCM data as Float32Arrays
    // Handle mono/stereo
    const left = audioBuffer.getChannelData(0);
    const right =
      audioBuffer.numberOfChannels > 1
        ? audioBuffer.getChannelData(1)
        : audioBuffer.getChannelData(0); // Use left for mono

    const length = audioBuffer.length;

    // Transfer to worklet (using transferable objects for zero-copy)
    // We need to copy the data since getChannelData returns a view
    const leftCopy = new Float32Array(left);
    const rightCopy = new Float32Array(right);

    this.workletNode.port.postMessage(
      {
        type: "load-sample",
        soundId,
        left: leftCopy,
        right: rightCopy,
        length,
      },
      [leftCopy.buffer, rightCopy.buffer] // Transfer ownership
    );

    this.loadedSamples.add(soundId);
  }

  /**
   * Load multiple sounds with progress tracking
   */
  async loadSounds(
    sounds: Array<{ id: string; url: string }>,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const total = sounds.length;
    let loaded = 0;

    for (const sound of sounds) {
      onProgress?.({ loaded, total, currentSound: sound.id });

      try {
        await this.loadSound(sound.id, sound.url);
      } catch (err) {
        console.error(`Failed to load sound ${sound.id}:`, err);
        // Continue loading other sounds
      }

      loaded++;
    }

    onProgress?.({ loaded, total, currentSound: null });
  }

  /**
   * Trigger playback of a loaded sound
   */
  trigger(soundId: string): void {
    if (!this.workletNode) {
      console.warn("AudioEngine not initialized, cannot trigger sound");
      return;
    }

    if (!this.loadedSamples.has(soundId)) {
      console.warn(`Sound ${soundId} not loaded`);
      return;
    }

    this.workletNode.port.postMessage({
      type: "trigger",
      soundId,
    });
  }

  /**
   * Unload a sound from memory
   */
  unloadSound(soundId: string): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: "unload-sample",
      soundId,
    });

    this.loadedSamples.delete(soundId);
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: "stop-all",
    });
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.stopAll();

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    this.loadedSamples.clear();
    this.state = "uninitialized";
    this.initPromise = null;
  }
}

// Singleton instance for the application
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine();
  }
  return audioEngineInstance;
}
