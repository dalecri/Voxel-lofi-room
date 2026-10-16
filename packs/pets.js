// Ordinary pet furniture and ephemeral room life. No saves, purchases or extra pets in room codes.
(function(root){
  const IDS=['scratchpost','windowperch','cattunnel','catgrass','litterbox','catfountain','catshelves','groomarch','toymouse','featherstand','cardbox','paperbag','donutbed','radhammock','dogbed','bowlstand','toybasket','leashhook','hamstercage','bunnyhutch','birdgym','reptiletank','treatjar','petcarrier','puzzlefeeder','lickmat','petflap','pawtraits'];
  function register(L){
    const {def,shade}=L,cream=0xf2e6cc,ink=0x3d4144,water=0x81bfc4,glass=0xc5e4df;
    const vars=[[0xb78c65,0xa5b8a1],[0x80644e,0xc58e82]];
    const disc=(m,x,y,z,r,c,h=1,inner=0)=>{for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const d=Math.hypot(a,b);if(d<=r&&d>=inner)m.box(x+a,y,z+b,x+a+1,y+h,z+b+1,c);}};
    const bowl=(m,x,y,z,c)=>{disc(m,x,y,z,3,c,1);disc(m,x,y+1,z,3,c,2,2);disc(m,x,y+1,z,1,0xa87c55);};
    const cage=(m,w,h,d,c)=>{m.box(0,0,0,w,2,d,c);for(let x=0;x<w;x+=3)m.box(x,h,0,x+1,h+1,d,glass);for(let x=0;x<w;x+=3)m.box(x,2,0,x+1,h,1,glass).box(x,2,d-1,x+1,h,d,glass);for(let z=0;z<d;z+=3)m.box(0,2,z,1,h,z+1,glass).box(w-1,2,z,w,h,z+1,glass);};
    const add=(id,name,props,build)=>def(id,{name,kind:'floor',group:'pets',size:[1,1],vars,...props,build});
    add('scratchpost','Sisal scratching post',{petAction:'scratch'},(m,[w,c])=>{disc(m,4,0,4,4,c,2);m.box(3,2,3,6,16,6,cream);for(let y=3;y<16;y+=2)m.box(3,y,3,6,y+1,6,shade(w,1.25));disc(m,4,16,4,2,w);});
    add('windowperch','Window perch',{size:[2,1],seat:7,petSpot:true,petGaze:true},(m,[w,c])=>{for(const x of [1,13])for(const z of [1,5])m.box(x,0,z,x+2,5,z+2,w);m.box(0,4,0,16,5,8,w).box(1,5,1,15,7,7,c).box(1,7,0,15,8,1,cream);});
    add('cattunnel','Crinkly cat tunnel',{size:[2,2],walk:true,petAction:'tunnel'},(m,[w,c])=>{for(let x=0;x<16;x++)for(let y=0;y<13;y++)for(let z=0;z<16;z++){const d=Math.hypot(y-5,z-7.5);if(d>5.4&&d<7.3)m.set(x,y,z,x%5===0?cream:c);}m.box(0,0,0,16,1,16,shade(c,.8));});
    add('catgrass','Cat grass planter',{petAction:'nibble'},(m,[w,c])=>{m.box(1,0,1,7,4,7,c).box(0,4,0,8,5,8,cream).box(1,5,1,7,6,7,w);for(let x=1;x<7;x+=2)for(let z=1;z<7;z+=2)m.box(x,6,z,x+1,9+(x+z)%3,z+1,0x91ae6d).set(x+1,8,z,0xc9c47d);});
    add('litterbox','Covered litter box',{size:[2,2]},(m,[w,c])=>{m.box(1,0,1,15,3,15,c).box(2,3,2,14,4,14,0xc4b59a).box(1,3,1,3,12,15,cream).box(13,3,1,15,12,15,cream).box(2,4,1,14,12,3,cream).box(2,12,2,14,14,14,cream).box(1,4,13,6,11,15,c).box(10,4,13,15,11,15,c).box(6,10,13,10,13,15,c);});
    add('catfountain','Cat water fountain',{petAction:'drink',petAnim:'fountain'},(m,[w,c])=>{disc(m,4,0,4,4,c,2);disc(m,4,2,4,3,water);m.box(3,2,3,5,8,5,cream);m.part('water',[4,5,5]);m.box(3,4,5,5,8,6,water).set(3,3,5,glass);m.main();});
    add('catshelves','Wall cat shelves',{kind:'wall',size:[3,3],depth:7,seat:7,petSpot:true,petShelves:[[4,7,4],[12,13,4],[20,19,4]]},(m,[w,c])=>{for(const [x,y] of [[0,5],[8,11],[16,17]]){m.box(x,y,0,x+8,y+1,7,w).box(x+1,y+1,1,x+7,y+2,6,c).box(x+2,y-3,0,x+3,y,2,w).box(x+5,y-3,0,x+6,y,2,w);}});
    add('groomarch','Self-grooming brush arch',{petAction:'rub',walk:true},(m,[w,c])=>{m.box(0,0,0,8,1,8,w);for(let x=0;x<8;x++)for(let y=1;y<11;y++)if(Math.abs(Math.hypot(x-3.5,y-4)-5)<1.4)m.box(x,y,3,x+1,y+1,5,c);});
    add('toymouse','Wind-up toy mouse',{kind:'small',walk:true,petAction:'chase',petAnim:'mouse'},(m,[w,c])=>{m.part('mouse',[4,1,4]);m.blob(4,2,4,3,2,2,shade(c,.8)).set(6,2,5,ink).set(7,1,4,0xd19497).set(3,4,4,cream).set(5,4,4,cream).box(0,1,3,2,2,4,w).box(3,3,2,4,5,3,ink);m.main();});
    add('featherstand','Feather wand stand',{petAction:'bat',petAnim:'feather'},(m,[w,c])=>{disc(m,4,0,4,4,w,2);m.box(3,2,3,4,16,4,w);m.part('feathers',[4,16,4]);m.box(4,13,3,5,18,4,cream).box(5,11,3,6,16,5,c).box(6,12,3,7,17,4,0xd6b16e);m.main();});
    add('cardbox','Cardboard cat box',{seat:2,petSpot:true},(m,[w,c])=>{const b=shade(w,1.18);m.box(0,0,0,8,2,8,b).box(0,2,0,1,6,8,b).box(7,2,0,8,6,8,b).box(1,2,0,7,6,1,b).box(1,2,7,7,5,8,b).box(-1,6,0,1,7,8,shade(b,1.1)).box(7,6,0,9,7,8,b).box(3,2,7,5,4,9,cream);});
    add('paperbag','Crinkled paper bag',{size:[2,1],seat:8,petSpot:true,petPad:[8,8,4]},(m,[w])=>{const b=shade(w,1.35);m.box(1,0,0,15,2,8,b).box(1,2,0,15,7,1,b).box(1,2,7,15,7,8,b).box(1,7,1,15,8,7,shade(b,1.1)).box(1,2,1,3,7,7,b);for(const x of [5,8,11])m.set(x,7,6,0xa18a61);});
    add('donutbed','Donut cuddler bed',{size:[2,2],seat:3,petSpot:true,petPad:[7.5,3,7.5]},(m,[w,c])=>{disc(m,7,0,7,7,c,2);disc(m,7,2,7,7,c,3,4);disc(m,7,2,7,4,cream);});
    add('radhammock','Radiator hammock',{size:[2,1],seat:6,petSpot:true,petPad:[8,6,4]},(m,[w,c])=>{for(const x of [1,13])m.box(x,0,1,x+2,9,3,w).box(x,0,6,x+2,9,8,w);m.box(0,8,1,16,9,2,w).box(0,8,7,16,9,8,w);m.box(2,5,2,14,6,7,c).box(0,6,2,3,7,7,c).box(13,6,2,16,7,7,c);});
    add('dogbed','Big plush dog bed',{size:[2,2],seat:2,petOnly:'dog'},(m,[w,c])=>{disc(m,7,0,7,7,shade(c,.85),2);disc(m,7,2,7,7,c,3,5);disc(m,7,2,7,4,cream);m.box(5,2,13,10,3,15,w);});
    add('bowlstand','Elevated dog bowl stand',{size:[2,1],tap:'bowl',petFeed:'dog'},(m,[w,c])=>{for(const x of [1,13])m.box(x,0,1,x+2,4,7,w);m.box(0,4,0,16,5,8,w);bowl(m,4,5,4,c);bowl(m,12,5,4,cream);disc(m,12,6,4,1,water);});
    add('toybasket','Pet toy basket',{petAction:'bat',petAnim:'toys'},(m,[w,c])=>{m.box(0,0,0,8,4,8,w);for(let y=1;y<4;y+=2)m.box(0,y,0,8,y+1,1,cream).box(7,y,0,8,y+1,8,cream);m.part('yarn',[3,5,3]);m.blob(3,5,3,2.5,2.5,2.5,c).box(1,5,4,5,6,5,cream);m.main();m.box(5,4,4,7,5,8,cream).box(6,4,1,8,6,3,0xd5a2a4).set(7,6,2,0xd5a2a4).set(7,5,3,ink);});
    add('leashhook','Leash wall hook',{kind:'wall',size:[1,2],depth:4},(m,[w,c])=>{m.box(2,12,0,6,16,1,w).box(3,12,1,5,13,4,ink).box(3,3,3,4,12,4,c).box(5,3,3,6,11,4,c).box(3,2,3,6,3,4,c).box(3,11,3,6,12,4,c);});
    add('hamstercage','Hamster cage with wheel',{size:[2,1],petAnim:'wheel'},(m,[w,c])=>{cage(m,16,13,8,c);m.box(1,2,1,15,3,7,0xd4b58a);m.part('wheel',[10,7,4],'z');for(let x=6;x<15;x++)for(let y=3;y<12;y++)if(Math.abs(Math.hypot(x-10,y-7)-4)<.8)m.set(x,y,4,w);m.box(6,7,4,15,8,5,c).box(10,3,4,11,12,5,c);m.main();m.blob(3,4,4,2,1.5,1.5,cream).set(4,4,5,ink).set(3,6,4,0xd5a2a4);});
    add('bunnyhutch','Bunny hutch',{size:[2,2],petAnim:'bunny'},(m,[w,c])=>{m.box(0,0,0,16,2,16,w).box(0,2,0,2,12,16,w).box(14,2,0,16,12,16,w).box(2,2,0,14,12,2,w).box(0,12,0,16,14,6,w).box(0,12,14,16,13,16,w);for(let x=2;x<14;x+=3)m.box(x,2,14,x+1,11,15,glass);m.part('bunny',[7,3,10]);m.blob(7,4,10,3,2,2,cream).box(8,5,9,10,7,11,cream).box(8,7,9,9,10,10,cream).box(10,7,9,11,10,10,cream).set(10,6,11,ink);m.main();});
    add('birdgym','Bird play gym',{kind:'small',size:[1,1],petAnim:'feather'},(m,[w,c])=>{m.box(0,0,0,8,1,8,w).box(3,1,3,5,13,5,w).box(0,11,3,8,13,5,w);m.part('feathers',[6,11,4]);m.box(6,6,4,7,11,5,cream).blob(6,5,4,1.5,1.5,1.5,c).box(1,9,4,2,11,5,c);m.main();});
    add('reptiletank','Gecko basking tank',{size:[2,1],petAnim:'gecko'},(m,[w,c])=>{m.box(0,0,0,16,2,8,w).box(0,12,0,16,13,8,w);for(const x of [0,15])for(const z of [0,7])m.box(x,2,z,x+1,12,z+1,glass);m.box(0,3,0,1,6,8,glass);m.box(1,2,1,15,3,7,0xcbb88c).blob(6,3,4,3,2,2,0x8d9690);m.box(11,9,3,15,11,6,ink).box(12,8,4,14,9,5,0xf6b770,true);m.part('gecko',[6,5,5]);m.box(4,5,4,8,6,6,0x98ae77).box(7,5,5,10,6,6,0x98ae77).set(4,5,3,0x98ae77).set(7,5,6,0x98ae77).set(8,5,5,ink);m.main();});
    add('treatjar','Glass treat jar',{kind:'small',tap:'bowl',petFeed:'cat'},(m,[w,c])=>{m.box(1,0,1,7,1,7,glass);for(const x of [1,6])for(const z of [1,6])m.box(x,1,z,x+1,7,z+1,glass);m.box(2,1,1,6,7,2,glass).box(1,7,1,7,8,7,w).box(3,8,3,5,9,5,w);for(const [x,z] of [[2,2],[4,3],[3,5]])m.box(x,1,z,x+2,3,z+1,0xc5a36d);m.box(2,4,6,6,6,7,cream).set(3,5,7,c);});
    add('petcarrier','Open pet carrier',{size:[2,1]},(m,[w,c])=>{m.box(0,0,0,16,2,8,c).box(0,2,0,2,11,8,cream).box(14,2,0,16,11,8,cream).box(2,2,0,14,11,1,cream).box(1,11,0,15,12,8,c).box(6,12,3,10,13,5,ink);for(let y=3;y<10;y+=3)m.box(15,y,2,16,y+1,6,ink);for(let x=0;x<7;x+=2)m.box(x,2,8,x+1,9,9,glass);});
    add('puzzlefeeder','Puzzle slow-feeder',{tap:'bowl',petFeed:'cat'},(m,[w,c])=>{m.box(0,0,0,8,1,8,c);for(const z of [0,7])m.box(0,1,z,8,3,z+1,c);for(const x of [0,7])m.box(x,1,0,x+1,3,8,c);m.box(2,1,1,3,3,5,c).box(4,1,3,5,3,7,c).set(1,1,5,w).set(5,1,2,w).set(6,1,6,w);});
    add('lickmat','Textured lick mat',{kind:'rug',petAction:'lick'},(m,[w,c])=>{m.box(0,0,0,8,1,8,c);for(let x=1;x<7;x+=2)for(let z=1;z<7;z+=2)m.set(x,1,z,cream);});
    add('petflap','Pet flap door',{kind:'wall',size:[1,2],depth:3,petAction:'slip',petAnim:'flap'},(m,[w,c])=>{m.box(0,0,0,1,12,3,w).box(7,0,0,8,12,3,w).box(0,11,0,8,13,3,w);m.part('flap',[4,11,2],'x');m.box(1,1,2,7,11,3,c).box(2,1,3,6,2,4,cream);m.main();});
    add('pawtraits','Pawtrait frames',{kind:'wall',size:[2,1],depth:2},(m,[w,c])=>{for(const x of [0,8]){m.box(x,0,0,x+7,8,2,w).box(x+1,1,2,x+6,7,3,cream).box(x+2,2,3,x+5,4,4,c);for(const a of [1,3,5])m.set(x+a,5,3,c);}});
  }
  // Part transforms only. Burst clocks have a held final pose between bursts.
  function animate(obj,kind,t,reduced=false){
    const parts=obj.userData.parts || {},part=name=>{const p=parts[name];if(p && !p.userData.petHome)p.userData.petHome={...p.position};return p;};
    const wave=reduced?0:Math.sin(t*1.6),burst=(period,seconds)=>Math.floor(t/period)+Math.min((t%period)/seconds,1);
    let p;
    if(kind==='wheel' && (p=part('wheel')))p.rotation.z=reduced?0:burst(22,4)*Math.PI*4;
    if(kind==='fountain' && (p=part('water')))p.position.y=p.userData.petHome.y+wave*.025;
    if(kind==='feather' && (p=part('feathers')))p.rotation.z=wave*.09;
    if(kind==='toys' && (p=part('yarn')))p.rotation.z=!reduced && (obj.userData.petExcitedUntil || 0)>t?Math.sin(t*9)*.25:0;
    if(kind==='bunny' && (p=part('bunny'))){const k=t%29,hop=!reduced && k<3?Math.sin(k*Math.PI)*.12:0;p.position.y=p.userData.petHome.y+Math.abs(hop);p.position.x=p.userData.petHome.x+(!reduced && k<3?Math.sin(k*Math.PI/3)*.25:0);}
    if(kind==='gecko' && (p=part('gecko')))p.rotation.y=!reduced && t%43<4?Math.sin(t)*.12:0;
    if(kind==='flap' && (p=part('flap')))p.rotation.x=(obj.userData.petSlipUntil || 0)>t?-.65:0;
  }
  function createView({view,room,CAT,random=Math.random}){
    const dogs=new Map(),mice=new Map();let clock=0;
    const eligible=P=>!P.robot && !P.visitorLeaving && view.fp?.id!==P.id && !P.eat && !P.onArrive && room.get(P.id)?.t==='cat' && !P.perch && !P.hop && !P.petActivity && !P.petPending && !(P.manual>view.t) && ['sit','walk'].includes(P.state);
    const vacant=([x,z],P)=>view.cellFree(x,z) && ![...view.pets.values()].some(q=>q!==P && (Math.floor(q.x)===x && Math.floor(q.z)===z || q.path?.length && Math.floor(q.path[q.path.length-1][0])===x && Math.floor(q.path[q.path.length-1][1])===z));
    function rootItem(it){const seen=new Set();while(it?.p && !seen.has(it.id)){seen.add(it.id);it=room.get(it.p);}return it;}
    function spots(it,P){
      const owner=rootItem(it);if(!owner)return [];
      if(CAT[owner.t].kind==='wall'){const p=view.itemPoint(owner.id,[4,1,4]),x=Math.floor(p.x),z=Math.floor(p.z);return [[x,z],[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(s=>vacant(s,P));}
      const mouse=mice.get(it.id),goal=mouse?.path.at(-1),at=mouse?{...owner,x:Math.floor(goal?.[0] ?? mouse.obj.position.x),z:Math.floor(goal?.[1] ?? mouse.obj.position.z)}:owner;
      return view.spotsAround(at).filter(s=>vacant(s,P));
    }
    function release(P){
      const a=P.petActivity || P.petPending,o=view.objs.get(P.id);if(a?.hidden && o)o.visible=true;
      if(P.onArrive===a?.arrive)P.onArrive=null;
      P.petActivity=null;P.petPending=null;P.petSpeed=1;
    }
    function finish(P){release(P);P.path=null;P.state='sit';P.timer=5;}
    function perform(P,it){
      if(room.get(it.id)?.t!==it.t || view.pets.get(P.id)!==P)return;
      const kind=CAT[it.t].petAction,center=view.itemPoint(it.id,[4,2,4]);
      P.heading=Math.atan2(center.x-P.x,center.z-P.z);P.petPending=null;P.path=null;P.state='pet-play';P.timer=kind==='slip'?3:10;
      P.petActivity={kind,id:it.id,until:clock+P.timer,hidden:kind==='slip'};
      const obj=view.objs.get(it.id);if(obj){obj.userData.petExcitedUntil=clock+4;if(kind==='slip')obj.userData.petSlipUntil=clock+3;}
      if(kind==='slip'){const cat=view.objs.get(P.id);if(cat)cat.visible=false;}
      if(kind==='tunnel'){
        const ends=[[1,1,8],[14,1,8]].map(at=>view.itemPoint(it.id,at)).map(p=>[Math.floor(p.x),Math.floor(p.z)]).filter(s=>vacant(s,P));
        ends.sort((a,b)=>Math.hypot(b[0]+.5-P.x,b[1]+.5-P.z)-Math.hypot(a[0]+.5-P.x,a[1]+.5-P.z));
        for(const [x,z] of ends){const path=view.path(Math.floor(P.x),Math.floor(P.z),x,z);if(path?.length){P.path=path;P.state='walk';P.petSpeed=1.4;P.onArrive=q=>{q.state='pet-play';q.timer=2;q.petActivity.until=clock+2;};P.petActivity.path=path;P.petActivity.arrive=P.onArrive;break;}}
      }
    }
    function invite(P,it){
      if(!eligible(P))return false;
      const sent=view.sendCat(spots(it,P),P.id);if(!sent)return false;
      P.petPending={id:it.id,type:it.t,path:sent.path};P.petSpeed=['chase','tunnel'].includes(CAT[it.t].petAction)?1.4:1;
      if(sent.path.length){P.onArrive=q=>perform(q,it);P.petPending.arrive=P.onArrive;}else perform(P,it);
      return true;
    }
    function choose(P,kind){
      if(!eligible(P) || (!kind && random()>.28))return false;
      const choices=room.items.filter(it=>CAT[it.t].petAction && (!kind || CAT[it.t].petAction===kind));
      // Keep an occupied warm favorite; wait nearby rather than stealing its reservation.
      const favorite=room.get(P.favoriteId);
      if(!kind && favorite?.t==='radhammock' && [...view.pets.values()].some(q=>q!==P&&(q.perch?.owner===favorite.id || q.next?.owner===favorite.id))){
        const sent=view.sendCat(spots(favorite,P),P.id);if(sent){P.onArrive=q=>{q.timer=25;};if(!sent.path.length){P.path=null;P.state='sit';P.timer=25;P.onArrive=null;}return true;}
      }
      if(!choices.length)return false;
      const first=Math.floor(random()*choices.length);
      for(let n=0;n<choices.length;n++)if(invite(P,choices[(first+n)%choices.length]))return true;
      return false;
    }
    function feed(it){
      if(CAT[it.t].petFeed==='dog'){
        const dog=room.items.find(i=>i.t==='mxdog'&&!i.p),o=dog && view.objs.get(dog.id);if(!o)return 0;
        const d=dogState(dog,o);for(const [x,z] of spots(it)){const path=view.path(Math.floor(o.position.x),Math.floor(o.position.z),x,z);if(path){d.path=path;d.target=it.id;d.feeding=true;d.state='walk';return dog.id;}}return 0;
      }
      let best=null;
      for(const P of view.pets.values())if(eligible(P))for(const [x,z] of spots(it,P)){
        const path=view.path(Math.floor(P.x),Math.floor(P.z),x,z);if(path && (!best || path.length<best.path.length))best={P,path,x,z};
      }
      if(!best)return 0;
      const sent=view.sendCat([[best.x,best.z]],best.P.id);if(!sent)return 0;
      const p=view.itemPoint(it.id,[4,2,4]);best.P.eat={x:p.x,z:p.z};
      if(!sent.path.length)view.startEating(best.P);
      return best.P.id;
    }
    function perches(){
      const out=[];
      for(const it of room.items){const C=CAT[it.t];if(!C.petShelves && !C.petPad)continue;
        if(C.petPad){if([...view.pets.values()].some(q=>q.perch?.owner===it.id || q.next?.owner===it.id))continue;const p=view.itemPoint(it.id,C.petPad);for(const from of view.spotsAround(it))out.push({x:Math.floor(p.x),z:Math.floor(p.z),px:p.x,pz:p.z,y:p.y,from,owner:it.id,t:it.t});continue;}
        for(const at of C.petShelves){const p=view.itemPoint(it.id,at),x=Math.floor(p.x),z=Math.floor(p.z);
          if([...view.pets.values()].some(q=>[q.perch,q.next].some(s=>s?.x===x&&s?.z===z)))continue;
          for(const [dx,dz] of [[0,1],[1,0],[-1,0],[0,-1]])if(view.cellFree(x+dx,z+dz))out.push({x,z,y:p.y,from:[x+dx,z+dz],owner:it.id,t:it.t});
        }
      }return out;
    }
    function pose(P,obj,t){
      const a=P.petActivity,inner=obj.userData.inner;
      if(a && !view.reducedMotion){
        if(a.kind==='scratch'){inner.rotation.x=Math.sin(t*9)*.09;inner.position.y=Math.abs(Math.sin(t*9))*.06;}
        if(['nibble','drink','lick'].includes(a.kind))inner.rotation.x=.18+Math.sin(t*5)*.035;
        if(a.kind==='rub')inner.rotation.z=Math.sin(t*3)*.15;
        if(['bat','chase'].includes(a.kind))inner.rotation.z=Math.sin(t*5)*.09;
      }else inner.rotation.z=0;
      if(P.perch && !P.hop && P.state!=='pet' && CAT[room.get(P.perch.owner)?.t]?.petGaze){
        const birds=room.items.find(i=>CAT[i.t].tap==='feeder'),windows=view.windowSpots();
        if(birds){const p=view.itemPoint(birds.id,[4,4,4]);P.heading=Math.atan2(p.x-P.x,p.z-P.z);}
        else if(windows.length){const w=windows.reduce((a,b)=>Math.hypot(a.x-P.x,a.z-P.z)<Math.hypot(b.x-P.x,b.z-P.z)?a:b);P.heading=w.heading;}
        P.state='sit';obj.rotation.y=P.heading;
      }
    }
    function dogState(it,obj){let d=dogs.get(it.id);if(!d || d.obj!==obj){d={obj,state:'idle',wait:3,path:[],target:null};dogs.set(it.id,d);}return d;}
    function updateDogs(dt,t){
      for(const it of room.items.filter(i=>i.t==='mxdog'&&!i.p)){
        const obj=view.objs.get(it.id);if(!obj)continue;const d=dogState(it,obj);
        if(view.petsPaused)continue;
        if(d.target && !room.get(d.target)){d.state='idle';d.target=null;d.path=[];d.wait=2;view.placeObject(obj,it,room);}
        if(d.state==='idle'){
          d.wait-=dt;if(d.wait>0)continue;d.wait=25;
          const bed=room.items.find(i=>i.t==='dogbed'&&![...dogs.values()].some(q=>q!==d&&q.target===i.id));
          if(bed)for(const [x,z] of spots(bed)){const path=view.path(Math.floor(obj.position.x),Math.floor(obj.position.z),x,z);if(path){d.path=path;d.target=bed.id;d.state='walk';break;}}
        }
        if(d.state==='walk'){
          const next=d.path[0];if(next){const dx=next[0]-obj.position.x,dz=next[1]-obj.position.z,len=Math.hypot(dx,dz),step=Math.min(len,dt*.7);obj.position.x+=dx/(len||1)*step;obj.position.z+=dz/(len||1)*step;obj.rotation.y=Math.atan2(dx,dz);if(len<.04)d.path.shift();}
          else if(d.feeding){d.state='eat';d.wait=6;}
          else {d.state='settle';d.progress=0;d.from=obj.position.clone();}
        }
        if(d.state==='settle'){
          const bed=room.get(d.target);if(bed){d.progress=Math.min(1,d.progress+dt/1.2);const target=view.itemPoint(bed.id,[7,3,7]);obj.position.lerpVectors(d.from,target,d.progress);if(d.progress===1)d.state='sleep';}
        }
        if(d.state==='eat'){d.wait-=dt;if(d.wait<=0){d.feeding=false;d.target=null;d.state='idle';d.wait=3;}}
        if(d.state==='sleep' && !view.reducedMotion && Math.floor(t/4)!==d.lastZ){d.lastZ=Math.floor(t/4);view.icon('z',obj.position.clone().add({x:0,y:.8,z:0}),{size:.2,life:2});}
      }
      for(const [id,d] of dogs)if(!room.get(id)||view.objs.get(id)!==d.obj)dogs.delete(id);
    }
    function frame(dt,t){
      clock=t;
      for(const P of view.pets.values()){
        if(P.petPending && room.get(P.petPending.id)?.t!==P.petPending.type)finish(P);
        if(P.petPending && (P.state!=='walk' || P.path!==P.petPending.path))release(P);
        const a=P.petActivity;
        if(a && (clock>=a.until || !room.get(a.id)))finish(P);
        else if(a && !a.hidden && P.state!=='pet-play' && !(a.kind==='tunnel' && P.path===a.path))release(P);
        if(!view.petsPaused && eligible(P) && P.state==='walk' && !(P.groomAfter>clock)){
          const arch=room.items.find(it=>it.t==='groomarch'&&Math.hypot(it.x+.5-P.x,it.z+.5-P.z)<.9);if(arch){P.groomAfter=clock+60;perform(P,arch);}
        }
        // Visibility changes from wall culling or scene sync must not reveal a cat mid-slip.
        if(P.petActivity?.hidden){const o=view.objs.get(P.id);if(o)o.visible=false;}
      }
      for(const it of room.items){const C=CAT[it.t],obj=view.objs.get(it.id);if(!obj || !C.petAnim)continue;
        animate(obj,C.petAnim,t,view.reducedMotion || view.petsPaused);
        if(C.petAnim==='mouse'&&!it.p){
          let m=mice.get(it.id);if(!m || m.obj!==obj){m={obj,next:t+4,path:[]};mice.set(it.id,m);}
          if(!view.petsPaused && !view.reducedMotion){
            if(t>=m.next){m.next=t+20;const x=Math.floor(obj.position.x),z=Math.floor(obj.position.z),options=[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(([a,b])=>view.cellFree(a,b)&&Math.hypot(a-it.x,b-it.z)<2.5);if(options.length){const dest=options[Math.floor(random()*options.length)];m.path=view.path(x,z,...dest)||[];if(m.path.length){const cats=[...view.pets.values()].filter(eligible).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));if(cats.length)invite(cats[0],it);}}}
            const p=m.path[0];if(p){const dx=p[0]-obj.position.x,dz=p[1]-obj.position.z,len=Math.hypot(dx,dz),step=Math.min(len,dt*1.2);obj.position.x+=dx/(len||1)*step;obj.position.z+=dz/(len||1)*step;obj.rotation.y=Math.atan2(dx,dz);if(len<.04)m.path.shift();}
          }
        }
      }
      for(const [id,m] of mice)if(!room.get(id)||view.objs.get(id)!==m.obj)mice.delete(id);
      updateDogs(dt,t);
      if([...view.pets.values()].some(P=>P.petActivity || P.petPending))view.activity?.report('pet activities');
    }
    function reset(){
      for(const P of view.pets.values())if(P.petActivity || P.petPending)finish(P);
      dogs.clear();mice.clear();
    }
    return {choose,invite,feed,perches,pose,frame,reset,dogs};
  }
  const api={IDS,register,animate,createView};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else {root.LRPets=api;register(root.LR);}
})(typeof window!=='undefined'?window:globalThis);
