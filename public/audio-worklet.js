/**
 * MixerProcessor - AudioWorklet for mixing multiple sample voices
 *
 * This processor runs on the audio thread and handles:
 * - Loading decoded PCM samples (transferred from main thread)
 * - Triggering voices for playback
 * - Mixing active voices with proper envelope handling
 * - Voice management with polyphony limits
 */

// Maximum number of simultaneous voices to prevent CPU overload
const MAX_POLYPHONY = 32;

// Envelope times in samples (calculated at runtime based on sample rate)
const ATTACK_MS = 2; // 2ms attack to prevent clicks
const RELEASE_MS = 3; // 3ms release for smooth endings

class MixerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Pre-allocated voice pool to avoid allocations in process()
    // Each voice tracks: soundId, position, state, envelope level
    this.voices = [];
    for (let i = 0; i < MAX_POLYPHONY; i++) {
      this.voices.push({
        active: false,
        soundId: null,
        position: 0, // Current playback position in samples
        state: "idle", // 'attack' | 'sustain' | 'release' | 'idle'
        envLevel: 0, // Current envelope amplitude (0-1)
        releaseStart: 0, // Position where release started
      });
    }

    // Sample storage: soundId -> { left: Float32Array, right: Float32Array, length: number }
    this.samples = new Map();

    // Envelope increments (set when sample rate is known)
    this.attackIncrement = 0;
    this.releaseIncrement = 0;
    this.envelopeConfigured = false;

    // Handle messages from main thread
    this.port.onmessage = (e) => {
      const { type } = e.data;

      if (type === "load-sample") {
        // Store decoded PCM data
        // Data comes as { soundId, left: Float32Array, right: Float32Array, length }
        const { soundId, left, right, length } = e.data;
        this.samples.set(soundId, { left, right, length });
      } else if (type === "trigger") {
        // Trigger a voice for the given sound
        this.triggerVoice(e.data.soundId);
      } else if (type === "unload-sample") {
        // Remove a sample from memory
        this.samples.delete(e.data.soundId);
      } else if (type === "stop-all") {
        // Stop all active voices (useful for cleanup)
        for (const voice of this.voices) {
          if (voice.active) {
            voice.state = "release";
            voice.releaseStart = voice.position;
          }
        }
      }
    };
  }

  /**
   * Configure envelope times based on sample rate
   * Called once we know the sample rate from process()
   */
  configureEnvelope() {
    // Calculate envelope increments per sample
    const attackSamples = (ATTACK_MS / 1000) * sampleRate;
    const releaseSamples = (RELEASE_MS / 1000) * sampleRate;

    this.attackIncrement = 1.0 / attackSamples;
    this.releaseIncrement = 1.0 / releaseSamples;
    this.envelopeConfigured = true;
  }

  /**
   * Find an available voice slot and start playback
   * Uses oldest-voice stealing if all slots are full
   */
  triggerVoice(soundId) {
    const sample = this.samples.get(soundId);
    if (!sample) {
      // Sample not loaded yet, ignore trigger
      return;
    }

    // First, try to find an idle voice
    let voice = null;
    for (const v of this.voices) {
      if (!v.active) {
        voice = v;
        break;
      }
    }

    // If no idle voice, steal the oldest one (furthest in playback)
    if (!voice) {
      let oldestPosition = -1;
      for (const v of this.voices) {
        if (v.position > oldestPosition) {
          oldestPosition = v.position;
          voice = v;
        }
      }
    }

    // Start the voice
    voice.active = true;
    voice.soundId = soundId;
    voice.position = 0;
    voice.state = "attack";
    voice.envLevel = 0;
    voice.releaseStart = 0;
  }

  /**
   * Main audio processing - called for each audio block (128 samples)
   * Mixes all active voices into the output buffer
   */
  process(inputs, outputs, parameters) {
    // Configure envelope on first process call (when sampleRate is available)
    if (!this.envelopeConfigured) {
      this.configureEnvelope();
    }

    const output = outputs[0];
    if (!output || output.length === 0) {
      return true;
    }

    const outputLeft = output[0];
    const outputRight = output[1] || output[0]; // Mono fallback
    const blockSize = outputLeft.length;

    // Clear output buffers (avoid creating new arrays)
    for (let i = 0; i < blockSize; i++) {
      outputLeft[i] = 0;
      outputRight[i] = 0;
    }

    // Process each active voice
    for (const voice of this.voices) {
      if (!voice.active) continue;

      const sample = this.samples.get(voice.soundId);
      if (!sample) {
        voice.active = false;
        continue;
      }

      const { left, right, length } = sample;

      // Mix this voice into the output
      for (let i = 0; i < blockSize; i++) {
        // Check if voice has finished
        if (voice.position >= length) {
          if (voice.state !== "release") {
            voice.state = "release";
            voice.releaseStart = voice.position;
          }
        }

        // Process envelope
        if (voice.state === "attack") {
          voice.envLevel += this.attackIncrement;
          if (voice.envLevel >= 1.0) {
            voice.envLevel = 1.0;
            voice.state = "sustain";
          }
        } else if (voice.state === "release") {
          voice.envLevel -= this.releaseIncrement;
          if (voice.envLevel <= 0) {
            voice.envLevel = 0;
            voice.active = false;
            voice.state = "idle";
            break; // Stop processing this voice
          }
        }

        // Get sample values (with bounds check)
        const pos = voice.position;
        if (pos < length) {
          const sampleL = left[pos] * voice.envLevel;
          const sampleR = right[pos] * voice.envLevel;

          outputLeft[i] += sampleL;
          outputRight[i] += sampleR;
        }

        voice.position++;
      }
    }

    // Soft clip to prevent harsh distortion when many voices play
    for (let i = 0; i < blockSize; i++) {
      outputLeft[i] = Math.tanh(outputLeft[i]);
      outputRight[i] = Math.tanh(outputRight[i]);
    }

    return true; // Keep processor alive
  }
}

registerProcessor("mixer-processor", MixerProcessor);
