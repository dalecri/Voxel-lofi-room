// Private companion wardrobe. Art is data; the rig and animation live in companion.js.
(function (root) {
  /* Add art + one COSTUMES entry, no renderer changes:
     {id, name, unlock:{type:'free'|'fireflies'|'streak'|'season', price?, days?, season?},
      layers:{hood:{color,faceColor?,shapes:[]}, suit:{color,trim?,shapes:[]},
              badge:{shapes:[]}, accessory:{shapes:[]}}}
     Colors are RGB integers. A shape is {shape:'box'|'blob', at:[x,y,z],
     size:[width,height,depth] (box) or [rx,ry,rz] (blob), color, glow?, part?}.
     Coordinates use the BASE rig's voxel space (8 voxels/tile), +Z faces forward.
     Hood art always attaches to head; suit defaults to main; badge to main;
     accessory specifies part: head/main/leftarm/rightarm/leftleg/rightleg.
     Hood color creates a rounded shell with an open face. Suit color replaces
     pajama cloth, leaving hands and face visible. Badge's front is z=8, centered
     x=4,y=7; keep badges to x=2..5,y=5..9. Geometry is merged into its rig part,
     so hood, limbs and badge follow every pose without separate floating meshes.
     Head extras should meet the shell at y=20; hands/feet keep their rig pivots.
     Each owned costume unlocks all its layers for mixing. Device-private slots
     pick a costume id per layer (or 'plain'); whole-costume purchases set all
     four. An accessory with part:'rightarm' follows the hand in every pose.
     No functions, URLs, timers or room metadata belong in registry entries. */
  const COSTUMES = [
    { id: 'plain', name: 'Pajama day', unlock: { type: 'free' }, layers: {} },
    { id: 'automata', name: 'Automata', unlock: { type: 'free' }, layers: {
      hood: { color: 0xbfeee8, faceColor: 0x91d9d0, shapes: [
        { shape: 'box', at: [3,20,3], size: [2,3,2], color: 0x476d6c },
        { shape: 'box', at: [3,23,3], size: [2,1,2], color: 0x91d9d0, glow: true },
        { shape: 'box', at: [-2,13,3], size: [1,4,3], color: 0x34595c },
        { shape: 'box', at: [9,13,3], size: [1,4,3], color: 0x34595c }] },
      suit: { color: 0x34595c, trim: 0x779986, shapes: [
        { shape: 'box', at: [1,8,8], size: [6,1,1], color: 0x779986 },
        { shape: 'box', at: [2,4,8], size: [4,1,1], color: 0x203e43 }] },
      badge: { shapes: [{ shape: 'box', at: [3,6,8], size: [2,2,1], color: 0x91d9d0, glow: true }] } } },
    { id: 'bear', name: 'Honey bear', unlock: { type: 'fireflies', price: 40 }, layers: {
      hood: { color: 0xb88960, shapes: [
        { shape: 'blob', at: [0,20,4], size: [2,2,2], color: 0xb88960 },
        { shape: 'blob', at: [8,20,4], size: [2,2,2], color: 0xb88960 },
        { shape: 'box', at: [-1,20,5], size: [2,1,1], color: 0xe8c99e },
        { shape: 'box', at: [7,20,5], size: [2,1,1], color: 0xe8c99e }] },
      suit: { color: 0xb88960, trim: 0xe8c99e },
      badge: { shapes: [{ shape: 'box', at: [3,6,8], size: [2,2,1], color: 0xe9b64f }] } } },
    { id: 'cat', name: 'Sleepy cat', unlock: { type: 'fireflies', price: 60 }, layers: {
      hood: { color: 0x8c849b, shapes: [
        { shape: 'box', at: [-1,19,3], size: [3,2,3], color: 0x8c849b },
        { shape: 'box', at: [-1,21,3], size: [2,2,2], color: 0x8c849b },
        { shape: 'box', at: [6,19,3], size: [3,2,3], color: 0x8c849b },
        { shape: 'box', at: [7,21,3], size: [2,2,2], color: 0x8c849b }] },
      suit: { color: 0x8c849b, trim: 0xd3c5d5 },
      badge: { shapes: [{ shape: 'box', at: [3,6,8], size: [2,2,1], color: 0xeec1c3 }] } } },
    { id: 'rabbit', name: 'Moon rabbit', unlock: { type: 'streak', days: 7 }, layers: {
      hood: { color: 0xe8dfd7, shapes: [
        { shape: 'box', at: [0,19,3], size: [2,7,3], color: 0xe8dfd7 },
        { shape: 'box', at: [6,19,3], size: [2,7,3], color: 0xe8dfd7 },
        { shape: 'box', at: [0,21,5], size: [1,4,1], color: 0xdcaeb1 },
        { shape: 'box', at: [7,21,5], size: [1,4,1], color: 0xdcaeb1 }] },
      suit: { color: 0xe8dfd7, trim: 0xfff3df },
      badge: { shapes: [{ shape: 'box', at: [3,6,8], size: [2,2,1], color: 0xd6bb75 }] } } },
    { id: 'frog', name: 'Puddle frog', unlock: { type: 'fireflies', price: 80 }, layers: {
      hood: { color: 0x83ad79, shapes: [
        { shape: 'blob', at: [0,20,4], size: [2,2,2], color: 0x83ad79 },
        { shape: 'blob', at: [8,20,4], size: [2,2,2], color: 0x83ad79 },
        { shape: 'box', at: [0,20,6], size: [1,1,1], color: 0x253d35 },
        { shape: 'box', at: [8,20,6], size: [1,1,1], color: 0x253d35 }] },
      suit: { color: 0x83ad79, trim: 0xd6dda0 },
      badge: { shapes: [{ shape: 'box', at: [3,6,8], size: [2,2,1], color: 0x5c9476 }] } } },
    { id: 'ghost', name: 'Polite ghost', unlock: { type: 'season', season: 'halloween' }, layers: {
      hood: { color: 0xe9e8f2 }, suit: { color: 0xe9e8f2, trim: 0xd4d0e6 },
      badge: { shapes: [{ shape: 'box', at: [3,6,8], size: [2,2,1], color: 0xb0a3c9 }] } } },
    { id: 'penguin', name: 'Winter penguin', unlock: { type: 'season', season: 'holiday' }, layers: {
      hood: { color: 0x394c5d }, suit: { color: 0x394c5d, trim: 0xeee8d8 },
      badge: { shapes: [{ shape: 'box', at: [3,6,8], size: [2,2,1], color: 0xe3ae5e }] },
      accessory: { shapes: [{ shape: 'box', at: [0,10,4], size: [8,1,4], color: 0xb06c6c }] } } },
  ];
  const KEY = 'lr.wardrobe';
  const SLOTS = ['hood','suit','badge','accessory'];
  const slotsFor = id => Object.fromEntries(SLOTS.map(slot => [slot,id]));
  const normalizeSlots = slots => Object.fromEntries(SLOTS.map(slot => [slot,find(slots?.[slot]) ? slots[slot] : 'plain']));
  const find = id => COSTUMES.find(c => c.id === id);
  const catalog = () => COSTUMES.filter(c => c.unlock.type === 'fireflies').map(c => ({ id: 'costume-' + c.id, costume: c.id, name: c.name + ' costume', price: c.unlock.price, icon: '🧵', desc: 'A permanent outfit for your little roommate. Bought outfits equip right away.' }));
  function inSeason(season, date, seasons) {
    const s = seasons.find(s => s.group === season); if (!s) return false;
    const key = date.getMonth() * 32 + date.getDate(), a = s.from[0] * 32 + s.from[1], b = s.to[0] * 32 + s.to[1];
    return a <= b ? key >= a && key <= b : key >= a || key <= b;
  }
  function condition(c) {
    if (c.unlock.type === 'free') return 'Always yours';
    if (c.unlock.type === 'fireflies') return `${c.unlock.price} Fireflies · Mallow’s traveling shop`;
    if (c.unlock.type === 'streak') return `${c.unlock.days}-day Daily Moment streak`;
    return c.unlock.season === 'halloween' ? 'Visit during Halloween season (October 1 to November 2)' : 'Visit during winter holidays (December 1 to January 7)';
  }
  function create({ store, owns = () => false, now = () => new Date(), seasons = [] }) {
    const saved = store.get(KEY, {}) || {}, owned = new Set(Array.isArray(saved.owned) ? saved.owned.filter(id => find(id)) : []);
    let migrated = !saved.slots, slots = normalizeSlots(saved.slots || slotsFor(saved.selected || 'plain'));
    migrated = migrated || JSON.stringify(saved.slots) !== JSON.stringify(slots);
    function save() { store.set(KEY, { slots: {...slots}, owned: [...owned] }); }
    function sync() {
      let changed = migrated; migrated = false; const streak = store.get('lr.dailyStreak', { n: 0 }).n;
      for (const c of COSTUMES) {
        const u = c.unlock, unlocked = u.type === 'free' || u.type === 'fireflies' && owns('costume-' + c.id) || u.type === 'streak' && streak >= u.days || u.type === 'season' && inSeason(u.season, now(), seasons);
        if (unlocked && !owned.has(c.id)) { owned.add(c.id); changed = true; }
      }
      for (const slot of SLOTS) if (!owned.has(slots[slot])) { slots[slot] = 'plain'; changed = true; }
      if (changed) save(); return changed;
    }
    function equip(id) { sync(); if (!owned.has(id) || !find(id)) return false; slots = slotsFor(id); save(); return true; }
    function equipSlot(slot, id) {
      sync();
      if (!SLOTS.includes(slot) || !owned.has(id) || (id !== 'plain' && !find(id)?.layers[slot])) return false;
      slots[slot] = id; save(); return true;
    }
    sync();
    // selected is a compatibility view only; persistence and rendering use slots.
    return { sync, equip, equipSlot, owns: id => owned.has(id), get slots() { return {...slots}; }, get selected() { return SLOTS.every(s=>slots[s]===slots.hood) ? slots.hood : 'mixed'; } };
  }
  function register(L) {
    L.def('companionwardrobe', { name: 'Costume dresser', kind: 'floor', group: 'cozy', size: [2,1], top: 19, tap: 'wardrobe', vars: [[0xc3a487,0xf0e2c9]], build(m,[wood,cream]) {
      m.box(1,0,1,3,3,7,wood).box(13,0,1,15,3,7,wood).box(0,3,0,16,18,8,wood).box(0,18,0,16,19,8,cream);
      for(const y of [4,9,14]) m.box(1,y,8,15,y+4,9,cream).box(7,y+1,9,9,y+2,10,0x9b7f5e);
    } });
  }
  const api = { COSTUMES, KEY, SLOTS, slotsFor, normalizeSlots, find, catalog, condition, inSeason, create, register };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LRCostumes = api; register(root.LR); }
})(typeof window !== 'undefined' ? window : globalThis);
