// Local room QR transport. The payload is the caller's already-sanitized LR0/LR1
// string, unchanged. No URL wrapper, account, network, or persisted QR state.
(function(root){
  const encoder=typeof module!=='undefined'&&module.exports?require('./vendor/qrcode-generator/qrcode.js'):root.qrcode;
  const decoder=typeof module!=='undefined'&&module.exports?require('./vendor/jsqr/jsQR.js'):root.jsQR;
  const QUIET=4,PIXELS=1536;
  function encode(code){
    if(!/^LR[01]\.[A-Za-z0-9_-]+$/.test(code))throw Error('Not a room code');
    const level=code.length<=256?'L':'M';
    // Byte-mode version 40 limits. Check before asking the encoder to allocate.
    if(code.length>(level==='L'?2953:2331))throw Error('Room code exceeds QR capacity');
    const qr=encoder(0,level);qr.addData(code,'Byte');qr.make();
    const n=qr.getModuleCount(),matrix=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>qr.isDark(r,c)));
    return {matrix,level};
  }
  function decode(pixels,width,height){return decoder(pixels,width,height,{inversionAttempts:'attemptBoth'})?.data || null;}
  function plain(canvas,matrix){
    const g=canvas.getContext('2d'),n=matrix.length,cell=Math.floor(canvas.width/(n+QUIET*2)),offset=Math.floor((canvas.width-n*cell)/2);
    g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.fillStyle='#000';
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(matrix[r][c])g.fillRect(offset+c*cell,offset+r*cell,cell,cell);
    return canvas;
  }
  // Voxel QR themes, matching the Voxel QR Tree generator: a white plate, the code in
  // coloured blocks (theme colours in the middle, the edge colours round the rim and on
  // the three finder squares), on a deep background.
  const THEMES={
    blossom:{label:'Cherry blossom',icon:'🌸',bg:0x160d16,qr:[0xf0a0c4,0xe07eaa,0xd4508b,0xcc4488,0xec407a],edge:[0x1b5e20,0x2e7d32,0x388e3c],petal:'#f5c0d8'},
    maple:{label:'Autumn maple',icon:'🍁',bg:0x180e08,qr:[0xe65100,0xef6c00,0xf57c00,0xd84315,0xff9800],edge:[0x1b5e20,0x2e7d32,0x388e3c],petal:'#ffb74d'},
    pine:{label:'Alpine pine',icon:'🌲',bg:0x09150f,qr:[0x2e7d32,0x388e3c,0x43a047,0x4caf50],edge:[0x1b5e20,0x003300],petal:'#a5d6a7'},
    frost:{label:'Winter frost',icon:'❄️',bg:0x08111a,qr:[0x0277bd,0x1565c0,0x0288d1,0x039be5],edge:[0x0d47a1,0x01579b],petal:'#e1f5fe'}
  };
  // Seeded, so the same code always paints the same colours.
  function seeded(text){let s=0;for(let i=0;i<text.length;i++)s=((s<<5)-s+text.charCodeAt(i))|0;return ()=>{s=(s*16807)%2147483647;if(s<0)s+=2147483647;return s/2147483647;};}
  // Pale shades (light pink, light orange) blur into the white plate for cameras, so any colour
  // brighter than a 3.2:1 contrast with white is deepened just enough. Darker shades stay as-is.
  function scanSafe(hex){
    const lin=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;},srgb=v=>Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055));
    const rgb=[hex>>16&255,hex>>8&255,hex&255].map(lin),L=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2],max=1.05/3.2-.05;
    if(L<=max)return hex;const k=max/L;const [r,g,b]=rgb.map(v=>Math.min(255,srgb(v*k)));return r<<16|g<<8|b;
  }
  const luminance=hex=>{const lin=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};return .2126*lin(hex>>16&255)+.7152*lin(hex>>8&255)+.0722*lin(hex&255);};
  const darkest=list=>list.reduce((a,b)=>luminance(b)<luminance(a)?b:a);
  function colours(matrix,theme,seed='room'){
    const t=THEMES[theme]||THEMES.blossom,n=matrix.length,rng=seeded(seed),out=[];
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      if(!matrix[r][c])continue;
      const finder=(r<7&&c<7)||(r<7&&c>=n-7)||(r>=n-7&&c<7),dist=Math.hypot(c-n/2,r-n/2)/(n/2),noise=rng()*.4-.2;
      // Finders are one even shade (the darkest edge colour): scanners lock on to them first.
      const pool=!finder&&dist+noise<.65?t.qr:t.edge,pick=pool[Math.floor(rng()*pool.length)];out.push([r,c,finder?darkest(t.edge):scanSafe(pick),finder]);
    }
    return out;
  }
  // Seen from straight above as an upright square, with the generator's colours.
  // Blocks keep a small gap (finders aside); the white quiet zone stays four modules wide.
  // Uses the app's existing Three.js and offscreen thumbnail renderer, no new GL context.
  function scene(T,matrix,night=false,height=180,theme='blossom',seed='room'){
    const t=THEMES[theme]||THEMES.blossom,scene=new T.Scene(),n=matrix.length,span=n+QUIET*2,resources=[];
    scene.background=new T.Color(t.bg);
    const geometry=new T.BoxGeometry(1,1,1);resources.push(geometry);
    const material=color=>{const m=new T.MeshBasicMaterial({color});resources.push(m);return m;};
    const plate=new T.Mesh(geometry,material(0xffffff));plate.scale.set(span,.08,span);plate.position.y=-.04;scene.add(plate);
    const dark=colours(matrix,theme,seed),blocks=new T.InstancedMesh(geometry,material(0xffffff),dark.length),transform=new T.Object3D(),colour=new T.Color();
    // The three finder squares stay solid: scanners find a code by its
    // finders, and gaps across them break the dark runs they look for.
    dark.forEach(([r,c,hex,finder],i)=>{const k=finder?1:.92;transform.position.set(c-(n-1)/2,.25,r-(n-1)/2);transform.scale.set(k,.5,k);transform.updateMatrix();blocks.setMatrixAt(i,transform.matrix);blocks.setColorAt(i,colour.setHex(hex));});
    scene.add(blocks);scene.updateMatrixWorld(true);
    // Row 0 at the top, column 0 on the left: the code reads like any printed QR.
    // Whole-pixel blocks keep every edge crisp; a thin dark margin frames the plate.
    const px=Math.floor(PIXELS/(span*1.06)),radius=PIXELS/px/2,camera=new T.OrthographicCamera(-1,1,1,-1,.1,600);
    camera.up.set(0,0,-1);camera.position.set(0,100,0);camera.lookAt(0,0,0);
    camera.left=-radius;camera.right=radius;camera.top=radius;camera.bottom=-radius;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    return {scene,camera,dispose(){geometry.dispose();blocks.dispose();for(const r of resources)if(r!==geometry)r.dispose();}};
  }
  function voxel(canvas,matrix,renderer,night,height=180,theme='blossom',seed='room'){
    renderer.ensureThumbs();const qr=scene(root.THREE,matrix,night,height,theme,seed),r=renderer.thumbR,oldSize=r.getSize(new root.THREE.Vector2()),ratio=r.getPixelRatio(),tone=r.toneMapping;
    try{r.setPixelRatio(1);r.setSize(canvas.width,canvas.height,false);r.toneMapping=root.THREE.NoToneMapping;r.render(qr.scene,qr.camera);canvas.getContext('2d').drawImage(r.domElement,0,0);}
    finally{r.toneMapping=tone;r.setPixelRatio(ratio);r.setSize(oldSize.x,oldSize.y,false);qr.dispose();}
  }
  function renderCode(canvas,encoded,code,renderer,night,theme='blossom'){
    // Verify the rendered pixels once, not just the matrix. If the coloured
    // blocks don't read back, use the truthful Plain QR instead.
    voxel(canvas,encoded.matrix,renderer,night,180,theme,code);const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
    if(decode(p.data,canvas.width,canvas.height)===code)return 'voxel';
    plain(canvas,encoded.matrix);return 'plain';
  }
  function pngFile(canvas){const data=canvas.toDataURL('image/png'),bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return {data,file:new File([bytes],'lofi-room-qr.png',{type:'image/png'})};}
  async function shareImage({data,file,code,cap=root.Capacitor,nav=root.navigator}){
    if(cap?.isNativePlatform?.()){
      try{const saved=await cap.registerPlugin('Filesystem').writeFile({path:'lofi-room-qr-'+Date.now()+'.png',data:data.split(',')[1],directory:'CACHE'});
        await cap.registerPlugin('Share').share({title:'My Lofi Room',files:[saved.uri]});}
      catch(e){if(e.name==='AbortError'||/cancel/i.test(e.message||''))throw e;await cap.registerPlugin('Share').share({title:'My Lofi Room',text:code});}return;
    }
    try{if(nav.share&&nav.canShare?.({files:[file]})){await nav.share({title:'My Lofi Room',files:[file]});return;}}
    catch(e){if(e.name==='AbortError'||/cancel/i.test(e.message||''))throw e;}
    if(nav.share){await nav.share({title:'My Lofi Room',text:code});return;}
    await nav.clipboard.writeText(code);return 'copied';
  }
  async function downloadPNG(data,cap=root.Capacitor){
    if(cap?.isNativePlatform?.())return cap.registerPlugin('RoomQrFiles').save({filename:'lofi-room-qr.png',base64:data.split(',')[1]});
    const a=document.createElement('a');a.href=data;a.download='lofi-room-qr.png';document.body.appendChild(a);a.click();a.remove();
  }
  function createView({host,code,renderer,phase,notice=()=>{},onTheme=()=>{}}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const section=el('section','room-qr'),heading=el('h3','','QR code'),note=el('p','muted small','A little voxel QR to scan. Pick its colours, or Plain for a simpler code.');let encoded;
    try{encoded=encode(code);}catch(e){note.textContent='This room is too big for a QR. Copy or send the code above instead.';note.classList.add('qr-unavailable');host.appendChild(note);return {destroy(){}};}
    const canvas=el('canvas','room-qr-canvas');canvas.width=canvas.height=PIXELS;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Scannable QR code for this room');
    const frame=el('div','room-qr-frame'),petals=el('div','room-qr-petals');petals.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)petals.appendChild(el('i'));frame.append(canvas,petals);
    const controls=el('div','rowbtns'),toggle=el('button','chipbtn room-qr-plain','Plain'),download=el('button','chipbtn','Download PNG'),share=el('button','chipbtn','Share image');for(const b of [toggle,download,share])b.type='button';toggle.setAttribute('aria-pressed','false');
    // Themes, as in the generator. The pick is remembered on this device only.
    let theme='blossom';try{const saved=JSON.parse(root.localStorage.getItem('lr.qrTheme'));if(THEMES[saved])theme=saved;}catch(e){/* first time, or private mode */}
    const themes=el('div','room-qr-themes');themes.setAttribute('role','radiogroup');themes.setAttribute('aria-label','QR colours');
    for(const [id,t] of Object.entries(THEMES)){const b=el('button','room-qr-theme',t.icon);b.type='button';b.dataset.theme=id;b.setAttribute('role','radio');b.setAttribute('aria-label',t.label);b.title=t.label;b.onclick=()=>{const changed=theme!==id;theme=id;try{root.localStorage.setItem('lr.qrTheme',JSON.stringify(id));}catch(e){/* private mode */}isPlain=false;render();if(changed)onTheme(id);};themes.appendChild(b);}
    let isPlain=false,image;
    const render=()=>{canvas.getContext('2d').clearRect(0,0,PIXELS,PIXELS);if(isPlain)plain(canvas,encoded.matrix);else if(renderCode(canvas,encoded,code,renderer,phase==='night',theme)==='plain'){isPlain=true;note.textContent='Plain keeps this room easy to scan. The code above works too.';}
      petals.hidden=isPlain;toggle.setAttribute('aria-pressed',String(isPlain));frame.style.setProperty('--qr-petal',THEMES[theme].petal);frame.style.setProperty('--qr-bg','#'+THEMES[theme].bg.toString(16).padStart(6,'0'));frame.classList.toggle('plain',isPlain);
      themes.querySelectorAll('button').forEach(b=>b.setAttribute('aria-checked',String(!isPlain&&b.dataset.theme===theme)));image=pngFile(canvas);};
    toggle.onclick=()=>{isPlain=!isPlain;render();};
    download.onclick=async()=>{try{await downloadPNG(image.data);}catch(e){if(!/cancel/i.test(e.message||''))notice('Could not save the picture. Copy the room code instead.');}};
    share.onclick=async()=>{try{if(await shareImage({...image,code})==='copied')notice('Room code copied');}catch(e){if(e.name!=='AbortError'&&!/cancel/i.test(e.message||''))notice('Could not share the picture. Copy the room code instead.');}};
    controls.append(download,share,toggle);section.append(heading,note,frame,themes,controls);host.appendChild(section);
    try{render();}catch(e){isPlain=true;render();note.textContent='Here is the plain QR. The room code above works too.';toggle.disabled=true;}
    // Pause decorative CSS when the sheet is closed or the QR scrolls offscreen.
    const visible=new IntersectionObserver(rows=>{petals.classList.toggle('paused',!rows[0].isIntersecting);});visible.observe(frame);
    return {destroy(){visible.disconnect();petals.classList.add('paused');},canvas};
  }
  function scanner({host,onCode,notice=()=>{},media=root.navigator?.mediaDevices,read=decode,interval=250,accept=text=>/^LR[01]\.[A-Za-z0-9_-]+$/.test(text)}){
    const panel=document.createElement('div');panel.className='room-qr-scanner';panel.hidden=true;
    const video=document.createElement('video');video.muted=true;video.playsInline=true;video.setAttribute('aria-label','Camera preview for room QR');
    const status=document.createElement('p');status.className='muted small';status.setAttribute('role','status');
    const stopButton=document.createElement('button');stopButton.className='chipbtn';stopButton.type='button';stopButton.textContent='Stop camera';panel.append(video,status,stopButton);host.appendChild(panel);
    const canvas=document.createElement('canvas'),g=canvas.getContext('2d',{willReadFrequently:true});let stream=null,timer=null,generation=0,destroyed=false;
    function stop(){generation++;clearTimeout(timer);timer=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;panel.hidden=true;}
    function fail(){stop();notice('Camera unavailable, paste the code instead');}
    function frame(){if(!stream||destroyed)return;try{if(video.readyState>=2&&video.videoWidth){const scale=Math.min(1,1920/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);g.drawImage(video,0,0,canvas.width,canvas.height);const pixels=g.getImageData(0,0,canvas.width,canvas.height),code=read(pixels.data,canvas.width,canvas.height);if(code){if(accept(code)){stop();onCode(code);return;}status.textContent='That is not a room QR. Try another, or paste a room code.';}}}catch(e){fail();return;}timer=setTimeout(frame,interval);}
    async function start(){stop();const token=generation;if(!media?.getUserMedia){fail();return;}try{const next=await media.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});if(destroyed||token!==generation){next.getTracks().forEach(t=>t.stop());return;}stream=next;video.srcObject=stream;panel.hidden=false;status.textContent='Point the camera at a room QR. Everything stays on this device.';await video.play();if(token!==generation)return;frame();}catch(e){if(token===generation&&!destroyed)fail();}}
    stopButton.onclick=stop;
    const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);
    return {start,stop,destroy(){destroyed=true;stop();document.removeEventListener('visibilitychange',visibility);panel.remove();}};
  }
  const api={QUIET,PIXELS,THEMES,colours,scanSafe,encode,decode,plain,scene,voxel,renderCode,shareImage,downloadPNG,createView,scanner};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRRoomQR=api;
})(typeof window!=='undefined'?window:globalThis);
