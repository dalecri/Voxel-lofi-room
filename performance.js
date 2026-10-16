/* Render scheduling is separate from room time. Idle maintenance still advances brains,
   timers and widget refreshes, but never submits an unchanged frame to the GPU. */
(function (root) {
  'use strict';
  function quality({ calm = false, width = 1024, dpr = 1, size = 10 } = {}) {
    return { pixelRatio: Math.min(dpr, calm && width >= 760 ? 1.25 : 2), shadowSize: calm ? 1024 : size > 14 ? 4096 : 2048, bloom: !calm, quietMs: calm ? 1000 : 2000 };
  }
  function createActivity({ now = () => performance.now(), calm = false } = {}) {
    let lastBusy = now(), dirty = true, wakeHandler = () => {}, quietMs = quality({ calm }).quietMs;
    const sources = new Set();
    return {
      begin() { sources.clear(); },
      report(source, busy = true) { if (busy) { sources.add(source); lastBusy = now(); wakeHandler(); } },
      wake() { dirty = true; lastBusy = now(); wakeHandler(); },
      onWake(fn) { wakeHandler = fn; },
      setCalm(on) { quietMs = quality({ calm: on }).quietMs; this.wake(); },
      continuous() { return sources.size > 0 || now() - lastBusy < quietMs; },
      needsFrame() { return dirty || this.continuous(); },
      presented() { dirty = false; },
      get sources() { return [...sources]; },
      get quietMs() { return quietMs; }
    };
  }
  function createLoop({ activity, step, draw, now = () => performance.now(), raf = requestAnimationFrame, cancel = cancelAnimationFrame, delay = setTimeout, clear = clearTimeout }) {
    let pending = null, timer = null, stopped = true, running = false, frames = 0;
    function schedule() { if (!stopped && pending === null) pending = raf(run); }
    function run() {
      pending = null; timer = null;
      if (stopped) return;
      running = true;
      activity.begin(); step(now());
      if (activity.needsFrame()) { draw(); frames++; activity.presented(); }
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
  function createVisualTracker() {
    let previous = [];
    return function changed(scene, camera) {
      const values = [];
      function node(o) {
        if (!o.visible) return;
        values.push(o.id, o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z);
        if (o.isLight) values.push(o.intensity, o.color.r, o.color.g, o.color.b);
        if (o.isInstancedMesh && o.count) values.push(o.count, o.instanceMatrix.version, o.instanceColor?.version || 0);
        const materials = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of materials) {
          values.push(m.id, m.opacity, m.visible ? 1 : 0, m.map?.version || 0);
          for (const color of [m.color, m.emissive]) if (color) values.push(color.r, color.g, color.b);
          if (m.emissiveIntensity !== undefined) values.push(m.emissiveIntensity);
        }
        for (const child of o.children) node(child);
      }
      node(scene); node(camera);
      values.push(...camera.projectionMatrix.elements);
      const different = values.length !== previous.length || values.some((v, i) => Math.abs(v - previous[i]) > 1e-7);
      previous = values;
      return different;
    };
  }
  const api = { quality, createActivity, createLoop, createVisualTracker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LRPerformance = api;
})(typeof window !== 'undefined' ? window : globalThis);
