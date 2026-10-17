# Rooms views

Audited origin/main at 8acee3e. The existing navigator had neutral generated
roomThumb previews, no persisted room photos and no per-room soundtrack,
letter count, description or storey model. No bedroom-card snapshot cache was
present. The main-bedroom select and door controls remain unchanged.

room-views.js owns native grid, blueprint and showcase views. lr.roomsView keeps
only the layout choice. Universal Your Space search filters these views and can
also travel to matching rooms. Travel delegates to the existing switchRoom /
leaveThen path; new-room cards use the existing template-section shortcut.

Existing rooms form one Ground floor. floorLabel or floorLevel in supplied room
metadata groups future assigned floors; room.floor remains the flooring material.
Descriptions use actual flooring/wall styles unless a description is supplied.
Only real item counts are shown; no letter or soundtrack metadata is invented.
Blueprint links use LRVillage.bridges, with positions derived from container width
and floor groups. Existing Your house door-management rows remain below.

The shared createSnapshots cache in lr.roomSnapshots stores bounded PNGs from the
photo renderer, never SVG art or regenerated furniture thumbnails. Saving changed
decor captures four 240px lighting variants using the existing scene and context;
the active room's card takes a fresh photo. Relighting is synchronous and restores
live lighting/camera/simulation without ticking or switching rooms. Lighting
variants reuse the current scene's geometry (including its window artwork), while
applying the requested sun, ambient, hemisphere, exposure and lamp lighting.
Other rooms load the saved PNG for the current daypart. Old rooms without a photo
show “Visit to make a preview” until visited and saved. Cache eviction is capped
at 24 rooms and approximately 2 MB; it never prevents room saves. No room format
or share sanitizer changes. These device settings/photos never enter share codes.

Checks: node --test tests/*.test.cjs; npm run build;
python tests/village-browser.py; python tests/uiux-browser.py.
