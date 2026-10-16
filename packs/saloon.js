// Wild west saloon: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='saloon',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[10120776, 11038295, 14861973], [7491904, 8098413, 14667692], [11964000, 8292767, 15720639]];
  LR.addGroup(G,"Wild west saloon");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const lantern=(m,w,a,s)=>{m.box(1,0,1,7,2,7,w).box(1,11,1,7,13,7,w).box(3,13,3,5,16,5,w);for(const x of [1,6])for(const z of [1,6])m.box(x,2,z,x+1,11,z+1,w);m.box(2,3,2,6,10,6,s.on?a:shade(a,.5),s.on);};

  def('saloon-piano',{name:"Saloon upright piano",kind:'floor',group:G,size:[3, 1],vars:PALETTES,tap:'piano',
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,19,5,w).box(0,8,5,24,10,8,w).box(1,10,5,23,11,8,cream);for(let x=2;x<23;x+=3)m.box(x,11,5,x+1,12,7,ink);m.box(2,13,5,22,17,6,shade(w,.75));for(const x of [1,21])m.box(x,0,5,x+2,8,8,w);m.box(8,12,6,16,17,7,c);
    }
  });

  def('saloon-poker',{name:"Friendly poker table",kind:'floor',group:G,size:[2, 2],vars:PALETTES,top:10,tap:'fx',fx:{sfx:'flip',say:['The stakes are imaginary. The snacks are not.']},
    build(m,[w,a,c],s={on:true}){
      table(m,w,16,16,8);m.box(1,10,1,15,11,15,a);for(const x of [3,9])m.box(x,11,5,x+3,12,9,cream).set(x+1,12,6,w);disc(m,5,11,12,1,c,2);disc(m,11,11,12,1,w,3);
    }
  });

  def('saloon-barrels',{name:"Whiskey barrel pair",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'thump'},
    build(m,[w,a,c],s={on:true}){
      for(const x of [4,12]){disc(m,x,0,4,3,w,11);for(const y of [1,8])disc(m,x,y,4,3,ink,1,2);disc(m,x,11,4,2,c);m.set(x,12,4,w);}
    }
  });

  def('saloon-doors',{name:"Swinging saloon doors",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:3,tap:'fx',fx:{door:true,sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,15])m.box(x,0,0,x+1,24,2,w);m.part('door',[1,5,2]);m.box(1,5,2,7,17,3,a);for(let y=7;y<16;y+=3)m.box(1,y,3,7,y+1,4,w);m.main();m.part('door2',[15,5,2]);m.box(9,5,2,15,17,3,a);for(let y=7;y<16;y+=3)m.box(9,y,3,15,y+1,4,w);m.main();
    }
  });

  def('saloon-wanted',{name:"Wanted: a good nap poster",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:2,tap:'fx',fx:{sfx:'flip',say:['Wanted: a good nap. Reward: another nap.']},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,16,1,c).box(1,12,1,7,14,2,w).box(2,5,1,6,10,2,a).set(2,10,1,a).set(5,10,1,a).box(1,2,1,7,3,2,w).set(3,8,2,ink).set(5,8,2,ink);
    }
  });

  def('saloon-stool',{name:"Turned saloon barstool",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:10,
    build(m,[w,a,c],s={on:true}){
      for(const x of [1,6])for(const z of [1,6])m.box(x,0,z,x+1,10,z+1,w);m.box(1,4,1,7,5,7,w);disc(m,4,10,4,4,a,2);
    }
  });

  def('saloon-spittoon',{name:"Brass saloon flower pot",kind:'small',group:G,size:[1, 1],vars:PALETTES,plant:true,tap:'water',
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,3,w,2);disc(m,4,2,4,2,brass,4);disc(m,4,6,4,3,brass,1,2);m.box(3,6,3,4,12,4,green).blob(3,12,3,2,2,2,a).set(3,13,3,c);
    }
  });

  def('saloon-lantern',{name:"Saloon oil lantern",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:8,on:true,tap:'toggle',anim:'flame',light:{at:[4,7,4],color:0xffcb85,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      lantern(m,w,c,s);m.box(3,14,0,5,16,3,a);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["saloon-piano", "saloon-poker", "saloon-barrels", "saloon-doors", "saloon-wanted", "saloon-stool", "saloon-spittoon", "saloon-lantern"]};
})();
