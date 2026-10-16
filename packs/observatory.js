// Observatory: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='observatory',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[5068908, 13151598, 15261640], [7757941, 9419191, 15262425], [6778234, 12751993, 14147810]];
  LR.addGroup(G,"Observatory");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);

  def('observatory-orrery',{name:"Brass planetary orrery",kind:'floor',group:G,size:[2, 2],vars:PALETTES,tap:'toggle',on:true,spinOn:.14,top:7,
    build(m,[w,a,c],s={on:true}){
      disc(m,8,0,8,7,w,2);m.box(7,2,7,9,9,9,brass);m.part('spin',[8,9,8]);m.blob(8,10,8,2.5,2.5,2.5,a);for(const [x,z,y] of [[2,8,9],[12,12,12],[8,1,15]]){m.box(Math.min(x,8),y,Math.min(z,8),Math.max(x,8)+1,y+1,Math.max(z,8)+1,brass);m.blob(x,y+1,z,1.5,1.5,1.5,c);}m.main();
    }
  });

  def('observatory-chart',{name:"Constellation star chart",kind:'wall',group:G,size:[3, 2],vars:PALETTES,depth:3,tap:'fx',fx:{sfx:'flip'},
    build(m,[w,a,c],s={on:true}){
      panel(m,w,ink,24,16);for(const [x,y] of [[3,4],[7,6],[11,5],[15,10],[19,12]]){m.box(x,y,3,x+2,y+2,4,a);if(x<18)m.box(x+1,y+1,3,x+5,y+2,4,c);}m.box(3,13,3,12,14,4,c);
    }
  });

  def('observatory-projector',{name:"Constellation projector",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'toggle',on:true,anim:'twinkle',light:{at:[4,7,4],color:0x9ab8df,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,7,2,7,w).blob(4,6,4,3.7,4,3.7,w);for(const [x,y,z] of [[4,9,4],[6,7,6],[2,6,6],[5,4,7]])m.set(x,y,z,s.on?a:cream,s.on);
    }
  });

  def('observatory-telescope',{name:"Dome observatory telescope",kind:'floor',group:G,size:[2, 2],vars:PALETTES,tap:'fx',fx:{sfx:'whoosh',say:['A little farther into the quiet.']},
    build(m,[w,a,c],s={on:true}){
      disc(m,8,0,8,7,w,3);m.blob(8,3,8,6,5,6,c).box(6,5,6,10,15,10,w).box(4,13,3,12,19,13,w).box(3,14,10,13,21,16,c).box(4,15,16,12,20,17,ink).box(5,16,17,11,19,18,a).box(7,18,2,9,24,4,brass);
    }
  });

  def('observatory-desk',{name:"Astronomer\u2019s notebook desk",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:12,tap:'type',
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,8,10);m.box(2,12,1,13,13,7,c).box(7,13,1,8,14,7,brass);for(let x=3;x<13;x+=3)m.box(x,13,2,x+1,14,6,a);m.box(18,12,2,20,17,4,brass).box(16,17,1,23,19,6,a);
    }
  });

  def('observatory-moon',{name:"Lunar globe stand",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'spin',
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,7,2,7,w).box(3,2,3,5,8,5,brass);m.part('spin',[4,11,4]);m.blob(4,11,4,4,4,4,c).box(2,12,7,4,14,8,shade(c,.7)).set(5,9,7,w);m.main();
    }
  });

  def('observatory-stool',{name:"Observation stool",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:10,
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,3,9,3,w).box(5,0,1,7,9,3,w).box(1,0,5,3,9,7,w).box(5,0,5,7,9,7,w);disc(m,4,9,4,4,a,2);
    }
  });

  def('observatory-meteorite',{name:"Meteorite specimen case",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'tick'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,2,8,w).blob(4,4,4,3,2.5,3,ink);for(const x of [0,7])for(const z of [0,7])m.box(x,2,z,x+1,8,z+1,c);m.box(0,8,0,8,9,1,c).box(0,8,7,8,9,8,c).box(2,2,7,6,3,8,a);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["observatory-orrery", "observatory-chart", "observatory-projector", "observatory-telescope", "observatory-desk", "observatory-moon", "observatory-stool", "observatory-meteorite"]};
})();
