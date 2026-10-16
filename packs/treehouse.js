// Treehouse: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='treehouse',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[10189136, 8557411, 15126951], [7691847, 9610906, 15326412], [11768943, 11899761, 15786172]];
  LR.addGroup(G,"Treehouse");
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);

  def('treehouse-railing',{name:"Rope bridge railing",kind:'floor',group:G,size:[3, 1],vars:PALETTES,tap:'fx',fx:{sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,11,22])m.box(x,0,2,x+2,13,4,w);for(let x=1;x<23;x++){const y=9-Math.floor(Math.sin(x/22*Math.PI)*2);m.box(x,y,2,x+1,y+1,4,c).box(x,y-4,2,x+1,y-3,4,c);}
    }
  });

  def('treehouse-window',{name:"Leaf canopy window",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:4,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      panel(m,w,a,16,24);m.box(2,3,2,14,22,3,0xa5c3c7);m.box(7,2,3,9,23,4,w).box(1,11,3,15,13,4,w);for(const [x,y] of [[2,17],[9,18],[3,4]])m.box(x,y,2,x+4,y+4,3,shade(a,.85));m.box(0,0,0,16,2,6,c);
    }
  });

  def('treehouse-bucket',{name:"Pulley bucket lift",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,7,1,7,w).box(0,1,0,8,5,8,w).box(1,5,1,7,6,7,ink).box(0,4,3,1,10,4,c).box(7,4,3,8,10,4,c).box(0,9,3,8,10,4,c).box(3,10,3,4,24,4,c).box(1,22,2,7,25,5,a);
    }
  });

  def('treehouse-hammock',{name:"Treehouse woven hammock",kind:'floor',group:G,size:[3, 2],vars:PALETTES,seat:6,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,22])m.box(x,0,6,x+2,18,10,w);m.part('swing',[12,16,8],'z');for(let x=2;x<22;x++){const y=5+Math.floor(Math.pow((x-12)/10,2)*9);m.box(x,y,4,x+1,y+1,12,x%3?c:a);}m.main();
    }
  });

  def('treehouse-birdhouse',{name:"Painted treehouse birdhouse",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:7,tap:'fx',fx:{sfx:'tweet'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,2,1,7,10,7,w);for(let x=0;x<8;x++){const y=10+Math.min(x,7-x);m.box(x,y,0,x+1,y+1,8,a);}m.box(3,6,7,5,8,8,ink).box(3,3,7,5,4,10,c);
    }
  });

  def('treehouse-ladder',{name:"Wooden treehouse ladder",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,6])m.box(x,0,2,x+2,24,4,w);for(let y=2;y<24;y+=4)m.box(0,y,3,8,y+1,5,c);
    }
  });

  def('treehouse-basket',{name:"Forest picnic basket",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,4,8,w).box(1,4,1,7,5,7,a);for(const x of [0,7])m.box(x,3,3,x+1,9,5,c);m.box(0,8,3,8,9,5,c);for(let y=1;y<4;y+=2)m.box(0,y,7,8,y+1,8,c);
    }
  });

  def('treehouse-cushions',{name:"Leaf-print floor pillows",kind:'floor',group:G,size:[2, 1],vars:PALETTES,seat:3,walk:true,
    build(m,[w,a,c],s={on:true}){
      for(const x of [0,8]){m.box(x,0,0,x+8,3,8,a).box(x+1,3,1,x+7,4,7,c);m.box(x+3,4,2,x+5,5,6,a).set(x+2,4,3,a).set(x+5,4,4,a);}
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["treehouse-railing", "treehouse-window", "treehouse-bucket", "treehouse-hammock", "treehouse-birdhouse", "treehouse-ladder", "treehouse-basket", "treehouse-cushions"]};
})();
