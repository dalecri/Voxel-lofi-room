# Room QR sharing audit

Audited `origin/main` at `aa6bed40a5d0f881a773605cbd1846051f4f14ea` before implementation.
Reference: `dalecri/QR-Code-generator` at
`3d0288f541ebff7b06869fe54182760694890831`.

## Existing paths retained

- `main.js` `roomCode()` still calls `LRWidgets.shareDecor`, removes default
  item values, and generates the exact same LR1/LR0 payload. `readCode()`,
  guest-book LRG encoding/handling, and share sanitization are unchanged.
- The share textarea, count, Copy and Send handlers are unchanged. QR is an
  additional section; it does not wrap the code in a URL.
- Camera results populate that same import textarea and invoke its existing
  Open room handler, including `readCode()`, `LR.Room.load`, unknown-def
  filtering and `leaveThen`. URLs and LRG codes are not camera-imported.
- No new storage keys, network calls, dependencies in the package manifest,
  or second copy of Three.js.

## Rendering and offline transport

The reference's `qrcode(0, 'M')` byte matrix approach uses qrcode-generator
1.4.4. It is vendored with its MIT license; the independent jsQR 1.4.0 decoder
is bundled with its Apache-2.0 license. Android's `www` assembly copies both.
The reference's Scan mode is a top-down *display*, not a camera scanner;
camera import here uses local `getUserMedia` video and jsQR.

Codes up to 256 ASCII bytes use L; longer codes use M. Version-40 capacity
is checked before allocation. Overflow leaves the unchanged text fallback
and a short explanation. All room codes are ASCII by the existing format.

`room-qr.js` uses the existing `view.ensureThumbs()` / `thumbR` WebGL renderer,
restoring its size, pixel ratio and tone mapping afterward. Instanced boxes
keep draw calls low. The QR is gapless, high contrast and has a four-module
white quiet zone. The tree and petals are beyond the quiet zone. Images
are 1536px square. The rendered pixels are independently decoded before use:
a denser code can use a steeper camera angle, then Plain if neither image
verifies. There is no continuous QR WebGL loop. Only edge petals animate
with CSS, pausing offscreen/closed and respecting reduced motion.

## Native integration

Capacitor's existing `BridgeWebChromeClient.onPermissionRequest` handles the
runtime camera permission requested by getUserMedia; CAMERA is declared
with optional camera hardware. No microphone is requested. Denial, missing
hardware and stream errors leave paste available. Closing, navigating away,
hiding the document, successful scans and late permission resolution all
stop tracks. Frames remain on-device. HD video frames are retained up to 1920px
on their longest edge; unnecessarily shrinking a dense isometric code can
discard readable modules.

Share image follows the existing Filesystem CACHE + Share plugin path and
falls back to room text when file sharing is unsupported. Download PNG uses
a small RoomQrFiles document-picker plugin, matching LetterFiles, with
`image/png` and no broad storage permission. Browser sharing uses File when
`navigator.canShare` permits, otherwise text; cancellation is respected.

## Verification and remaining physical check

- Unit fixtures cover byte encode/decode, short/default correction levels,
  large payloads, overflow, file/text/native sharing and cancellation.
- Browser tests use actual `roomCode()` -> rendered voxel/plain PNG -> jsQR
  -> `readCode()`, comparing exact code text and identical room JSON, with
  several room densities. They also exercise downloads, shared File contents,
  camera denial, a real MediaStream carrying a QR image through the normal
  import flow, late-stream cleanup, privacy and day/night mobile/desktop.
- The browser suite makes no outbound requests. Existing widget privacy and
  fresh-session import coverage remains in `widgets-interactive-browser.py`;
  its fixture now includes the already-existing terrarium portal.
- **A physical phone-camera scan has not been performed in this cloud
  environment.** Open the exported voxel PNG on another screen, scan it with
  a phone QR reader, and compare its decoded text byte-for-byte to the raw
  textarea; then import and compare the room. Repeat Plain and night PNG.
  Automated camera-video coverage is not a substitute for that check.
- **Android native compilation/device execution was not run here:** Java 21
  is present, but this environment has no Android SDK. The existing Android
  workflow builds with Java 21 and the SDK when pushed to main. Physical
  Android permission, download-picker and share-sheet checks remain needed.
