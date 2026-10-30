const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../room.js'),W=require('../widgets.js');require('../furniture.js');W.register(L);
test('retired reading tools keep buildable, unlinked decor through old-room and code loads',()=>{
 const room=new L.Room();room.items=[];
 for(const type of ['lectern','newspaper','pomodorocandle']){
  const C=L.CAT[type];assert.equal(C.tap,undefined,type);assert.equal(C.link,undefined);assert.equal(C.url,undefined);
  for(const palette of C.vars){const m=new L.Model();assert.doesNotThrow(()=>C.build(m,palette,{}));assert(Object.values(m.parts).some(p=>p.vox.size));}
  room.add(room.make(type,{x:room.items.length*2,z:1}));
 }
 const code=W.shareDecor({...room.serialize(),library:{notes:['PRIVATE_READING_NOTE']},widgets:{newspaper:{headlines:['PRIVATE_NEWS']}}});assert(!JSON.stringify(code).includes('PRIVATE_'));
 const restored=new L.Room();assert(restored.load(code));assert.deepEqual(restored.items.map(i=>i.t),['lectern','newspaper','pomodorocandle']);
});
