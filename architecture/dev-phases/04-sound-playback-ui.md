# Phase 4: Sound Management UI

## Goal
Display uploaded sounds and allow assigning them to pads.

## Tasks

### 1. Create SoundList component (`app/components/SoundList.tsx`)
- Fetch sounds from `/api/rooms/:roomId/sounds`
- Display name, size, upload time
- Preview button (simple HTML audio for now)
- Delete button

### 2. Implement sound streaming endpoint (`app/routes/api/sounds.$soundId.tsx`)
- Fetch sound metadata from DB
- Redirect to UploadThing URL or proxy stream
- Set appropriate Content-Type header

### 3. Create pad assignment UI
- Drag-and-drop sounds onto pads, OR
- Click pad, then click sound to assign
- Visual indicator when pad has sound assigned

### 4. Update room state for pad mappings
- Add `updatePadMapping(roomId, padIndex, soundId)` to data layer
- Create API endpoint or use existing room update

### 5. Persist pad mappings
- Save to DB when user assigns sound to pad
- Load mappings when room loads
- Display sound name/indicator on assigned pads

### 6. Add sound deletion
- DELETE endpoint for `/api/sounds/:soundId`
- Remove from DB
- Optionally delete from UploadThing via API
- Clear any pad mappings referencing deleted sound

### 7. Update DAW view layout
- Sound library panel (list of uploaded sounds)
- 4x4 pad grid with assignment state
- Clear visual distinction between empty/assigned pads

## Verification
- [ ] Uploaded sounds appear in sound list
- [ ] Can preview sounds via HTML audio
- [ ] Can assign sound to pad
- [ ] Pad shows it has sound assigned
- [ ] Assignments persist after page reload
- [ ] Can delete sounds
