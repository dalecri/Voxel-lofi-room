// Assembles www/ for the Android app: the web app plus local copies of three.js,
// the fonts and Capacitor's runtime, so the APK works fully offline.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const nm = p => join(root, 'node_modules', p);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'vendor', 'fonts'), { recursive: true });
mkdirSync(join(out, 'assets'), { recursive: true });

for (const f of ['friend-cards.js', 'friend-cards.css', 'captions.js', 'captions.css', 'digest.js', 'press.js', 'digest.css', 'room-qr.js', 'room-qr.css', 'focus-garden.js', 'focus-garden.css', 'library.js', 'library.css', 'barnaby.js', 'barnaby.css', 'french.js', 'french.css', 'calendar.js', 'calendar.css', 'atlas.js', 'village.js', 'room-views.js', 'performance.js', 'weather.js', 'cozy-furniture.js', 'boot.js', 'care.js', 'shop.js', 'merchant-assets.js', 'life.js', 'rituals.js', 'companion.js', 'costumes.js', 'mail-window.js', 'postcard.css', 'notepad.css', 'letters.js', 'letters.css', 'pixel-maker.js', 'room-tools.js', 'room-tools.css', 'dashboard.js', 'dashboard.css', 'today.js', 'launcher.js', 'home.js', 'home.css', 'widgets.js', 'room.js', 'furniture.js', 'japan.js', 'scene.js', 'screens.js', 'sound.js', 'render.js', 'main.js', 'storage.js']) copyFileSync(join(root, f), join(out, f));
for (const name of ['qrcode-generator', 'jsqr']) cpSync(join(root, 'vendor', name), join(out, 'vendor', name), { recursive: true });
cpSync(join(root, 'packs'), join(out, 'packs'), { recursive: true });
cpSync(join(root, 'games'), join(out, 'games'), { recursive: true });
copyFileSync(join(root, 'assets', 'mailbox-access.png'), join(out, 'assets', 'mailbox-access.png'));
copyFileSync(join(root, 'assets', 'icon.png'), join(out, 'assets', 'icon.png'));
copyFileSync(join(root, 'assets', 'library-pixel.ttf'), join(out, 'assets', 'library-pixel.ttf'));
copyFileSync(join(root, 'assets', 'french.json'), join(out, 'assets', 'french.json'));
mkdirSync(join(out, 'vendor', 'three', 'build'), { recursive: true });
copyFileSync(nm('three/build/three.module.js'), join(out, 'vendor', 'three', 'build', 'three.module.js'));
for (const d of ['postprocessing', 'shaders']) cpSync(nm('three/examples/jsm/' + d), join(out, 'vendor', 'three', 'examples', 'jsm', d), { recursive: true });
copyFileSync(nm('@capacitor/core/dist/capacitor.js'), join(out, 'vendor', 'capacitor.js'));
copyFileSync(nm('mediabunny/dist/bundles/mediabunny.min.mjs'), join(out, 'vendor', 'mediabunny.min.mjs'));   // loaded only when filming a timelapse

// fonts: latin subsets of the weights the app uses
let css = '';
const fonts = { fredoka: [400, 500, 600], nunito: [400, 600, 700, 800], vt323: [400] };   // VT323: the mailbox's retro pixel type
for (const [family, weights] of Object.entries(fonts)) {
  for (const w of weights) {
    const src = readFileSync(nm(`@fontsource/${family}/latin-${w}.css`), 'utf8');
    for (const [, file] of src.matchAll(/url\(\.\/files\/([^)]+)\)/g)) {
      copyFileSync(nm(`@fontsource/${family}/files/${file}`), join(out, 'vendor', 'fonts', file));
    }
    css += src.replace(/url\(\.\/files\//g, 'url(fonts/') + '\n';
  }
}
writeFileSync(join(out, 'vendor', 'fonts.css'), css);

// index.html: swap CDN links for the bundled copies
let html = readFileSync(join(root, 'index.html'), 'utf8');
const swap = (from, to) => {
  if (!from.test(html)) throw new Error('build-www: pattern not found ' + from);
  html = html.replace(from, to);
};
swap(/<link rel="preconnect"[^>]*>\s*<link rel="preconnect"[^>]*>\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="vendor/fonts.css">');
swap(/https:\/\/unpkg\.com\/three@0\.160\.0\/build\/three\.module\.js/, './vendor/three/build/three.module.js');
swap(/https:\/\/unpkg\.com\/three@0\.160\.0\/examples\/jsm\//, './vendor/three/examples/jsm/');
swap(/https:\/\/unpkg\.com\/mediabunny@[\d.]+\/dist\/bundles\/mediabunny\.min\.mjs/, './vendor/mediabunny.min.mjs');
swap(/<script defer src="storage\.js"><\/script>/, '<script defer src="vendor/capacitor.js"></script>\n<script defer src="storage.js"></script>');
writeFileSync(join(out, 'index.html'), html);

console.log('www/ ready');
