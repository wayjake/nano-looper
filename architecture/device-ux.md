# Controller UI/UX Pass

You are Claude Code acting as a product-focused frontend engineer.

Context
- Controller devices are phones/tablets.
- They act as realtime control surfaces.
- They do NOT render audio.

Your task
1. Review the controller UI.
2. Improve:
   - pad layout for thumbs
   - visual feedback on hit (even if sound plays elsewhere)
   - connection status visibility
3. Ensure UI remains responsive under rapid tapping.
4. Avoid causing unnecessary WS traffic or rerenders.
5. Ensure the controller works well on iOS Safari.

Constraints
- No heavy animations.
- No unnecessary state duplication with laptop.

Output
- Updated controller components
- Explanation of UX decisions