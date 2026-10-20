const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../launcher.js'),D=require('../dashboard.js'),LR=require('../room.js'),W=require('../widgets.js');
require('../furniture.js');W.register(LR);
function fixture(){const data=new Map(),store={get:(k,d)=>structuredClone(data.get(k)??d),set:(k,v)=>data.set(k,structuredClone(v))};return {store,data};}
test('one tool directory includes every private room tool and file section with unique stable IDs',()=>{
 const ids=L.TOOLS.map(t=>t.id);assert.equal(new Set(ids).size,ids.length);assert.ok(!ids.includes('focus'));
 for(const id of ['mood','tally','typewriter','mailbox','groceries','ideas','tea','savings','sketch','french','whiteboard','breathing','wardrobe','merchant','letters','scenes','photos','camera','newspaper','tst','todo','moments','captions','digest','rooms','sound','settings'])assert.ok(ids.includes(id),id);
 assert.ok(L.TOOLS.every(t=>t.label&&t.icon&&t.description&&!t.url));
});
test('Home directory derives actual portal/widget destinations and reflects private custom links after reload',()=>{
 const {store,data}=fixture(),widgets=W.create({store}),model=D.create({store});model.addPortal('Private bank','https://example.com/my-bank');
 const apps=L.destinations(LR.CAT,widgets,D.create({store}).custom,D.destinations);
 assert.equal(apps.find(p=>p.furnitureId==='terrarium').url,'https://heycristobal.com/voxel-worlds/');
 assert.equal(apps.find(p=>p.furnitureId==='pomodorocandle').url,W.POMODORO_URL);
 assert.equal(apps.find(p=>p.label==='Private bank').url,'https://example.com/my-bank');assert.ok(data.has('lr.portals'));
 const portalApps=apps.filter(p=>p.url);assert.equal(new Set(portalApps.map(p=>p.url)).size,portalApps.length);
 // Returned rows are disposable views, not mutable application config or room data.
 apps[0].label='Changed';assert.equal(L.TOOLS[0].label,'Typewriter');
 const decor=W.shareDecor({...new LR.Room().serialize(),apps,portals:model.custom});assert.ok(!JSON.stringify(decor).includes('my-bank'));
});

test('French previews follow the corner desk and never a fridge',()=>{require('../french.js');assert.deepEqual(L.FURNITURE.french,['frenchdesk']);assert.deepEqual(L.furniture({id:'french'},[{t:'minifridge',c:1}],LR.CAT),{id:'frenchdesk',variant:0,present:false});assert.deepEqual(L.furniture({id:'french'},[{t:'frenchdesk',c:2}],LR.CAT),{id:'frenchdesk',variant:2,present:true});});


test('Mood tracker previews the placed journal cover',()=>{require('../room-tools.js').register(LR);assert.deepEqual(L.FURNITURE.mood,['moodjournal']);assert.deepEqual(L.furniture({id:'mood'},[],LR.CAT),{id:'moodjournal',variant:0,present:false});assert.deepEqual(L.furniture({id:'mood'},[{t:'moodjournal',c:2}],LR.CAT),{id:'moodjournal',variant:2,present:true});});
