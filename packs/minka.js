// Japanese minka: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='minka',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[9070925, 9280123, 15260600], [5785147, 11699576, 15787470], [11639672, 8295068, 15065031]];
  LR.addGroup(G,"Japanese minka");
  const plaid=(m,W,D,y,a,c)=>{for(let x=0;x<W;x++)for(let z=0;z<D;z++)m.set(x,y,z,(x%6<2&&z%6<2)?shade(a,.65):x%6<2||z%6<2?c:a);};

  def('minka-tatami',{name:"Woven tatami mats",kind:'rug',group:G,size:[3, 2],vars:PALETTES,walk:true,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,1,16,a);for(let z=0;z<16;z+=2)m.box(1,1,z,23,2,z+1,shade(a,1.12));m.box(0,1,0,1,2,16,w).box(23,1,0,24,2,16,w).box(11,1,0,13,2,16,w);
    }
  });

  def('minka-kotatsu',{name:"Quilted kotatsu table",kind:'floor',group:G,size:[2, 2],vars:PALETTES,top:8,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,6,16,a);plaid(m,16,16,6,a,c);m.box(2,7,2,14,9,14,w);for(let x=0;x<16;x+=4)m.box(x,0,15,x+2,5,16,c);
    }
  });

  def('minka-shoji',{name:"Freestanding shoji screen",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,24,2,w).box(1,1,2,15,23,3,c);for(let x=1;x<16;x+=4)m.box(x,0,3,x+1,24,4,w);for(let y=3;y<24;y+=5)m.box(0,y,3,16,y+1,4,w);m.box(0,0,0,3,2,8,w).box(13,0,0,16,2,8,w);
    }
  });

  def('minka-zabuton',{name:"Zabuton floor cushions",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:2,walk:true,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,2,8,a).box(1,2,1,7,3,7,c).set(4,3,4,a);
    }
  });

  def('minka-noren',{name:"Dyed noren curtain",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:3,tap:'fx',fx:{sfx:'rustle',door:true},
    build(m,[w,a,c],s={on:true}){
      m.box(0,23,0,16,24,2,w);m.part('door',[1,23,2]);m.box(0,9,2,7,23,3,a);m.main();m.part('door2',[15,23,2]);m.box(9,9,2,16,23,3,a);m.box(10,15,3,14,19,4,c);m.main();
    }
  });

  def('minka-tea',{name:"Minka ceramic tea set",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'sip',
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,1,8,w);m.blob(3,3,3,2.4,2,2.4,a).box(3,5,3,4,6,4,c).box(5,3,3,7,4,4,a);m.box(5,1,5,8,3,8,c).set(6,3,6,w);
    }
  });

  def('minka-bonsai',{name:"Minka juniper bonsai",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'water',plant:true,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,3,8,w).box(1,3,1,7,4,7,ink).box(3,4,3,5,10,5,w).box(4,7,3,7,9,5,w).blob(3,10,4,4,2,3,green).blob(6,9,4,2,2,3,a);
    }
  });

  def('minka-scroll',{name:"Tokonoma ink scroll",kind:'wall',group:G,size:[1, 3],vars:PALETTES,depth:3,tap:'fx',fx:{sfx:'flip'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,1,1,8,23,2,a).box(1,4,2,7,20,3,c).box(0,0,1,8,2,3,w).box(0,22,1,8,24,3,w);for(const [x,y] of [[3,15],[2,12],[4,9],[3,6]])m.box(x,y,3,x+2,y+3,4,ink);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["minka-tatami", "minka-kotatsu", "minka-shoji", "minka-zabuton", "minka-noren", "minka-tea", "minka-bonsai", "minka-scroll"]};
})();
