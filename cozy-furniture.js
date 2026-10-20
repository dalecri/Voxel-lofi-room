// Furniture that remembers a little of life in the room. Personal text and photo
// references live only in lr.cozy, never on room items or in shared decor.
(function(root) {
  const KEY='lr.cozy';
  const IDS=['sushiconveyor','streakboard','harp','photocollage','hangingtee','dreamcatcher','beadcurtain','whiteboard','tipjar','bigrug','cloudrug','calllaptop'];
  const NOTES=[60,62,64,67,69,72,74];
  // A slow, closed track. Coordinates are voxels; every plate stays on the belt.
  function plateAt(t,index) {
    let d=((t*.9+index*12)%72+72)%72;
    if(d<26)return {x:3+d,z:3};d-=26;
    if(d<10)return {x:29,z:3+d};d-=10;
    if(d<26)return {x:29-d,z:13};d-=26;
    return {x:3,z:13-d};
  }
  const photoURL=data=>typeof data==='string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)?data:'';
  function create({store}) {
    const read=()=>{const s=store.get(KEY,{});return s && typeof s==='object' && !Array.isArray(s)?s:{};};
    const key=(room,id)=>`${room}:${id}`;
    function surface(room,id){const s=read()[key(room,id)] || {};return {text:typeof s.text==='string'?s.text:'',pins:Array.isArray(s.pins)?s.pins.filter(v=>typeof v==='string').slice(0,6):[]};}
    function update(room,id,patch){const s=read();s[key(room,id)]={...surface(room,id),...patch};store.set(KEY,s);if(JSON.stringify(store.get(KEY,{}))!==JSON.stringify(s))throw Error('Could not save on this device.');}
    return {surface,favorite(room,cat,items,CAT){const s=read(),key=`${room}:${cat.id}`,previous=s.favorites?.[key],chosen=favorite(cat,items,previous,CAT);if(chosen!=null && previous!==chosen){s.favorites={...(s.favorites || {}),[key]:chosen};store.set(KEY,s);}return chosen;},write(room,id,text){update(room,id,{text:String(text).slice(0,1200)});},pin(room,id,photo,max=6){const pins=surface(room,id).pins,i=pins.indexOf(photo);if(i>=0)pins.splice(i,1);else if(pins.length<max)pins.push(photo);else return false;update(room,id,{pins});return true;}};
  }
  // Stable per cat and room, independent of which perches are currently occupied.
  function favorite(cat,items,previous,CAT=root.LR?.CAT || {}) {
    const seats=items.filter(i=>!i.p && CAT[i.t]?.petOnly!=='dog' && (CAT[i.t]?.petSpot || CAT[i.t]?.seat && CAT[i.t].kind==='floor')).sort((a,b)=>a.id-b.id);
    if(seats.some(i=>i.id===previous))return previous;
    let h=0;for(const c of String(cat.name || cat.id))h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;
    return seats.length?seats[h%seats.length].id:null;
  }
  function dreamStrength(items,CAT){return items.some(i=>CAT[i.t]?.dreamBoost)?1.25:1;}
  function register(LR) {
    const {def,CAT,WOOD,shade}=LR,ink=0x383e40,cream=0xfff0d4;
    def('focusgarden',{name:'Focus Garden',kind:'floor',group:'plants',size:[2,1],top:4,tap:'focus-garden',vars:[[WOOD.oak],[WOOD.walnut],[0xcbb58d]],build(m,[wood]){
      m.box(0,0,0,16,1,8,shade(wood,.7)).box(0,1,0,16,4,1,wood).box(0,1,7,16,4,8,wood).box(0,1,1,1,4,7,wood).box(15,1,1,16,4,7,wood).box(1,1,1,15,3,7,0x645042);
      m.box(1,4,0,15,5,1,shade(wood,1.16)).box(1,4,7,15,5,8,shade(wood,1.16));m.set(2,3,2,0x8a7460).set(12,3,5,0x8a7460);
    }});
    def('focusbloom',{name:'Focus bloom',kind:'small',group:'plants',size:[1,1],tap:'focus-label',focusGrowth:true,vars:[[0xe9a1b9],[0xdec075],[0xa7b5dc]],build(m,[petal]){
      m.box(2,0,2,6,1,6,0x66513f).set(4,1,4,0xb39261);
      m.part('growth1',[0,0,0]);m.box(4,1,4,5,4,5,0x7f9d62).set(3,3,4,0x94b978);
      m.part('growth2',[0,0,0]);m.box(4,4,4,5,7,5,0x7f9d62).box(2,4,4,4,5,5,0x91af6f).box(5,5,4,7,6,5,0x91af6f);
      m.part('growth3',[0,0,0]);m.box(4,7,4,5,9,5,0x7f9d62).box(3,9,3,6,11,6,LR.shade(petal,.85));
      m.part('growth4',[0,0,0]);m.box(1,10,3,7,11,5,petal).box(3,10,1,5,11,7,petal).box(3,11,3,5,12,5,0xf4db93);m.main();
    }});
    // Reuse the existing cherry tree art. Its care is the ordinary watered-day
    // plant lifecycle; only the focus bloom above has a timed growth override.
    def('focuscherry',{name:'Focus cherry sapling',kind:'floor',group:'plants',size:[1,1],tap:'water',vars:[[0xf6a8c4],[0xfad0e0],[0xe8789a]],build(m,vars,state){LR.CAT.sakura.build(m,vars,state);}});
    def('sushiconveyor',{name:'Sushi conveyor counter',kind:'floor',group:'kitchen',size:[4,2],top:10,tap:'cozy-sushi',vars:[[WOOD.oak,0xcf7763],[WOOD.walnut,0x87aaa0]],build(m,[wood,c]){
      m.box(0,0,0,32,9,16,wood).box(0,9,0,32,10,16,shade(wood,1.2));
      m.box(1,10,1,31,11,15,ink).box(5,10,5,27,12,11,wood).box(6,12,6,26,13,10,c);
      for(let x=7;x<26;x+=5)m.box(x,13,7,x+1,15,9,cream);
      for(let n=0;n<6;n++){const {x,z}=plateAt(0,n);m.part('plate'+n,[x,11,z]);m.box(x-2,11,z-2,x+2,12,z+2,[0x8dbab4,0xe5b267,0xd993a7][n%3]);m.box(x-1,12,z-1,x+1,13,z+1,cream).box(x-1,13,z-1,x+1,14,z+1,n%2?0x86a873:0xef9779);m.main();}
    }});
    const board=(id,name,size,color,tap)=>def(id,{name,kind:'wall',group:'wall',size,depth:2,tap,vars:[[color],[shade(color,.8)]],build(m,[c]){m.box(0,0,0,size[0]*8,size[1]*8,2,WOOD.oak).box(1,1,2,size[0]*8-1,size[1]*8-1,3,c);}});
    board('streakboard','Daily streak scoreboard',[2,1],0x30494a,'cozy-streak');
    board('photocollage','Photo collage wall',[3,2],0xb88f65,'cozy-photos');
    board('whiteboard','Whiteboard',[3,2],0xf6f1df,'cozy-whiteboard');
    def('harp',{name:'Pluckable harp',kind:'floor',group:'furniture',size:[2,1],tap:'cozy-harp',vars:[[WOOD.oak,0xe7c16d],[WOOD.walnut,0xd9b3a5]],build(m,[wood,brass]){
      m.box(0,0,0,16,2,8,wood).box(1,2,2,3,15,5,wood).box(13,2,2,15,24,5,wood);
      for(let x=2;x<15;x++)m.box(x,14+Math.floor((x-2)*.65),2,x+1,17+Math.floor((x-2)*.65),5,wood);
      for(let n=0;n<7;n++){m.part('string'+n,[4+n,12,4]);m.box(4+n,2,4,5+n,14+Math.floor((2+n)*.65),5,brass);m.main();}
    }});
    def('hangingtee',{name:'Roommate costume tee',kind:'wall',group:'wall',size:[1,2],depth:3,tap:'wardrobe',vars:[[cream]],build(m,[c]){
      m.box(3,14,0,5,16,1,WOOD.walnut).box(1,13,1,7,14,2,WOOD.walnut);
      m.box(1,10,2,7,13,3,c).box(0,9,2,2,12,3,c).box(6,9,2,8,12,3,c).box(2,3,2,6,11,3,c);
    }});
    def('dreamcatcher',{name:'Dreamcatcher',kind:'wall',group:'wall',size:[1,2],depth:3,dreamBoost:true,tap:'fx',fx:{say:['A little net for gentler dreams.'],sfx:'rustle'},vars:[[0xb79cce],[0xb7d1b1]],build(m,[c]){
      for(let x=0;x<8;x++)for(let y=7;y<15;y++){const d=Math.hypot(x-3.5,y-10.5);if(d>2.5&&d<3.8)m.set(x,y,2,WOOD.oak);else if(d<2.8 && ((x+y)%3===0))m.set(x,y,2,c);}
      for(const x of [1,3,6]){m.box(x,1+x%3,2,x+1,8,3,c).box(x-1,1,2,x+1,4,3,cream);}m.set(4,15,1,WOOD.walnut);
    }});
    def('beadcurtain',{name:'Beaded curtain doorway',kind:'wall',group:'doors',size:[2,3],depth:3,tap:'portal',vars:[[0xc08b9c,0xe9c484],[0x7aa5a1,0xc7dfb0]],build(m,[c,a]){
      m.box(0,0,0,16,23,1,ink).box(0,23,0,16,24,3,WOOD.walnut);
      for(let n=0;n<8;n++){const x=n*2;m.part('bead'+n,[x,23,2],'z');for(let y=1;y<23;y+=2)m.set(x,y,2,y%4===1?c:a,y%6===1);m.main();}
    }});
    if(CAT.savingsjar)def('tipjar',{...CAT.savingsjar,name:'Tip jar',vars:[[0xd3b68a],[0x9ebbb1]],build(m,v,s){CAT.savingsjar.build(m,v,s);m.box(1,5,7,7,9,8,cream).box(3,6,8,5,8,9,0xc69849);}});
    def('bigrug',{name:'Grand woven rug',kind:'rug',group:'furniture',size:[8,7],vars:[[0xb67366,0xf3dfbb],[0x6f9d96,0xe5d9b9],[0x8b81ab,0xf0d7b7]],build(m,[c,a]){
      m.box(0,0,0,64,1,56,(x,y,z)=>x<2||x>61||z<2||z>53?a:(x<5||x>58||z<5||z>50)?shade(c,.8):((x+z)%12<2?a:c));
    }});
    def('cloudrug',{name:'Cloud island rug',kind:'rug',group:'furniture',size:[6,5],vars:[[0xc4d9d1,cream],[0xc3b2d9,0xe6d9ed],[0xe5bdab,cream]],build(m,[c,a]){
      for(let x=0;x<48;x++)for(let z=0;z<40;z++){const d=Math.min(Math.hypot((x-15)/14,(z-19)/16),Math.hypot((x-31)/16,(z-20)/15),Math.hypot((x-24)/13,(z-12)/11));if(d<1)m.set(x,0,z,d>.88?a:c);}
    }});
    def('calllaptop',{name:'Cat video-call laptop',kind:'small',group:'tech',size:[2,1],tap:'fx',fx:{say:['Everyone is here. Mostly.'],sfx:'type'},on:true,screen:{x:1,y:2,z:2,w:14,h:9},channels:['catcall'],vars:[[0x8e9f9c],[0xb6a7bb]],build(m,[c]){
      m.box(0,0,0,16,1,8,c).box(0,1,0,16,12,1,ink).box(1,2,1,15,11,2,0x263840);
      for(let x=2;x<15;x+=2)for(let z=3;z<7;z+=2)m.set(x,1,z,0xdde3d8);m.box(6,1,6,10,2,8,shade(c,.8));
    }});
    if(!LR.MOMENTS.some(m=>m[0]==='sushisupper'))LR.MOMENTS.push(['sushisupper','One more little plate','Shared a passing plate with a roommate']);
    if(!LR.MOMENTS.some(m=>m[0]==='harp'))LR.MOMENTS.push(['harp','A few quiet strings','Plucked a gentle tune on the harp']);
  }
  function createView({store,model,view,room,roomId,files,wardrobe,companion,sheet,close,sound,discover,notice,editing,hidden,takePhoto,openFiles,pixelArt=()=>null}) {
    const surfaces=new Map(),images=new Map(),thumbs=new Map(),cooldowns=new Map();
    let scanAt=0,photos=[],context='',meal=null;
    const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
    const button=(parent,text,fn)=>{const b=element('button',text);b.type='button';b.className='chipbtn';b.onclick=fn;parent.appendChild(b);return b;};
    function photoPicker(id) {
      const it=room.get(id);if(!it)return;
      const max=it.t==='minifridge'?2:6;
      sheet(it.t==='minifridge'?'Fridge photo magnets':'Pin a room memory','Choose photos from your file cabinet. Pins stay on this device.',h=>{
        const status=h('p','muted'),grid=h('div','launcher-grid'),pins=model.surface(roomId(),id).pins;
        const rows=files.list('Photos').filter(p=>photoURL(p.data));
        status.textContent=rows.length?`Up to ${max} photos. Tap a pinned photo to unpin it.`:'No photos yet. Take one with the camera, then pin it here.';
        for(const p of rows){const b=button(grid,'',()=>{try{if(!model.pin(roomId(),id,p.id,max)){status.textContent=`There is room for ${max} photos. Unpin one first.`;return;}scanAt=0;photoPicker(id);}catch(e){status.textContent=e.message;}});b.setAttribute('aria-label',`${pins.includes(p.id)?'Unpin':'Pin'} ${p.title}`);b.setAttribute('aria-pressed',String(pins.includes(p.id)));const img=element('img');img.src=photoURL(p.data);img.alt='';img.style.cssText='width:100%;height:90px;object-fit:cover;border-radius:8px';b.append(img,element('span',p.title || 'Room photo'));}
        const row=h('div','rowbtns');button(row,'Take a room photo',()=>{close();takePhoto();});button(row,'Open photo cabinet',()=>openFiles());
      });
    }
    function whiteboard(id) {
      const key=roomId();sheet('A little whiteboard','A place to leave a thought.',h=>{
        const panel=h('section','whiteboard-panel');panel.setAttribute('aria-label','Room whiteboard');
        const label=element('label');label.className='whiteboard-label';label.htmlFor='whiteboardText';label.textContent='On the board';
        const input=element('textarea');input.id='whiteboardText';input.className='whiteboard-text';input.setAttribute('aria-label','Whiteboard text');input.setAttribute('aria-describedby','whiteboardStatus');input.maxLength=1200;input.rows=8;input.placeholder='A thought, a reminder, a little room for anything…';input.value=model.surface(key,id).text;
        const footer=element('div');footer.className='whiteboard-footer';
        const status=element('p','Saved on this device.');status.id='whiteboardStatus';status.className='whiteboard-status';status.setAttribute('role','status');
        const count=element('span');count.className='whiteboard-count';count.setAttribute('aria-label','Characters used');
        const updateCount=()=>{count.textContent=`${input.value.length} / ${input.maxLength}`;};updateCount();
        footer.append(status,count);panel.append(label,input,footer);
        input.oninput=()=>{updateCount();try{model.write(key,id,input.value);status.textContent='Saved on this device.';scanAt=0;}catch(e){status.textContent=e.message;}};
      });
    }
    function imageFor(key,data) {
      if(!photoURL(data))return null;
      if(!images.has(key)){const img=new Image();img.onload=()=>{scanAt=0;for(const e of surfaces.values())e.signature='';};img.src=data;images.set(key,img);}
      return images.get(key);
    }
    function dispose(e){e.mesh.removeFromParent();e.mesh.geometry.dispose();e.mesh.material.map.dispose();e.mesh.material.dispose();e.badge.remove();}
    function surface(it,obj) {
      const pixel=it.t==='pixelposter',fridge=it.t==='minifridge',tee=it.t==='hangingtee',streak=it.t==='streakboard';
      const canvas=document.createElement('canvas');canvas.width=pixel?512:fridge?256:tee?256:768;canvas.height=pixel?512:fridge?160:tee?512:streak?320:512;
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=pixel?THREE.NearestFilter:THREE.LinearFilter;texture.generateMipmaps=!pixel;
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(pixel?1.75:fridge?.7:tee?.5:streak?1.75:2.7,pixel?1.75:fridge?.4:tee?1.15:streak?.7:1.7),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));
      mesh.name='privateCozySurface';
      if(fridge){mesh.position.set(.45,.26,.258);obj.userData.parts.door.add(mesh);}else {mesh.position.set(pixel?1:tee?.5:streak?1:1.5,tee?.91:streak?.5:1,.39);obj.userData.inner.add(mesh);}
      obj.userData.parts.privateCozySurface=mesh;
      const badge=element('span','private');badge.className='roomtool-private';badge.setAttribute('aria-label','Private surface, excluded from shared rooms');document.body.appendChild(badge);
      return {obj,mesh,canvas,badge,signature:''};
    }
    function paint(e,it) {
      const data=model.surface(roomId(),it.id),g=e.canvas.getContext('2d'),W=e.canvas.width,H=e.canvas.height;
      if(it.t==='pixelposter'){const art=pixelArt(it),signature=JSON.stringify(art);if(signature===e.signature)return;e.signature=signature;g.fillStyle='#fff4de';g.fillRect(0,0,W,H);if(art){g.imageSmoothingEnabled=false;const src=LRPixelMaker.paintCanvas(document.createElement('canvas'),art,1);g.drawImage(src,0,0,W,H);}e.mesh.material.map.needsUpdate=true;return;}
      const slots=wardrobe.slots,costume=JSON.stringify(slots),streak=store.get('lr.dailyStreak',{n:0}).n || 0;
      const pinned=data.pins.map(id=>photos.find(p=>p.id===id)).filter(Boolean).slice(0,it.t==='minifridge'?2:6);
      const signature=JSON.stringify([it.t,data.text,pinned.map(p=>[p.id,p.updatedAt]),costume,streak]);if(e.signature===signature)return;e.signature=signature;
      g.clearRect(0,0,W,H);g.textAlign='center';g.fillStyle='#f9ead4';
      if(it.t==='streakboard'){g.font='bold 50px Nunito';g.fillText('DAILY MOMENT STREAK',W/2,80);g.font='bold 132px Fredoka';g.fillStyle='#f3ca70';g.fillText(String(streak),W/2,230);g.font='28px Nunito';g.fillStyle='#f9ead4';g.fillText(streak===1?'one cozy day':`${streak} cozy days`,W/2,285);}
      else if(it.t==='whiteboard'){
        g.fillStyle='#384842';g.textAlign='left';g.font='32px Nunito';const words=(data.text || 'A little room for a thought. Tap to write.').split(/\n/);let y=48;
        for(const para of words){let line='';for(const word of para.split(' ')){if(g.measureText(line+word).width>W-50&&line){g.fillText(line,24,y);line='';y+=40;}line+=word+' ';}g.fillText(line,24,y);y+=40;if(y>H-20)break;}
      }else if(it.t==='hangingtee'){
        if(!thumbs.has(costume))thumbs.set(costume,view.thumb({t:'costume-print:'+costume,c:0,on:true},LRCompanion.definitionForSlots(slots,true),o=>{o.userData.parts.lids.visible=false;}));
        const img=imageFor('costume:'+costume,thumbs.get(costume));if(img?.complete&&img.naturalWidth)g.drawImage(img,10,40,W-20,W-20);
        g.fillStyle='#584d48';g.font='bold 30px Nunito';g.fillText(LRCostumes.find(wardrobe.selected)?.name || 'Mixed with love',W/2,380,W-12);
      }else{
        if(!pinned.length&&it.t==='photocollage'){g.font='bold 40px Fredoka';g.fillText('Room memories',W/2,170);g.font='30px Nunito';g.fillText('Tap to pin a room photo',W/2,240);}
        const cols=it.t==='minifridge'?2:3,cellW=W/cols,cellH=H/(it.t==='minifridge'?1:2);
        pinned.forEach((p,n)=>{const x=(n%cols)*cellW+9,y=Math.floor(n/cols)*cellH+12;g.fillStyle='#fff4dd';g.fillRect(x,y,cellW-18,cellH-24);const img=imageFor(p.id+':'+p.updatedAt,p.data);if(img?.complete&&img.naturalWidth){const dw=cellW-30,dh=cellH-54,s=Math.max(dw/img.naturalWidth,dh/img.naturalHeight),sw=dw/s,sh=dh/s;g.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,x+6,y+10,dw,dh);}g.fillStyle=['#c36e6a','#719a90','#d8ae56'][n%3];g.beginPath();g.arc(x+(cellW-18)/2,y+6,8,0,Math.PI*2);g.fill();});
      }
      e.mesh.material.map.needsUpdate=true;
    }
    function pluck(it,index) {const obj=view.objs.get(it.id);if(!obj)return;let n=index==null?NaN:Number(index);if(!Number.isInteger(n)||n<0||n>6)n=(obj.userData.harpStep || 0)%7;obj.userData.harpStep=n+1;obj.userData.pluck={index:n,until:view.t+1.4};sound.harp(n);const p=view.itemPoint(it.id,[4+n,20,4]);if(p)view.icon('note',p,{size:.3});discover('harp');}
    function sushi(it,part) {
      const obj=view.objs.get(it.id);if(!obj)return;
      let n=/^plate[0-5]$/.test(part || '')?Number(part.slice(5)):null;
      const key=n=>`${roomId()}:${it.id}:${n}`;
      const available=n=>(cooldowns.get(key(n)) || 0)<=view.t;
      if(n==null)n=[0,1,2,3,4,5].filter(available).sort((a,b)=>plateAt(view.t,b).z-plateAt(view.t,a).z)[0];
      if(n==null || !available(n)){notice('Another little plate will be along soon.');return;}
      const current=roomId(),eat=P=>{if(current!==roomId() || !room.get(it.id))return;if(P){view.startEating(P,5);const p=view.petAt(P.id);if(p)view.icon('heart',p.add(new THREE.Vector3(0,.9,0)),{size:.3});}else{if(meal?.plate)meal.plate.removeFromParent();const who=companion().object,plate=obj.userData.parts['plate'+n].clone(true);plate.name='sushi-snack';plate.position.set(0,-.25,.5);plate.scale.setScalar(.7);(who.userData.parts.rightarm || who).add(plate);meal={until:view.t+4,who,plate};companion().celebrate();}sound.crunch();discover('sushisupper');notice(P?'A little plate, a very content cat.':'A little plate for your roommate.');};
      const spots=view.spotsAround(it);let best=null;const cats=[...view.pets.values()].filter(p=>!p.onArrive&&!p.eat&&p.state!=='eat').sort((a,b)=>Math.hypot(a.x-it.x,a.z-it.z)-Math.hypot(b.x-it.x,b.z-it.z));for(const cat of cats){best=view.sendCat(spots,cat.id);if(best)break;}
      if(best){const P=best.P;P.eat=null;P.onArrive=()=>eat(P);if(!best.path.length){P.onArrive=null;eat(P);}}
      else if(companion()){if(meal && meal.until>view.t){notice('Your roommate is still enjoying the last little plate.');return;}eat(null);}else {notice('A plate is waiting for a roommate.');return;}
      cooldowns.set(key(n),view.t+20);obj.userData.parts['plate'+n].visible=false;
    }
    function tap(it,part){
      if(it.t==='photocollage'){photoPicker(it.id);return true;}
      if(it.t==='whiteboard'){whiteboard(it.id);return true;}
      if(it.t==='streakboard'){const n=store.get('lr.dailyStreak',{n:0}).n || 0;notice(`${n} cozy day${n===1?'':'s'} in your Daily Moment streak.`);return true;}
      if(it.t==='harp'){pluck(it,/^string[0-6]$/.test(part || '')?Number(part.slice(6)):null);return true;}
      if(it.t==='sushiconveyor'){sushi(it,part);return true;}
      return false;
    }
    function frame(dt,t) {
      if(context!==String(roomId())){context=String(roomId());for(const e of surfaces.values())dispose(e);surfaces.clear();cooldowns.clear();if(meal?.plate)meal.plate.removeFromParent();meal=null;scanAt=0;}
      const refresh=t>=scanAt;if(refresh){scanAt=t+1;photos=files.list('Photos');const livePhotos=new Set(photos.map(p=>p.id+':'+p.updatedAt));for(const k of images.keys())if(!k.startsWith('costume:')&&!livePhotos.has(k))images.delete(k);}
      const alive=new Set();
      for(const it of room.items){const obj=view.objs.get(it.id);if(!obj)continue;
        if(['pixelposter','photocollage','whiteboard','streakboard','hangingtee','minifridge'].includes(it.t)){
          alive.add(it.id);let e=surfaces.get(it.id);if(e && e.obj!==obj){dispose(e);surfaces.delete(it.id);e=null;}if(!e){e=surface(it,obj);surfaces.set(it.id,e);paint(e,it);}else if(refresh)paint(e,it);
          const show=!hidden() && !view.capturing && view.isShown(obj);e.mesh.visible=show;
          e.badge.hidden=!show || !editing() || it.t==='minifridge';if(!e.badge.hidden){const p=view.itemPoint(it.id,[LR.CAT[it.t].size[0]*4,it.t==='minifridge'?15:LR.CAT[it.t].size[1]*8+2,3]);const point=view.root.localToWorld(p).project(view.cam),rect=view.r.domElement.getBoundingClientRect();e.badge.style.left=rect.left+(point.x+1)*rect.width/2+'px';e.badge.style.top=rect.top+(1-point.y)*rect.height/2+'px';}
        }
        if(it.t==='sushiconveyor')for(let n=0;n<6;n++){const p=plateAt(view.reducedMotion?0:t,n),part=obj.userData.parts['plate'+n];part.position.set(p.x/8,11/8,p.z/8);part.visible=(cooldowns.get(`${roomId()}:${it.id}:${n}`)||0)<=t;}
        if(it.t==='harp'){const p=obj.userData.pluck;if(p){const part=obj.userData.parts['string'+p.index];part.rotation.z=!view.reducedMotion&&p.until>t?Math.sin(t*45)*.04*(p.until-t)/1.4:0;if(p.until<=t)obj.userData.pluck=null;}}
        if(it.t==='beadcurtain'){
          const center=view.itemPoint(it.id,[LR.CAT[it.t].size[0]*4,0,4]);const actors=[...view.pets.values()].filter(p=>!p.robot),b=companion()?.object?.position;if(b)actors.push(b);
          const near=actors.some(p=>Math.hypot(p.x-center.x,p.z-center.z)<1.05);
          if(near&&!obj.userData.wasNear){obj.userData.brushedUntil=t+1.7;if(!view.reducedMotion)view.sparkle(center.clone().add(new THREE.Vector3(0,1,0)),0xe5d5a1,6);}obj.userData.wasNear=near;
          const swaying=!view.reducedMotion && (obj.userData.brushedUntil || 0)>t;
          for(let n=0;n<8;n++)obj.userData.parts['bead'+n].rotation.z=swaying?Math.sin(t*5+n*.6)*.1:0;
        }
      }
      for(const [id,e] of surfaces)if(!alive.has(id)){dispose(e);surfaces.delete(id);}
      if(meal){if(t<meal.until){const parts=meal.who.userData.parts;if(parts.head)parts.head.rotation.x+=view.reducedMotion?0:Math.sin(t*7)*.08;if(parts.rightarm)parts.rightarm.rotation.x=-.8;}else {meal.plate?.removeFromParent();meal=null;}}
    }
    return {tap,frame,photoPicker,whiteboard,model,favoriteFor:P=>model.favorite(roomId(),room.get(P.id) || P,room.items,LR.CAT),get surfaces(){return surfaces;}};
  }
  function registerScreens(screens) {
    screens.add('catcall',(g,W,H,t)=>{
      g.fillStyle='#253c42';g.fillRect(0,0,W,H);
      const colors=['#34353e','#ce9467','#e8ddd0','#a5a4ab'],drop=Math.floor(t/35)%4,absent=t%35<5;
      for(let n=0;n<4;n++){const x=n%2*W/2,y=Math.floor(n/2)*H/2,w=W/2,h=H/2;g.fillStyle=n===drop&&absent?'#34474d':['#799a91','#9a7c91','#8b9eaf','#b49a78'][n];g.fillRect(x+1,y+1,w-2,h-2);
        if(n===drop&&absent){g.fillStyle='#dddfcc';g.font=Math.max(4,Math.floor(W/15))+'px monospace';g.fillText('rejoining',x+2,y+h/2);continue;}
        const s=Math.max(1,Math.floor(Math.min(w,h)/6));g.save();g.translate(x+w/2-2.5*s,y+h/2-2.5*s);g.scale(s,s);screens.sprite(g,'cat',0,0,colors[n],'#f4d17b');g.restore();
        g.fillStyle='#c7dbaa';g.fillRect(x+w-4,y+h-4,2,2);
      }
    });
  }
  const api={KEY,IDS,NOTES,plateAt,photoURL,create,favorite,dreamStrength,register,createView,registerScreens};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else {root.LRCozyFurniture=api;register(root.LR);registerScreens(root.LRScreens);}
})(typeof window!=='undefined'?window:globalThis);
