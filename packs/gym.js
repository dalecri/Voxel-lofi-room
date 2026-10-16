// Home gym: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='gym',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[4344144, 8298387, 15261642], [6314072, 12683893, 15324605], [6912643, 13020784, 15788505]];
  LR.addGroup(G,"Home gym");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);

  def('gym-dumbbells',{name:"Dumbbell rack",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'clatter'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,3,13,7,w).box(13,0,1,15,13,7,w);for(const y of [5,11]){m.box(0,y,1,16,y+1,7,w);for(const x of [3,9])m.box(x,y+2,2,x+5,y+3,3,cream).box(x,y+1,1,x+1,y+4,4,a).box(x+4,y+1,1,x+5,y+4,4,a);}
    }
  });

  def('gym-mat',{name:"Unrolled exercise mat",kind:'rug',group:G,size:[2, 3],vars:PALETTES,walk:true,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,1,24,a);for(let z=1;z<24;z+=3)m.box(1,1,z,15,2,z+1,shade(a,1.1));
    }
  });

  def('gym-rolledmat',{name:"Rolled exercise mat",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<8;x++)for(let y=0;y<7;y++)for(let z=1;z<7;z++)if(Math.hypot(y-3,z-4)<3)m.set(x,y,z,(y+z)%3?a:shade(a,.7));m.box(3,0,0,5,7,1,c);
    }
  });

  def('gym-bands',{name:"Resistance band hooks",kind:'wall',group:G,size:[2, 2],vars:PALETTES,depth:3,
    build(m,[w,a,c],s={on:true}){
      m.box(0,13,0,16,15,2,w);for(const x of [2,7,12])m.box(x,2,2,x+1,13,3,a).box(x+2,2,2,x+3,12,3,a).box(x,1,2,x+3,2,3,c);
    }
  });

  def('gym-bench',{name:"Workout bench",kind:'floor',group:G,size:[1, 3],vars:PALETTES,seat:8,
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,2,7,2,6,w).box(1,0,18,7,2,22,w).box(3,2,3,5,7,21,w).box(0,7,0,8,10,24,a);m.box(1,10,2,7,11,21,shade(a,1.12));
    }
  });

  def('gym-water',{name:"Water bottle station",kind:'floor',group:G,size:[1, 1],vars:PALETTES,top:12,tap:'fx',fx:{sfx:'sip',say:['A small water break counts.']},
    build(m,[w,a,c],s={on:true}){
      table(m,w,8,8,10);m.box(2,12,2,6,18,6,a).box(3,18,3,5,20,5,ink).box(2,14,6,6,16,7,c);
    }
  });

  def('gym-mirror',{name:"Gym mirror wall",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:2,
    build(m,[w,a,c],s={on:true}){
      panel(m,w,0xb7ccd0,16,24);for(let y=3;y<20;y++)m.set(2+(y%11),y,3,cream);
    }
  });

  def('gym-roller',{name:"Textured foam roller",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'spin',
    build(m,[w,a,c],s={on:true}){
      m.part('spin',[4,4,4]);for(let y=0;y<8;y++)disc(m,4,y,4,3,y%2?a:shade(a,.8));m.main();
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["gym-dumbbells", "gym-mat", "gym-rolledmat", "gym-bands", "gym-bench", "gym-water", "gym-mirror", "gym-roller"]};
})();
