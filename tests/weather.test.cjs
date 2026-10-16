const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../weather.js');
const GEO={coords:{latitude:43.653226,longitude:-79.383184}};
function fixture(extra={}) {
 const meta={liveWeather:false,weather:'snow',weatherFetchedAt:5},saved=[],applied=[],notices=[],requests=[];let time=1000,locations=0,response={current:{weathercode:63,wind_speed_10m:20}};
 const deps={meta,save:()=>saved.push(structuredClone(meta)),applyWeather:(...v)=>applied.push(v),notice:v=>notices.push(v),now:()=>time,visible:()=>true,
 geolocation:{getCurrentPosition(ok){locations++;ok(GEO);}},fetchWeather:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>response};},...extra};
 const controller=W.create(deps);return {controller,meta,saved,applied,notices,requests,locations:()=>locations,advance:n=>{time+=n;},response:r=>{response=r;}};
}
test('all WMO codes 0–99 map to a supported sky, with every specified code mapped explicitly',()=>{
 assert.deepEqual(W.STATES,['clear','rain','storm','snow']);for(let code=0;code<=99;code++)assert.ok(W.STATES.includes(W.condition(code)),code);
 for(const [sky,codes] of Object.entries({clear:[0,1,2,3,45,48],rain:[51,53,55,56,57,61,63,65,66,67,80,81,82],snow:[71,73,75,77,85,86],storm:[95,96,99]}))for(const code of codes)assert.equal(W.condition(code),sky);
 assert.equal(W.condition(4),'clear');assert.equal(W.condition(100),'clear');
});
test('weather is opt-in; enabling requests location once and sends only rounded coordinates',async()=>{
 const f=fixture();await f.controller.refresh();assert.equal(f.locations(),0);assert.equal(f.requests.length,0);await f.controller.setEnabled(true);assert.equal(f.locations(),1);assert.equal(f.requests.length,1);
 const url=new URL(f.requests[0].url);assert.equal(url.origin,'https://api.open-meteo.com');assert.equal(url.pathname,'/v1/forecast');assert.equal(url.searchParams.get('latitude'),'43.7');assert.equal(url.searchParams.get('longitude'),'-79.4');assert.equal(url.searchParams.get('current'),'weathercode,wind_speed_10m');assert.equal(url.searchParams.get('timezone'),'auto');
 assert.deepEqual(f.applied,[['rain',true]]);assert.equal(f.meta.weather,'rain');assert.equal(f.meta.weatherFetchedAt,1000);assert.equal(f.controller.soundWind(.2),.5);
 assert.equal(f.requests[0].options.cache,'no-store');assert.equal(f.requests[0].options.credentials,'omit');assert.equal(f.requests[0].options.referrerPolicy,'no-referrer');assert.deepEqual(Object.keys(f.meta).sort(),['liveWeather','weather','weatherFetchedAt']);for(const s of f.saved)assert.ok(!JSON.stringify(s).includes('latitude')&&!JSON.stringify(s).includes('43.653226'));
 await f.controller.refresh();assert.equal(f.requests.length,1);f.advance(W.INTERVAL);await f.controller.refresh();assert.equal(f.requests.length,2);assert.equal(f.locations(),1);
});
test('denial or unavailable geolocation switches the setting back off, with a reason and no fetch',async()=>{
 const f=fixture({geolocation:{getCurrentPosition(ok,fail){fail({code:1});}}});await f.controller.setEnabled(true);assert.equal(f.meta.liveWeather,false);assert.equal(f.meta.weather,'snow');assert.equal(f.requests.length,0);assert.deepEqual(f.notices,['Location denied — live weather stays off']);assert.equal(f.saved.at(-1).liveWeather,false);
 const missing=fixture({geolocation:null});await missing.controller.setEnabled(true);assert.equal(missing.controller.enabled,false);assert.ok(missing.notices[0].includes('unavailable'));
});
test('network, HTTP and malformed responses keep the last state silently; next cycle retries',async()=>{
 for(const fetchWeather of [async()=>{throw Error('offline');},async()=>({ok:false}),async()=>({ok:true,json:async()=>({current:{weathercode:null,wind_speed_10m:null}})})]){
  const f=fixture({fetchWeather});await f.controller.setEnabled(true);assert.equal(f.meta.weather,'snow');assert.equal(f.meta.weatherFetchedAt,5);assert.equal(f.meta.liveWeather,true);assert.equal(f.applied.length,0);assert.equal(f.notices.length,0);
 }
 const f=fixture();await f.controller.setEnabled(true);f.response({});f.advance(W.INTERVAL);await f.controller.refresh();assert.equal(f.meta.weather,'rain');assert.equal(f.meta.weatherFetchedAt,1000);assert.equal(f.controller.soundWind(0),.5);f.response({current:{weathercode:95,wind_speed_10m:60}});await f.controller.refresh();assert.equal(f.requests.length,2);f.advance(W.INTERVAL);await f.controller.refresh();assert.equal(f.meta.weather,'storm');assert.equal(f.controller.soundWind(0),1);
});
test('saved opt-in refreshes on boot, then waits 30 minutes; hidden apps wait for the foreground',async()=>{
 const f=fixture();f.meta.liveWeather=true;await f.controller.refresh();assert.equal(f.requests.length,1);
 let visible=false;const h=fixture({visible:()=>visible});h.meta.liveWeather=true;await h.controller.refresh();assert.equal(h.locations(),0);visible=true;await h.controller.refresh();assert.equal(h.requests.length,1);
 const deny=fixture({geolocation:{getCurrentPosition(ok,fail){fail({code:1});}}});deny.meta.liveWeather=true;await deny.controller.refresh();assert.equal(deny.meta.liveWeather,false);
});
test('manual control immediately disables live weather and ignores an in-flight response or stale location callback',async()=>{
 let finish;const f=fixture({fetchWeather:()=>new Promise(r=>{finish=r;})});const job=f.controller.setEnabled(true);await new Promise(r=>setImmediate(r));assert.equal(typeof finish,'function');f.controller.manual();finish({ok:true,json:async()=>({current:{weathercode:95,wind_speed_10m:90}})});await job;assert.equal(f.meta.liveWeather,false);assert.equal(f.meta.weather,'snow');assert.equal(f.applied.length,0);assert.equal(f.controller.soundWind(.4),.4);assert.deepEqual(f.notices,["Live weather off — you're in charge of the sky now"]);
 let locate;const old=fixture({geolocation:{getCurrentPosition(ok){locate=ok;}}});const request=old.controller.setEnabled(true);await new Promise(r=>setImmediate(r));await old.controller.setEnabled(false);locate(GEO);await request;assert.equal(old.requests.length,0);assert.equal(old.meta.liveWeather,false);
});
test('invalid positions never reach the network; wind is bounded for the existing sound layer',()=>{
 assert.throws(()=>W.forecastURL({latitude:Infinity,longitude:0}));assert.throws(()=>W.forecastURL({latitude:0,longitude:181}));assert.equal(W.windFactor(-5),0);assert.equal(W.windFactor(0),0);assert.equal(W.windFactor(10),.25);assert.equal(W.windFactor(80),1);
});
test('manual override applies the chosen sky while disabled, then gives feedback after normal weather toasts',()=>{
 const events=[],f=fixture({notice:text=>events.push(text)});f.meta.liveWeather=true;
 assert.equal(f.controller.manual(()=>{assert.equal(f.meta.liveWeather,false);events.push('manual sky');}),true);
 assert.deepEqual(events,['manual sky',"Live weather off — you're in charge of the sky now"]);
 f.controller.manual(()=>events.push('another manual sky'));assert.equal(events.at(-1),'another manual sky');assert.equal(events.length,3);
});
