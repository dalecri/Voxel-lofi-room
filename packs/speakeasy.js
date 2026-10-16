// Art deco speakeasy: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='speakeasy',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[6310200, 6718841, 13017956], [4471611, 10319236, 13678472], [8806727, 6717337, 14730908]];
  LR.addGroup(G,"Art deco speakeasy");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);
  const books=(m,w,a,W=16,H=24)=>{m.box(0,0,0,W,H,1,shade(w,.7)).box(0,0,0,1,H,8,w).box(W-1,0,0,W,H,8,w);for(let y=0;y<H;y+=8){m.box(0,y,0,W,y+1,8,w);for(let x=2;x<W-2;x+=3)m.box(x,y+1,2,x+2,Math.min(H,y+5+x%3),7,x%2?a:cream);}};

  def('speakeasy-gramophone',{name:"Brass-horn jazz gramophone",kind:'floor',group:G,size:[2, 1],vars:PALETTES,top:9,tap:'mood',musicMood:1,anim:'record',
    build(m,[w,a,c],s={on:true}){
      table(m,w,16,8,7);m.part('disc',[5,9,4]);disc(m,5,9,4,3,ink);disc(m,5,10,4,1,a);m.main();m.box(11,9,2,13,17,4,c);for(let y=15;y<22;y++){const r=Math.floor((y-15)/2)+1;disc(m,11,y,3,r,c,1,Math.max(0,r-1));}m.box(10,21,2,13,22,5,ink);
    }
  });

  def('speakeasy-cart',{name:"Deco cocktail cart",kind:'floor',group:G,size:[2, 1],vars:PALETTES,top:10,tap:'sip',
    build(m,[w,a,c],s={on:true}){
      for(const y of [2,10])m.box(0,y,0,16,y+1,8,w);for(const x of [0,15])for(const z of [0,7])m.box(x,0,z,x+1,12,z+1,c);for(const x of [1,13])m.box(x,0,1,x+2,2,3,ink);for(const x of [3,7])m.box(x,11,2,x+2,16,4,a).box(x,16,2,x+1,18,3,c);m.box(11,11,4,14,14,7,cream);
    }
  });

  def('speakeasy-booth',{name:"Velvet speakeasy booth",kind:'floor',group:G,size:[3, 2],vars:PALETTES,seat:7,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,6,16,w).box(0,6,0,24,19,4,a).box(0,6,4,3,12,16,a).box(21,6,4,24,12,16,a).box(3,6,4,21,9,15,a);for(let x=4;x<21;x+=5)m.box(x,10,4,x+1,17,5,shade(a,.8));m.box(0,3,15,24,4,16,c);
    }
  });

  def('speakeasy-poster',{name:"Gilded art deco poster",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:3,
    build(m,[w,a,c],s={on:true}){
      panel(m,c,w,16,24);for(let x=2;x<14;x++)for(let y=3;y<22;y++)if((x+y)%5===0||Math.abs(x-8)<1)m.set(x,y,3,a);m.box(3,4,3,13,6,4,c).box(5,7,3,11,9,4,c);
    }
  });

  def('speakeasy-door',{name:"Hidden bookcase door",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:8,tap:'portal',wallish:true,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,24,1,c);m.part('door',[0,0,1]);books(m,w,a,16,24);m.set(14,12,8,c);m.main();
    }
  });

  def('speakeasy-lamp',{name:"Fan-shaped deco table lamp",kind:'small',group:G,size:[1, 1],vars:PALETTES,on:true,tap:'toggle',anim:'flame',light:{at:[4,8,4],color:0xffd29a,i:2,d:4},
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,3,c);m.box(3,1,3,5,8,5,c);for(let x=0;x<8;x++)m.box(x,7,2,x+1,12-Math.abs(x-4),6,s.on?a:shade(a,.5),s.on);
    }
  });

  def('speakeasy-rug',{name:"Deco fan-pattern rug",kind:'rug',group:G,size:[3, 2],vars:PALETTES,walk:true,
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<24;x++)for(let z=0;z<16;z++)m.set(x,0,z,x<1||x>22||z<1||z>14?c:Math.floor(Math.hypot(x-12,z-15))%4===0?c:a);
    }
  });

  def('speakeasy-screen',{name:"Gilded folding screen",kind:'floor',group:G,size:[3, 1],vars:PALETTES,tap:'fx',fx:{sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<24;x++){const edge=x%8===0||x%8===7;m.box(x,0,1,x+1,23,3,edge?c:w);}for(let y=2;y<23;y+=5)m.box(0,y,3,24,y+1,4,a);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["speakeasy-gramophone", "speakeasy-cart", "speakeasy-booth", "speakeasy-poster", "speakeasy-door", "speakeasy-lamp", "speakeasy-rug", "speakeasy-screen"]};
})();
