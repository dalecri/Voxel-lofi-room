// Backup: everything you've made, in one file you keep. A backup is a plain JSON
// file of the app's saved values. Sign-in tokens and rebuildable caches are left out.
(function(root){
  'use strict';
  const FORMAT='lofi-rooms-backup',VERSION=1,PREFIX='lr.',LAST='lr.lastBackup';
  // Never in a backup: sign-in tokens (private, and they expire) and caches the app rebuilds.
  const SKIP=new Set(['lr.googleCalendarToken','lr.roomSnapshots','lr.captionDesk']);
  const kept=k=>typeof k==='string'&&k.startsWith(PREFIX)&&!SKIP.has(k)&&!/token/i.test(k);
  function keys(storage){const out=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(kept(k))out.push(k);}return out.sort();}
  function build(storage,now=Date.now()){
    const data={};for(const k of keys(storage)){const v=storage.getItem(k);if(typeof v==='string')data[k]=v;}
    return {format:FORMAT,v:VERSION,app:'Lofi Rooms',createdAt:new Date(now).toISOString(),count:Object.keys(data).length,data};
  }
  const fileName=(now=Date.now())=>{const d=new Date(now);return `lofi-rooms-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;};
  // A backup must be ours, and every value must be text the app can read back.
  function parse(text){
    let raw;try{raw=JSON.parse(text);}catch(e){throw Error('That file isn’t a Lofi Rooms backup.');}
    if(!raw||raw.format!==FORMAT||typeof raw.data!=='object'||Array.isArray(raw.data)||!raw.data)throw Error('That file isn’t a Lofi Rooms backup.');
    if(Number(raw.v)>VERSION)throw Error('This backup is from a newer version of the app. Update the app, then try again.');
    const data={};
    for(const [k,v] of Object.entries(raw.data)){if(!kept(k)||typeof v!=='string')continue;try{JSON.parse(v);}catch(e){continue;}data[k]=v;}
    if(!Object.keys(data).length)throw Error('That backup is empty.');
    const at=Date.parse(raw.createdAt);
    return {createdAt:Number.isFinite(at)?at:null,count:Object.keys(data).length,rooms:Array.isArray(safeJSON(data['lr.rooms']))?safeJSON(data['lr.rooms']).length:0,data};
  }
  function safeJSON(v){try{return JSON.parse(v);}catch(e){return null;}}
  // Restore replaces what's on this device: saved values not in the backup are removed.
  function apply(parsed,storage,{set=(k,v)=>storage.setItem(k,v),del=k=>storage.removeItem(k)}={}){
    for(const k of keys(storage))if(!(k in parsed.data))del(k);
    for(const [k,v] of Object.entries(parsed.data))set(k,v);
    return parsed.count;
  }
  const api={FORMAT,VERSION,LAST,SKIP,kept,keys,build,fileName,parse,apply};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRBackup=api;
})(typeof window!=='undefined'?window:globalThis);
