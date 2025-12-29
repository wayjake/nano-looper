# Phase 7: First Sounds End-to-End

## Goal
Complete integration: upload a sound, assign to pad, trigger from controller, hear on laptop.

## Tasks

### 1. Wire controller pad hits to WebSocket
- On pad touch/click, send `pad-hit` message
- Include pad index and optional velocity
- Visual feedback on controller (highlight pad briefly)

### 2. Wire DAW to receive and play
- Listen for `pad-hit` messages
- Look up soundId from padMappings
- Trigger audio engine if sound assigned

### 3. Implement local pad triggering
- DAW pads also clickable
- Same trigger path as remote
- Visual feedback on trigger

### 4. Add pad visual feedback
- Flash/highlight on trigger
- Brief animation (CSS transition)
- Works for both local and remote triggers

### 5. Sync state on controller join
- When controller joins, DAW sends current state
- Controller receives pad assignments
- Controller shows which pads have sounds

### 6. Handle missing sounds gracefully
- If sound not loaded, log warning
- Don't crash on trigger
- Show "loading" state on pads

### 7. Test full flow
1. Open room on laptop (DAW)
2. Upload a WAV/MP3 file
3. Assign sound to pad 1
4. Open same room URL on phone (Controller)
5. Tap pad 1 on phone
6. Hear sound on laptop

## Integration Checklist

- [ ] Database stores room and sounds
- [ ] UploadThing handles file storage
- [ ] Sound URLs accessible for decoding
- [ ] WebSocket connects both devices
- [ ] Pad-hit messages flow correctly
- [ ] Audio engine decodes and plays
- [ ] Visual feedback on both devices

## Known Limitations (Future Work)
- No loop/sequencer yet
- No tempo sync
- No multi-user presence indicators
- No undo/redo
- Basic voice management only

## Success Criteria
A user can:
1. Create a room
2. Upload an audio sample
3. Assign it to a pad
4. Trigger it from their phone
5. Hear it play on their laptop
