// node tests/backdrop.test.cjs. The outdoor backdrop painter is pure, so it is checked here.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const B=require('../backdrop.js'),L=require('../room.js');
const day={top:'#8ccaf0',bot:'#e4f4fb',night:0},night={top:'#141a3c',bot:'#2e3a70',night:1};
const lum=(px,W,H)=>{let s=0,n=0;for(let i=0;i<W*H*4;i+=4)if(px[i+3]){s+=px[i]+px[i+1]+px[i+2];n++;}return s/n;};
test('every window view has a backdrop, and every backdrop is a window view',()=>{
 assert.deepEqual([...B.VIEWS].sort(),[...L.VIEWS].sort());for(const v of L.VIEWS)assert.ok(B.NAMES[v]);
 assert.ok(L.VIEWS.includes('hills'));assert.ok(L.VIEWS.includes('laurentians'));
});
test('each view paints land below a clear sky, differently, and the same every time',()=>{
 const W=120,H=200,seen=new Set();
 for(const view of B.VIEWS){
  const px=B.paint({view,W,H,...day});assert.equal(px.length,W*H*4);
  for(let x=0;x<W;x++)assert.equal(px[(2*W+x)*4+3],0,view+': the top rows stay sky');
  for(let x=0;x<W;x++)assert.equal(px[((H-1)*W+x)*4+3],255,view+': the bottom row is land');
  let solid=0;for(let i=3;i<px.length;i+=4){assert.ok(px[i]===0||px[i]===255);solid+=px[i]?1:0;}
  assert.ok(solid>W*H*0.5&&solid<W*H*0.85,view+' covers '+solid/(W*H));
  assert.deepEqual(B.paint({view,W,H,...day}),px,'deterministic');seen.add(Buffer.from(px).toString('base64'));
 }
 assert.equal(seen.size,B.VIEWS.length);
});
test('night falls over the land, rain greys it, and an unknown view falls back to the city',()=>{
 const W=96,H=160;
 for(const view of B.VIEWS){const a=lum(B.paint({view,W,H,...day}),W,H),b=lum(B.paint({view,W,H,...night}),W,H);assert.ok(b<a*0.6,view+' darkens: '+a+' → '+b);}
 assert.notDeepEqual(B.paint({view:'hills',W,H,...day,rain:true}),B.paint({view:'hills',W,H,...day}));
 assert.deepEqual(B.paint({view:'nowhere',W,H,...day}),B.paint({view:'city',W,H,...day}));
 assert.equal(B.paint({view:'hills',W:1,H:1,...day}).length,4,'tiny canvases never throw');
});
test('windows show the two new views, by day and by night',()=>{
 for(const view of ['hills','laurentians'])for(const phase of ['morning','day','evening','night']){
  const colours=new Set();for(let u=0;u<14;u++)for(let y=0;y<22;y++){const c=L.skyColor(phase,false,u,y,7,view);assert.ok(Number.isFinite(c));colours.add(c&0xffffff);}
  assert.ok(colours.size>4,view+' at '+phase+' is more than flat sky');
 }
 assert.notEqual(L.skyColor('day',false,3,1,7,'hills'),L.skyColor('day',false,3,1,7,'forest'));
});
test('the app loads the backdrop before the renderer, and the build ships it',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),build=fs.readFileSync(require.resolve('../scripts/build-www.mjs'),'utf8');
 assert.ok(html.indexOf('src="backdrop.js"')>0&&html.indexOf('src="backdrop.js"')<html.indexOf('src="render.js"'));
 assert.match(html,/<canvas id="backdrop" aria-hidden="true"><\/canvas>/);assert.match(build,/'backdrop\.js'/);
});
