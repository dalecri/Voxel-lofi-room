// Loads three.js as a module (plus the post-processing pieces for the night glow) and hands it to the
// rest of the app as the global THREE. The other scripts are deferred, so they run right after this.
import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

window.THREE = Object.assign({}, T, { EffectComposer, RenderPass, UnrealBloomPass, OutputPass });

window.dispatchEvent(new Event('lofi-renderer-ready'));
