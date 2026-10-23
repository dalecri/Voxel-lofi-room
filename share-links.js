// Share links and the picture card. A link carries the room (or guest-book note)
// code after the #, so it never reaches any server: the web version reads it
// straight from the address bar. The card (a 4:5 post or a 9:16 story) shows the
// room, its name and a QR code of the same link.
(function(root){
  'use strict';
  const BASE='https://heycristobal.com/Voxel-lofi-room/';
  const SCHEME='lofirooms';
  const CODE=/^(LRG?[01]\.[A-Za-z0-9_-]+)$/;
  const link=code=>{if(!CODE.test(code))throw Error('Not a share code');return BASE+'#'+code;};
  // Accepts a bare code, a #code, or any link/URL holding one (web or lofirooms://).
  function codeFrom(text){
    const s=String(text||'').trim();if(CODE.test(s))return s;
    const hash=s.match(/#(LRG?[01]\.[A-Za-z0-9_-]+)\s*$/);if(hash)return hash[1];
    const q=s.match(/[?&]c=(LRG?[01]\.[A-Za-z0-9_-]+)/);if(q)return q[1];
    return null;
  }
  // Short links: heycristobal.com/Voxel-lofi-room/#r/ab12cd34. The 8-character id is looked
  // up in the lofi-rooms Supabase project, which keeps only id -> code. Clients can shorten a
  // code or look up one id; they can't list or change the table.
  const SHORTENER={url:'https://smomqbsnesomcbdzjzsx.supabase.co/rest/v1/rpc/',key:'sb_publishable_8aheKvc-sYfXvn9dHf-RBA_FFHBuK78'};
  const SHORT=/^[a-z0-9]{8}$/;
  const shortLink=id=>{if(!SHORT.test(id))throw Error('Not a short id');return BASE+'#r/'+id;};
  function shortFrom(text){
    const s=String(text||'').trim();
    const m=s.match(/#r\/([A-Za-z0-9]{8})\s*$/)||s.match(/[?&]r=([A-Za-z0-9]{8})(?:[&#]|\s*$)/);
    return m?m[1].toLowerCase():null;
  }
  async function rpc(name,body,fetcher=root.fetch,ms=6000){
    const ctl=typeof AbortController!=='undefined'?new AbortController():null,timer=ctl&&setTimeout(()=>ctl.abort(),ms);
    try{
      const res=await fetcher(SHORTENER.url+name,{method:'POST',headers:{apikey:SHORTENER.key,Authorization:'Bearer '+SHORTENER.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl?.signal});
      if(!res.ok)throw Error('Short links are resting ('+res.status+')');
      return await res.json();
    }finally{if(timer)clearTimeout(timer);}
  }
  async function shorten(code,fetcher){
    if(!CODE.test(code))throw Error('Not a share code');
    const id=await rpc('shorten_room_link',{p_code:code},fetcher);
    if(typeof id!=='string'||!SHORT.test(id))throw Error('Unexpected short link');
    return id;
  }
  async function expand(id,fetcher){
    if(!SHORT.test(String(id||'')))throw Error('Not a short id');
    const code=await rpc('room_link',{p_id:id},fetcher);
    if(code==null)return null;   // no such link
    if(typeof code!=='string'||!CODE.test(code))throw Error('Unexpected room code');
    return code;
  }
  // Android Chrome: open the installed app, or stay on the web page if it isn't installed.
  const intentLink=code=>SHORT.test(code)?`intent://open?r=${code}#Intent;scheme=${SCHEME};package=com.lofirooms.app;end`:`intent://open?c=${code}#Intent;scheme=${SCHEME};package=com.lofirooms.app;end`;
  const isNote=code=>/^LRG/.test(code);
  // The QR holds the whole link. Very full rooms can outgrow a phone-scannable QR;
  // then the card just says the link is in the message.
  const QR_LIMIT=1200;
  function qrMatrix(text,qrcode=root.qrcode){
    if(!qrcode||text.length>QR_LIMIT)return null;
    try{const qr=qrcode(0,'L');qr.addData(text,'Byte');qr.make();const n=qr.getModuleCount();return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>qr.isDark(r,c)));}catch(e){return null;}
  }
  // The snapshot is the whole screen with a see-through sky: find the room inside it.
  function bounds(img){
    const full={x:0,y:0,w:img.width,h:img.height};
    try{const k=4,c=(root.document||{}).createElement?.('canvas');if(!c)return full;c.width=Math.max(1,Math.round(img.width/k));c.height=Math.max(1,Math.round(img.height/k));
      const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);const d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=-1,y1=-1;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>24){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
      if(x1<0)return full;const pad=10;x0=Math.max(0,(x0-pad)*k);y0=Math.max(0,(y0-pad)*k);x1=Math.min(img.width,(x1+pad+1)*k);y1=Math.min(img.height,(y1+pad+1)*k);
      return {x:x0,y:y0,w:x1-x0,h:y1-y0};}catch(e){return full;}
  }
  function rounded(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
  function fit(g,text,max,size,weight,family){let s=size;do{g.font=`${weight} ${s}px ${family}`;if(g.measureText(text).width<=max)break;s-=2;}while(s>24);return s;}
  // Card shapes: a 4:5 feed post, and a 9:16 story that keeps the words and QR
  // clear of the top and bottom bars Instagram and TikTok draw over a story.
  const FORMATS={post:{W:1080,H:1350,eyebrow:98,top:130,room:820,bottom:56},story:{W:1080,H:1920,eyebrow:300,top:350,room:960,bottom:330}};
  // Draws the card on a canvas and returns it. room: an Image of the room snapshot.
  function drawCard(canvas,{room,title,url,night=false,format='post',logo=null,qrColours=null,mine=true,qrcode=root.qrcode}){
    const F=FORMATS[format]||FORMATS.post,W=F.W,H=F.H,base=H-F.bottom;canvas.width=W;canvas.height=H;const g=canvas.getContext('2d');
    const sky=night?['#2a2550','#433a74','#6b5592']:['#ffe6c7','#f8c9b3','#dcc9f0'],ink=night?'#fff6ea':'#3a2a26',soft=night?'#d9cff5':'#7d6158';
    const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,sky[0]);bg.addColorStop(.55,sky[1]);bg.addColorStop(1,sky[2]);g.fillStyle=bg;g.fillRect(0,0,W,H);
    if(night){g.fillStyle='#ffffffb0';for(let i=0;i<46;i++){const x=(i*197)%W,y=(i*331)%(H*.55),r=i%5===0?3:1.6;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}}
    const matrix=url?qrMatrix(url,qrcode):null,name=String(title||'My room').slice(0,40),quiet=4;
    const cell=matrix?Math.max(2,Math.floor(320/(matrix.length+quiet*2))):0,size=matrix?cell*(matrix.length+quiet*2):0;
    // The room, cropped to what's drawn and centred in the upper part.
    if(room&&room.width){const crop=bounds(room),box={x:70,y:F.top,w:W-140,h:Math.min(F.room,(matrix?base-size-24:base-280)-F.top)},s=Math.min(box.w/crop.w,box.h/crop.h),w=crop.w*s,h=crop.h*s;
      g.drawImage(room,crop.x,crop.y,crop.w,crop.h,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);}
    // Eyebrow up top; the room's name and a QR code share the bottom strip.
    g.fillStyle=soft;g.font='700 34px Nunito, sans-serif';g.textAlign='center';g.fillText(mine?'COME VISIT MY LOFI ROOM':'COME SEE THIS LOFI ROOM',W/2,F.eyebrow);g.textAlign='left';
    if(matrix){
      // Whole-pixel cells and a white moat keep it easy for a phone camera to read.
      const n=matrix.length,x=W-56-size,y=base-size;
      g.fillStyle='#ffffff';rounded(g,x,y,size,size,26);g.fill();canvas.qrBox={x,y,size};
      // Themed: qrColours(matrix) gives [row,col,hex,finder] per dark module, like the voxel QR.
      // Blocks get a hairline gap when cells are big enough; finders always stay solid.
      const painted=qrColours?qrColours(matrix):null,gap=cell>=6?Math.max(1,Math.round(cell*.08)):0;
      if(painted)for(const [r,c,hex,finder] of painted){const k=finder?0:gap;g.fillStyle='#'+hex.toString(16).padStart(6,'0');g.fillRect(x+(c+quiet)*cell+k/2,y+(r+quiet)*cell+k/2,cell-k,cell-k);}
      else{g.fillStyle='#16131f';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(matrix[r][c])g.fillRect(x+(c+quiet)*cell,y+(r+quiet)*cell,cell,cell);}
      const left=W-56-size-40-60;fit(g,name,left,72,'600','Fredoka, Nunito, sans-serif');g.fillStyle=ink;g.fillText(name,60,base-180);
      g.font='800 36px Nunito, sans-serif';g.fillText('Scan to step inside',60,base-114);
      g.fillStyle=soft;g.font='600 28px Nunito, sans-serif';g.fillText(format==='story'?'or tap the link on my story':'or tap the link in my message',60,base-70);
    }else{
      g.textAlign='center';fit(g,name,W-140,84,'600','Fredoka, Nunito, sans-serif');g.fillStyle=ink;g.fillText(name,W/2,base-154);
      g.font='800 38px Nunito, sans-serif';g.fillText('Tap the link to step inside',W/2,base-84);g.textAlign='left';
    }
    // Sign-off: the app icon beside the name, so a reposted card is still recognisably ours.
    let fx=60;
    if(logo&&logo.width){const s=52,y=base-14-34;g.save();rounded(g,fx,y,s,s,13);g.clip();g.drawImage(logo,fx,y,s,s);g.restore();fx+=s+14;}
    g.fillStyle=ink;g.font='800 26px Nunito, sans-serif';g.fillText('Lofi Rooms',fx,base-14);fx+=g.measureText('Lofi Rooms').width;
    g.fillStyle=soft;g.font='700 24px Nunito, sans-serif';g.fillText(' · heycristobal.com',fx,base-14);
    return canvas;
  }
  // mine=false when passing on a friend's room you're visiting: it isn't yours to call "my room".
  const shareText=(title,url,mine=true)=>`Come see ${mine?'my':'this'} Lofi Room “${String(title||'My room').slice(0,40)}” 🏠✨ ${url}`;
  const noteText=url=>`I signed your guest book in Lofi Rooms 💌 ${url}`;
  const api={BASE,SCHEME,FORMATS,SHORTENER,link,shortLink,shortFrom,shorten,expand,codeFrom,intentLink,isNote,qrMatrix,QR_LIMIT,bounds,drawCard,shareText,noteText};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRShareLinks=api;
})(typeof window!=='undefined'?window:globalThis);
