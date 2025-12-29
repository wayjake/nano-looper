# Audio Engine Quality & Stability Pass

You are Claude Code acting as an audio/DSP engineer reviewing an existing browser-based DAW codebase.

Context
- Audio rendering is done in an AudioWorkletProcessor.
- Samples are decoded in the main thread and transferred as PCM Float32Arrays.
- Controller devices send realtime events; only the laptop renders audio.

Your task
1. Read the existing AudioWorklet mixer implementation.
2. Identify any sources of:
   - dropped voices
   - clicks/pops
   - timing instability
   - unnecessary allocations inside process()
3. Improve the mixer to:
   - add a short attack/release envelope per voice (1–3ms)
   - implement deterministic voice stealing (oldest or quietest)
   - avoid per-frame allocations
   - ensure consistent stereo handling
4. Verify resampling occurs only once (on load) and not in the audio thread.
5. Add inline comments explaining why each DSP decision exists.

Constraints
- Do NOT move audio back to the main thread.
- Do NOT add heavy DSP or external libraries.
- Keep CPU predictable.

Output
- Updated AudioWorklet code
- Any necessary main-thread changes
- Brief explanation of improvements and expected audible impact