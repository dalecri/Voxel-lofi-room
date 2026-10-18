const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const F=require('../french.js');
const C=require('../calendar.js');
const W=require('../widgets.js');
const LR=require('../room.js');

function fixture(){const values={};const store={get:(k,d)=>structuredClone(values[k]??d),set:(k,v)=>{values[k]=structuredClone(v);}};return {values,store};}
const file=fs.readFileSync(require.resolve('../assets/french.json'),'utf8');
const vocab=F.parseVocabulary(file,()=>assert.fail('the synced vocabulary should already be valid'));
const tiny='abcdef'.split('').map(id=>({id,deck:'d',fr:id,en:'en-'+id,type:'noun',ex:'ex-'+id,exEn:'exn-'+id,ipa:'/a/',say:'AY'}));

test('vocabulary loads from the Wordnest copy and skips malformed cards',()=>{
  assert.match(file.split(/\r?\n/,1)[0],/Synced from dalecri\/Wordnest/);
  assert.equal(vocab.cards.length,803);
  assert.equal(vocab.categories.length,19);
  assert.equal(F.deckRows(vocab.cards,vocab.categories).reduce((sum,deck)=>sum+deck.count,0),803);
  assert.ok(F.deckRows(vocab.cards,vocab.categories).some(deck=>deck.label==='First words'&&deck.count===15));
  assert.ok(vocab.cards.every(card=>card.id&&card.fr&&card.en&&card.deck));
  const warnings=[];
  const parsed=F.parseVocabulary('// keep this note\n{"categories":[{"id":"basics","label":"First words"}],"cards":[{"id":"ok","deck":"basics","fr":"Oui","en":"Yes","type":"word","ex":"Oui.","exEn":"Yes.","ipa":"/wi/","say":"WEE"},{"fr":"no id"},{"id":"x","en":"missing french"},null]}',message=>warnings.push(message));
  assert.equal(parsed.cards.length,1);
  assert.equal(parsed.cards[0].label,'First words');
  assert.equal(warnings.length,3);
  assert.deepEqual(F.parseVocabulary('{"cards":"nope"}',()=>{}),{cards:[],categories:[]});
  const repeat=[];
  assert.equal(F.parseVocabulary('[{"id":"a","fr":"un","en":"one"},{"id":"a","fr":"deux","en":"two"}]',message=>repeat.push(message)).cards.length,1);
  assert.equal(repeat.length,1);
});

test('deck picker filters the session and starts with every deck checked',()=>{
  const {store}=fixture(),model=F.create({store,cards:vocab});
  assert.equal(model.selection().length,19);
  model.setDecks(['numbers','food']);
  assert.deepEqual(model.selection(),['numbers','food']);
  const session=model.start();
  assert.equal(session.planned,F.LIMIT);
  assert.ok(session.queue.every(id=>['numbers','food'].includes(vocab.cards.find(card=>card.id===id).deck)));
  model.setDecks([]);
  assert.equal(model.start().planned,0);
  const reloaded=F.create({store,cards:vocab});
  assert.deepEqual(reloaded.selection(),[]);
});

test('flip reveals the English, example, translation and pronunciation',()=>{
  const {store}=fixture(),model=F.create({store,cards:vocab});
  model.start(['basics']);
  const card=model.view().card;
  assert.equal(F.face(card,false).word,card.fr);
  assert.equal(F.face(card,false).type,card.type);
  assert.equal(model.act('known').queue[0],card.id);
  model.act('flip');
  const back=F.face(model.view().card,true);
  assert.equal(back.side,'back');
  assert.equal(back.word,card.en);
  assert.equal(back.example,card.ex);
  assert.equal(back.translation,card.exEn);
  assert.equal(back.say,card.say);
  assert.equal(back.ipa,card.ipa);
  assert.equal(card.fr,'Bonjour');
  assert.equal(back.word,'Hello');
});

test('still learning cards return sooner than a skip, and a round cannot loop forever',()=>{
  const learning=F.rotate(tiny,'learning').map(card=>card.id);
  const skipped=F.rotate(tiny,'skip').map(card=>card.id);
  assert.deepEqual(learning,['b','c','d','a','e','f']);
  assert.deepEqual(skipped,['b','c','d','e','f','a']);
  assert.ok(learning.indexOf('a')<skipped.indexOf('a'));
  const {store}=fixture(),model=F.create({store,cards:tiny});
  model.start(['d']);
  model.act('flip');
  assert.deepEqual(model.act('learning').queue,learning);
  model.start(['d']);
  assert.deepEqual(model.act('skip').queue,skipped);
  const one=F.create({store:fixture().store,cards:[{id:'a',deck:'d',fr:'A',en:'A'}]});
  one.start(['d']);
  one.act('flip');one.act('learning');
  assert.equal(one.view().done,false);
  one.act('flip');one.act('learning');
  assert.equal(one.view().done,true);
  assert.equal(one.view().queue.length,0);
});

test('progress stays attached to card ids when the vocabulary changes',()=>{
  const {values,store}=fixture();
  values[F.KEY]={v:1,cards:{'retired-word':{status:'known',updatedAt:4}},decks:null};
  const model=F.create({store,cards:tiny,now:()=>new Date(2026,9,17,9)});
  model.start(['d']);
  model.act('flip');model.act('known');
  const reloaded=F.create({store,cards:tiny.filter(card=>card.id!=='a').concat([{id:'new-word',deck:'d',fr:'Neuf',en:'New'}])});
  assert.equal(reloaded.progress().cards.a.status,'known');
  assert.equal(reloaded.progress().cards['retired-word'].status,'known');
  assert.equal(reloaded.progress().cards.a.updatedAt,+new Date(2026,9,17,9));
  assert.equal(JSON.stringify(values).includes('en-a'),false);
  const studied=[];
  const session=F.create({store:fixture().store,cards:tiny,onStudied:()=>studied.push('french')});
  session.start(['d']);session.close();
  session.act('flip');session.act('learning');session.close();session.close();
  assert.deepEqual(studied,['french']);
  const calendar=C.create({store});
  assert.equal(calendar.append('french',{id:'2026-10-17'}),true);
  assert.equal(calendar.append('french',{id:'2026-10-17'}),false);
  assert.ok(C.activityWords(['french']).includes('Studied French'));
  assert.ok(C.activityWords(['french','french']).includes('Studied French 2 times'));
});

test('the word of the day is the same card for a date and can change on another date',()=>{
  const first=F.wordOfDay(vocab.cards,'2026-10-17');
  assert.equal(first.id,F.wordOfDay(vocab.cards,'2026-10-17').id);
  assert.equal(F.wordOfDay([],'2026-10-17'),null);
  assert.equal(F.wordOfDay(vocab.cards,'17 October'),null);
  const seen=new Set();
  for(let day=1;day<=28;day++)seen.add(F.wordOfDay(vocab.cards,`2026-10-${String(day).padStart(2,'0')}`).id);
  assert.ok(seen.size>1);
  const {store}=fixture(),model=F.create({store,cards:vocab,now:()=>new Date(2026,9,17,12)});
  assert.equal(model.word().id,first.id);
  assert.notEqual(model.word('2026-10-18').id,first.id);
});

test('the French corner is a placeable desk and its words stay out of room codes',()=>{
  assert.equal(LR.CAT.frenchdesk.name,'French corner');
  assert.equal(LR.CAT.frenchdesk.tap,'french');
  assert.deepEqual(LR.CAT.frenchdesk.size,[2,1]);
  const model=new LR.Model();
  LR.CAT.frenchdesk.build(model,LR.CAT.frenchdesk.vars[0],{on:true});
  assert.ok(model.parts.main.vox.size>40);
  const shared=W.shareDecor({v:1,name:'Study',n:10,wall:{style:'paint'},floor:{style:'wood'},items:[{id:1,t:'frenchdesk',x:1,z:1,fr:'PRIVATE_FRENCH',progress:{status:'known'}}]});
  assert.equal(shared.items[0].t,'frenchdesk');
  assert.equal(JSON.stringify(shared).includes('PRIVATE_FRENCH'),false);
});

test('quick reviews persist against the same card ids without changing the study queue',()=>{
 const {store,values}=fixture();let studied=0;
 const model=F.create({store,cards:tiny,now:()=>new Date(2026,9,18,12),onStudied:()=>studied++});
 model.start(['d']);const queue=model.view().queue;
 const card=model.word();assert.equal(model.review(card.id,'known'),true);
 assert.equal(values[F.KEY].cards[card.id].status,'known');assert.deepEqual(model.view().queue,queue);
 assert.equal(model.review(card.id,'learning'),true);assert.equal(studied,2);
 assert.equal(F.create({store,cards:tiny}).progress().cards[card.id].status,'learning');
 assert.equal(model.review('missing','known'),false);assert.equal(model.review(card.id,'other'),false);assert.equal(studied,2);
 assert.deepEqual(Object.keys(values),[F.KEY]);assert.deepEqual(model.selection(),['d']);
});
test('browsing another word advances and wraps without grading or changing the daily word',()=>{
 const {store}=fixture(),model=F.create({store,cards:tiny,now:()=>new Date(2026,9,18,12)}),daily=model.word();
 assert.notEqual(model.nextWord(daily.id).id,daily.id);assert.equal(model.nextWord('f').id,'a');
 assert.equal(model.word().id,daily.id);assert.deepEqual(model.progress().cards,{});
 assert.equal(F.create({store,cards:[]}).nextWord('none'),null);
});
