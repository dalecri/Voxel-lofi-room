const {test}=require('node:test'),assert=require('node:assert/strict');
const QR=require('../room-qr.js');
function raster(matrix,cell=5){const n=(matrix.length+QR.QUIET*2)*cell,data=new Uint8ClampedArray(n*n*4).fill(255);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const r=Math.floor(y/cell)-QR.QUIET,c=Math.floor(x/cell)-QR.QUIET;if(matrix[r]?.[c]){const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=0;}}return {data,n};}
test('vendored byte encoder and decoder preserve exact room strings with four-module quiet zone',()=>{
 for(const size of [40,600,1800,2300]){const code='LR1.'+'Abcdef_0123456789-'.repeat(Math.ceil(size/18)).slice(0,size),qr=QR.encode(code),pixels=raster(qr.matrix);assert.equal(qr.level,code.length<=256?'L':'M');assert.equal(QR.decode(pixels.data,pixels.n,pixels.n),code);assert.ok(qr.matrix.every(row=>row.length===qr.matrix.length));}
 assert.equal(QR.QUIET,4);assert.equal(QR.decode(new Uint8ClampedArray(100*100*4).fill(255),100,100),null);
 assert.throws(()=>QR.encode('LR1.'+'x'.repeat(2400)),/capacity/);assert.throws(()=>QR.encode('LRG1.abc'),/room code/);
});
test('image sharing uses native cached files, browser files, or the unchanged room text fallback',async()=>{
 const calls=[],file={type:'image/png'},code='LR1.exact';const nav={canShare:()=>true,share:async options=>calls.push(options)};
 await QR.shareImage({data:'data:image/png;base64,AAA',file,code,cap:null,nav});assert.deepEqual(calls.pop(),{title:'My Lofi Room',files:[file]});
 nav.canShare=()=>false;await QR.shareImage({file,code,cap:null,nav});assert.deepEqual(calls.pop(),{title:'My Lofi Room',text:code});
 const cap={isNativePlatform:()=>true,registerPlugin:name=>name==='Filesystem'?{writeFile:async opts=>{calls.push(opts);return {uri:'cache/qr.png'};}}:{share:async opts=>calls.push(opts)}};
 await QR.shareImage({data:'data:image/png;base64,AAA',file,code,cap,nav});assert.equal(calls[0].data,'AAA');assert.equal(calls[0].directory,'CACHE');assert.deepEqual(calls[1].files,['cache/qr.png']);
 let copied;await QR.shareImage({file,code,cap:null,nav:{clipboard:{writeText:async text=>copied=text}}});assert.equal(copied,code);
});
test('unsupported file sharing falls back to text, while cancellation stays cancelled',async()=>{
 const calls=[],unsupported=Object.assign(Error('unsupported files'),{name:'NotSupportedError'}),nav={canShare:()=>true,share:async options=>{calls.push(options);if(options.files)throw unsupported;}};
 await QR.shareImage({file:{},code:'LR1.exact',cap:null,nav});assert.equal(calls.length,2);assert.equal(calls[1].text,'LR1.exact');
 const cancelled=Object.assign(Error('cancelled'),{name:'AbortError'});calls.length=0;nav.share=async options=>{calls.push(options);throw cancelled;};await assert.rejects(()=>QR.shareImage({file:{},code:'LR1.exact',cap:null,nav}),{name:'AbortError'});assert.equal(calls.length,1);
 const cap={isNativePlatform:()=>true,registerPlugin:name=>name==='Filesystem'?{writeFile:async()=>{throw unsupported;}}:{share:async options=>calls.push(options)}};calls.length=0;await QR.shareImage({data:'data:image/png;base64,AAA',file:{},code:'LR1.exact',cap});assert.deepEqual(calls,[{title:'My Lofi Room',text:'LR1.exact'}]);
});
test('voxel colours follow the generator: theme colours in the middle, edge colours on the finders, same code same colours',()=>{
 const qr=QR.encode('LR1.'+'Abc_123-'.repeat(40)),n=qr.matrix.length,dark=qr.matrix.flat().filter(Boolean).length;
 for(const [id,t] of Object.entries(QR.THEMES)){
  const out=QR.colours(qr.matrix,id,'seed');assert.equal(out.length,dark);
  for(const [r,c,hex,finder] of out){assert.ok(qr.matrix[r][c]);if(finder)assert.ok(t.edge.includes(hex),id);else assert.ok(t.qr.includes(hex)||t.edge.includes(hex),id);}
  const middle=out.filter(([r,c])=>Math.abs(r-n/2)<n/8&&Math.abs(c-n/2)<n/8);assert.ok(middle.filter(([,,hex])=>t.qr.includes(hex)).length>middle.length*.8,id);
 }
 assert.deepEqual(QR.colours(qr.matrix,'blossom','a'),QR.colours(qr.matrix,'blossom','a'));
 assert.deepEqual(QR.colours(qr.matrix,'nope','a'),QR.colours(qr.matrix,'blossom','a'));
});
