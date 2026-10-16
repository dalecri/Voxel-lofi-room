// 80s arcade: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='arcade80s',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[3355721, 12944053, 9355202], [4471117, 14127463, 12691415], [3163731, 8043451, 14727312]];
  LR.addGroup(G,"80s arcade");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);

  def('arcade80s-row',{name:"Twin arcade cabinet row",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'arcade',on:true,screen:{x:1,y:14,z:6,w:6,h:7},channels:['arcade'],light:{at:[8,18,8],color:0xc196df,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,8]){m.box(x,0,0,x+8,25,7,w).clear(x+1,14,6,x+7,21,7).box(x+1,14,5,x+7,21,6,ink).box(x+1,22,6,x+7,24,7,a,true).box(x,11,7,x+8,13,8,shade(w,.8)).set(x+2,13,7,ink).set(x+2,14,7,a).set(x+5,13,7,c,true);}m.box(10,15,6,13,16,7,c,true).box(12,17,6,14,18,7,a,true);
    }
  });

  def('arcade80s-neon',{name:"Pixel sunset neon sign",kind:'wall',group:G,size:[3, 2],vars:PALETTES,depth:3,tap:'toggle',on:true,anim:'twinkle',light:{at:[12,8,3],color:0xc196df,i:2,d:6},
    build(m,[w,a,c],s={on:true}){
      panel(m,w,ink,24,16);for(let y=4;y<13;y+=2)m.box(6,y,3,18,y+1,4,s.on?a:shade(a,.4),s.on);for(let x=3;x<22;x+=5)m.box(x,3,3,x+2,11-(x%3),4,s.on?c:shade(c,.4),s.on);
    }
  });

  def('arcade80s-crtwall',{name:"Arcade CRT television wall",kind:'wall',group:G,size:[3, 3],vars:PALETTES,depth:8,tap:'screen',on:true,screen:{x:2,y:13,z:8,w:7,h:7},channels:['retro','cartoon','static'],light:{at:[12,12,9],color:0xadc8e3,i:1,d:5},
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,12])for(const y of [0,12]){m.box(x,y,0,x+12,y+12,8,w).box(x+2,y+1,7,x+9,y+8,8,ink).box(x+2,y+9,7,x+9,y+10,8,a).set(x+10,y+3,8,c);}m.box(15,3,8,18,5,9,c,true).box(14,15,8,18,16,9,a,true);
    }
  });

  def('arcade80s-change',{name:"Arcade change machine",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'tick2',say:['A pocketful of pretend quarters.']},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,18,7,w).box(1,10,7,7,16,8,a).box(3,11,8,5,12,9,ink).box(2,3,7,6,6,8,ink);for(let x=1;x<7;x+=2)m.set(x,14,8,c);
    }
  });

  def('arcade80s-scores',{name:"High-score chalkboard",kind:'wall',group:G,size:[2, 2],vars:PALETTES,depth:3,tap:'fx',fx:{sfx:'tick'},
    build(m,[w,a,c],s={on:true}){
      panel(m,w,0x3f5550);for(const y of [4,8,12]){m.box(3,y,3,8,y+1,4,c).box(10,y,3,13,y+1,4,a);}m.box(0,0,0,16,1,5,w).box(3,1,3,7,2,4,c);
    }
  });

  def('arcade80s-carpet',{name:"Confetti arcade carpet",kind:'rug',group:G,size:[3, 3],vars:PALETTES,walk:true,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,1,24,w);for(let x=1;x<23;x+=4)for(let z=1;z<23;z+=5){m.box(x,0,z,x+2,1,z+1,a).set(x+1,0,z+1,c).set(x+2,0,z+2,a);}
    }
  });

  def('arcade80s-stool',{name:"Chrome arcade stool",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:10,
    build(m,[w,a,c],s={on:true}){
      m.box(3,0,3,5,10,5,c);for(const x of [1,6])for(const z of [1,6])m.box(x,0,z,x+1,9,z+1,c);disc(m,4,10,4,4,a,2);
    }
  });

  def('arcade80s-tokens',{name:"Arcade token tray",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'tick2'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,1,8,w).box(0,1,0,8,2,1,a).box(0,1,7,8,2,8,a);for(const [x,z,h] of [[2,2,3],[5,3,2],[3,5,4]])disc(m,x,1,z,1,c,h);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["arcade80s-row", "arcade80s-neon", "arcade80s-crtwall", "arcade80s-change", "arcade80s-scores", "arcade80s-carpet", "arcade80s-stool", "arcade80s-tokens"]};
})();
