# Focus Garden audit

Audited origin/main at `7c5b873a616fa065bc249fbaa3ff78c6b548fa05` before implementation.

- `focuscandle` is absent. `Room.load` migrates old placements to ordinary candles. That migration remains intact.
- `rituals.js` only retained breathing. The former focus/light/snuff/tick/activeFocus APIs and `lr.focusRituals` were removed. The garden extends this same module with elapsed-time deadlines, preserving garden records and dropping retired candle records. No candle furniture returns.
- `care.js` classifies normal `plant`/`herb` pieces, grows them through watered days in `stageOf`, and derives wilt from time since watering. These rules stay unchanged. A separate per-item growth override supplies focus stages before watering state is consulted.
- The tea dial in `room-tools.js` is tightly coupled to its 1–10-minute selector, tea presets and `brew` state. The garden uses the allowed simple preset row and the existing dial visual classes instead of extracting or changing tea behavior.
- `japan.js` already defines sakura art. The milestone sapling delegates to that builder with ordinary `tap: water` care.
- Companion hop/bubble patterns and `Sound.tick2` / `Sound.ritualChime` provide feedback without new assets.
- Reviewed `dalecri/pomodoro-terrarium`'s `setGrowth` and early-end/bloom flow as reference. Lofi Rooms uses its own existing timer, room placement and care renderer, with the requested quarter-session stages and gentle pocketing.

Private timer deadlines live in `lr.focusRituals`; outcomes, room/item references and labels live in `lr.focusGarden`. Room decor contains only ordinary piece IDs/placement/variants. Share codes never include these private stores or labels. Completed blooms remain in their bed; if a bed is full, a prior bloom moves to the nearest available floor tile. Earned cherry saplings wait for space if needed.
