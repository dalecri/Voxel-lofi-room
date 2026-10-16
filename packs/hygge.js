// Scandinavian hygge: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='hygge',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[13021582, 12036769, 16051418], [11510667, 8887194, 15525850], [13876638, 12753804, 16773083]];
  LR.addGroup(G,"Scandinavian hygge");
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));

  def('hygge-throw',{name:"Sheepskin reading throw",kind:'rug',group:G,size:[2, 2],vars:PALETTES,walk:true,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<16;x++)for(let z=0;z<16;z++)if(Math.pow((x-7.5)/8,2)+Math.pow((z-7.5)/6,2)<1)m.box(x,0,z,x+1,1+(x+z)%2,z+1,c);
    }
  });

  def('hygge-candles',{name:"Hygge candle cluster",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'toggle',on:true,anim:'flame',light:{at:[4,8,4],color:0xffd599,i:2,d:4},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,1,8,w);for(const [x,z,h] of [[1,1,9],[5,1,6],[3,5,4]]){m.box(x,1,z,x+2,h,z+2,c).set(x,h,z,s.on?a:ink,s.on);}
    }
  });

  def('hygge-bench',{name:"Pale oak entry bench",kind:'floor',group:G,size:[3, 1],vars:PALETTES,seat:7,top:7,
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,8,5);m.box(1,7,1,23,8,7,c).box(1,8,1,8,10,7,a);
    }
  });

  def('hygge-blankets',{name:"Wool blanket stack",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      for(const y of [0,2,4])m.box(0,y,1,8,y+2,7,y===2?a:c);for(let x=1;x<8;x+=2)m.box(x,0,7,x+1,5,8,w);
    }
  });

  def('hygge-shelf',{name:"Minimalist oak wall shelf",kind:'wall',group:G,size:[3, 1],vars:PALETTES,depth:6,top:2,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,2,6,w);m.box(2,2,0,4,5,2,w).box(20,2,0,22,5,2,w);pot(m,4,2,1,a);m.box(16,2,1,20,7,5,c);
    }
  });

  def('hygge-star',{name:"Paper star pendant",kind:'wall',group:G,size:[2, 2],vars:PALETTES,depth:4,tap:'toggle',on:true,anim:'twinkle',light:{at:[8,8,3],color:0xffdca5,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      m.box(7,12,0,8,16,2,w);for(let x=1;x<15;x++)for(let y=1;y<15;y++){const dx=Math.abs(x-8),dy=Math.abs(y-8);if(dx+dy<7||dx<2&&dy<7||dy<2&&dx<7)m.set(x,y,3,s.on?c:a,s.on&&((x+y)%3===0));}
    }
  });

  def('hygge-teapot',{name:"Stoneware hygge teapot",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'sip',
    build(m,[w,a,c],s={on:true}){
      m.blob(4,3,4,3.5,3,3,a).box(3,6,3,5,7,5,w).box(7,3,4,9,5,5,a).box(0,2,3,1,6,5,w).box(1,5,3,2,6,5,w);
    }
  });

  def('hygge-knitting',{name:"Knitting basket",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,4,8,w);for(let y=1;y<4;y+=2)m.box(0,y,0,8,y+1,1,c);m.blob(3,5,3,2,2,2,a).blob(6,5,5,2,2,2,c).box(2,4,2,3,12,3,w).box(5,4,2,6,11,3,w);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["hygge-throw", "hygge-candles", "hygge-bench", "hygge-blankets", "hygge-shelf", "hygge-star", "hygge-teapot", "hygge-knitting"]};
})();
