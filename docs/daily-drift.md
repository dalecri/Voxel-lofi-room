# Daily Drift

Audited main at `215b42543d387541900ce2efb8c6645a1dd0d41b` before implementation.
The CBC newspaper (`widgets.js`, `newspaper`, CBC RSS fetch/cache/surface) is
unchanged. This is a separate local module and transient scene object.

## Timing and private state

An issue is delivered once per local ISO week, recapping the previous completed
Monday–Sunday. For example, delivery week `2026-W43` recaps October 12–18.
The first visit in a week produces the issue; quiet weeks get a gentle paper,
not a list of omissions. Missed delivery weeks are not backfilled. An existing
week is immutable even if source data changes. ISO week-year boundaries are
handled independently of the device's UTC offset and daylight saving changes.

Only `lr.digest` is added, through the app's Store wrapper:
`{lastIssueWeek, issues:[{week,date,from,through,sections,read}]}`. Read flags live
inside each issue; there is no separate notification key. Issues stay readable
in the paper's Past issues section and via the Control Centre entry. Reading
picks up the latest paper, including across reloads. No network is used.

## Existing sources

- `calendarModel.activity()` reads `lr.activityLog`: focus, tea, letter and
  pushup milestone events. No new habit logging is added by this feature.
- Ideas already have creation dates in `lr.tools.ideas`; use these as the
  fallback for idea activity, without double-counting an existing idea event.
- Scene snapshots come from the file cabinet's `lr.scenes` files and creation
  dates. The existing `LRCalendar.memoryFor` selects the year-ago-day memory.
- Streaks use `lr.dailyStreak`.
- The actual guest book on main is `lr.guestbook` in `main.js`, not `care.js`.
- Existing cat observations come from `lr.catJournal`. No persisted companion
  activity log exists on audited main. The pure issue generator accepts a
  future supplied log but creates no speculative log key or invented sighting.
- No countdown-board model exists on main. Existing private calendar events
  supply the optional upcoming-dates section; absent data is simply omitted.

Sections use templates and textContent. The field-notes column is a deadpan
observation of actual dated diary activity, or an explicitly quiet fallback.
No generated text, random selection, external images or API calls are involved.
Scene thumbnails reuse the existing private file/room thumbnail pipeline.

## The doormat

There is no doormat definition on main. The transient object builds a small
coir mat and folded paper together using the existing voxel model/renderer.
It is attached directly to the scene root, never `room.items`, `view.objs`, the
placement grid or the catalog. It prefers a free two-cell front-edge spot; in
a packed room it sits on the doorstep just beyond the front edge. Furniture,
pets and walls retain hit priority when closer to the camera.

No animation loop is added. The existing idle heartbeat checks for local date
changes and updates visibility; room changes and edit-mode changes update it
immediately. Only changes wake a render. The paper is hidden in decorate,
capture and other immersive modes. The Control Centre provides keyboard access
and access to old issues after the physical paper is picked up.

Room serializers and share sanitization are unchanged. The transient object
cannot be serialized, and digest state/section text is not on the share
allowlist. Node and browser tests cover deterministic fixtures, empty sources,
ISO rollover, persistence, the real paper tap, archives, and actual LR1 privacy.
