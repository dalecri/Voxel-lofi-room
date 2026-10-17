# Offline QR dependencies

These upstream files are vendored unchanged. They are loaded locally by
`index.html` and copied into Android `www/vendor` by `scripts/build-www.mjs`.
There are no CDN imports or runtime fetches for encoding or scanning.

- `qrcode-generator/qrcode.js`: qrcode-generator **1.4.4**, Kazuhiko Arase,
  MIT. Same byte-matrix algorithm/version as dalecri/QR-Code-generator.
  Source: npm `qrcode-generator@1.4.4`, `package/qrcode.js`.
  SHA-256: `18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780`.
- `jsqr/jsQR.js`: jsQR **1.4.0**, Apache-2.0, independent offline image decoder.
  Source: npm `jsqr@1.4.0`, `package/dist/jsQR.js`.
  SHA-256: `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`.

Upstream licenses are included beside each file. npm packages were retrieved
with the pinned versions and registry integrity verification. Only the QR
libraries are vendored here; Three.js continues to use the app's existing copy.
