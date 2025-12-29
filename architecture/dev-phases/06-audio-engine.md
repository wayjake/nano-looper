# Phase 6: Audio Engine Setup

## Goal
Create AudioWorklet-based mixer that can decode and play sounds triggered by pad hits.

## Tasks

### 1. Create AudioWorklet processor (`public/audio-worklet.js`)

```javascript
class MixerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.voices = []; // Active playback voices
    this.samples = new Map(); // soundId -> Float32Array (decoded PCM)

    this.port.onmessage = (e) => {
      if (e.data.type === "load-sample") {
        this.samples.set(e.data.soundId, e.data.buffer);
      } else if (e.data.type === "trigger") {
        this.triggerVoice(e.data.soundId);
      }
    };
  }

  process(inputs, outputs) {
    // Mix active voices into output
    // Remove finished voices
    return true;
  }
}
```

### 2. Create audio engine manager (`app/lib/audio-engine.ts`)

```typescript
class AudioEngine {
  private context: AudioContext;
  private workletNode: AudioWorkletNode;
  private loadedSamples: Set<string>;

  async init(): Promise<void>;
  async loadSound(soundId: string, url: string): Promise<void>;
  trigger(soundId: string): void;
  setTempo(bpm: number): void;
}
```

### 3. Implement sample loading
- Fetch audio file from URL
- Decode using `AudioContext.decodeAudioData()`
- Convert to Float32Array
- Transfer to worklet via `postMessage` with transferable

### 4. Create audio context initialization
- Must be triggered by user gesture (browser requirement)
- Add "Enable Audio" button or init on first interaction
- Resume suspended context

### 5. Wire pad triggers to audio
- On pad click (local): trigger sound
- On WebSocket pad-hit (remote): trigger sound
- Only DAW role plays audio

### 6. Preload room sounds
- On room load, fetch sound list
- Decode all assigned sounds
- Show loading progress

### 7. Add basic voice management
- Track active voices (currently playing)
- Limit polyphony (e.g., 32 voices)
- Simple voice stealing if limit reached

## Audio Flow

```
[Sound URL]
    -> fetch()
    -> decodeAudioData()
    -> Float32Array
    -> postMessage to Worklet

[Pad Hit]
    -> trigger(soundId)
    -> postMessage to Worklet
    -> Worklet mixes into output
```

## Verification
- [ ] AudioWorklet loads without errors
- [ ] Can decode WAV file
- [ ] Can decode MP3 file
- [ ] Clicking pad plays assigned sound
- [ ] Multiple sounds can play simultaneously
- [ ] No clicks/pops on playback start
