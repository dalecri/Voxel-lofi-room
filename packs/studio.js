// Music studio: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='studio',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[7692363, 8228766, 14142392], [5066065, 11830659, 14865348], [10519394, 8626582, 15655630]];
  LR.addGroup(G,"Music studio");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));

  def('studio-mixer',{name:"Recording studio mixing desk",kind:'floor',group:G,size:[3, 2],vars:PALETTES,top:11,tap:'music',anim:'speaker',
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,16,8);m.box(0,10,0,24,12,16,ink);for(let x=2;x<23;x+=3){m.box(x,12,3,x+1,13,14,c).box(x-1,13,5+x%5,x+2,14,7+x%5,a);m.set(x,12,1,a,true);}m.box(9,12,0,15,16,2,w).box(10,13,2,14,15,3,a,true);
    }
  });

  def('studio-monitors',{name:"Studio monitor speaker pair",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'music',anim:'speaker',
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,8]){m.box(x,0,0,x+7,13,7,w).box(x+1,1,7,x+6,12,8,ink);for(let i=x+1;i<x+6;i++)for(let y=2;y<7;y++)if(Math.hypot(i-x-3,y-4)<3)m.set(i,y,8,a);m.box(x+2,9,8,x+5,11,9,c);}
    }
  });

  def('studio-guitars',{name:"Wall guitar collection",kind:'wall',group:G,size:[3, 3],vars:PALETTES,depth:5,tap:'strum',
    build(m,[w,a,c],s={on:true}){
      for(const cx of [5,17]){m.box(cx-1,9,1,cx+1,23,3,w).box(cx-2,21,1,cx+2,24,3,a);for(let x=cx-4;x<cx+4;x++)for(let y=1;y<14;y++)if(Math.hypot((x-cx)*1.2,y-6)<5||Math.hypot(x-cx,y-10)<3)m.box(x,y,1,x+1,y+1,4,a);m.box(cx-1,4,4,cx+1,16,5,c).box(cx-1,7,5,cx+1,9,6,ink);}
    }
  });

  def('studio-foam',{name:"Acoustic foam wall panels",kind:'wall',group:G,size:[2, 2],vars:PALETTES,depth:4,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,16,1,w);for(let x=0;x<16;x+=4)for(let y=0;y<16;y+=4)m.box(x,y,1,x+4,y+4,2,a).box(x+1,y+1,2,x+3,y+3,4,shade(a,.8));
    }
  });

  def('studio-mic',{name:"Studio microphone and pop filter",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'blip',say:['Testing. The cats have notes.']},
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,4,w);m.box(3,1,3,5,19,5,w).box(2,18,2,6,23,6,a);for(let y=19;y<23;y+=2)m.box(2,y,6,6,y+1,7,c);m.box(1,18,7,7,23,8,ink).box(3,17,5,4,19,8,w);
    }
  });

  def('studio-vinyl',{name:"Listening studio vinyl shelf",kind:'floor',group:G,size:[2, 1],vars:PALETTES,top:16,tap:'music',
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,17,1,w).box(0,0,0,2,17,8,w).box(14,0,0,16,17,8,w);for(const y of [0,8,16]){m.box(0,y,0,16,y+1,8,w);if(y<16)for(let x=3;x<14;x+=2)m.box(x,y+1,2,x+1,y+7,8,x%3?a:c);}
    }
  });

  def('studio-headphones',{name:"Headphones on oak stand",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'music',
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,7,1,7,w).box(3,1,3,5,10,5,w).box(1,11,2,7,13,5,a);for(const x of [0,6])m.box(x,6,2,x+2,12,5,a).box(x,6,5,x+2,10,6,c);
    }
  });

  def('studio-rug',{name:"Studio soundwave rug",kind:'rug',group:G,size:[3, 2],vars:PALETTES,walk:true,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,1,16,w);for(let x=1;x<23;x++){const h=2+Math.floor(Math.abs(Math.sin(x*.7))*5);m.box(x,0,8-h,x+1,1,8+h,x%2?a:c);}
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["studio-mixer", "studio-monitors", "studio-guitars", "studio-foam", "studio-mic", "studio-vinyl", "studio-headphones", "studio-rug"]};
})();
