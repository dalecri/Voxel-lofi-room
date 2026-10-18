// Cosmetic night-market finds inspired by retro consoles, seating and kitchens.
// All models use the room's voxel primitives. Functional base furniture stays free.
(function (root) {
  const catalog = [
    ['pearl-tower', 'Pearl tower console', 75, 'A silver tower with a vented crown. A display collectible.'],
    ['obsidian-slim', 'Obsidian slim console', 80, 'A slim black console with tiny colored status lights.'],
    ['pearl-fin', 'Pearl fin console', 110, 'Sculpted ivory panels around a dark central spine.'],
    ['vented-monolith', 'Vented monolith console', 100, 'A charcoal tower with a checkerboard vent cap.'],
    ['cloud-disc', 'Cloud disc console', 65, 'A pale disc deck with a little amber emblem.'],
    ['emerald-cube', 'Emerald cube console', 90, 'A chunky charcoal cube with an emerald jewel.'],
    ['violet-wedge', 'Violet wedge console', 70, 'A low black deck with a violet light seam.'],
    ['ivory-keyboard', 'Ivory microcomputer', 85, 'A cream keyboard computer with individually modeled keys.'],
    ['woodgrain-deck', 'Woodgrain cartridge deck', 95, 'Warm wood trim, metal switches and a cartridge slot.'],
    ['tangerine-sofa', 'Tangerine low sofa', 150, 'A low, wide sofa with bold orange cushions.'],
    ['emerald-swivel', 'Emerald swivel seat', 100, 'A green quilted seat on a four-point pedestal.'],
    ['blue-tub', 'Blue tub chair', 110, 'A soft blue shell with a rounded, low seat.'],
    ['olive-lounge', 'Olive lounge chair', 120, 'Walnut edges, olive upholstery and a relaxed back.'],
    ['olive-ottoman', 'Olive lounge ottoman', 55, 'The matching little footrest, with a walnut rim.'],
    ['striped-armchair', 'Seaside stripe armchair', 115, 'Cream and blue cushions in a warm timber frame.'],
    ['cream-folding', 'Cream folding chair', 60, 'A slender folding-frame silhouette in cream and sage.'],
    ['sage-icebox', 'Sage tall icebox', 130, 'A cream-and-sage cosmetic cousin of the free mini fridge.'],
    ['cream-sink', 'Cream enamel sink', 120, 'The free kitchen counter dressed in cream enamel and sage trim.'],
    ['enamel-range', 'Enamel range miniature', 80, 'A decorative four-burner stove for a shelf or countertop.'],
    ['cream-microwave', 'Cream microwave miniature', 65, 'A tiny dark window, a cream casing and two little buttons.'],
    ['enamel-toaster', 'Enamel toaster', 45, 'Two toast slots and a warm cream shell. A decorative keepsake.'],
    ['sage-dishrack', 'Sage dish rack', 40, 'A neat row of cream plates in a little sage rack.'],
    ['mini-foosball', 'Miniature foosball table', 85, 'A shelf-sized stadium with tiny teams. Display only.'],
    ['question-cube', 'Lucky question cube', 50, 'A golden question-mark ornament. Nothing to chase or collect inside.'],
  ].map(([id, name, price, desc]) => ({ id, name, price, desc, piece: 'shop' + id.replace(/-/g, ''), icon: '✦' }));
  // Paired rotation: twelve colorways make a complete six-day circuit.
  const exclusives = [
    ['autumn-petals','Autumn petal-fall',60,'shoppetals',[0xd68c53]],
    ['snow-lantern','Snowy firefly lantern',90,'shopfireflies',[0xd9edf0]],
    ['frost-blossom','Frosted cherry blossom',100,'sakura',[0xe5eef6]],
    ['harvest-hearth','Harvest hearth',140,'fireplace',[0xb6784d]],
    ['moss-chair','Moss velvet armchair',110,'armchair',[0x6c8060,0xd9b575]],
    ['winter-sofa','Winter berry sofa',160,'sofa',[0x78596f,0xe2bdcc]],
    ['copper-desk','Copperwood writing desk',130,'desk',[0xb78061]],
    ['dusk-lamp','Dusk rose lamp',80,'floorlamp',[0xcc9caf]],
    ['midnight-wall','Midnight blue wallpaper',180,null,[0x26394e]],
    ['plum-wall','Winter plum wallpaper',150,null,[0x49354d]],
    ['honey-floor','Honey parquet floor',120,null,[0xbd925a]],
    ['frost-floor','Frost mosaic floor',150,null,[0xd3e0df]],
  ].map(([id,name,price,base,colors])=>({id,name,price,base,colors,exclusive:true,icon:'✦',
    ...(base?{piece:'travel'+id.replace(/-/g,'')} : id.endsWith('wall')?{wall:'travel'+id.replace(/-/g,'')}:{floor:'travel'+id.replace(/-/g,'')}),
    desc:base?'A special traveling colorway of a familiar favorite.':`A traveling palette. Find it in Paint → ${id.endsWith('wall')?'Walls':'Floor'}.`}));
  function travelingFor(date, owns=()=>false, pool=exclusives) {
    const parts=String(date).split('-').map(Number),day=Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000);
    if(!pool.length || !Number.isFinite(day))return [];
    const start=((day*2)%pool.length+pool.length)%pool.length;
    // The day's pair is global: buying one must not expose tomorrow's stock.
    // Already-owned finds leave their slot to the ordinary catalog.
    return Array.from({length:Math.min(2,pool.length)},(_,i)=>pool[(start+i)%pool.length]).filter(item=>!owns(item.id));
  }
  function registerExclusives(L) {
    for(const item of exclusives) {
      if(item.base) {const base=L.CAT[item.base];if(!base)continue;L.def(item.piece,{...base,name:item.name,group:'market',shop:item.id,vars:[item.colors],
        ...(item.id==='autumn-petals'?{roomEffectColors:[0xcf8050,0xe9b05f]}:{}),
        ...(item.id==='snow-lantern'?{roomEffectColors:[0xc7e5fa,0xf1f8ff],light:{at:[4,6,4],color:0xd8eaff,i:1,d:3}}:{})});}
      else if(item.wall)L.WALLS[item.wall]={label:item.name,shop:item.id,fn:(c,u,y)=>L.shade(item.colors[0],(u+y)%12===0?1.25:1)};
      else L.FLOORS[item.floor]={label:item.name,shop:item.id,fn:(x,z)=>L.shade(item.colors[0],x%8===7||z%8===7?.8:1+(L.hash3(x,z,0,91)-.5)*.08)};
    }
  }
  function register(L) {
    const { CAT, def } = L;
    const item = id => catalog.find(c => c.id === id);
    function piece(id, props) { const c = item(id); def(c.piece, { vars: [[]], ...props, name: c.name, group: 'market', shop: id }); }
    function skin(id, base, props) { piece(id, { ...CAT[base], ...props }); }
    const ivory = 0xe8e9d7, sage = 0x93a18b, dark = 0x252a2e, trim = 0x52645c, wood = 0xa77b55;
    const feet = (m, w, d) => { for (const x of [1, w - 2]) for (const z of [1, d - 2]) m.box(x, 0, z, x + 1, 2, z + 1, dark); };
    for (const id of ['pearl-tower', 'obsidian-slim', 'pearl-fin', 'vented-monolith', 'cloud-disc', 'emerald-cube', 'violet-wedge', 'ivory-keyboard', 'woodgrain-deck']) {
      piece(id, { kind: 'small', size: [1, 1], build(m) {
        if (id === 'pearl-tower') {
          m.box(1, 0, 2, 7, 1, 7, 0xb5b9b7).box(2, 1, 2, 6, 12, 6, ivory).box(1, 2, 2, 2, 11, 6, 0xc7cecb);
          m.box(2, 11, 2, 6, 12, 6, trim).box(2, 8, 6, 5, 9, 7, 0xb4bcb9).set(5, 2, 6, sage);
          for (let y = 3; y < 10; y += 2) m.set(2, y, 6, trim);
        } else if (id === 'obsidian-slim') {
          m.box(1, 0, 2, 7, 1, 7, dark).box(2, 1, 2, 6, 12, 6, 0x303535).box(1, 1, 3, 2, 11, 6, 0x11181a);
          m.box(2, 10, 6, 6, 11, 7, 0x11181a); [0x8db6d6, 0xddac52, 0xb95c42].forEach((c, k) => m.set(2, 8 - k * 2, 6, c));
        } else if (id === 'pearl-fin') {
          m.box(2, 0, 2, 6, 1, 7, dark).box(3, 1, 3, 5, 12, 6, dark);
          m.box(1, 1, 2, 3, 11, 7, ivory).box(5, 1, 2, 7, 12, 7, 0xf7f5e9).box(2, 11, 2, 3, 13, 6, ivory);
          m.box(1, 4, 7, 3, 5, 8, dark).set(4, 9, 6, 0x8baec8);
        } else if (id === 'vented-monolith') {
          m.box(1, 0, 1, 7, 12, 7, 0x252b29);
          for (let x = 1; x < 7; x++) for (let z = 1; z < 7; z++) m.set(x, 12, z, (x + z) % 2 ? 0x101714 : trim);
          m.set(6, 10, 7, 0xb7d6b0);
        } else if (id === 'cloud-disc') {
          m.box(0, 0, 1, 8, 3, 7, ivory).box(1, 3, 2, 7, 4, 6, 0xf7f6ed);
          for (let x = 2; x < 6; x++) { m.set(x, 3, 1, sage); m.set(x, 3, 6, sage); }
          for (let x = 1; x < 7; x += 2) m.set(x, 1, 7, dark);
          m.set(4, 4, 4, 0xd78548);
        } else if (id === 'emerald-cube') {
          m.box(0, 0, 0, 8, 4, 8, dark).box(1, 4, 1, 7, 5, 7, 0x39443b);
          for (let x = 0; x < 8; x++) { m.set(x, 4, x, trim); m.set(7 - x, 4, x, trim); }
          m.box(3, 5, 3, 5, 6, 5, 0x8bcb57).box(1, 1, 7, 7, 2, 8, 0x121a16);
        } else if (id === 'violet-wedge') {
          m.box(0, 0, 0, 8, 2, 8, dark).box(0, 2, 0, 8, 3, 4, 0x161d24).box(1, 2, 4, 7, 3, 8, 0x35404a);
          m.box(0, 3, 3, 8, 4, 4, 0x7865ba).box(1, 0, 7, 6, 1, 8, 0x14191f);
        } else if (id === 'ivory-keyboard') {
          m.box(0, 0, 1, 8, 2, 7, ivory).box(1, 2, 1, 7, 3, 3, 0xd2d6c1);
          for (let x = 1; x < 7; x++) for (let z = 3; z < 6; z++) m.set(x, 2, z, (x + z) % 2 ? trim : 0x6e7969);
          m.set(6, 3, 2, 0xb66b40);
        } else {
          m.box(0, 0, 1, 8, 2, 7, dark).box(0, 1, 6, 8, 3, 7, wood).box(1, 2, 1, 7, 4, 5, dark);
          m.box(2, 4, 2, 6, 5, 3, 0x111717); for (let x = 1; x < 7; x += 2) m.set(x, 4, 4, 0xc6c9b2);
        }
      } });
    }
    skin('tangerine-sofa', 'sofa', { vars: [[0xe96a21, 0xf69035]], build(m, [c, a]) {
      feet(m, 24, 16); m.box(0, 2, 0, 24, 6, 16, c).box(0, 6, 0, 24, 12, 4, c);
      m.box(0, 6, 4, 4, 10, 16, c).box(20, 6, 4, 24, 10, 16, c);
      for (let x = 4; x < 20; x += 8) m.box(x, 6, 4, x + 7, 8, 15, a);
      m.box(1, 3, 15, 23, 4, 16, 0xc34d19);
    } });
    for (const id of ['emerald-swivel', 'blue-tub', 'olive-lounge', 'striped-armchair']) {
      skin(id, 'armchair', { vars: [[]], build(m) {
        if (id === 'emerald-swivel') {
          m.box(3, 0, 6, 13, 1, 9, trim).box(6, 0, 3, 9, 1, 13, trim).box(7, 1, 7, 9, 4, 9, trim);
          m.box(1, 4, 2, 15, 7, 15, 0x287e4b).box(2, 7, 1, 14, 15, 4, 0x2c9858);
          for (let x = 3; x < 14; x += 4) { m.box(x, 7, 4, x + 3, 8, 14, 0x38a15c).box(x, 9, 4, x + 2, 13, 5, 0x227744); }
        } else if (id === 'blue-tub') {
          feet(m, 16, 16); m.box(1, 2, 1, 15, 4, 15, 0x4275a1).blob(8, 5, 8, 8, 3, 8, 0x4275a1).box(1, 5, 1, 15, 12, 4, 0x4f88b4);
          m.box(0, 5, 4, 3, 9, 14, 0x4275a1).box(13, 5, 4, 16, 9, 14, 0x4275a1).box(3, 6, 4, 13, 8, 14, 0x77a8cc);
        } else if (id === 'olive-lounge') {
          m.box(3, 0, 6, 13, 1, 9, trim).box(7, 1, 6, 9, 4, 8, trim);
          m.box(1, 4, 2, 15, 6, 15, wood).box(2, 6, 4, 14, 8, 14, 0x72784d);
          m.box(2, 7, 1, 14, 15, 3, wood).box(3, 8, 3, 13, 14, 5, 0x626b42);
          m.box(0, 7, 5, 2, 9, 13, wood).box(14, 7, 5, 16, 9, 13, wood);
        } else {
          feet(m, 16, 16); m.box(1, 2, 2, 15, 5, 15, wood);
          m.box(1, 5, 1, 15, 14, 4, (x) => (x >> 1) % 2 ? 0xe8e6cd : 0x739cbd);
          m.box(2, 5, 4, 14, 8, 15, (x) => (x >> 1) % 2 ? 0xe8e6cd : 0x739cbd);
          for (const x of [0, 14]) m.box(x, 7, 3, x + 2, 9, 16, wood).box(x, 2, 11, x + 2, 8, 13, wood);
        }
      } });
    }
    skin('olive-ottoman', 'chair', { seat: 7, vars: [[]], build(m) {
      m.box(1, 0, 3, 7, 1, 5, trim).box(3, 1, 3, 5, 3, 5, trim).box(0, 3, 0, 8, 5, 8, wood).box(1, 5, 1, 7, 7, 7, 0x72784d);
    } });
    skin('cream-folding', 'chair', { seat: 6, vars: [[]], build(m) {
      for (const x of [1, 6]) { m.box(x, 0, 1, x + 1, 13, 2, sage).box(x, 0, 6, x + 1, 6, 7, sage); }
      m.box(1, 12, 1, 7, 13, 2, sage).box(2, 8, 1, 6, 11, 2, ivory).box(1, 5, 2, 7, 6, 7, ivory);
      m.box(1, 1, 1, 7, 2, 2, sage).box(1, 1, 6, 7, 2, 7, sage);
    } });
    skin('sage-icebox', 'minifridge', { top: 24, vars: [[ivory]], build(m) {
      feet(m, 8, 8); m.box(0, 2, 0, 8, 24, 7, ivory).box(1, 23, 1, 7, 24, 7, 0xf2f1e2);
      m.part('door', [0, 2, 7], 'y').box(0, 2, 7, 8, 23, 8, ivory).box(0, 16, 7, 8, 17, 8, sage);
      m.box(1, 6, 8, 2, 13, 9, trim).box(1, 18, 8, 2, 21, 9, trim).set(6, 12, 8, 0xd68448); m.main();
    } });
    skin('cream-sink', 'counter', { vars: [[ivory, 0xd8e3d5]], build(m, v, s) {
      CAT.counter.build(m, v, s); m.box(1, 2, 7, 7, 3, 8, sage).box(9, 2, 7, 15, 3, 8, sage);
      m.box(0, 10, 0, 16, 11, 7, sage);
    } });
    for (const id of ['enamel-range', 'cream-microwave', 'enamel-toaster', 'sage-dishrack', 'mini-foosball', 'question-cube']) {
      piece(id, { kind: 'small', size: [1, 1], build(m) {
        if (id === 'enamel-range') {
          m.box(0, 0, 0, 8, 7, 8, ivory).box(1, 1, 7, 7, 5, 8, trim).box(2, 2, 7, 6, 4, 8, dark);
          for (const x of [1, 5]) for (const z of [1, 5]) m.box(x, 7, z, x + 2, 8, z + 2, trim).set(x, 8, z, dark);
          for (let x = 1; x < 7; x += 2) m.set(x, 6, 8, sage);
        } else if (id === 'cream-microwave') {
          m.box(0, 0, 1, 8, 5, 7, ivory).box(1, 1, 7, 6, 4, 8, trim).box(2, 2, 7, 5, 3, 8, dark);
          m.set(6, 3, 7, sage).set(6, 1, 7, 0xb7b99c);
        } else if (id === 'enamel-toaster') {
          m.box(1, 0, 1, 7, 4, 7, ivory).box(2, 4, 1, 6, 5, 7, ivory);
          m.box(2, 4, 2, 6, 5, 3, dark).box(2, 4, 5, 6, 5, 6, dark).box(6, 1, 4, 8, 2, 5, wood);
        } else if (id === 'sage-dishrack') {
          m.box(0, 0, 1, 8, 1, 7, sage);
          for (let x = 1; x < 8; x += 2) m.box(x, 1, 2, x + 1, 5, 6, ivory);
          m.box(0, 1, 1, 8, 2, 2, trim).box(0, 1, 6, 8, 2, 7, trim);
        } else if (id === 'mini-foosball') {
          feet(m, 8, 8); m.box(0, 2, 0, 8, 4, 8, wood).box(1, 4, 1, 7, 5, 7, 0x629554);
          for (let z = 2; z < 7; z += 2) { m.box(-1, 5, z, 9, 6, z + 1, sage); m.set(2, 6, z, 0xd6b765).set(5, 6, z, 0x6389aa); }
        } else {
          m.box(1, 0, 1, 7, 6, 7, 0xe8bd48).box(2, 5, 2, 6, 6, 6, 0xf9d86d);
          m.box(2, 4, 7, 5, 5, 8, 0x765934).set(4, 3, 7, 0x765934).set(3, 2, 7, 0x765934).set(3, 0, 7, 0x765934);
        }
      } });
    }
  }
  const api = { catalog, exclusives, travelingFor, register, registerExclusives };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LRMerchantAssets = api;
})(typeof window !== 'undefined' ? window : globalThis);
