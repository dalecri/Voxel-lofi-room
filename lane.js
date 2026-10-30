// The Lane: your house on a little street with a few permanent places, each with a job.
// Everything recurring is systemic (rotations, seeded days, templated letters), so nothing
// needs writing by hand. Nothing expires and nothing breaks if you're away: shelf items
// cycle back, papers wait quietly, and the "while you were away" note stays gentle.
// State lives under lr.lane and never enters rooms or share codes.
(function (root) {
  'use strict';
  const KEY = 'lr.lane';
  const PLACES = [
    ['house', 'Your house', 'Manage your saved rooms'],
    ['shop', 'Mallow’s Shop', 'Enter the shop · three finds a day'],
    ['mail', 'Mail Room', 'Enter for papers and letters'],
    ['notice', 'Notice Board', 'What’s on this week'],
  ];
  const DAY = 86400000;
  const valid = d => typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d);
  // Whole days between two local date keys, counted at noon so clock changes never wobble it.
  const dayNumber = d => Math.round(new Date(d + 'T12:00').getTime() / DAY);
  const daysBetween = (a, b) => dayNumber(b) - dayNumber(a);
  const weekday = d => new Date(d + 'T12:00').getDay();
  // A fixed, seeded order: the shelf walks through it, so every item comes back on a cycle.
  function seededOrder(list, seed) {
    let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) | 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 100000) / 100000; };
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  // Today's shelf: three regular finds, plus a special on Sundays (a traveling colourway).
  // Only unowned items are stocked; anything you skip returns within a few days.
  function shelf({ catalog, owns = () => false, date }) {
    if (!valid(date)) return { items: [], special: null };
    const unowned = catalog.filter(i => !owns(i.id));
    const regular = seededOrder(unowned.filter(i => !i.exclusive).map(i => i.id).sort(), 'lane-shelf');
    const n = regular.length, start = n ? (dayNumber(date) * 3) % n : 0;
    const items = [];
    for (let k = 0; k < Math.min(3, n); k++) items.push(regular[(start + k) % n]);
    let special = null;
    if (weekday(date) === 0) {
      const rare = seededOrder(unowned.filter(i => i.exclusive).map(i => i.id).sort(), 'lane-special');
      special = rare.length ? rare[Math.floor(dayNumber(date) / 7) % rare.length] : null;
    }
    return { items, special };
  }
  // How long until a skipped item is back on the shelf (in days).
  const cycleDays = ({ catalog, owns = () => false }) => Math.max(1, Math.ceil(catalog.filter(i => !owns(i.id) && !i.exclusive).length / 3));
  // A capped, kind note when you come back after two days or more. Never a pile to clear.
  function away({ lastVisit, today, unreadPapers = 0 }) {
    if (!valid(lastVisit) || !valid(today)) return null;
    const days = daysBetween(lastVisit, today);
    if (days < 2) return null;
    const when = days > 14 ? 'a little while' : `${days} days`;
    const papers = unreadPapers > 0 ? (unreadPapers === 1 ? ' One paper is waiting in the Mail Room.' : unreadPapers > 6 ? ' A few papers are waiting in the Mail Room, no rush.' : ` ${unreadPapers} papers are waiting in the Mail Room.`) : '';
    return `Welcome back! You were away ${when}. Mallow restocked his shelf while you were gone.${papers}`;
  }
  // Templated letters from the lane. Each has a stable id, so read marks stick.
  function letters({ firstVisit, today, specialName = null }) {
    if (!valid(firstVisit) || !valid(today)) return [];
    const out = [{ id: 'welcome', date: firstVisit, from: 'Mallow', subject: 'Welcome to the lane',
      body: 'Hello, neighbour! I keep the little shop two doors down. Three new finds on the shelf every day, and something rare on Sundays. Nothing ever goes for good: if you miss a thing, it comes back around.\n\nFireflies come from the cozy things you already do. Pop by whenever you like.\n\nMallow' }];
    // The most recent Sunday since you arrived brings a short note about the special.
    const back = weekday(today), sunday = new Date(new Date(today + 'T12:00').getTime() - back * DAY);
    const sundayKey = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
    if (sundayKey >= firstVisit && sundayKey !== firstVisit) out.push({ id: 'sunday-' + sundayKey, date: sundayKey, from: 'Mallow', subject: 'This Sunday on the lane',
      body: (specialName ? `Sunday’s special came in: the ${specialName}. It’s only on the shelf today, but it comes back on another Sunday if today isn’t the day.` : 'No special this Sunday: you’ve collected every rare find I carry. Tea’s on me.') + '\n\nThe week ahead is pinned on the Notice Board.\n\nMallow' });
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }
  // The Notice Board: tomorrow, then the rest of the week. Days with nothing on are skipped.
  function notices({ today, events = [], holidays = [], seasonal = () => [] }) {
    if (!valid(today)) return [];
    const rows = [];
    for (let k = 0; k < 7; k++) {
      const d = new Date(new Date(today + 'T12:00').getTime() + k * DAY);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const items = [...events.filter(e => e.date === key).map(e => ({ kind: BIRTHDAY.test(e.title || '') ? 'birthday' : 'event', title: (BIRTHDAY.test(e.title || '') ? '🎂 ' : '') + e.title })),
        ...holidays.filter(h => h.date === key).map(h => ({ kind: 'holiday', title: h.name || h.title || 'Holiday' })),
        ...seasonal(key).map(s => ({ kind: 'season', title: typeof s === 'string' ? s : s.label || s.title || '' }))].filter(i => i.title);
      if (items.length) rows.push({ date: key, label: k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' }), items });
    }
    return rows;
  }
  // Days to the next solstice or equinox: true everywhere on Earth, so no hemisphere guess.
  function skyNote(today) {
    if (!valid(today)) return '';
    const y = +today.slice(0, 4), marks = [[2, 20, 'the March equinox'], [5, 21, 'the June solstice'], [8, 22, 'the September equinox'], [11, 21, 'the December solstice']];
    for (const yy of [y, y + 1]) for (const [m, d, name] of marks) {
      const key = `${yy}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, n = daysBetween(today, key);
      if (n >= 0) return n === 0 ? `Today is ${name}.` : `${n} day${n === 1 ? '' : 's'} until ${name}.`;
    }
    return '';
  }
  function create({ store, today }) {
    const read = () => { const s = store.get(KEY, {}) || {}; return { firstVisit: valid(s.firstVisit) ? s.firstVisit : '', lastVisit: valid(s.lastVisit) ? s.lastVisit : '', read: Array.isArray(s.read) ? s.read.filter(x => typeof x === 'string').slice(-200) : [], talks: cleanTalks(s.talks), day: s.day && valid(s.day.date) ? { date: s.day.date, found: Array.isArray(s.day.found) ? s.day.found.filter(x => typeof x === 'string').slice(0, 8) : [], carrying: typeof s.day.carrying === 'string' ? s.day.carrying : null } : null, kept: Array.isArray(s.kept) ? s.kept.filter(x => typeof x === 'string' && valid(x.slice(0, 10))).slice(-60) : [], town: cleanTown(s.town), closed: valid(s.closed) ? s.closed : null }; };
    const save = s => store.set(KEY, s);
    return {
      // Called when the lane is shown: returns the away note (once) and records the visit.
      visit(unreadPapers = 0) {
        const s = read(), t = today(), note = away({ lastVisit: s.lastVisit, today: t, unreadPapers });
        if (!s.firstVisit) s.firstVisit = t;
        if (s.lastVisit !== t) { s.lastVisit = t; save(s); }
        return note;
      },
      get firstVisit() { return read().firstVisit || today(); },
      isRead: id => read().read.includes(id),
      markRead(id) { const s = read(); if (!s.read.includes(id)) { s.read.push(id); save(s); } },
      // Private, bounded conversation memory; never included in shared room data.
      memory: id => read().talks[id] || null,
      // Today's little discoveries: what you've found, and the parcel you're carrying (if any).
      // A new day starts fresh; a parcel nobody received is quietly returned by the post.
      today() { const s = read(), t = today(); return s.day && s.day.date === t ? s.day : { date: t, found: [], carrying: null }; },
      found(id) { const s = read(), d = this.today(); if (!d.found.includes(id)) d.found.push(id); if (d.carrying === id) d.carrying = null; s.day = d; if (/:letter$/.test(id) && !s.kept.includes(id)) s.kept.push(id); save(s); },
      carry(id) { const s = read(), d = this.today(); d.carrying = id; s.day = d; save(s); },
      get kept() { return read().kept; },
      // The street's slow projects: garden beds, the bench, the courtyard.
      get town() { return read().town; },
      setTown(town) { const s = read(); s.town = cleanTown(town); save(s); },
      // The evening wind-down: only remembers that today's has happened, so the invitation isn't repeated.
      get closedToday() { return read().closed === today(); },
      close() { const s = read(); s.closed = today(); save(s); },
      remember(id, rec) {
        if(!NEIGHBORS[id]||!rec||!answer(id,rec.topic,rec.reply,rec.date))return;
        const s=read(), previous=s.talks[id];
        if(previous&&rec.date<=previous.date)return; // repeated clicks and clock rollback cannot farm warmth
        const topic=NEIGHBORS[id].topics.find(t=>t.id===rec.topic), warmth=previous?.warmth||0;
        if((topic.warmth||0)>warmth)return;
        if(topic.story&&topic.step!==(previous?.stories[topic.story]??-1)+1)return;
        const stories={...previous?.stories};if(topic.story)stories[topic.story]=topic.step;
        s.talks[id]=cleanMemory(id,{date:rec.date,topic:rec.topic,reply:rec.reply,warmth:Math.min(365,warmth+1),history:previous?.history||[],stories});save(s);
      },
    };
  }

  // ---------- Neighbours: routines, growing familiarity, and ongoing stories ----------
  // Routines follow the time of day and the weather, nothing else, so they're the same for
  // everyone on the same day. Conversation choices and warmth stay personal to this save.
  const NEIGHBORS = {
    mallow: { name: 'Mallow', coat: 0xe8a050, role: 'Shopkeeper', about: 'Warm, a little theatrical about his stock, always halfway through a story about where something came from.',
      hello: 'Ah, a customer! Or a friend. Both, ideally.', missed: 'There you are! The shelf has turned over twice without you.', again: 'Back already? I’m still thinking about what you said.',
      topics: [
        { id: 'teapot', ask: 'A crate of teapots came in, and one of them hums when you pour. Keep it, or send it back?', replies: [
          ['Keep it, it has character', 'That’s what I said! It stays.', 'That humming teapot? Sold it this morning to someone who hums back. You were right.'],
          ['Send it back', 'Sensible. A little boring, but sensible.', 'I sent the humming teapot back like you said. I miss it a bit, if I’m honest.']] },
        { id: 'sign', ask: 'I’m repainting the sign. Coral again, or something bolder?', replies: [
          ['Coral, always', 'Coral it is. The street wouldn’t recognise me otherwise.', 'Coral it stayed. The street looks like itself, thanks to you.'],
          ['Something bolder', 'Bolder! Oh, you’re trouble. I like it.', 'I tried bolder on a scrap of wood. Too bold. Coral won, but thank you for pushing me.']] },
        { id: 'stories', ask: 'People ask where my finds come from. Should I tell the true stories, or the better ones?', replies: [
          ['The true ones', 'Honest Mallow. It has a ring to it.', 'I told a true story yesterday, like you said. The lamp came from a car boot sale. They loved it anyway.'],
          ['The better ones', 'A merchant after my own heart.', 'Yesterday a rug “flew in from a mountain monastery”. You’re a bad influence. Thank you.']] },
        { id: 'early', ask: 'Do you think a shop should open early, or whenever the shopkeeper wakes up?', replies: [
          ['Early, with the sun', 'Up with the sun, then. Ugh. Fine.', 'I opened early, like you said. Nobody came for an hour, but the light on the shelf was lovely.'],
          ['Whenever you wake up', 'Finally, someone who understands.', 'I slept in, on your advice. Best morning I’ve had all month.']] },
      ] },
    juniper: { name: 'Juniper', coat: 0x9a8a78, role: 'The reader', about: 'Quiet and dry. Reads anything, everywhere, and lends books whether you asked or not.',
      hello: 'Oh. Hello. I’m Juniper. I’ll be reading, mostly.', missed: 'You’ve been away. I read three books about it.', again: 'Twice in one day. People will talk.',
      topics: [
        { id: 'pick', ask: 'I’m torn between a mystery and a book about moss. Which one?', replies: [
          ['The mystery', 'Mystery. Good. I’ll pretend I didn’t guess the ending.', 'I finished the mystery you picked. It was the cat. It’s always the cat.'],
          ['The moss book', 'Moss. Bold choice. Correct choice.', 'The moss book was wonderful. I’ll never walk past a step the same way.']] },
        { id: 'lend', ask: 'I could lend you something. Short, or long?', replies: [
          ['Something short', 'Short. I’ll find you something you can finish in one cup of tea.', 'I found you a short one, like you asked. Poems, mostly about weather. It’s on the notice board.'],
          ['Something long', 'Long. You’re braver than you look.', 'I picked out a long one for you. Eight hundred pages. No pressure. Some pressure.']] },
        { id: 'quiet', ask: 'Do you read with music on, or in silence?', replies: [
          ['With music', 'Hm. I tried that once. I read the same page eleven times.', 'I tried reading with music, because you do. Lofi, like your radio. It was… actually nice.'],
          ['In silence', 'Correct. We understand each other.', 'I thought about what you said, about silence. It’s why I sit out here. Even the street is quiet in the afternoon.']] },
        { id: 'ending', ask: 'Do you peek at the last page first?', replies: [
          ['Always', 'Monster. Fascinating monster.', 'I peeked at the last page yesterday, because of you. I feel terrible. It was great.'],
          ['Never', 'Good. Some of us still have principles.', 'Never peek, you said. I didn’t. The ending got me, properly. Thank you.']] },
      ] },
    puddle: { name: 'Puddle', coat: 0x7d8590, role: 'Comes with the rain', about: 'A shy grey stray who only turns up when it rains, and shelters under Mallow’s awning.',
      hello: 'Oh! You can see me. Most people walk faster in the rain.', missed: 'It hasn’t rained in a while. I was hoping you’d still be here.', again: 'Still raining. Still here. Still you.',
      topics: [
        { id: 'rain', ask: 'Do you like the rain, or do you just put up with it?', replies: [
          ['I love it', 'Me too. It makes the whole street smell like a garden.', 'Last time you said you love the rain. I thought about it all the way home.'],
          ['I put up with it', 'That’s fair. I’ll try to bring the gentle kind.', 'You said you put up with the rain, so I brought the soft kind today. Did you notice?']] },
        { id: 'awning', ask: 'Mallow says he doesn’t mind me under here. Do you think he means it?', replies: [
          ['He’s glad you’re here', 'You think so? I’ll stay a bit longer, then.', 'I stayed under the awning longer, like you said. Mallow brought me a saucer of milk. I think you were right.'],
          ['You could ask him', 'Ask him? Out loud? …Maybe next time.', 'I asked Mallow, like you said. He said the awning was built for me. I don’t think that’s true, but I liked it.']] },
        { id: 'name', ask: 'Puddle isn’t my real name. I like it better, though. Do you?', replies: [
          ['It suits you', 'It does, doesn’t it. Small and shiny.', 'You said Puddle suits me. I’ve been saying it to myself. Puddle. Yes.'],
          ['What’s the real one?', 'It’s… a secret. Ask me on a sunny day.', 'You asked my real name. It’s still raining, so it’s still a secret. Sorry. Nearly.']] },
      ] },
  };
  // Authored conversations stay local; warmth opens more personal subjects, never rewards or chores.
  const MORE_TALKS = {
    mallow: [
      ['bell','The doorbell sounds very grand for a shop this small. Shall I soften it?', 'Keep the fanfare','Every entrance a premiere. Excellent.','I kept the grand bell. Even the post feels important now.', 'Make it gentle','A little welcome, then.','I wrapped the clapper in felt. The shop says hello instead of announcing it.'],
      ['ribbon','I have one last length of ribbon. Wrap a parcel, or decorate the till?', 'The parcel','A good farewell for a good ribbon.','That ribbon went home on a parcel. I hope they kept it.', 'The till','Even tills deserve occasion.','The till is wearing a bow. Business remains exactly the same, but prettier.'],
      ['chipped','This cup has a chipped handle. Pencil pot or tiny planter?', 'Pencil pot','A second career in stationery.','The chipped cup now holds pencils. It looks rather qualified.', 'Tiny planter','I’ll find it something leafy.','There’s a cutting in the chipped cup now. New growth, old handle.'],
      ['labels','Should price labels be very neat or a little handwritten?', 'Very neat','Dignity through legibility.','I made the labels neat. Someone complimented the seven.', 'Handwritten','You’ll know a paw was involved.','The labels are handwritten now. One looks like a dancing chair.'],
      ['biscuit','One biscuit left. Save it for closing, or have it with this tea?', 'Save it','A small appointment with happiness.','I saved that biscuit for closing. Nearly forgot it. A lovely surprise.', 'Have it now','Your decisiveness is inspiring.','I had the biscuit warm with tea. Crumbs on the ledger. Worth it.'],
      ['window','What belongs in my window: one wonderful object or a friendly jumble?', 'One wonderful object','A spotlight! I can do that.','One vase had the window to itself. People stopped to look.', 'A friendly jumble','Ah, the professional term for my method.','I made a jumble in the window. Somehow everything looked more at home.'],
      ['receipt','Someone left a drawing on a receipt. Pin it up or tuck it safely away?', 'Pin it up','An exhibition with an unusually small budget.','The receipt drawing is pinned up. The artist came back and smiled.', 'Keep it safe','Into my important-paper tin.','The drawing is in my tin. Between a warranty and a very good leaf.'],
      ['slow','It’s quiet in here. Rearrange the shelf or enjoy the quiet?', 'Rearrange it','A fresh view for the same old treasures.','I moved three things on the shelf. The whole shop feels different.', 'Enjoy it','Permission to lean on the counter accepted.','I left the shelf alone and listened to the clock. A respectable use of an hour.'],
      ['first-sale','My first sale was a crooked stool. Want the proud bit or the embarrassing bit?', 'The proud bit','They still use it. Twenty years of sitting.','I thought of that first stool again. Useful is a lovely thing to be.', 'The embarrassing bit','I charged for a table. Ran all the way down the lane with their change.','Telling you about my first sale made it less embarrassing. A little.',7],
      ['empty-shop','Sometimes I worry people only visit for the stock. Would an empty shop still be worth visiting?', 'I’d come for a chat','Oh. Well. I shall put the kettle on.','I remembered you’d come just for a chat. The quiet hours feel different.', 'You make it a shop','That is dangerously kind of you.','You said I make it a shop. I’ve been polishing the counter rather fondly.',14],
      ['old-apron','This apron belonged to my aunt. Patch it again or give it a rest?', 'Another patch','Then there’s room for one more story.','I patched my aunt’s apron. The stitches are mine; the pocket is still hers.', 'Let it rest','I could hang it where I can see it.','The old apron hangs by the kettle. Retirement with excellent company.',21],
      ['spare-cup','I keep a second cup near the kettle now. Shall it be the blue one or the speckled one?', 'The blue one','Blue it is. Your usual, whenever you come by.','Your blue cup is by the kettle. No appointment needed.', 'The speckled one','A fine choice. I’ll leave it within reach.','The speckled cup is waiting by the kettle. It looks right there.',28],
    ],
    juniper: [
      ['bookmark','A leaf or a proper bookmark for this chapter?', 'A leaf','Temporary, like most things.','The leaf dried flat between the pages. It kept its place very well.', 'A proper bookmark','Civilisation survives another day.','The bookmark has stayed put. A quiet professional.'],
      ['margins','Someone wrote a tiny argument in this margin. Reply in pencil or leave them to it?', 'Reply in pencil','A correspondence across decades.','I replied in pencil. The author of the margin remains stubbornly silent.', 'Leave them to it','An argument won by absence.','I left the margin alone. Their exclamation marks have enough company.'],
      ['map','This book has a map. Study it first or get lost for a while?', 'Study it','Prepared wandering. Sensible.','I studied the map first. Still got lost. A well-designed book.', 'Get lost','My preferred form of travel.','I ignored the map and found a village I wasn’t expecting.'],
      ['poem','Would you rather read a poem twice or two poems once?', 'One poem twice','A second cup from the same pot.','I read the poem twice. The second time it was about something else.', 'Two poems once','Let them introduce themselves.','Two poems. One stayed with me; one wandered off. Fair enough.'],
      ['weather-book','A book set in winter: better in winter or on a hot afternoon?', 'In winter','Weather with footnotes.','I saved the winter book for a cold day. It felt like an extra window.', 'On a hot afternoon','Portable shade.','I opened the winter book in the warm light. Instant imaginary snow.'],
      ['title','Can a good title rescue a dull book?', 'Give it a chance','Three chapters. I have limits.','I gave the good title three chapters. It was carrying the entire book.', 'Probably not','A stern but fair librarian.','I put the dull book back. Admired its title from a distance.'],
      ['read-aloud','This sentence is excellent. Read it aloud or keep it to myself?', 'Read it aloud','Listen carefully. There are several commas.','I read the sentence to a passing beetle. Attentive audience.', 'Keep it','A small private possession.','I kept that sentence to myself. It still sounds good in here.'],
      ['unfinished','An unfinished book: failure or invitation?', 'An invitation','There’s a generous interpretation.','I left the unfinished book within reach. An invitation, as you said.', 'Just not your book','Permission to stop. Underrated.','I returned the unfinished book. Someone else can have the ending.'],
      ['writing','I’ve written a paragraph of my own. Is that a beginning or just a paragraph?', 'A beginning','That sounds alarmingly possible.','I wrote another paragraph. Apparently it was a beginning.', 'A good paragraph is enough','A manageable ambition. Thank you.','I let my paragraph be one good paragraph. It no longer feels small.',7],
      ['company','I used to choose this spot because nobody stopped here. Mind if that changes?', 'I’ll stop by','I’ll move my bag.','I left the space beside me clear. In case you stopped by.', 'Quiet company is good','The best kind, sometimes.','The quiet feels less empty with company. You were right.',14],
      ['dedication','A dedication for my notebook: to the lane or to the people in it?', 'To the lane','A place can hold a great deal.','I wrote “For this little lane.” That includes you, obviously.', 'To the people','Names make it rather real.','I started the dedication with the people here. Yours was easy to remember.',21],
      ['read-draft','You’re the first person I’ve offered my writing to. Honest notes or just read together?', 'Honest notes','Kind and honest can share a chair.','I kept your advice in mind while rewriting. The page is better company now.', 'Read together','Yes. That sounds less frightening.','Reading together made my own words feel new. Thank you for staying.',28],
    ],
    puddle: [
      ['drops','Do raindrops sound more like footsteps or applause to you?', 'Footsteps','Tiny visitors. So many of them.','I listened for footsteps in the rain. The roof had a busy afternoon.', 'Applause','For the clouds? They worked hard.','The rain sounded like applause after you said that. I took a little bow.'],
      ['reflection','A puddle has the whole sky in it. Look at the clouds or make ripples?', 'Look at the clouds','A very small sky with very big clouds.','I watched a cloud in a puddle until it sailed out of view.', 'Make ripples','Carefully. I don’t want to spill the moon.','I made one ripple. The whole sky wobbled.'],
      ['boots','Yellow boots or green boots, if you could pick?', 'Yellow','Little pieces of sunshine for your feet.','I saw yellow boots go past and thought of your sunshine feet.', 'Green','So you can stand quietly with the plants.','Someone wore green boots past the awning. Almost a walking garden.'],
      ['scent','After the rain, do you notice the earth or the leaves first?', 'The earth','Like someone opened a fresh pot.','I noticed the earth first this time. You helped me find that smell.', 'The leaves','They smell awake, don’t they?','I stood near the leaves after the rain. Awake was the right word.'],
      ['cloud-shape','That cloud looks like a boat. Where should it go?', 'Somewhere warm','I hope it remembers the way back.','Our boat-cloud sailed off. I imagined it finding a warm window.', 'Stay over the lane','We could tie it to the chimney.','A boat-shaped cloud came back. Perhaps it likes the lane too.'],
      ['drizzle','Is drizzle proper rain or just the sky thinking about it?', 'Proper rain','Small things still count.','I decided the drizzle counted. I stayed out to enjoy it.', 'The sky is thinking','It takes its time. I like that.','The sky thought about raining for ages. No rush, I told it.'],
      ['stone','I found a smooth stone. Pocket treasure or leave it by the tree?', 'Pocket treasure','Something steady to carry.','The stone fits my paw. A very small anchor.', 'By the tree','Maybe someone else will notice it.','I left the stone by the tree. Someone put a leaf beside it.'],
      ['shelter-song','The gutter makes three notes. Should I hum along?', 'Try it','Only quietly. For now.','I hummed with the gutter. We weren’t quite in tune. I didn’t mind.', 'Just listen','Listening can be joining in.','I listened to the gutter for a while. It knows more than three notes.'],
      ['dry-place','I know a dry place under the stairs. Bring a blanket or a picture?', 'A blanket','Warmth first. Sensible kindness.','I took a blanket to the stairs. It’s beginning to feel like a place to stay.', 'A picture','Something to look at when the rain stops.','There’s a picture by my dry spot now. It makes the wall feel less lonely.',7],
      ['welcome','Would it be strange if I came to say hello before finding shelter?', 'I’d like that','Hello first, then. I can practise.','I thought “hello” before I thought “somewhere dry.” That’s new.', 'You’re always welcome','Even when I’m dripping? Thank you.','I remembered I was welcome. Even with wet paws.',14],
      ['real-name','I think I can tell you now. My old name was Pip. May I still be Puddle here?', 'Of course, Puddle','Oh, good. I like who I am here.','You know both my names now. Puddle still feels like home.', 'Both names are yours','I hadn’t thought of keeping both.','Pip and Puddle. I can carry both, like you said.',21],
      ['stay','I used to wait for the rain to bring me here. Could I belong even when it’s dry?', 'Of course you belong','I might believe that. A little more each time.','I thought about belonging on a dry day. It felt warm.', 'We’d save you a spot','A spot. For me. I’ll remember that.','I remembered you’d save me a spot. All the way here.',28],
    ],
  };
  for(const [id,rows] of Object.entries(MORE_TALKS)) for(const [key,ask,a,replyA,recallA,b,replyB,recallB,warmth=0] of rows)
    NEIGHBORS[id].topics.push({id:key,ask,replies:[[a,replyA,recallA],[b,replyB,recallB]],warmth});

  // Three conversations on separate visit days. Missing days never skips a chapter.
  const STORIES = {
    mallow: { id:'music-box', title:'The quiet music box', steps:[
      ['A music box arrived without a tune. Shall I look inside or ask who owned it?', 'Look inside','A careful screwdriver adventure.','I opened the box. A folded note was holding the comb still.', 'Ask around','A mystery with customer service.','The previous owner sent me a note explaining the silent box.'],
      ['The note says the tune was meant as a gift, but never finished. Shall we finish it or keep the little silence?', 'Finish the tune','I know someone with very patient paws.','We found the missing notes. It plays slowly, as if remembering.', 'Keep the silence','A place to put a thought. I understand.','I cleaned the box and kept it quiet. The mechanism still turns.'],
      ['The box is ready. Put it in the window or beside the kettle?', 'In the window','I’ll tell people we worked it out together.','The music box has its own place in the window. Our little project.', 'By the kettle','Then it can keep our cups company.','The music box lives beside the kettle now. I think of our project when I see it.'],
    ]},
    juniper: { id:'loose-page', title:'A page without a book', steps:[
      ['A loose page blew into my book. No title. Should we follow the handwriting or the little drawing?', 'The handwriting','A detective must begin somewhere.','The handwriting belonged to the old postkeeper, according to Mallow.', 'The drawing','A tree with an unusually smug bird. Noted.','The drawing matches the tree outside the old postkeeper’s window.'],
      ['It’s a list of things the postkeeper wanted to notice. Shall we try the first one or add our own?', 'Try the first one','“A light left on for somebody.” We can find that.','I found a light left on in Mallow’s window. The list was right.', 'Add our own','“The sound of turning a page.” There.','I added our sound to the list. Then I heard it everywhere.'],
      ['I’ve copied the list safely. Return the page to the Mail Room or pin up a copy for everyone?', 'Return the page','Back where its story began.','The page is safe with the post. I kept our copy in my notebook.', 'Share a copy','An invitation to pay attention.','I made a copy for the neighbours. Someone added “rain on the awning.”'],
    ]},
    puddle: { id:'rain-garden', title:'A small rain garden', steps:[
      ['A seed is caught beside the drain. Shall we put it in a cup or beside the wall?', 'In a cup','I can keep an eye on something that small.','I put the seed in a chipped cup Mallow gave me.', 'Beside the wall','Somewhere the wind can’t push it about.','I tucked the seed into the sheltered earth by the wall.'],
      ['There’s a little green tip. Give it a name or wait to see what it becomes?', 'Give it a name','Brave. That can be its name.','Brave has two leaves now. A lot to live up to for two leaves.', 'Wait and see','It can introduce itself.','It has two leaves now. Still keeping its identity to itself.'],
      ['The little plant is standing on its own. Shall I draw it or tell Mallow?', 'Draw it','So I remember how small it started.','I drew the little plant. My drawing is bigger than the real thing.', 'Tell Mallow','He’ll pretend not to be excited. He’s bad at that.','Mallow came to see the plant. He brought a whole watering can for two leaves.'],
    ]},
  };
  for(const [id,story] of Object.entries(STORIES)) story.steps.forEach(([ask,a,ra,ma,b,rb,mb],step)=>
    NEIGHBORS[id].topics.push({id:`${story.id}:${step}`,ask,replies:[[a,ra,ma],[b,rb,mb]],story:story.id,step,warmth:3}));

  const WET = w => ['rain', 'storm', 'snow'].includes(w);

  // ---------- Little discoveries: two or three a day, seeded by the date ----------
  // A letter from a neighbour, a flower on the green, a parcel left at the wrong door, and now and
  // then a visitor passing through with a piece of furniture that needs a home. Nothing is lost if
  // you miss a day: letters you open are kept in the Mail Room, and tomorrow brings new things.
  const LANE_LETTERS = [
    { from: 'Juniper', subject: 'A pressed leaf', body: 'I found a pressed leaf in a library book, right at the best chapter. Somebody marked their place with autumn. I’m leaving it in this envelope so you can mark yours.\n\nJuniper' },
    { from: 'Mallow', subject: 'Inventory, sort of', body: 'Dear neighbour,\n\nI counted the shelf this morning and got a different number twice. I’ve decided the shop is slightly bigger on the inside. Come and check my maths sometime.\n\nYour shopkeeper, Mallow' },
    { from: 'Puddle', subject: 'From under the awning', body: 'It rained on my side of town last night and I thought of the lane. The lamps here look like little moons in the puddles. I hope it rains near you soon. (Not too much.)\n\nPuddle' },
    { from: 'A neighbour', subject: 'Your window', body: 'To whoever lives in the cottage: thank you for the light in your window. I walk home late, and it’s the warmest thing on the street.\n\nA neighbour' },
    { from: 'Juniper', subject: 'A short one', body: 'Here is the whole of a poem I liked:\n\n“The kettle knows\nbefore I do\nthat it is time.”\n\nThat’s it. That’s the poem. Short ones count.\n\nJuniper' },
    { from: 'Mallow', subject: 'A small confession', body: 'I talk to the teapots when the shop is quiet. They are excellent listeners. I thought you should know, in case you hear me through the door.\n\nMallow' },
    { from: 'The Mail Room', subject: 'Postmark: somewhere warm', body: 'This postcard has travelled a long way and lost its sender on the journey. On the front: a sunny harbour. On the back, just one line: “Wish you were here.” We think it means you.' },
    { from: 'Puddle', subject: 'A sunny day', body: 'It was sunny today so I didn’t come by. I wanted you to know I wasn’t ignoring you. I was being dry somewhere. Back with the next rain.\n\nPuddle' },
  ];
  const BLOOMS = { spring: ['crocus', 'Crocuses'], summer: ['sunflower', 'A sunflower'], autumn: ['aster', 'Asters'], winter: ['snowdrop', 'Snowdrops'] };
  const BLOOM_SPOTS = [[4, 9], [5, 10], [6, 12], [0, 12], [7, 11]], BLOOM_WHERE = ['by the bench', 'near the garden', 'at the edge of the green', 'under the big tree', 'by the path'];
  const VISITORS = [
    { name: 'Bramble', coat: 0x8a6a4a, who: 'a tinker passing through', says: 'Mended this on the road and I’ve no room left in the cart. Would you give it a home?' },
    { name: 'Odile', coat: 0xe8e2d8, who: 'a traveller from the coast', says: 'I’m moving somewhere smaller, and this deserves a proper room. Yours, if you’d like it.' },
    { name: 'Fennel', coat: 0x3a3438, who: 'a removals driver with one thing left over', says: 'Everything got delivered except this. The paperwork says “the lane”. That’s you, I reckon.' },
    { name: 'Sorrel', coat: 0xd88a3a, who: 'Mallow’s cousin, heading north', says: 'Mallow said you’d appreciate something a bit unusual. Don’t tell him I gave it away for free.' },
  ];
  const PARCELS = [['Fragile: books', 'juniper'], ['This way up (probably)', 'mallow'], ['Smells faintly of tea', 'mallow'], ['Do not bend: pressed flowers', 'juniper'], ['Handle with care: one teapot', 'mallow']];
  function seasonOf(date, south = false) { const m = +date.slice(5, 7), k = [3, 4, 5].includes(m) ? 'spring' : [6, 7, 8].includes(m) ? 'summer' : [9, 10, 11].includes(m) ? 'autumn' : 'winter'; return south ? { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }[k] : k; }
  // gifts: every catalogue id a visitor could bring (owned or not, so the day stays stable);
  // giftFor() then picks the first one you don't own yet, starting from the day's seeded spot.
  function discoveries({ date, gifts = [], south = false }) {
    if (!valid(date)) return [];
    const rnd = seeded(date + '|finds'), count = rnd() < 0.4 ? 3 : 2;
    const kinds = seededOrder(['letter', 'bloom', 'parcel'], date + '|kinds').slice(0, count);
    if (gifts.length && dayNumber(date) % 3 === 0 && rnd() < 0.6) kinds[kinds.length - 1] = 'visitor';   // a visitor is a treat, about one day in five
    return kinds.map(kind => {
      const id = date + ':' + kind;
      if (kind === 'letter') { const l = LANE_LETTERS[Math.floor(rnd() * LANE_LETTERS.length)]; return { id, kind, at: [4, 2], piece: 'laneletter', ...l, title: `A letter from ${l.from}` }; }
      if (kind === 'bloom') { const k = Math.floor(rnd() * BLOOM_SPOTS.length), [flower, label] = BLOOMS[seasonOf(date, south)]; return { id, kind, at: BLOOM_SPOTS[k], piece: 'lanebloom', c: Object.keys(BLOOMS).indexOf(seasonOf(date, south)), flower, title: `${label} came up ${BLOOM_WHERE[k]}` }; }
      if (kind === 'parcel') { const [label, to] = PARCELS[Math.floor(rnd() * PARCELS.length)]; return { id, kind, at: [6, 3], piece: 'laneparcel', label, to, title: `A parcel for ${NEIGHBORS[to].name}`, }; }
      const v = VISITORS[Math.floor(rnd() * VISITORS.length)];
      return { id, kind, at: [7, 9], piece: 'lanevisitor', c: VISITORS.indexOf(v), gifts, giftAt: Math.floor(rnd() * gifts.length), ...v, title: `${v.name}, ${v.who}` };
    });
  }
  function giftFor(d, owns = () => false) {
    const list = d?.gifts || [];
    for (let k = 0; k < list.length; k++) { const id = list[(d.giftAt + k) % list.length]; if (!owns(id)) return id; }
    return null;   // you own everything: the visitor brings a jar of fireflies instead
  }
  // ---------- Slow projects: the street changes a little, day by day ----------
  // One step a day per project, never a deadline: beds grow on the days they're watered (rain
  // counts), the bench is mended over three visits, and the courtyard gets one new piece a day,
  // chosen by you. Everything stays once it's done, so the street slowly becomes yours.
  const PLANTS = {
    sunflower: { name: 'Sunflowers', seed: '🌻', c: 0 }, lavender: { name: 'Lavender', seed: '💜', c: 1 },
    strawberry: { name: 'Strawberries', seed: '🍓', c: 2 }, pumpkin: { name: 'A pumpkin', seed: '🎃', c: 3 },
  };
  const GROW = ['Just planted', 'Sprouting', 'Leafing out', 'Budding', 'In full bloom'], GROWN = 4, BEDS = [[1, 10], [2, 10], [3, 10]];
  const BENCH_STEPS = [
    { label: 'Fit new slats', did: 'You fitted new slats. Juniper held the planks (and read between nails).' },
    { label: 'Sand it smooth', did: 'Sanded smooth. It’s ready for paint.' },
    { label: 'Paint it', did: 'A fresh coat of paint. The bench is mended!' },
  ];
  const BENCH_COLORS = [['sage', 'Sage'], ['coral', 'Coral'], ['blue', 'Harbour blue']];
  const BENCH_STATE = ['Broken, with two slats missing', 'New slats, still rough', 'Sanded and ready for paint', 'Mended and freshly painted'];
  // Each courtyard step offers two pieces; the one you pick stays.
  const COURT = [
    { label: 'A table', options: [{ name: 'An oilcloth table', items: [['mxmesa', 10, 9]] }, { name: 'A carved tea table', items: [['riad-table', 10, 9]] }] },
    { label: 'Somewhere to sit', options: [{ name: 'Bentwood chairs', items: [['barbistrochair', 9, 9, 1], ['barbistrochair', 12, 10, 3]] }, { name: 'Woven equipal chairs', items: [['mxequipal', 9, 9, 1], ['mxequipal', 12, 10, 3]] }] },
    { label: 'Lights for the evening', options: [{ name: 'Stone lanterns', items: [['toro', 13, 8], ['toro', 9, 11]] }, { name: 'Hanging lanterns', items: [['tsuridoro', 13, 8], ['tsuridoro', 9, 11]] }] },
    { label: 'Something green', options: [{ name: 'Talavera planters', items: [['tavplanter', 9, 12], ['tavplanter', 13, 12]] }, { name: 'Pedestal planters', items: [['retro70s-planter', 9, 12], ['retro70s-planter', 13, 12]] }] },
    { label: 'A centrepiece', options: [{ name: 'A statue fountain', items: [['eufountain', 11, 11]] }, { name: 'A plaza fountain', items: [['mxfountain', 11, 11]] }] },
  ];
  const emptyTown = () => ({ beds: BEDS.map(() => null), bench: { stage: 0, color: null, last: null }, court: { picks: [], last: null } });
  function cleanTown(t) {
    const out = emptyTown(); if (!t || typeof t !== 'object') return out;
    if (Array.isArray(t.beds)) out.beds = BEDS.map((_, i) => { const b = t.beds[i]; return b && PLANTS[b.plant] && valid(b.planted) ? { plant: b.plant, planted: b.planted, water: Array.isArray(b.water) ? [...new Set(b.water.filter(valid))].sort().slice(-GROWN) : [] } : null; });
    if (t.bench && typeof t.bench === 'object') out.bench = { stage: Math.max(0, Math.min(3, Number.isInteger(t.bench.stage) ? t.bench.stage : 0)), color: BENCH_COLORS.some(c => c[0] === t.bench.color) ? t.bench.color : null, last: valid(t.bench.last) ? t.bench.last : null };
    if (out.bench.stage === 3 && !out.bench.color) out.bench.color = 'sage';
    if (t.court && Array.isArray(t.court.picks)) out.court = { picks: t.court.picks.filter(x => x === 0 || x === 1).slice(0, COURT.length), last: valid(t.court.last) ? t.court.last : null };
    return out;
  }
  const growth = bed => bed ? Math.min(GROWN, bed.water.length) : -1;
  const copy = t => cleanTown(JSON.parse(JSON.stringify(t)));
  // Each of these returns the new town, or null if it isn't possible today.
  const projects = {
    plant(town, i, plant, date) { if (!PLANTS[plant] || !valid(date) || town.beds[i] !== null || i < 0 || i >= BEDS.length) return null; const t = copy(town); t.beds[i] = { plant, planted: date, water: [] }; return t; },
    water(town, i, date) { const b = town.beds[i]; if (!b || !valid(date) || b.water.includes(date) || growth(b) >= GROWN || date < b.planted) return null; const t = copy(town); t.beds[i].water.push(date); return t; },
    // Rain waters every growing bed for you.
    rain(town, date) { let t = town; town.beds.forEach((_, i) => { t = projects.water(t, i, date) || t; }); return t; },
    clear(town, i) { if (growth(town.beds[i]) < GROWN) return null; const t = copy(town); t.beds[i] = null; return t; },
    bench(town, date, color = null) { const b = town.bench; if (!valid(date) || b.stage >= 3 || b.last === date) return null; if (b.stage === 2 && !BENCH_COLORS.some(c => c[0] === color)) return null; const t = copy(town); t.bench.stage++; t.bench.last = date; if (t.bench.stage === 3) t.bench.color = color; return t; },
    court(town, pick, date) { const c = town.court; if (!valid(date) || c.picks.length >= COURT.length || c.last === date || (pick !== 0 && pick !== 1)) return null; const t = copy(town); t.court.picks.push(pick); t.court.last = date; return t; },
  };
  // What the street shows for the projects. act: what tapping it opens.
  function townPieces(town) {
    const out = [];
    town.beds.forEach((b, i) => { const g = growth(b); out.push({ t: 'lanebed', x: BEDS[i][0], z: BEDS[i][1], c: b ? 1 + PLANTS[b.plant].c * 5 + g : 0, act: 'bed:' + i }); });
    out.push({ t: 'lanebench', x: 5, z: 7, r: 2, c: town.bench.stage < 3 ? town.bench.stage : 3 + BENCH_COLORS.findIndex(c => c[0] === town.bench.color), act: 'bench' });
    out.push({ t: 'lanecourt', x: 8, z: 9, c: Math.min(town.court.picks.length, COURT.length), act: 'court' });
    town.court.picks.forEach((pick, k) => { for (const [t, x, z, r] of COURT[k].options[pick].items) out.push({ t, x, z, r: r || 0, act: 'court' }); });
    return out;
  }
  // A line for the Notice Board about each project.
  function townNotes(town, date) {
    const out = [];
    const beds = town.beds.filter(Boolean);
    if (!beds.length) out.push(['🌱', 'The garden beds are empty and waiting for seeds.']);
    for (const b of beds) { const g = growth(b), thirsty = g < GROWN && !b.water.includes(date); out.push(['🌱', `${PLANTS[b.plant].name}: ${GROW[g].toLowerCase()}${g < GROWN ? ` (${g} of ${GROWN} days)` : ''}${thirsty ? '. Could use some water.' : '.'}`]); }
    out.push(['🪑', `The bench: ${BENCH_STATE[town.bench.stage].toLowerCase()}.`]);
    const n = town.court.picks.length;
    out.push(['⛲', n >= COURT.length ? 'The courtyard is finished. Everyone’s been using it.' : n ? `The courtyard: ${n} of ${COURT.length} pieces. Next, ${COURT[n].label.toLowerCase()}.` : 'The courtyard is bare. It needs a table first.']);
    return out;
  }
  // Neighbours notice the projects; at most one remark per chat.
  function remark(id, { town = emptyTown(), weather = 'clear' } = {}) {
    if (id === 'juniper') return ['That bench by the green has been broken for ages. Someone should fix it. I’m looking at you, gently.', 'New slats on the bench! I thought I heard hammering.', 'The bench is sanded. It just needs paint. I have opinions about colours, if you want them.', 'I’ve started reading on the mended bench. It’s the best seat on the lane.'][town.bench.stage];
    if (id === 'mallow') { const n = town.court.picks.length; return n >= COURT.length ? 'Have you seen the courtyard? I had my morning tea there. Felt like a holiday.' : n ? `${COURT[n - 1].options[town.court.picks[n - 1]].name}, in the courtyard! It’s coming along beautifully.` : 'That courtyard is so bare. I keep picturing a little table there.'; }
    if (id === 'puddle') { const b = town.beds.find(x => x && growth(x) < GROWN); if (b && WET(weather)) return `The rain is watering your ${PLANTS[b.plant].name.toLowerCase().replace(/^a /, '')}. I’ve been supervising.`; const done = town.beds.find(x => growth(x) >= GROWN); return done ? `${PLANTS[done.plant].name} in bloom! Rain did that. Rain, and you.` : null; }
    return null;
  }
  // ---------- The day's gentle close ----------
  // Where you sit with your tea: the mended bench, else a courtyard chair, else your own doorstep.
  function restSpot(town = emptyTown()) {
    if (town.bench.stage >= 3) return { x: 6.5, z: 7.5, seat: 'lanebench', heading: 0, where: 'on the bench you mended' };
    if (town.court.picks.length >= 2) return { x: 9.5, z: 9.5, seat: COURT[1].options[town.court.picks[1]].items[0][0], heading: Math.PI / 2, where: 'in the courtyard' };
    return { x: 2.5, z: 2.5, seat: null, heading: 0, where: 'on your doorstep' };
  }
  const GOODNIGHTS = {
    mallow: 'Mallow turns the sign to “See you tomorrow” and heads upstairs.',
    juniper: 'Juniper marks her page and heads home. “Goodnight, neighbour.”',
    puddle: 'Puddle curls up under the awning, out of the rain.',
    visitor: 'Your visitor waves and sets off down the road.',
  };
  // A short look back at the day: only what happened, never what didn't.
  function recap({ date, found = 0, chats = [], town = emptyTown(), weather = 'clear' }) {
    const lines = [];
    if (found) lines.push(found === 1 ? 'You found a little something on the lane.' : `You found ${found} little things on the lane.`);
    const watered = town.beds.filter(b => b && b.water.includes(date));
    if (watered.length) lines.push(`${watered.some(b => growth(b) >= GROWN) ? 'Something bloomed in the garden' : WET(weather) ? 'The rain watered the garden' : 'You watered the garden'}.`);
    if (town.bench.last === date) lines.push(town.bench.stage >= 3 ? 'The bench is mended, and painted.' : 'The bench is a little closer to mended.');
    if (town.court.last === date) { const n = town.court.picks.length; lines.push(`The courtyard got ${COURT[n - 1].options[town.court.picks[n - 1]].name.toLowerCase()}.`); }
    if (chats.length) lines.push(`You talked with ${chats.length < 2 ? chats.join('') : chats.slice(0, -1).join(', ') + ' and ' + chats.at(-1)}.`);
    if (!lines.length) lines.push('A quiet day. Those count too.');
    const rnd = seeded(date + '|close');
    const close = ['The lamps hum. Somewhere a kettle clicks off.', 'The street settles in for the night.', 'The last light slips behind the roofs.', 'Windows glow up and down the lane.', 'The tea is just the right temperature.'][Math.floor(rnd() * 5)];
    return { title: 'The day, gently', lines, close, tomorrow: 'Tomorrow can be whatever it is. Nothing here needs you.' };
  }
  // Letters you've opened on the lane, newest first, rebuilt from their ids.
  function keptLetters(ids = []) {
    return ids.map(id => { const d = discoveries({ date: id.slice(0, 10) }).find(x => x.id === id); return d && d.kind === 'letter' ? { id, date: id.slice(0, 10), from: d.from, subject: d.subject, body: d.body } : null; }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  }
  // Where everyone is right now. place: 'street' (with a spot on the street), 'shop', or 'away'.
  function neighbors({ phase = 'day', weather = 'clear', town = null, closed = false } = {}) {
    const wet = WET(weather), out = [];
    const add = (id, place, doing, extra = {}) => out.push({ id, name: NEIGHBORS[id].name, coat: NEIGHBORS[id].coat, place, doing, ...extra });
    if (phase === 'morning') add('mallow', 'street', 'opening up the shop', { piece: 'lanemallow', at: [6, 2] });
    else add('mallow', 'shop', { day: 'minding the shelf', evening: 'counting the day’s Fireflies', night: 'dozing behind the counter' }[phase] || 'minding the shelf');
    if (phase === 'morning') add('juniper', 'street', 'reading the notice board', { piece: 'lanereader', c: 1, at: [13, 2] });
    else if (phase === 'day') add('juniper', 'street', wet ? 'reading under the Mail Room porch' : town?.bench.stage === 3 ? 'reading on the mended bench' : 'reading under the tree', { piece: 'lanereader', c: 0, at: wet ? [9, 2] : town?.bench.stage === 3 ? [4, 7] : [2, 8] });
    else if (phase === 'evening' && !wet && (town?.court.picks.length || 0) >= 2) add('juniper', 'street', 'reading in the courtyard' + ((town.court.picks.length >= 3) ? ' by lantern light' : ''), { piece: 'lanereader', c: 0, at: [13, 10] });
    else add('juniper', 'away', 'home with a book');
    if (wet) add('puddle', 'street', weather === 'snow' ? 'watching the snow from under the awning' : 'sheltering under Mallow’s awning', { piece: 'lanestray', at: [5, 2] });
    else add('puddle', 'away', 'somewhere dry, waiting for rain');
    if (closed) return out.map(n => n.id === 'puddle' && n.place === 'street' ? { ...n, doing: 'dozing under the awning' } : n.id === 'mallow' ? { ...n, place: 'shop', doing: 'upstairs, kettle on', piece: undefined, at: undefined } : { ...n, place: 'away', doing: 'home for the night', piece: undefined, at: undefined });
    return out;
  }
  // Familiarity counts days spent talking, not streaks. Keep a bounded history of choices
  // and separate story progress so an old completed story never restarts when history rolls over.
  function cleanMemory(id, r) {
    const N=NEIGHBORS[id];
    const good=x=>x && valid(x.date) && N.topics.some(t=>t.id===x.topic && t.replies[x.reply]) && Number.isInteger(x.reply);
    if(!N || !good(r))return null;
    const record=x=>({date:x.date,topic:x.topic,reply:x.reply});
    const history=(Array.isArray(r.history)?r.history:[]).filter(x=>good(x)&&x.date<r.date).map(record)
      .sort((a,b)=>a.date.localeCompare(b.date)).filter((x,i,a)=>!i||x.date!==a[i-1].date).slice(-47);
    history.push(record(r));
    const story=STORIES[id], progress={};
    const savedStep=r.stories?.[story.id];
    if(Number.isInteger(savedStep)&&savedStep>=0&&savedStep<=2)progress[story.id]=savedStep;
    for(const h of history){const t=N.topics.find(t=>t.id===h.topic);if(t.story)progress[t.story]=Math.max(progress[t.story]??-1,t.step);}
    const warmth=Number.isInteger(r.warmth)?Math.max(history.length,Math.min(365,r.warmth)):history.length;
    return {...record(r),warmth,history,stories:progress};
  }
  function talk(id, { date, memory = null } = {}) {
    const N=NEIGHBORS[id];if(!N||!valid(date))return null;
    memory=cleanMemory(id,memory);
    const gap=memory?daysBetween(memory.date,date):null, warmth=memory?.warmth||0;
    const said=memory&&N.topics.find(t=>t.id===memory.topic);
    if(memory&&gap<=0)return {id,name:N.name,lines:[N.again],ask:null,replies:[],remembered:false,warmth};
    const lines=[];let remembered=false;
    const story=STORIES[id], step=memory?.stories[story.id]??-1;
    const chapter=warmth>=3&&step<2?N.topics.find(t=>t.story===story.id&&t.step===step+1):null;
    if(said&&(gap===1||said.story||(chapter&&step>=0))){lines.push(said.replies[memory.reply][2]);remembered=true;}
    else if(gap>1)lines.push(N.missed);
    else lines.push(N.hello);
    // Recall a distinct older choice occasionally, even after a long absence.
    const older=memory?.history.filter(h=>h.topic!==memory.topic&&daysBetween(h.date,date)>=7)||[];
    if(!remembered&&older.length){
      const pick=older[Math.floor(seeded(date+'|recall|'+id)()*older.length)];
      const t=N.topics.find(t=>t.id===pick.topic);
      lines.push(`${N.name==='juniper'?'I remember your exact words':N.name==='puddle'?'I still remember you saying':'You once told me'}: “${t.replies[pick.reply][0]}.”`);
      remembered=true;
    }
    let topic=chapter;
    if(!topic){
      const pool=N.topics.filter(t=>!t.story&&(t.warmth||0)<=warmth&&t.id!==said?.id);
      const lastSeen=t=>memory?.history.filter(h=>h.topic===t.id).at(-1)?.date||'';
      const oldest=pool.map(lastSeen).sort()[0];
      const fresh=pool.filter(t=>lastSeen(t)===oldest);
      // Newly unlocked personal subjects get their first turn promptly.
      const personal=fresh.filter(t=>t.warmth>0), choices=personal.length?personal:fresh;
      topic=choices[Math.floor(seeded(date+'|talk|'+id)()*choices.length)];
    }
    return {id,name:N.name,lines,topic:topic.id,ask:topic.ask,replies:topic.replies.map(r=>r[0]),remembered,warmth,
      story:topic.story?{title:story.title,chapter:topic.step+1,total:3}:null};
  }
  function answer(id, topicId, reply, date) {
    const t=NEIGHBORS[id]?.topics.find(x=>x.id===topicId), r=Number.isInteger(reply)&&t?.replies[reply];
    return r&&valid(date)?{line:r[1],record:{date,topic:topicId,reply}}:null;
  }
  function cleanTalks(t) {
    const out={};
    if(t&&typeof t==='object')for(const id of Object.keys(NEIGHBORS)){const r=cleanMemory(id,t[id]);if(r)out[id]=r;}
    return out;
  }



  // ---------- Phase 2: residents, seasons and dressing (all systemic) ----------
  // Residents are the save's own pets. Each gets one place a day, seeded by the date and
  // the pet, and a templated thing to be doing there. Everyone is home at night.
  const DOING = {
    house: ['curled up by the window', 'napping on the rug', 'playing in the hall', 'watching the street from the sill'],
    shop: ['helping Mallow stock the shelf', 'asleep on the shop counter', 'guarding the till', 'inspecting a new delivery'],
    mail: ['sorting the post', 'asleep in the parcel bin', 'watching the mail slot', 'sitting on the Sunday magazines'],
    notice: ['reading the notice board', 'batting at a pinned note', 'sunning by the board', 'keeping an eye on the week'],
  };
  function seeded(text) { let s = 2166136261; for (const ch of text) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619); } return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909); return ((s ^= s >>> 16) >>> 0) / 4294967296; }; }
  function residents({ pets = [], date, phase = 'day' }) {
    if (!valid(date)) return [];
    return pets.slice(0, 12).map(pet => {
      const rnd = seeded(date + '|' + pet.key), places = ['house', 'shop', 'mail', 'notice'];
      let place = places[Math.floor(rnd() * places.length)];
      const homeEarly = rnd() < 0.5;
      if (phase === 'night' || (phase === 'evening' && homeEarly)) place = 'house';
      const doing = phase === 'night' ? 'asleep at home' : DOING[place][Math.floor(rnd() * DOING[place].length)];
      return { key: pet.key, name: pet.name, coat: pet.coat, place, doing };
    });
  }
  const at = (list, place) => list.filter(r => r.place === place);
  // "Neo is sorting the post." / "Neo and Biscuit are asleep at home." Pets doing the same thing share a line.
  const andList = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names.at(-1);
  function sayAround(list) {
    const groups = new Map();
    for (const r of list) { if (!groups.has(r.doing)) groups.set(r.doing, []); groups.get(r.doing).push(r.name); }
    return [...groups].map(([doing, names]) => `${andList(names)} ${names.length === 1 ? 'is' : 'are'} ${doing}.`).join(' ');
  }
  // The Daily Brief's lane column: this morning's routines, plus what's on Mallow's shelf.
  const WHERE = { house: 'at home', shop: 'at the shop', mail: 'at the Mail Room', notice: 'by the notice board' };
  function briefColumn({ residents: list = [], special = null }) {
    if (!list.length && !special) return null;
    const shop = special ? `Mallow has three new finds on the shelf, and it's Sunday: the ${special} is in.` : 'Mallow has three new finds on the shelf.';
    return { body: shop, items: list.slice(0, 6).map(r => ({ label: r.name, value: `${r.doing[0].toUpperCase()}${r.doing.slice(1)}${r.place === 'house' ? '' : ' (' + WHERE[r.place] + ')'}` })) };
  }
  // Hemisphere: from the live-weather latitude when there is one, else the time zone.
  const SOUTH = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate|Port_Moresby)|^America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|La_Paz|Lima|Punta_Arenas)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Lusaka|Maseru|Mbabane|Lubumbashi)|^Indian\/(Mauritius|Reunion|Antananarivo)/;
  function hemisphere({ latitude = null, timeZone = '' } = {}) {
    if (Number.isFinite(latitude)) return latitude < 0 ? 'south' : 'north';
    return SOUTH.test(String(timeZone)) ? 'south' : 'north';
  }
  // One templated note a month, shifted six months for the southern hemisphere.
  const MONTH_NOTES = ['Deep winter: the lamps stay on a little longer.', 'Late winter: the days are stretching out again.', 'Early spring: the lane smells like wet soil.',
    'Spring: windows open, the first warm afternoons.', 'Late spring: everything is green and a bit too tall.', 'Early summer: long light, late sunsets on the lane.',
    'High summer: the cats nap in the shade by noon.', 'Late summer: warm evenings, the first crickets.', 'Early autumn: cool mornings, warm tea.',
    'Autumn: leaves are turning along the lane.', 'Late autumn: frosty mornings, cozy nights in.', 'Early winter: the lane gets its first cold snap.'];
  function seasonNote(date, hemi = 'north') {
    if (!valid(date)) return '';
    const m = (+date.slice(5, 7) - 1 + (hemi === 'south' ? 6 : 0)) % 12;
    return MONTH_NOTES[m];
  }
  // Birthdays and anniversaries already on the calendar, the next 30 days.
  const BIRTHDAY = /birthday|b-?day|anniversar|anniv/i;
  function birthdays({ events = [], today, days = 30 }) {
    if (!valid(today)) return [];
    return events.filter(e => valid(e.date) && BIRTHDAY.test(e.title || '')).map(e => ({ ...e, inDays: daysBetween(today, e.date) }))
      .filter(e => e.inDays >= 0 && e.inDays <= days).sort((a, b) => a.inDays - b.inDays);
  }
  // Seasonal dressing on the street, from the real date and weather.
  function dressing({ date, seasons = [], weather = 'clear' }) {
    let season = '';
    if (valid(date)) {
      const m = +date.slice(5, 7) - 1, d = +date.slice(8, 10), n = m * 100 + d;
      for (const s of seasons) {
        if (!Array.isArray(s.from) || !Array.isArray(s.to)) continue;
        const a = s.from[0] * 100 + s.from[1], b = s.to[0] * 100 + s.to[1];
        if (a <= b ? n >= a && n <= b : n >= a || n <= b) { season = s.group; break; }
      }
    }
    return { season, weather: ['rain', 'storm', 'snow', 'sakura'].includes(weather) ? (weather === 'storm' ? 'rain' : weather) : '' };
  }
  // ---------- The view: a street of four fronts, and the place you're at below it ----------
  // Little pixel fronts, drawn inline so there is nothing to fetch. Windows glow after dusk.
  const FRONTS = {
    house: '<rect x="10" y="26" width="44" height="30" fill="#c99872"/><path d="M6 28 32 8l26 20z" fill="#8f5a4a"/><rect x="18" y="34" width="10" height="9" class="lane-window"/><rect x="36" y="34" width="10" height="9" class="lane-window"/><rect x="27" y="44" width="10" height="12" fill="#6b4334"/><rect x="40" y="12" width="6" height="10" fill="#7a4a3c"/>',
    shop: '<rect x="8" y="24" width="48" height="32" fill="#efe3cf"/><path d="M6 24h52l-4 8H10z" fill="#f07a5a"/><path d="M14 24h6l-2 8h-6zM26 24h6l-1 8h-6zM38 24h6l1 8h-6zM50 24h6l2 8h-6z" fill="#fff4e6"/><rect x="14" y="36" width="20" height="12" class="lane-window"/><rect x="40" y="38" width="10" height="18" fill="#7a5a48"/><rect x="18" y="14" width="28" height="8" rx="2" fill="#3c2d4f"/><circle cx="32" cy="18" r="2" fill="#ffd27a"/>',
    mail: '<rect x="10" y="22" width="44" height="34" fill="#9fb4d8"/><rect x="8" y="18" width="48" height="6" fill="#5b6f9e"/><rect x="16" y="30" width="14" height="10" class="lane-window"/><rect x="38" y="30" width="10" height="26" fill="#43557f"/><rect x="18" y="45" width="10" height="7" fill="#fff6e8"/><path d="M18 45l5 4 5-4" fill="none" stroke="#c0675a" stroke-width="1.4"/>',
    notice: '<rect x="14" y="42" width="4" height="14" fill="#7a5a48"/><rect x="46" y="42" width="4" height="14" fill="#7a5a48"/><rect x="8" y="14" width="48" height="30" rx="2" fill="#a77a58"/><rect x="11" y="17" width="42" height="24" fill="#d9b88e"/><rect x="15" y="20" width="12" height="9" fill="#fff6e8"/><rect x="31" y="21" width="17" height="7" fill="#ffe08a"/><rect x="18" y="31" width="14" height="7" fill="#bfe3d0"/><rect x="36" y="31" width="10" height="8" fill="#f4c2c2"/><circle cx="21" cy="20" r="1.4" fill="#c0675a"/><circle cx="39" cy="21" r="1.4" fill="#5b6f9e"/>',
  };
  // Seasonal dressing, per front: pumpkins on the step (Halloween), string lights and snow on
  // the roofline (winter holidays, or real snow). CSS shows them from the lane's data attributes.
  const DECOR = {
    house: { snow: 'M8 28 32 9l24 19h-5L32 14 13 28z', lights: [[12,27],[18,22],[24,18],[30,13],[36,13],[42,18],[48,22],[53,27]], step: [12, 52] },
    shop: { snow: 'M18 14h28v3H18z', lights: [[9,26],[16,26],[23,26],[30,26],[37,26],[44,26],[51,26]], step: [44, 52] },
    mail: { snow: 'M8 18h48v3H8z', lights: [[11,23],[18,23],[25,23],[32,23],[39,23],[46,23],[53,23]], step: [32, 52] },
    notice: { snow: 'M8 14h48v3H8z', lights: [[11,16],[18,16],[25,16],[32,16],[39,16],[46,16],[53,16]], step: [24, 52] },
  };
  const LIGHT_COLOURS = ['#ff6b6b', '#ffd27a', '#7ed6a3', '#7fb8ff'];
  function decor(id) {
    const d = DECOR[id], [px, py] = d.step;
    return `<path class="lane-snow" d="${d.snow}" fill="#ffffff"/>` +
      `<g class="lane-lights">${d.lights.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${LIGHT_COLOURS[i % 4]}"/>`).join('')}</g>` +
      `<g class="lane-pumpkin"><ellipse cx="${px}" cy="${py + 2}" rx="4" ry="3" fill="#e8782a"/><rect x="${px - .6}" y="${py - 2}" width="1.4" height="2" fill="#5a7a2a"/></g>`;
  }
  const catHead = (coat, name) => `<svg viewBox="0 0 16 14" aria-hidden="true"><title>${String(name).replace(/[<&]/g, '')}</title><path d="M2 13V4l3 2h6l3-2v9z" fill="#${(coat >>> 0).toString(16).padStart(6, '0').slice(-6)}" stroke="#00000040" stroke-width="1"/><rect x="5" y="8" width="1.6" height="1.6" fill="#2a2a2a"/><rect x="9.4" y="8" width="1.6" height="1.6" fill="#2a2a2a"/></svg>`;
  function createView({ model, today, pets = () => [], weather = () => 'clear', seasons = [], location = () => ({}), phase = () => 'day', reducedMotion = () => false, notice = () => {}, sound = {},
    catalog = [], shop = null, thumb = () => '', onBuy = () => {}, openCatalogue = null,
    currentLocation = () => null, returnHome = null, visitRoom = null, digest = null, mailbox = null, openLetter = () => {}, calendar = null,
    gifts = [], sheet = null, onFind = () => {}, onTown = () => {}, windDown = null }) {
    const el = (tag, cls, text, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; if (parent) parent.appendChild(n); return n; };
    const play = name => { try { sound[name]?.(); } catch (e) { /* sounds are optional */ } };
    let place = null, dismissedAway = false, town = [];
    // mount(host): draws the lane into the menu tab and returns the house panel, which the
    // app fills with the rooms gallery, house map and guest book exactly as before.
    function mount(host, { awayNote = null, showHeading = true } = {}) {
      const lane = el('section', 'lane', undefined, host); lane.dataset.phase = phase();
      const dress = dressing({ date: today(), seasons, weather: weather() });
      if (dress.season) lane.dataset.season = dress.season;
      if (dress.weather) lane.dataset.weather = dress.weather;
      town = residents({ pets: pets(), date: today(), phase: phase() });
      const head = el('div', 'lane-heading', undefined, lane); if(showHeading)el('h2', '', 'The Lane', head);
      el('p', 'lane-when muted', new Date(today() + 'T12:00').toLocaleDateString(undefined, { weekday: 'long' }) + ' ' + ({ morning: 'morning', afternoon: 'afternoon', evening: 'evening', night: 'night', day: '' }[phase()] || '') + ' on the lane', head);
      if (awayNote && !dismissedAway) {
        const note = el('div', 'lane-away', undefined, lane); note.setAttribute('role', 'status');
        el('p', '', awayNote, note); const ok = el('button', 'chipbtn', 'Thanks', note); ok.type = 'button'; ok.onclick = () => { dismissedAway = true; note.remove(); };
      }
      el('p','lane-intro muted','Step outside and stroll the street, pop straight into a place, or open your house to manage your rooms.',lane);
      if (visitRoom) { const p = progress(), line = el('p', 'lane-finds', undefined, lane); line.textContent = p.carrying ? `📦 You’re carrying ${NEIGHBORS[p.carrying.to].name}’s parcel.` : p.found >= p.total ? `✨ You found all ${p.total} little things today.` : `✨ ${p.total - p.found} little thing${p.total - p.found === 1 ? '' : 's'} to find on the lane today.`; }
      if (visitRoom) { const t = model.town, d = today(), thirsty = t.beds.some(b => b && growth(b) < GROWN && !b.water.includes(d)), bench = t.bench.stage < 3 && t.bench.last !== d, court = t.court.picks.length < COURT.length && t.court.last !== d;
        const todo = [thirsty && 'the garden could use water', bench && 'the bench needs a hand', court && 'the courtyard is ready for its next piece'].filter(Boolean);
        if (todo.length) el('p', 'lane-todo', '🌱 ' + todo.join(', ').replace(/^./, c => c.toUpperCase()) + '.', lane); }
      if (visitRoom) { const walk = el('button', 'chipbtn primary lane-walk', '🚶 Walk the lane', lane); walk.type = 'button'; walk.onclick = () => { play('flip'); visitRoom('street'); }; }
      if (visitRoom && windDown && ['evening', 'night'].includes(phase())) { const w = el('button', 'chipbtn lane-wind', model.closedToday ? '☕ Another cup of tea' : '☕ Wind down for the day', lane); w.type = 'button'; w.onclick = () => windDown(); }
      const location=currentLocation();if(location){const status=el('div','lane-location',undefined,lane);el('span','',location,status);if(returnHome){const back=el('button','chipbtn','Back home',status);back.type='button';back.onclick=returnHome;}}
      const street = el('div', 'lane-street', undefined, lane); street.setAttribute('role', 'group'); street.setAttribute('aria-label', 'Places on the lane');
      const panels = {};
      for (const [id, name, hint] of PLACES) {
        const b = el('button', 'lane-front', undefined, street); b.type = 'button'; b.dataset.place = id;  b.id = 'lane-tab-' + id; b.title = hint;
        const here = at(town, id), faces = here.slice(0, 3).map(r => catHead(r.coat, r.name)).join('') + (here.length > 3 ? `<small>+${here.length - 3}</small>` : '');
        b.innerHTML = `<svg viewBox="0 0 64 60" aria-hidden="true" shape-rendering="crispEdges">${FRONTS[id]}${decor(id)}<rect x="2" y="56" width="60" height="4" fill="#00000022"/></svg>${here.length ? `<span class="lane-residents">${faces}</span>` : ''}<span>${name}</span><small class="lane-front-hint">${hint}</small>`;
        if (here.length) b.setAttribute('aria-label', `${name}: ${here.map(r => r.name).join(', ')} ${here.length === 1 ? 'is' : 'are'} here`);
        const panel = el('div', 'lane-place', undefined, lane); panel.id = 'lane-' + id; panel.dataset.place = id; panel.setAttribute('role', 'region'); panel.setAttribute('aria-labelledby', b.id); if(!['shop','mail'].includes(id))b.setAttribute('aria-controls',panel.id);
        panels[id] = panel;
        b.onclick = () => choose(id, true);
      }
      street.onkeydown = e => {
        const ids = PLACES.map(p => p[0]), i = ids.indexOf(place), next = e.key === 'ArrowRight' ? ids[(i + 1) % ids.length] : e.key === 'ArrowLeft' ? ids[(i + ids.length - 1) % ids.length] : e.key === 'Home' ? ids[0] : e.key === 'End' ? ids.at(-1) : null;
        if (next) { e.preventDefault(); choose(next, true); street.querySelector(`[data-place=${next}]`).focus(); }
      };
      function choose(id, user = false) {
        if(user && visitRoom && ['shop','mail'].includes(id)){place=null;play('flip');visitRoom(id);return;}
        if(user && place===id)id=null;
        if (user && id !== place) play('flip');
        place = id;
        for (const b of street.children) { const on = b.dataset.place === id; if(!['shop','mail'].includes(b.dataset.place))b.setAttribute('aria-expanded',String(on));b.tabIndex=0; }
        for (const [pid, panel] of Object.entries(panels)) panel.hidden = pid !== id;
        if (id && id !== 'house') renderPlace(id, panels[id]);
        if (id && user && !reducedMotion() && panels[id].animate) panels[id].animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      // Who's home: one line above the house content the app fills in.
      const home = at(town, 'house');
      if (home.length) el('p', 'lane-around', sayAround(home), panels.house);
      choose(place);
      return { house: panels.house, choose, get place() { return place; } };
    }
    function renderPlace(id, panel) {
      panel.replaceChildren();
      const here = at(town, id);
      if (here.length) el('p', 'lane-around', sayAround(here), panel);
      try { ({ shop: renderShop, mail: renderMail, notice: renderNotice })[id](panel); }
      catch (e) { el('p', 'muted', 'This place is resting right now. Try again in a moment.', panel); }
    }
    // ---- The Shop: Mallow's shelf ----
    function renderShop(panel) {
      const t = today(), { items, special } = shelf({ catalog, owns: id => shop.owns(id), date: t });
      const keeper = el('div', 'lane-keeper', undefined, panel);
      el('span', 'lane-keeper-face', '🐈', keeper).setAttribute('aria-hidden', 'true');
      const hour = phase(), greet = { morning: 'Morning! Fresh finds on the shelf.', afternoon: 'Afternoon! Have a look around.', evening: 'Evening. Lamps are on, take your time.', night: 'Late visit? I’m always here.' }[hour] || 'Welcome in! Have a look around.';
      const said = el('div', 'lane-keeper-words', undefined, keeper); el('b', '', 'Mallow', said); el('p', '', greet + (special ? ' And it’s Sunday, so there’s something rare.' : ''), said);
      const purse = el('p', 'lane-purse', `${shop.balance} Fireflies`, panel); purse.setAttribute('role', 'status'); purse.setAttribute('aria-live', 'polite');
      el('p', 'muted small lane-earn', 'Fireflies come from finishing tasks, keeping habits and cozy moments. No money, no ads.', panel);
      const shelfRow = el('div', 'lane-shelf', undefined, panel);
      const rows = [...(special ? [special] : []), ...items].map(id => catalog.find(c => c.id === id)).filter(Boolean);
      if (!rows.length) el('p', 'lane-empty', 'You own everything Mallow carries. He’s very proud of your collection.', panel);
      for (const item of rows) {
        const card = el('article', 'lane-item' + (item.id === special ? ' lane-special' : ''), undefined, shelfRow); card.dataset.item = item.id;
        if (item.id === special) el('span', 'lane-tag', 'Sunday special', card);
        const art = thumb(item); if (art) { const img = el('img', '', undefined, card); img.src = art; img.alt = ''; } else el('span', 'lane-item-icon', item.icon || '✦', card).setAttribute('aria-hidden', 'true');
        el('b', '', item.name, card); el('p', 'muted small', item.desc || '', card);
        const buy = el('button', 'chipbtn primary', `${item.price} Fireflies`, card); buy.type = 'button';
        buy.setAttribute('aria-label', `Buy ${item.name} for ${item.price} Fireflies`);
        if (shop.balance < item.price) { buy.disabled = true; buy.title = 'Not enough Fireflies yet'; }
        buy.onclick = () => {
          if (!shop.buy(item.id)) { notice('Not enough Fireflies yet. They come from tasks and cozy moments.'); return; }
          play('arpeggio'); onBuy(item); renderPlace('shop', panel);
          notice(item.costume ? `${item.name} is yours. Find it in the Wardrobe.` : `${item.name} is yours. Find it in Decorate.`);
        };
      }
      el('p', 'muted small', `Tomorrow there are three new finds. Anything you skip comes back within ${cycleDays({ catalog, owns: id => shop.owns(id) })} days.`, panel);
      if (openCatalogue) { const all = el('button', 'chipbtn', 'Everything you own', panel); all.type = 'button'; all.onclick = openCatalogue; }
    }
    // ---- The Mail Room: papers, the Sunday magazine, and letters ----
    function renderMail(panel) {
      el('h3', '', 'Papers', panel);
      const papers = el('div', 'lane-list', undefined, panel);
      try { digest?.ensure(); } catch (e) { /* the archive still lists older papers */ }
      const issues = (digest?.issues() || []).filter(i => i.brief).slice(0, 7);
      if (!issues.length) el('p', 'muted', 'Your first paper arrives tomorrow morning.', papers);
      for (const i of issues) {
        const label = i.date === today() ? 'Today’s paper' : new Date(i.date + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        const row = el('button', 'lane-row' + (i.read ? '' : ' unread'), undefined, papers); row.type = 'button';
        el('span', 'lane-row-icon', i.sunday ? '📚' : '🗞', row).setAttribute('aria-hidden', 'true');
        const text = el('span', '', undefined, row); el('b', '', label, text); el('small', '', i.sunday ? 'Sunday edition with the weekly magazine' : 'The Daily Brief', text);
        row.onclick = () => digest.open(i.date);
      }
      el('h3', '', 'Letters', panel);
      const list = el('div', 'lane-list', undefined, panel);
      const mine = mailbox?.unread() || 0;
      if (mine) { const row = el('button', 'lane-row unread', undefined, list); row.type = 'button'; el('span', 'lane-row-icon', '✉', row).setAttribute('aria-hidden', 'true'); const text = el('span', '', undefined, row); el('b', '', mine === 1 ? 'A letter from your past self' : `${mine} letters from your past self`, text); el('small', '', 'Arrived in your mailbox', text); row.onclick = () => mailbox.open(); }
      const specialId = shelf({ catalog, owns: id => shop?.owns(id), date: (() => { const d = new Date(today() + 'T12:00'); d.setDate(d.getDate() - d.getDay()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() }).special;
      for (const letter of letters({ firstVisit: model.firstVisit, today: today(), specialName: catalog.find(c => c.id === specialId)?.name || null })) {
        const read = model.isRead(letter.id), row = el('button', 'lane-row' + (read ? '' : ' unread'), undefined, list); row.type = 'button';
        el('span', 'lane-row-icon', '💌', row).setAttribute('aria-hidden', 'true');
        const text = el('span', '', undefined, row); el('b', '', letter.subject, text); el('small', '', 'From ' + letter.from, text);
        row.onclick = () => { model.markRead(letter.id); openLetter(letter); };
      }
      const kept = keptLetters(model.kept);
      if (kept.length) {
        el('h3', '', 'Found on the lane', panel);
        const found = el('div', 'lane-list', undefined, panel);
        for (const letter of kept) { const row = el('button', 'lane-row', undefined, found); row.type = 'button'; el('span', 'lane-row-icon', '✉', row).setAttribute('aria-hidden', 'true'); const text = el('span', '', undefined, row); el('b', '', letter.subject, text); el('small', '', 'From ' + letter.from, text); row.onclick = () => openLetter(letter); }
      }
    }
    // ---- The Notice Board: tomorrow and this week, straight from the calendar ----
    function renderNotice(panel) {
      const t = today(), sky = el('p', 'lane-sky', undefined, panel);
      try { const m = calendar?.moon?.(new Date(t + 'T12:00')); sky.textContent = [m ? `${m.icon} ${m.name}.` : '', skyNote(t)].filter(Boolean).join(' '); } catch (e) { sky.textContent = skyNote(t); }
      el('p', 'lane-season-note', seasonNote(t, hemisphere(location())), panel);
      const rows = notices({ today: t, events: calendar?.events() || [], holidays: calendar?.holidays() || [], seasonal: d => calendar?.seasonal(d) || [] });
      const tomorrow = rows.find(r => r.label === 'Tomorrow');
      const pinned = el('div', 'lane-pin', undefined, panel); el('b', '', 'Tomorrow in the house', pinned);
      el('p', '', tomorrow ? tomorrow.items.map(i => i.title).join(' · ') : 'Nothing pinned for tomorrow yet.', pinned);
      el('h3', '', 'This week', panel);
      const week = el('div', 'lane-week', undefined, panel);
      const rest = rows.filter(r => r.label !== 'Tomorrow');
      if (!rest.length) el('p', 'muted', tomorrow ? 'Nothing else pinned this week.' : 'A quiet week on the lane.', week);
      for (const r of rest) { const row = el('div', 'lane-day', undefined, week); el('b', '', r.label, row); const ul = el('ul', '', undefined, row); for (const i of r.items) { const li = el('li', 'lane-' + i.kind, i.title, ul); } }
      const cakes = birthdays({ events: calendar?.events() || [], today: t });
      if (cakes.length) {
        el('h3', '', 'Birthdays coming up', panel);
        const list = el('div', 'lane-week', undefined, panel);
        for (const c of cakes) { const row = el('div', 'lane-day lane-cake', undefined, list); el('b', '', c.inDays === 0 ? 'Today' : c.inDays === 1 ? 'Tomorrow' : `In ${c.inDays} days`, row); el('p', '', '🎂 ' + c.title, row); }
      }
      if (town.length) {
        el('h3', '', 'Who’s where today', panel);
        const names = { house: 'at home', shop: 'at the shop', mail: 'at the Mail Room', notice: 'by the notice board' };
        const list = el('ul', 'lane-who', undefined, panel);
        for (const r of town) { const li = el('li', '', undefined, list); li.innerHTML = catHead(r.coat, r.name); el('span', '', `${r.name} is ${r.doing}` + (/home/.test(r.doing) ? '' : ` (${names[r.place]})`), li); }
      }
      el('h3', '', 'Around the lane', panel);
      const notes = el('ul', 'lane-who lane-town-notes', undefined, panel);
      for (const [icon, text] of townNotes(model.town, today())) { const li = el('li', '', undefined, notes); el('span', 'lane-town-icon', icon, li).setAttribute('aria-hidden', 'true'); el('span', '', text, li); }
      el('h3', '', 'Neighbours', panel);
      const folks = el('ul', 'lane-who lane-neighbours', undefined, panel);
      for (const n of neighbors({ phase: phase(), weather: weather(), town: model.town })) { const li = el('li', '', undefined, folks); li.innerHTML = catHead(n.coat, n.name); el('span', '', `${n.name} is ${n.doing}.`, li); }
      if (calendar?.open) { const b = el('button', 'chipbtn', 'Pin something on the calendar', panel); b.type = 'button'; b.onclick = calendar.open; }
    }
    function finds() {
      const list = discoveries({ date: today(), gifts, south: hemisphere(location()) === 'south' });
      return list.map(d => { if (d.kind !== 'visitor') return d; const item = catalog.find(c => c.id === giftFor(d, id => !!shop?.owns(id))) || null; return { ...d, item, gift: item?.piece || null }; });
    }
    function progress() { const day = model.today(), list = finds(); return { found: list.filter(d => day.found.includes(d.id)).length, total: list.length, carrying: list.find(d => d.id === day.carrying) || null }; }
    // Tapping a discovery on the street.
    function find(id) {
      const d = finds().find(x => x.id === id); if (!d) return;
      const done = model.today().found.includes(id);
      if (d.kind === 'letter') { model.found(id); onFind(d, { take: true }); play('flip'); openLetter({ id, from: d.from, subject: d.subject, body: d.body }); return; }
      if (d.kind === 'bloom') { if (done) { notice(`${d.title}. Still blooming.`); return; } model.found(id); play('chime'); notice(`${d.title}.`); onFind(d, { reward: 'bloom' }); return; }
      if (!sheet) return;
      if (d.kind === 'parcel') {
        sheet(d.title, host => {
          const box = el('div', 'lane-find', undefined, host);
          el('p', 'lane-find-label', '“' + d.label + '”', box);
          const to = NEIGHBORS[d.to], here = neighbors({ phase: phase(), weather: weather(), town: model.town }).find(n => n.id === d.to);
          el('p', '', `Left at the wrong door. It’s addressed to ${to.name}, who is ${here?.doing || 'around somewhere'}.`, box);
          if (here?.place === 'away') el('p', 'muted', 'Mallow will pass it on if they’re not about.', box);
          const b = el('button', 'chipbtn primary', 'Pick it up', box); b.type = 'button';
          b.onclick = () => { model.carry(id); play('click'); onFind(d, { take: true, close: true }); notice(`You’re carrying ${to.name}’s parcel. Say hello to hand it over.`); };
        });
        return;
      }
      // A visitor with something unusual.
      sheet(d.name, host => {
        const box = el('div', 'lane-talk lane-find', undefined, host);
        const who = el('div', 'lane-talk-who', undefined, box); el('span', 'lane-talk-face', undefined, who).innerHTML = catHead(d.coat, d.name);
        const nm = el('div', '', undefined, who); el('b', '', 'Visiting the lane', nm); el('small', '', d.who[0].toUpperCase() + d.who.slice(1), nm);
        const log = el('div', 'lane-talk-log', undefined, box), say = (t, mine) => el('p', 'lane-bubble' + (mine ? ' mine' : ''), t, log);
        if (done) { say('Enjoy it! I’ll be on my way by sunset. Lovely street, this.'); return; }
        if (!d.item) {
          say('I was going to give you something unusual, but you seem to have one of everything! Here, have a jar of fireflies instead.');
          const b = el('button', 'chipbtn primary', 'Thank you', box); b.type = 'button'; b.onclick = () => { model.found(id); b.remove(); say('Thank you', true); onFind(d, { reward: 'visitor' }); };
          return;
        }
        say(d.says);
        const card = el('div', 'lane-item lane-gift', undefined, box);
        const art = thumb(d.item); if (art) { const img = el('img', '', undefined, card); img.src = art; img.alt = ''; } else el('div', 'lane-item-icon', d.item.icon || '🎁', card);
        el('b', '', d.item.name, card); el('p', 'muted', d.item.desc || '', card);
        const row = el('div', 'lane-talk-replies', undefined, box);
        const yes = el('button', 'chipbtn primary', 'Give it a home', row); yes.type = 'button';
        const no = el('button', 'chipbtn', 'Not today', row); no.type = 'button';
        yes.onclick = () => { model.found(id); row.remove(); card.remove(); say('Give it a home', true); say('Wonderful. It’s been waiting for the right room.'); play('chime'); onFind(d, { gift: d.item }); };
        no.onclick = () => { row.remove(); say('Not today', true); say('No trouble at all. I’ll be about until sunset if you change your mind.'); };
      });
    }
    // Tapping a garden bed, the bench, or the courtyard: one small step today.
    function project(act) {
      if (!sheet) return;
      const date = today(), save = (t, opts = {}) => { model.setTown(t); onTown(model.town, opts); };
      if (act.startsWith('bed:')) {
        const i = +act.slice(4);
        sheet('Garden bed', host => {
          const box = el('div', 'lane-find lane-project', undefined, host), bed = model.town.beds[i], g = growth(bed);
          if (!bed) {
            el('p', '', 'An empty bed, freshly dug. What would you like to grow? It takes four days of watering (rain counts).', box);
            const row = el('div', 'lane-talk-replies', undefined, box);
            for (const [key, P] of Object.entries(PLANTS)) { const b = el('button', 'chipbtn', `${P.seed} ${P.name}`, row); b.type = 'button'; b.onclick = () => { const t = projects.plant(model.town, i, key, date); if (!t) return; play('click'); save(projects.water(t, i, date) || t, { close: true, say: `${P.name} planted and watered. Come back tomorrow.` }); }; }
            return;
          }
          const P = PLANTS[bed.plant];
          el('p', 'lane-project-title', `${P.seed} ${P.name}: ${GROW[g]}`, box);
          const bar = el('div', 'lane-progress', undefined, box); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(GROWN)); bar.setAttribute('aria-valuenow', String(g));
          for (let k = 0; k < GROWN; k++) el('span', k < g ? 'on' : '', undefined, bar);
          if (g >= GROWN) {
            el('p', '', 'In full bloom. It’ll stay like this as long as you like.', box);
            const b = el('button', 'chipbtn', 'Clear the bed and plant something new', box); b.type = 'button'; b.onclick = () => { const t = projects.clear(model.town, i); if (t) save(t, { close: true, say: 'The bed is ready for new seeds.' }); };
            return;
          }
          if (bed.water.includes(date)) { el('p', 'muted', 'Watered today. Come back tomorrow to see it grow.', box); return; }
          const b = el('button', 'chipbtn primary', '💧 Water it', box); b.type = 'button';
          b.onclick = () => { const t = projects.water(model.town, i, date); if (!t) return; play('chime'); const now = growth(t.beds[i]); save(t, { close: true, reward: now >= GROWN ? 'bloom' : null, say: now >= GROWN ? `${P.name} in full bloom!` : `${GROW[now]}. See you tomorrow.` }); };
        });
        return;
      }
      if (act === 'bench') {
        sheet('The old bench', host => {
          const box = el('div', 'lane-find lane-project', undefined, host), b = model.town.bench;
          el('p', 'lane-project-title', BENCH_STATE[b.stage], box);
          const bar = el('div', 'lane-progress', undefined, box); for (let k = 0; k < 3; k++) el('span', k < b.stage ? 'on' : '', undefined, bar);
          if (b.stage >= 3) { el('p', '', 'Mended. Juniper reads here most afternoons now, and the plaque says “Fixed by a neighbour”.', box); return; }
          if (b.last === date) { el('p', 'muted', 'That’s enough for today. Paint and glue like a night to settle.', box); return; }
          const step = BENCH_STEPS[b.stage];
          if (b.stage < 2) { const go = el('button', 'chipbtn primary', step.label, box); go.type = 'button'; go.onclick = () => { const t = projects.bench(model.town, date); if (t) { play('click'); save(t, { close: true, say: step.did }); } }; return; }
          el('p', '', 'What colour should it be?', box);
          const row = el('div', 'lane-talk-replies', undefined, box);
          for (const [key, name] of BENCH_COLORS) { const c = el('button', 'chipbtn lane-paint', name, row); c.type = 'button'; c.dataset.paint = key; c.onclick = () => { const t = projects.bench(model.town, date, key); if (t) { play('chime'); save(t, { close: true, reward: 'bench', say: step.did }); } }; }
        });
        return;
      }
      if (act === 'court') {
        sheet('The courtyard', host => {
          const box = el('div', 'lane-find lane-project', undefined, host), c = model.town.court, n = c.picks.length;
          el('p', 'lane-project-title', n >= COURT.length ? 'Finished!' : `${n} of ${COURT.length} pieces`, box);
          const bar = el('div', 'lane-progress', undefined, box); for (let k = 0; k < COURT.length; k++) el('span', k < n ? 'on' : '', undefined, bar);
          if (n) { const ul = el('ul', 'lane-court-list', undefined, box); c.picks.forEach((p, k) => el('li', '', COURT[k].options[p].name, ul)); }
          if (n >= COURT.length) { el('p', '', 'A table, chairs, lights, plants and a fountain. The neighbours have tea here now.', box); return; }
          if (c.last === date) { el('p', 'muted', 'One new piece a day. Tomorrow: ' + COURT[n].label.toLowerCase() + '.', box); return; }
          el('p', '', `Today: ${COURT[n].label.toLowerCase()}. Which one?`, box);
          const row = el('div', 'lane-talk-replies', undefined, box);
          COURT[n].options.forEach((o, k) => { const b = el('button', 'chipbtn', o.name, row); b.type = 'button'; b.onclick = () => { const t = projects.court(model.town, k, date); if (t) { play('chime'); save(t, { close: true, reward: t.court.picks.length >= COURT.length ? 'court' : null, say: `${o.name} for the courtyard.` }); } }; });
        });
      }
    }
    // A chat with a neighbour: what they remember, one question, two answers, and their reply.
    function renderTalk(id, host) {
      const N = NEIGHBORS[id]; if (!N) return;
      const date = today(), chat = talk(id, { date, memory: model.memory(id) }); if (!chat) return;
      const box = el('div', 'lane-talk', undefined, host); box.dataset.neighbor = id;
      const who = el('div', 'lane-talk-who', undefined, box);
      const face = el('span', 'lane-talk-face', undefined, who); face.innerHTML = catHead(N.coat, N.name);
      const name = el('div', '', undefined, who); el('b', '', N.role, name); el('small', '', N.name === 'Mallow' ? 'Mallow’s Shop' : 'Your neighbour', name);
      el('p', 'lane-talk-about muted', N.about, box);
      const log = el('div', 'lane-talk-log', undefined, box); log.setAttribute('aria-live', 'polite');
      const say = (text, mine) => el('p', 'lane-bubble' + (mine ? ' mine' : '') + (chat.remembered && !mine && log.children.length === 0 ? ' remembered' : ''), text, log);
      const carried = finds().find(d => d.id === model.today().carrying && d.kind === 'parcel');
      if (carried && (carried.to === id || id === 'mallow')) {
        const own = carried.to === id, give = el('button', 'chipbtn primary lane-handover', own ? 'Hand over the parcel' : `Leave ${NEIGHBORS[carried.to].name}’s parcel with Mallow`, box); give.type = 'button';
        give.onclick = () => {
          model.found(carried.id); give.remove(); say(own ? 'Here’s your parcel.' : 'This is for ' + NEIGHBORS[carried.to].name + '.', true); play('chime');
          say(own ? ({ mallow: 'My parcel! It was at the wrong door all morning? You’re a hero. A small, parcel-carrying hero.', juniper: 'Oh! I’d given up on it. Thank you. I owe you a chapter.' }[id] || 'Thank you!') : 'For Juniper? I’ll pass it on with a biscuit. Thank you, neighbour.');
          onFind(carried, { reward: 'parcel' });
        };
      }
      for (const line of chat.lines) say(line);
      const note = chat.ask ? remark(id, { town: model.town, weather: weather() }) : null; if (note) say(note);
      if(chat.story)el('p','lane-talk-note muted',`${chat.story.title} · ${chat.story.chapter} of ${chat.story.total}`,box);
      if (chat.ask) say(chat.ask);
      if (!chat.replies.length) return;
      const picks = el('div', 'lane-talk-replies', undefined, box);
      chat.replies.forEach((label, i) => {
        const b = el('button', 'chipbtn', label, picks); b.type = 'button';
        b.onclick = () => {
          const res = answer(id, chat.topic, i, date); if (!res) return;
          model.remember(id, res.record); picks.remove(); say(label, true); play('click'); say(res.line);
          el('p', 'lane-talk-note muted', `${N.name} will remember this.`, box);
        };
      });
    }
    return { mount, renderPlace, renderTalk, finds, find, progress, project, get place() { return place; }, set place(v) { if (PLACES.some(p => p[0] === v)) place = v; } };
  }
  // Public interiors are rebuilt for a visit; they never become house rooms or drafts.
  // The street outside: your house, Mallow's Shop, the Mail Room and the Notice Board in the
  // same order as the Lane tab, a sidewalk to stroll along and a little green across the road.
  // Doors carry actions ('home', 'go:shop', 'go:mail'); residents are today's pets out and about.
  const STREET = { house: [1, 0, 'lanehome'], shop: [5, 0, 'laneshop'], mail: [9, 0, 'lanepost'], notice: [12, 1, 'laneboard'] };
  function street(L, { residents = [], season = null, neighbors: folks = [], finds = [], found = [], carrying = null, town = emptyTown(), lit = false } = {}) {
    const room = new L.Room(), actions = {};
    room.n = 14; room.name = 'The Lane';
    room.wall = { style: L.WALLS.none ? 'none' : 'paint', color: 0 };
    room.floor = { style: L.FLOORS.grass ? 'grass' : 'oak' };
    const add = (t, o, action) => {
      if (!L.CAT[t]) return null;
      const it = room.make(t, o); if (!room.canPlace(it)) return null;
      room.add(it); if (action) actions[it.id] = action; return it;
    };
    for (let x = 0; x < 14; x += 2) { add('sidewalk', { x, z: 2 }); add('road', { x, z: 4, r: 1 }); }
    add('lanehome', { x: 1, z: 0, on: lit }, 'home'); add('laneshop', { x: 5, z: 0, on: lit }, 'go:shop'); add('lanepost', { x: 9, z: 0, on: lit }, 'go:mail'); add('laneboard', { x: 12, z: 1 }, 'notice');
    add('streettree', { x: 0, z: 1, c: 0 }); add('plant', { x: 8, z: 1 }); add('mailbox', { x: 12, z: 3 }, 'go:mail');
    add('streetlamp', { x: 0, z: 3, on: lit }); add('streetlamp', { x: 8, z: 6, on: lit }); add('streetlamp', { x: 13, z: 6, on: lit });
    add('streettree', { x: 1, z: 8, c: 1 }); add('streettree', { x: 3, z: 12, c: 0 }); add('streettree', { x: 6, z: 13, c: 2 }); add('streettree', { x: 8, z: 13, c: 1 });
    for (const p of townPieces(town)) add(p.t, { x: p.x, z: p.z, r: p.r || 0, c: p.c || 0 }, p.act);
    if (season === 'halloween') { add('pumpkins', { x: 3, z: 2 }); add('pumpkins', { x: 10, z: 3 }); }
    if (season === 'holiday') add('holidaytree', { x: 0, z: 7 });
    // Neighbours stand where their routine puts them; tapping one starts a chat.
    for (const n of folks) if (n.place === 'street' && n.piece) add(n.piece, { x: n.at[0], z: n.at[1], c: n.c || 0, name: n.name }, 'talk:' + n.id);
    // Today's discoveries. Letters and parcels leave the street once picked up; the flower stays
    // (it bloomed!) and the visitor waves you off after handing over their piece.
    for (const d of finds) {
      const done = found.includes(d.id), act = 'find:' + d.id;
      if ((d.kind === 'letter' || d.kind === 'parcel') && (done || carrying === d.id)) continue;
      add(d.piece, { x: d.at[0], z: d.at[1], c: d.c || 0, on: !done }, act);
      if (d.kind === 'visitor' && !done && d.gift && L.CAT[d.gift]) for (const [x, z] of [[6, 10], [5, 9], [6, 11], [4, 11], [0, 9]]) if (add(d.gift, { x, z, on: true }, act)) break;
    }
    // Pets who are out today wander the green, near the place they're spending the day.
    const spots = [[3, 7], [7, 8], [2, 11], [8, 12], [0, 11], [4, 12]];
    residents.filter(r => r.place !== 'house' && r.c != null).slice(0, spots.length).forEach((r, i) => add('cat', { x: spots[i][0], z: spots[i][1], c: r.c, name: r.name }));
    return { data: room.serialize(), actions };
  }
  // The cell you step onto when you come out of a place, facing the street.
  const outside = place => { const [x, z, t] = STREET[place] || STREET.house; return { x: x + (t === 'lanehome' ? 1 : 2) + 0.5, z: z + 3.5, heading: 0 }; };
  function interior(L, place, stock = [], opts = {}) {
    if (place === 'street') return street(L, opts);
    if (!['shop','mail'].includes(place)) throw Error('Unknown lane room');
    const room = new L.Room(), actions = {};
    room.n = 14; room.name = place === 'shop' ? 'Mallow’s Shop' : 'Mail Room';
    room.wall = {style:'wainscot',color:place === 'shop' ? 2 : 4};
    room.floor = {style:'oak'};
    const add = (t, o, action) => {
      if (!L.CAT[t]) return null;
      const it = room.make(t, o); if (!room.canPlace(it)) return null;
      room.add(it); if (action) actions[it.id] = action; return it;
    };
    add('olddoor',{k:0,u:6,e:0,r:0},'street');
    add('rug',{x:4,z:8,c:place === 'shop'?2:0});
    add('floorlamp',{x:12,z:1,on:true});
    add('plant',{x:1,z:1});
    add('clock',{k:0,u:9,e:4});
    add('window',{k:1,u:5,e:2});
    add('plant',{x:12,z:12});
    if (place === 'shop') {
      add('marketstall',{x:2,z:1},'shop');
      if (!opts.mallowOut) add('merchantcat',{x:4,z:3,name:'Mallow'},'shop');   // mornings he's out front, opening up
      add('bookshelf',{x:10,z:0},'shop');
      for (const [i,item] of stock.slice(0,4).entries()) {
        const x=1+(i%2)*6,z=6+Math.floor(i/2)*4;
        const t=item.piece&&L.CAT[item.piece]?.kind==='floor'?item.piece:'nightstand';
        const display=add(t,{x,z,c:0},'shop');
        if (!display) add('nightstand',{x,z},'shop');
        if(display?.t==='nightstand')add(item.piece&&L.CAT[item.piece]?.kind==='small'?item.piece:'books',{p:display.id,lx:0,lz:0},'shop');
      }
      // A stocked counter remains available even after the collection is complete.
      add('desk',{x:10,z:3},'shop');
    } else {
      add('filecab',{x:1,z:0},'mail');add('filecab',{x:2,z:0},'mail');add('filecab',{x:3,z:0},'mail');
      const papers=add('desk',{x:1,z:2},'mail');
      if(papers)add('morningpaper',{p:papers.id,lx:0,lz:0},'mail');
      add('bookshelf',{x:10,z:0},'mail');
      add('mailbox',{x:9,z:3},'mail');
      const writing=add('desk',{x:2,z:6},'compose');
      if(writing)add('letterbox',{p:writing.id,lx:0,lz:0},'mailbox');
      add('chair',{x:3,z:8,r:2});
      add('sofa',{x:9,z:9,c:1});
    }
    return {data:room.serialize(),actions};
  }
  const api = { KEY, PLACES, FRONTS, DOING, residents, sayAround, briefColumn, hemisphere, seasonNote, birthdays, dressing, shelf, cycleDays, away, letters, notices, skyNote, daysBetween, seededOrder, create, createView, interior, outside, STREET, NEIGHBORS, neighbors, talk, answer, discoveries, keptLetters, giftFor, restSpot, GOODNIGHTS, recap, PLANTS, GROW, BENCH_STEPS, BENCH_COLORS, COURT, cleanTown, projects, growth, townPieces, townNotes, remark, VISITORS, LANE_LETTERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LRLane = api;
})(typeof window !== 'undefined' ? window : globalThis);
