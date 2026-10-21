// One directory for Home and the phone. Tool entries navigate to existing UIs;
// external apps are derived from the real portal definitions and private links.
(function(root) {
  const TOOLS=[
    ['typewriter','Notetaker','📝','Lists and notes'],
    ['digest','Daily Brief','🗞','Your morning paper at the door'],
    ['captions','Caption studio','🎬','TwoStoryTails clips, ready to copy'],
    ['library','My Library','📖','Letters, sparks, and quick notes'],
    ['mailbox','Future-self mailbox','✉','Send a note to later'],
    ['groceries','Grocery list','🥬','A little less to remember'],
    ['mood','Mood tracker','☺','A moment to check in'],
    ['ideas','Idea jar','💡','Keep a spark for later'],
    ['tea','Tea timer','🫖','Put the kettle on'],
    ['tally','Pushup tally','＋','One rep at a time'],
    ['habits','Habit Pots','🪴','Little habits that grow'],
    ['savings','Savings jar','🪙','Small steps toward a goal'],
    ['sketch','Pixel maker','▦','Make a little pixel picture'],
    ['french','French flashcard','🇫🇷','Your word for today'],
    ['whiteboard','Whiteboard','▤','Room for a thought'],
    ['breathing','Breathing room','☾','Ten minutes in your room'],
    ['wardrobe','Wardrobe','👕','Dress the little dude'],
    ['merchant','Traveling merchant','🐈','Visit Mallow’s shop'],
    ['letters','Saved letters','✉','Open your drafts'],
    ['scenes','Saved scenes','▧','Keep a room memory'],
    ['photos','Photo album','📷','Your room snapshots'],
    ['camera','Room camera','◎','Take a photo'],
    ['calendar','Calendar','📅','A little memory of your days'],
    ['newspaper','Newspaper','📰','Read the headlines'],
    ['tst','TwoStoryTails','📌','Your published captions'],
    ['todo','To-Do','✓','Your list for today'],
    ['moments','Cozy moments','✦','The checklist and the cats’ version'],
    ['rooms','Rooms','⌂','Your home and new places'],
    ['sound','Radio & sound','♫','Choose what’s playing'],
    ['settings','Settings','⚙','Weather, motion and room settings'],
  ].map(([id,label,icon,description])=>({id,label,icon,description,...(['mailbox','letters'].includes(id)?{iconSrc:'assets/mailbox-access.png'}:{})}));
  // The first ID is the preview when absent. Any matching piece in the room
  // supplies its actual model and variant; an absent asset is grayed in CSS only.
  const FURNITURE={digest:['morningpaper'],mood:['moodjournal'],captions:['captionboard'],tally:['tallycounter'],habits:['habitpot'],library:['lectern'],calendar:['calendar'],typewriter:['typewriter'],mailbox:['letterbox','mailbox'],groceries:['minifridge'],ideas:['ideajar'],tea:['kettle'],savings:['savingsjar','tipjar'],sketch:['sketchbook'],french:['frenchdesk'],whiteboard:['whiteboard'],wardrobe:['dresser'],merchant:['marketstall'],letters:['filecab'],scenes:['filecab'],photos:['filecab'],newspaper:['newspaper'],tst:['tstcorkboard'],sound:['record','jukebox']};
  function furniture(entry,items,CAT) {
    const ids=entry.furnitureId?[entry.furnitureId]:FURNITURE[entry.id] || [];
    const it=items.find(i=>!i.visitor&&ids.includes(i.t));
    const id=it?.t || ids.find(id=>CAT[id]);
    return id?{id,variant:it?.c || 0,present:!!it}:null;
  }
  function destinations(CAT,widgets,custom,portals) {
    return [...TOOLS.map(t=>({...t})),...portals(CAT,widgets,custom).map(p=>({...p,id:'portal:'+p.url,description:p.custom?'Your private link':'Open app'}))];
  }
  const api={TOOLS,FURNITURE,furniture,destinations};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRLauncher=api;
})(typeof window!=='undefined'?window:globalThis);
