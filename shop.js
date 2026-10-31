// Earn-only Fireflies and the merchant's cosmetic collection. No paid currency.
(function (root) {
  const extras = typeof module !== 'undefined' && module.exports ? require('./merchant-assets.js') : root.LRMerchantAssets;
  const costumes = typeof module !== 'undefined' && module.exports ? require('./costumes.js') : root.LRCostumes;
  const catalog = [
    ...costumes.catalog(),
    { id: 'galaxy', name: 'Galaxy aquarium', price: 120, piece: 'shopgalaxy', icon: '🌌', desc: 'A tiny animated galaxy for your fish. The ordinary aquarium stays free.' },
    { id: 'bluefire', name: 'Blue-flame fireplace', price: 100, piece: 'shopbluefire', icon: '🔥', desc: 'The familiar hearth, glowing icy blue.' },
    { id: 'blossom', name: 'Moonlit cherry blossom', price: 80, piece: 'shopblossom', icon: '🌸', desc: 'Pearl-pink blossoms and golden leaves.' },
    { id: 'crown', name: 'Cat crown', price: 40, piece: 'shopcrown', icon: '👑', desc: 'A shelf collectible. Tap it to dress your cats, or drag it onto a cat with Move.' },
    { id: 'petals', name: 'Petal-fall keepsake', price: 60, piece: 'shoppetals', icon: '🌸', desc: 'Place and tap to toggle falling petals across the room.' },
    { id: 'fireflies', name: 'Firefly lantern', price: 90, piece: 'shopfireflies', icon: '✨', desc: 'Place and tap to toggle a dense, gentle firefly drift.' },
    { id: 'starwall', name: 'Constellation wallpaper', price: 140, wall: 'shopstars', icon: '🌠', desc: 'A rare midnight finish. Find it in Paint → Walls.' },
    { id: 'pearlfloor', name: 'Moonstone floor', price: 160, floor: 'shoppearl', icon: '🌙', desc: 'A pearly mosaic. Find it in Paint → Floor.' },
    { id: 'ufo', name: 'Tiny UFO', price: 200, piece: 'shopufo', icon: '🛸', desc: 'A little visitor that hovers above its display stand.' },
    ...extras.catalog,
  ];

  const exclusives=extras.exclusives, allCatalog=[...catalog,...exclusives];
  const finishOf=room=>JSON.stringify([room.wall,room.floor]);
  const isGilded=room=>!!room && room.gild===finishOf(room);
  const clearGild=room=>{delete room.gild;};
  function create({ store, today, notify = () => {}, onPurchase = () => {}, onTip = () => {} }) {
    let balance = store.get('lr.fireflies', null);
    if (balance === null) { balance = 30; store.set('lr.fireflies', balance); }
    if (!Number.isSafeInteger(balance) || balance < 0) balance = 0;
    const owned = new Set(store.get('lr.shopOwned', []));
    function day() {
      const d = store.get('lr.fireflyDay', null);
      return d && d.date === today() ? {...d,watered:Array.isArray(d.watered)?d.watered:[],taskIds:Array.isArray(d.taskIds)?d.taskIds:[]} : { date: today(), earned: 0, watered: [], taskIds:[] };
    }
    function earn(source, plant) {
      const rates = { moment: 5, daily: 15, water: 2, streak: 25, task:3 };
      if (!rates[source]) return 0;
      const d = day();
      if (source === 'water') {
        if (!plant || d.watered.includes(plant)) return 0;
        d.watered.push(plant);
      }
      if(source==='task'){if(typeof plant!=='string'||!plant||d.taskIds.includes(plant))return 0;d.taskIds.push(plant);}
      // The starter purse and seven-day celebration never consume the cozy-play allowance.
      const n = source === 'streak' ? rates[source] : Math.max(0, Math.min(rates[source], 50 - d.earned));
      if (source !== 'streak') d.earned += n;
      store.set('lr.fireflyDay', d);
      if (n) { balance += n; store.set('lr.fireflies', balance); notify(n); }
      return n;
    }
    function buy(id) {
      const item = allCatalog.find(c => c.id === id);
      if (!item || owned.has(id) || balance < item.price) return false;
      balance -= item.price; owned.add(id);
      store.set('lr.fireflies', balance); store.set('lr.shopOwned', [...owned]);
      onPurchase(item);
      return true;
    }
    // A present (from a visitor on the lane): owned like a purchase, but free.
    function gift(id) {
      const item = allCatalog.find(c => c.id === id);
      if (!item || owned.has(id)) return false;
      owned.add(id); store.set('lr.shopOwned', [...owned]); onPurchase(item);
      return true;
    }
    function spend(n) {if(!Number.isSafeInteger(n)||n<=0||balance<n)return false;balance-=n;store.set('lr.fireflies',balance);return true;}
    function tip(n) {if(![5,10,25].includes(n)||!spend(n))return false;onTip(n);return true;}
    function gild(room) {if(!room||isGilded(room)||!spend(150))return false;room.gild=finishOf(room);return true;}
    return { earn, buy, gift, spend, tip, gild, owns: id => owned.has(id), available: C => !C.shop || owned.has(C.shop), get balance() { return balance; }, get earnedToday() { return day().earned; } };
  }

  function register(L) {
    const { def, CAT, grain, WOOD, shade, hash3 } = L;
    L.addGroup('market', 'Night market');
    const variant = (base, id, extra) => {
      const item = catalog.find(c => c.id === id);
      def(item.piece, Object.assign({}, CAT[base], { name: item.name, group: 'market', shop: id }, extra));
    };
    variant('aquarium', 'galaxy', {
      vars: [[0x38264e]], galaxy: true, light: { ...CAT.aquarium.light, color: 0xb898ff },
      build(m, v, s) {
        CAT.aquarium.build(m, v, s);
        m.box(1, 10, 0, 15, 19, 1, 0x241f42);
        [[2, 14], [4, 17], [7, 12], [9, 16], [12, 13], [13, 18]].forEach(([x, y]) => m.set(x, y, 1, 0xf4dcff, s.on));
      },
    });
    variant('fireplace', 'bluefire', {
      vars: [[0x38445c]], fxColor: 0x8bdfff,
      light: { ...CAT.fireplace.light, color: 0x7ad8ff },
      build(m, v, s) {
        CAT.fireplace.build(m, v, s);
        if (s.on) {
          m.box(5, 2, 4, 11, 4, 5, 0x408aff, true).box(6, 3, 3, 10, 5, 4, 0x7ad8ff, true);
          m.box(7, 5, 3, 9, 7, 4, 0xe0f8ff, true).box(6, 4, 4, 7, 6, 5, 0xa0eaff, true);
        }
      },
    });
    variant('sakura', 'blossom', {
      vars: [[0xffdae9]],
      build(m, v, s) { CAT.sakura.build(m, v, s); [[1, 18, 2], [6, 20, 4], [4, 23, 3]].forEach(([x, y, z]) => m.set(x, y, z, 0xffe6a0, true)); },
    });
    const crown = m => {
      m.box(1, 0, 1, 7, 2, 7, 0xd9ad57).clear(2, 0, 2, 6, 2, 6);
      [[1, 1], [6, 1], [1, 6], [6, 6], [3, 6]].forEach(([x, z]) => m.box(x, 2, z, x + 1, 4, z + 1, 0xffd778));
      m.set(3, 1, 7, 0xc898ff, true);
    };
    def('shopcrown', { name: 'Cat crown', kind: 'small', group: 'market', shop: 'crown', size: [1, 1], tap: 'crown', vars: [[]], build: crown });
    for (const id of ['petals', 'fireflies']) {
      const item = catalog.find(c => c.id === id), pink = id === 'petals';
      def(item.piece, {
        name: item.name, kind: 'small', group: 'market', shop: id, size: [1, 1], tap: 'toggle', on: false, roomEffect: id,
        vars: [[pink ? 0xf4bfd8 : 0xf2de94]],
        build(m, [c], s) {
          m.box(1, 0, 1, 7, 2, 7, WOOD.walnut).box(2, 2, 2, 6, 3, 6, 0xd9ad57);
          [[2, 2], [5, 2], [2, 5], [5, 5]].forEach(([x, z]) => m.box(x, 3, z, x + 1, 9, z + 1, c));
          m.box(1, 9, 1, 7, 10, 7, c).box(3, 10, 3, 5, 11, 5, 0xd9ad57);
          m.box(3, 4, 3, 5, 7, 5, s.on ? 0xfff0a0 : shade(c, 0.7), s.on);
        },
      });
    }
    def('shopufo', {
      name: 'Tiny UFO', kind: 'small', group: 'market', shop: 'ufo', size: [1, 1], tap: 'fx', fx: { sparkle: true, sfx: 'chime', say: ['Just visiting this cozy little planet'] }, vars: [[]],
      build(m) {
        m.box(2, 0, 2, 6, 1, 6, 0x42374e).box(3, 1, 3, 5, 3, 5, 0xc7b0e0);
        m.part('float', [4, 4, 4]);
        m.box(0, 4, 1, 8, 5, 7, 0x9c96b8).box(1, 5, 2, 7, 6, 6, 0xd9d0ea).box(2, 6, 2, 6, 8, 6, 0x9ee6e2);
        [1, 3, 5, 7].forEach(x => m.set(x, 4, 7, 0xe1b0ff, true)); m.main();
      },
    });
    def('marketstall', {
      name: 'Firefly night-market stall', kind: 'floor', group: 'market', size: [2, 2], tap: 'shop', vars: [[0x756094]],
      build(m, [c]) {
        m.box(0, 0, 1, 16, 7, 9, grain(WOOD.walnut)).box(0, 7, 0, 16, 8, 10, grain(WOOD.oak));
        [0, 15].forEach(x => m.box(x, 0, 1, x + 1, 20, 2, WOOD.oak));
        m.box(-1, 19, 0, 17, 21, 12, (x) => (x >> 1) % 2 ? c : 0xf1d4b2);
        for (let x = 2; x < 15; x += 3) m.box(x, 17, 3, x + 1, 19, 4, 0xffe39a, true);
        m.box(3, 8, 3, 6, 12, 6, 0x8b718e).set(4, 11, 6, 0xffeea0, true);
        m.box(9, 8, 3, 13, 9, 7, 0xd9ad57).set(10, 9, 5, 0xffd778);
      },
    });
    extras.register(L);
    extras.registerExclusives(L);
    // Kept out of the picker and excluded from room saves by its visitor flag.
    def('merchantcat', {
      name: 'Mallow, the traveling merchant', kind: 'pet', group: 'guest', size: [1, 1], tap: 'shop', vars: [[5]],
      build(m, v, s) {
        CAT.cat.build(m, v, s); m.main();
        m.box(0, 3, 0, 2, 7, 4, 0x756094).box(6, 3, 0, 8, 7, 4, 0x756094);
        m.box(0, 6, 0, 8, 7, 1, 0xd9ad57).set(0, 5, 4, 0xffe39a, true);
        m.box(1, 10, 4, 7, 11, 8, 0xa6b891).box(2, 11, 5, 6, 12, 7, 0xa6b891);
      },
    });
    L.WALLS.shopstars = { label: 'Constellation', shop: 'starwall', fn: (c, u, y) => hash3(u, y, 0, 81) > 0.977 ? 0xffe8ad : ((u + y) % 13 === 0 ? 0x514465 : 0x302a48) };
    L.FLOORS.shoppearl = { label: 'Moonstone', shop: 'pearlfloor', fn: (x, z) => x % 6 === 5 || z % 6 === 5 ? 0xb3a9c4 : shade((Math.floor(x / 6) + Math.floor(z / 6)) % 2 ? 0xe4dbef : 0xc9e0e4, 0.95 + hash3(x, z, 0, 41) * 0.1) };
  }
  const api = { catalog, exclusives, allCatalog, travelingFor:extras.travelingFor, isGilded, clearGild, create, register };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.LRShop = api; register(root.LR); }
})(typeof window !== 'undefined' ? window : globalThis);
