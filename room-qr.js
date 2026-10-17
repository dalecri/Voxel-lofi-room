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
  // A shallow, gapless QR slab. Top faces retain the exact matrix; the white
  // four-module moat, tree, petals and lighting never cross into its modules.
  // Uses the app's existing Three.js and offscreen thumbnail renderer, no new GL context.
  function scene(T,matrix,night=false,height=180){
    const scene=new T.Scene(),n=matrix.length,span=n+QUIET*2,resources=[];
    scene.background=new T.Color(night?0x24203f:0xf8edda);
    const geometry=new T.BoxGeometry(1,1,1);resources.push(geometry);
    const material=color=>{const m=new T.MeshBasicMaterial({color});resources.push(m);return m;};
    const lit=color=>{const m=new T.MeshLambertMaterial({color});resources.push(m);return m;};
    scene.add(new T.AmbientLight(0xffffff,1.5));const light=new T.DirectionalLight(0xfff2e1,2);light.position.set(-20,80,40);scene.add(light);
    const dark=material(0x171923),white=material(0xffffff),wood=lit(0x9b6848),leaf=lit(night?0xb577a4:0xd294ac),pink=lit(0xf0c0d4),edge=lit(night?0x6e586d:0xc0a58b);
    const box=(x,y,z,w,h,d,mat)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(w,h,d);scene.add(m);return m;};
    box(0,-.11,0,span,.18,span,edge);box(0,-.01,0,span,.04,span,white);
    const count=matrix.reduce((s,row)=>s+row.filter(Boolean).length,0),blocks=new T.InstancedMesh(geometry,dark,count),transform=new T.Object3D();let i=0;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(matrix[r][c]){transform.position.set(c-(n-1)/2,.08,r-(n-1)/2);transform.scale.set(1,.12,1);transform.updateMatrix();blocks.setMatrixAt(i++,transform.matrix);}scene.add(blocks);
    // A little sakura beside (never on) the quiet zone, built as chunky voxels.
    const tx=span/2+9,tz=-span/2-7;
    box(tx,.25,tz,7,.5,7,wood);box(tx,10,tz,1.5,20,1.5,wood);box(tx+1.8,18,tz,4,1,1,wood);
    for(const [x,y,z,w,h,d] of [[0,22,0,8,4,7],[-2,21,1,5,3,5],[3,21,-1,5,4,5],[0,25,0,5,2,4]])box(tx+x,y,tz+z,w,h,d,leaf);
    box(tx+1,25.7,tz+1,3,.7,2,pink);
    for(let p=0;p<7;p++)box(tx-3+(p%4)*2,6+(p*2.9)%18,tz+5+(p%3),.6,.15,.7,pink).rotation.y=p*.8;
    scene.updateMatrixWorld(true);
    const camera=new T.OrthographicCamera(-1,1,1,-1,.1,600);
    // Same diagonal convention as room thumbnails, lifted slightly for dense codes.
    camera.position.set(80,height,80);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(scene),points=[];
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),cx=(minX+maxX)/2,cy=(minY+maxY)/2,radius=Math.max(maxX-minX,maxY-minY)*.53;
    camera.left=cx-radius;camera.right=cx+radius;camera.top=cy+radius;camera.bottom=cy-radius;camera.updateProjectionMatrix();
    return {scene,camera,dispose(){geometry.dispose();blocks.dispose();for(const r of resources)if(r!==geometry)r.dispose();}};
  }
  function voxel(canvas,matrix,renderer,night,height=180){
    renderer.ensureThumbs();const qr=scene(root.THREE,matrix,night,height),r=renderer.thumbR,oldSize=r.getSize(new root.THREE.Vector2()),ratio=r.getPixelRatio(),tone=r.toneMapping;
    try{r.setPixelRatio(1);r.setSize(canvas.width,canvas.height,false);r.toneMapping=root.THREE.NoToneMapping;r.render(qr.scene,qr.camera);canvas.getContext('2d').drawImage(r.domElement,0,0);}
    finally{r.toneMapping=tone;r.setPixelRatio(ratio);r.setSize(oldSize.x,oldSize.y,false);qr.dispose();}
  }
  function renderCode(canvas,encoded,code,renderer,night){
    // Verify the rendered pixels once, not just the matrix. Dense rooms may
    // need a steeper angle; if neither view decodes, use the truthful Plain QR.
    for(const height of [180,250]){voxel(canvas,encoded.matrix,renderer,night,height);const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);if(decode(p.data,canvas.width,canvas.height)===code)return 'voxel';}
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
  function createView({host,code,renderer,phase,notice=()=>{}}){
    const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    const section=el('section','room-qr'),heading=el('h3','','QR code'),note=el('p','muted small','A tiny room to scan. Choose Plain for a simpler code.');let encoded;
    try{encoded=encode(code);}catch(e){note.textContent='This room is too big for a QR. Copy or send the code above instead.';note.classList.add('qr-unavailable');host.appendChild(note);return {destroy(){}};}
    const canvas=el('canvas','room-qr-canvas');canvas.width=canvas.height=PIXELS;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Scannable QR code for this room');
    const frame=el('div','room-qr-frame'),petals=el('div','room-qr-petals');petals.setAttribute('aria-hidden','true');for(let i=0;i<4;i++)petals.appendChild(el('i'));frame.append(canvas,petals);
    const controls=el('div','rowbtns'),toggle=el('button','chipbtn room-qr-plain','Plain'),download=el('button','chipbtn','Download PNG'),share=el('button','chipbtn','Share image');for(const b of [toggle,download,share])b.type='button';toggle.setAttribute('aria-pressed','false');
    let isPlain=false,image;
    const render=()=>{canvas.getContext('2d').clearRect(0,0,PIXELS,PIXELS);if(isPlain)plain(canvas,encoded.matrix);else if(renderCode(canvas,encoded,code,renderer,phase==='night')==='plain'){isPlain=true;note.textContent='Plain keeps this room easy to scan. The code above works too.';}petals.hidden=isPlain;toggle.setAttribute('aria-pressed',String(isPlain));image=pngFile(canvas);};
    toggle.onclick=()=>{isPlain=!isPlain;render();};
    download.onclick=async()=>{try{await downloadPNG(image.data);}catch(e){if(!/cancel/i.test(e.message||''))notice('Could not save the picture. Copy the room code instead.');}};
    share.onclick=async()=>{try{if(await shareImage({...image,code})==='copied')notice('Room code copied');}catch(e){if(e.name!=='AbortError'&&!/cancel/i.test(e.message||''))notice('Could not share the picture. Copy the room code instead.');}};
    controls.append(download,share,toggle);section.append(heading,note,frame,controls);host.appendChild(section);
    try{render();}catch(e){isPlain=true;render();note.textContent='Here is the plain QR. The room code above works too.';toggle.disabled=true;}
    // Pause decorative CSS when the sheet is closed or the QR scrolls offscreen.
    const visible=new IntersectionObserver(rows=>{petals.classList.toggle('paused',!rows[0].isIntersecting);});visible.observe(frame);
    return {destroy(){visible.disconnect();petals.classList.add('paused');},canvas};
  }
  function scanner({host,onCode,notice=()=>{},media=root.navigator?.mediaDevices,read=decode,interval=250}){
    const panel=document.createElement('div');panel.className='room-qr-scanner';panel.hidden=true;
    const video=document.createElement('video');video.muted=true;video.playsInline=true;video.setAttribute('aria-label','Camera preview for room QR');
    const status=document.createElement('p');status.className='muted small';status.setAttribute('role','status');
    const stopButton=document.createElement('button');stopButton.className='chipbtn';stopButton.type='button';stopButton.textContent='Stop camera';panel.append(video,status,stopButton);host.appendChild(panel);
    const canvas=document.createElement('canvas'),g=canvas.getContext('2d',{willReadFrequently:true});let stream=null,timer=null,generation=0,destroyed=false;
    function stop(){generation++;clearTimeout(timer);timer=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;panel.hidden=true;}
    function fail(){stop();notice('Camera unavailable, paste the code instead');}
    function frame(){if(!stream||destroyed)return;try{if(video.readyState>=2&&video.videoWidth){const scale=Math.min(1,1920/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);g.drawImage(video,0,0,canvas.width,canvas.height);const pixels=g.getImageData(0,0,canvas.width,canvas.height),code=read(pixels.data,canvas.width,canvas.height);if(code){if(/^LR[01]\.[A-Za-z0-9_-]+$/.test(code)){stop();onCode(code);return;}status.textContent='That is not a room QR. Try another, or paste a room code.';}}}catch(e){fail();return;}timer=setTimeout(frame,interval);}
    async function start(){stop();const token=generation;if(!media?.getUserMedia){fail();return;}try{const next=await media.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});if(destroyed||token!==generation){next.getTracks().forEach(t=>t.stop());return;}stream=next;video.srcObject=stream;panel.hidden=false;status.textContent='Point the camera at a room QR. Everything stays on this device.';await video.play();if(token!==generation)return;frame();}catch(e){if(token===generation&&!destroyed)fail();}}
    stopButton.onclick=stop;
    const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);
    return {start,stop,destroy(){destroyed=true;stop();document.removeEventListener('visibilitychange',visibility);panel.remove();}};
  }
  const api={QUIET,PIXELS,encode,decode,plain,scene,voxel,renderCode,shareImage,downloadPNG,createView,scanner};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRRoomQR=api;
})(typeof window!=='undefined'?window:globalThis);
