/* Render scheduling is separate from room time. Idle maintenance still advances brains,
   timers and widget refreshes, but never submits an unchanged frame to the GPU. */
(function (root) {
  'use strict';
  function quality({ calm = false, width = 1024, dpr = 1, size = 10 } = {}) {
    return { pixelRatio: Math.min(dpr, calm ? 1 : 2), shadowSize: calm ? 1024 : size > 14 ? 4096 : 2048, bloom: !calm, quietMs: calm ? 1000 : 2000, antialias: !calm, toneMapping: calm ? 'none' : 'aces', powerPreference: calm ? 'low-power' : 'default', shadowAutoUpdate: !calm, fps: calm ? 30 : 0 };
  }
  function createActivity({ now = () => performance.now(), calm = false } = {}) {
    let revision = 0, lastBusy = now(), dirty = true, wakeHandler = () => {}, quietMs = quality({ calm }).quietMs;
    const sources = new Set();
    return {
      begin() { sources.clear(); },
      report(source, busy = true) { if (busy) { sources.add(source); lastBusy = now(); wakeHandler(); } },
      wake() { revision++; dirty = true; lastBusy = now(); wakeHandler(); },
      onWake(fn) { wakeHandler = fn; },
      setCalm(on) { calm = !!on; quietMs = quality({ calm: on }).quietMs; this.wake(); },
      continuous() { return sources.size > 0 || now() - lastBusy < quietMs; },
      needsFrame() { return dirty || this.continuous(); },
      presented() { dirty = false; },
      get sources() { return [...sources]; },
      get quietMs() { return quietMs; },
      get calm() { return calm; },
      get revision() { return revision; }
    };
  }
  function createLoop({ activity, step, draw, fullRate = () => false, now = () => performance.now(), raf = requestAnimationFrame, cancel = cancelAnimationFrame, delay = setTimeout, clear = clearTimeout }) {
    let pending = null, timer = null, stopped = true, running = false, frames = 0, lastDraw = -Infinity;
    function schedule() { if (!stopped && pending === null) pending = raf(run); }
    function run() {
      pending = null; timer = null;
      if (stopped) return;
      running = true;
      const time = now();
      activity.begin(); step(time); // Input and simulation still run on every RAF.
      const interval = activity.calm && !fullRate() ? 1000 / 30 : 0;
      if (activity.needsFrame() && time - lastDraw >= interval - .001) {
        draw(); frames++; lastDraw = time; activity.presented();
      }
      running = false;
      if (activity.continuous()) schedule();
      else timer = delay(run, 100); // CPU-only heartbeat: no RAF and no canvas work while still.
    }
    activity.onWake(() => { if (running) return; if (timer !== null) { clear(timer); timer = null; } schedule(); });
    return {
      start() { if (stopped) { stopped = false; activity.wake(); } },
      stop() { stopped = true; if (pending !== null) cancel(pending); if (timer !== null) clear(timer); pending = timer = null; },
      get sleeping() { return !stopped && pending === null && timer !== null; },
      get frames() { return frames; }
    };
  }
  // Compare visible transforms/materials rather than guessing from furniture IDs.
  // This also covers new costume layers, private canvases, water and widget shimmer.
  // Particle buffers are tracked explicitly by the renderer (empty buffers change versions too).
  function createVisualTracker({ shadows = false } = {}) {
    let previous = [];
    return function changed(scene, camera) {
      const values = [];
      function node(o) {
        if (!o.visible) return false;
        const start = values.length;
        values.push(o.id, o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z);
        if (!shadows && o.isLight) values.push(o.intensity, o.color.r, o.color.g, o.color.b);
        if (shadows && o.castShadow) {
          if (o.geometry) values.push(o.geometry.id, o.geometry.attributes?.position?.version || 0, o.geometry.index?.version || 0, o.geometry.drawRange.start, o.geometry.drawRange.count);
          if (o.shadow) values.push(...o.shadow.camera.projectionMatrix.elements);
          if (o.target) values.push(o.target.position.x, o.target.position.y, o.target.position.z);
        }
        if (o.isInstancedMesh && o.count) values.push(o.count, o.instanceMatrix.version, o.instanceColor?.version || 0);
        const materials = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of materials) {
          if (shadows) {
            values.push(m.id, m.visible ? 1 : 0, m.side, m.shadowSide ?? -1, m.alphaTest);
            if (m.alphaTest > 0) values.push(m.opacity, m.map?.version || 0, m.alphaMap?.version || 0);
          } else {
            values.push(m.id, m.opacity, m.visible ? 1 : 0, m.map?.version || 0);
            for (const color of [m.color, m.emissive]) if (color) values.push(color.r, color.g, color.b);
            if (m.emissiveIntensity !== undefined) values.push(m.emissiveIntensity);
          }
        }
        let caster = !!o.castShadow;
        for (const child of o.children) caster = node(child) || caster;
        if (shadows && !caster) values.length = start;
        return caster;
      }
      node(scene);
      if (!shadows) { node(camera); values.push(...camera.projectionMatrix.elements); }
      const different = values.length !== previous.length || values.some((v, i) => v !== previous[i] && Math.abs(v - previous[i]) > 1e-7);
      previous = values;
      return different;
    };
  }
  function createShadows({ map, revision = () => 0, calm = false }) {
    let seen = -1;
    return {
      setCalm(on) { calm = !!on; map.autoUpdate = !calm; map.needsUpdate = true; seen = -1; },
      prepare(changed = false) {
        if (!calm) return;
        const next = revision();
        if (changed || next !== seen) map.needsUpdate = true;
        seen = next;
      }
    };
  }
  const api = { createShadows, quality, createActivity, createLoop, createVisualTracker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LRPerformance = api;
})(typeof window !== 'undefined' ? window : globalThis);
