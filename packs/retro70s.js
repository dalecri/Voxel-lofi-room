// 70s retro lounge: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='retro70s',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[8674624, 13667144, 15258790], [5852480, 9412729, 15129279], [11237716, 11499365, 15783341]];
  LR.addGroup(G,"70s retro lounge");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));

  def('retro70s-lava',{name:"Retro lava lamp",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'toggle',on:true,anim:'lava',light:{at:[4,7,4],color:0xe5a06c,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,7,2,7,w).box(3,2,3,5,4,5,brass).box(2,4,2,6,12,6,s.on?a:shade(a,.5),s.on).box(2,12,2,6,14,6,w);
    }
  });

  def('retro70s-console',{name:"Walnut vinyl console",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:12,tap:'music',anim:'record',
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,3,3,7,w).box(21,0,1,23,3,7,w).box(0,3,0,24,12,8,w);for(const x of [2,17])for(let y=5;y<10;y+=2)m.box(x,y,8,x+5,y+1,9,ink);m.part('disc',[12,12,4]);disc(m,12,12,4,4,ink);disc(m,12,13,4,1,a);m.main();m.box(15,12,2,17,13,7,brass);
    }
  });

  def('retro70s-fondue',{name:"Fondue supper set",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'crunch'},
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,3,w);m.box(3,1,3,5,4,5,brass);disc(m,4,4,4,3,a,3);disc(m,4,7,4,2,c);for(const x of [1,6])m.box(x,6,4,x+1,12,5,w);
    }
  });

  def('retro70s-clock',{name:"Sunburst wall clock",kind:'wall',group:G,size:[1, 1],vars:PALETTES,depth:3,anim:'clock',tap:'fx',fx:{sfx:'tick'},
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<8;x++)for(let y=0;y<8;y++){const dx=x-4,dy=y-4,d=Math.hypot(dx,dy);if(d<2.5)m.set(x,y,0,c);else if(d<5&&(Math.abs(dx)<1||Math.abs(dy)<1||Math.abs(Math.abs(dx)-Math.abs(dy))<1))m.set(x,y,0,a);}m.set(4,4,1,w);
    }
  });

  def('retro70s-rug',{name:"Sunset shag rug",kind:'rug',group:G,size:[3, 2],vars:PALETTES,walk:true,
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<24;x++)for(let z=0;z<16;z++)m.box(x,0,z,x+1,1+(x+z)%2,z+1,Math.hypot(x-12,z-8)<5?c:Math.hypot(x-12,z-8)<9?a:w);
    }
  });

  def('retro70s-chair',{name:"Velvet egg chair",kind:'floor',group:G,size:[2, 2],vars:PALETTES,seat:6,
    build(m,[w,a,c],s={on:true}){
      disc(m,8,0,8,5,brass);m.box(7,1,7,9,5,9,w);m.blob(8,11,7,7,9,6,w).clear(2,7,8,14,18,15).box(3,5,5,13,8,13,a).box(3,8,5,13,16,7,a);
    }
  });

  def('retro70s-tapes',{name:"Eight-track tape deck",kind:'small',group:G,size:[2, 1],vars:PALETTES,tap:'music',
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,5,8,w).box(1,1,8,15,4,9,cream).box(3,2,9,10,3,10,ink).box(12,2,9,14,4,10,a);
    }
  });

  def('retro70s-planter',{name:"Retro pedestal planter",kind:'floor',group:G,size:[1, 1],vars:PALETTES,plant:true,tap:'water',
    build(m,[w,a,c],s={on:true}){
      m.box(3,0,3,5,10,5,w);disc(m,4,0,4,3,w);pot(m,2,9,2,a);m.box(3,15,3,5,21,5,green).blob(3,20,4,4,2,3,green).blob(6,18,5,3,2,3,shade(green,.8));
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["retro70s-lava", "retro70s-console", "retro70s-fondue", "retro70s-clock", "retro70s-rug", "retro70s-chair", "retro70s-tapes", "retro70s-planter"]};
})();
