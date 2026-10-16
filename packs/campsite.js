// Campsite: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='campsite',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[9992018, 13075799, 14864048], [6642505, 8558214, 15195590], [11047024, 9079974, 15393236]];
  LR.addGroup(G,"Campsite");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const lantern=(m,w,a,s)=>{m.box(1,0,1,7,2,7,w).box(1,11,1,7,13,7,w).box(3,13,3,5,16,5,w);for(const x of [1,6])for(const z of [1,6])m.box(x,2,z,x+1,11,z+1,w);m.box(2,3,2,6,10,6,s.on?a:shade(a,.5),s.on);};

  def('campsite-fire',{name:"Campfire stone ring",kind:'floor',group:G,size:[2, 2],vars:PALETTES,tap:'toggle',on:true,anim:'fire',light:{at:[8,5,8],color:0xffb275,i:4,d:6,flicker:true},emit:{kind:'embers',at:[8,5,8],rate:1,on:true},
    build(m,[w,a,c],s={on:true}){
      disc(m,8,0,8,7,shade(w,.7),3,5);m.box(4,1,6,12,3,9,w).box(6,1,4,9,4,12,w);m.box(6,3,6,10,7,10,s.on?a:ink,s.on).box(7,7,7,9,10,9,s.on?cream:ink,s.on);
    }
  });

  def('campsite-logs',{name:"Camp log seats",kind:'floor',group:G,size:[2, 1],vars:PALETTES,seat:5,tap:'fx',fx:{sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      for(const x of [1,10]){m.box(x,0,1,x+5,5,7,w).box(x+1,5,1,x+4,6,7,c);m.box(x,1,7,x+5,4,8,shade(w,.65));}
    }
  });

  def('campsite-tent',{name:"Canvas tent backdrop",kind:'wall',group:G,size:[3, 3],vars:PALETTES,depth:9,tap:'fx',fx:{door:true,sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      for(let y=0;y<24;y++){const inset=Math.floor(y/2);if(inset<12)m.box(inset,y,0,24-inset,y+1,2,a);}m.box(10,0,2,14,17,3,ink);m.part('door',[10,0,3]);m.box(10,0,3,14,17,4,c);m.main();for(const x of [1,22])m.box(x,0,2,x+1,3,8,w);
    }
  });

  def('campsite-lantern',{name:"Hanging camp lantern",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:8,tap:'toggle',on:true,anim:'flame',light:{at:[4,7,4],color:0xffcf8e,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      lantern(m,w,a,s);m.box(3,15,0,5,16,4,w);
    }
  });

  def('campsite-cooler',{name:"Picnic cooler",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'creak',door:true},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,9,8,a).box(7,5,8,9,8,9,cream);m.part('door',[0,9,0]);m.box(0,9,0,16,11,8,c);m.main();m.box(0,4,3,1,8,5,w).box(15,4,3,16,8,5,w);
    }
  });

  def('campsite-backpack',{name:"Canvas hiking backpack",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,7,10,6,a).box(2,10,2,6,12,5,c).box(2,2,6,6,6,8,c).box(0,1,2,1,7,5,w).box(7,1,2,8,7,5,w).box(2,8,6,3,10,7,brass).box(5,8,6,6,10,7,brass);
    }
  });

  def('campsite-marshmallows',{name:"Marshmallow roasting sticks",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'crunch',say:['Golden at the edges. Worth the wait.']},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,1,8,2,7,w);for(const x of [1,4])m.box(x,2,3,x+1,12,4,w).box(x-1,11,2,x+2,14,5,cream).set(x,14,3,a);
    }
  });

  def('campsite-chair',{name:"Folding camp chair",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:6,
    build(m,[w,a,c],s={on:true}){
      for(const x of [1,6]){m.box(x,0,1,x+1,7,3,w).box(x,0,5,x+1,12,7,w);}m.box(1,6,1,7,8,7,a).box(1,8,6,7,14,7,c);m.box(0,10,1,1,11,7,w).box(7,10,1,8,11,7,w);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["campsite-fire", "campsite-logs", "campsite-tent", "campsite-lantern", "campsite-cooler", "campsite-backpack", "campsite-marshmallows", "campsite-chair"]};
})();
