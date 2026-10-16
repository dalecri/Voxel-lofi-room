// One directory for Home and the phone. Tool entries navigate to existing UIs;
// external apps are derived from the real portal definitions and private links.
(function(root) {
  const TOOLS=[
    ['typewriter','Typewriter','⌨','Write a letter'],
    ['mailbox','Future-self mailbox','✉','Send a note to later'],
    ['groceries','Grocery list','🥬','A little less to remember'],
    ['ideas','Idea jar','💡','Keep a spark for later'],
    ['tea','Tea timer','🫖','Put the kettle on'],
    ['savings','Savings jar','🪙','Small steps toward a goal'],
    ['sketch','Sketchbook','✎','Make a little mark'],
    ['french','French flashcard','🇫🇷','Your word for today'],
    ['whiteboard','Whiteboard','▤','Room for a thought'],
    ['focus','Focus candle','🕯','Twenty-five quiet minutes'],
    ['breathing','Breathing room','☾','Ten minutes in your room'],
    ['wardrobe','Wardrobe','👕','Dress the little dude'],
    ['merchant','Traveling merchant','🐈','Visit Mallow’s shop'],
    ['letters','Saved letters','✉','Open your drafts'],
    ['scenes','Saved scenes','▧','Keep a room memory'],
    ['photos','Photo album','📷','Your room snapshots'],
    ['camera','Room camera','◎','Take a photo'],
    ['newspaper','Newspaper','📰','Read the headlines'],
    ['tst','TwoStoryTails plan','📌','Your posting corkboard'],
    ['journal','Journal','📖','Moments and the cats’ version'],
    ['rooms','Rooms','⌂','Your home and new places'],
    ['sound','Radio & sound','♫','Choose what’s playing'],
    ['settings','Settings','⚙','Weather, motion and room settings'],
  ].map(([id,label,icon,description])=>({id,label,icon,description}));
  function destinations(CAT,widgets,custom,portals) {
    return [...TOOLS.map(t=>({...t})),...portals(CAT,widgets,custom).map(p=>({...p,id:'portal:'+p.url,description:p.custom?'Your private link':'Open app'}))];
  }
  const api={TOOLS,destinations};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRLauncher=api;
})(typeof window!=='undefined'?window:globalThis);
