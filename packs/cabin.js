// Laurentian cabin: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='cabin',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[8411971, 12680034, 14272430], [4800056, 9544077, 15129024], [11768429, 7177621, 15655372]];
  LR.addGroup(G,"Laurentian cabin");
  const lantern=(m,w,a,s)=>{m.box(1,0,1,7,2,7,w).box(1,11,1,7,13,7,w).box(3,13,3,5,16,5,w);for(const x of [1,6])for(const z of [1,6])m.box(x,2,z,x+1,11,z+1,w);m.box(2,3,2,6,10,6,s.on?a:shade(a,.5),s.on);};
  const plaid=(m,W,D,y,a,c)=>{for(let x=0;x<W;x++)for(let z=0;z<D;z++)m.set(x,y,z,(x%6<2&&z%6<2)?shade(a,.65):x%6<2||z%6<2?c:a);};

  def('cabin-stove',{name:"Cabin wood stove",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'toggle',on:true,anim:'fire',light:{at:[8,6,7],color:0xffaf64,i:4,d:6,flicker:true},emit:{kind:'smoke',at:[12,25,3],rate:.25,on:true},
    build(m,[w,a,c],s={on:true}){
      m.box(2,2,1,14,13,7,ink).box(4,4,7,12,10,8,s.on?a:shade(w,.5),s.on).box(11,13,2,14,25,5,ink);for(const x of [3,11])m.box(x,0,2,x+2,3,6,w);m.box(2,13,1,14,14,7,w);
    }
  });

  def('cabin-rocker',{name:"Cabin rocking chair",kind:'floor',group:G,size:[1, 2],vars:PALETTES,seat:8,tap:'fx',fx:{sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,1,0,2,3,16,w).box(6,1,0,7,3,16,w);for(const z of [3,10])m.box(1,3,z,3,8,z+2,w).box(5,3,z,7,8,z+2,w);m.box(1,8,3,7,10,13,a).box(1,9,1,7,18,3,w);for(let x=2;x<7;x+=2)m.box(x,11,3,x+1,17,4,c);
    }
  });

  def('cabin-snowshoes',{name:"Woven snowshoes",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:3,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      for(const x0 of [4,12])for(let x=x0-3;x<=x0+3;x++)for(let y=1;y<23;y++){const d=Math.pow((x-x0)/3,2)+Math.pow((y-12)/11,2);if(d<1&& (d>.65 || (x+y)%3===0))m.set(x,y,2,d>.65?w:c);}m.box(3,9,3,6,13,4,a).box(11,9,3,14,13,4,a);
    }
  });

  def('cabin-blankets',{name:"Cabin plaid blanket stack",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      for(let y=0;y<5;y+=2){m.box(0,y,1,8,y+2,7,a);plaid(m,8,6,y+2,a,c);}
    }
  });

  def('cabin-antlers',{name:"Carved antler mount",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:5,
    build(m,[w,a,c],s={on:true}){
      m.blob(8,7,1,4,5,1,w).box(6,5,2,10,10,4,c);for(const d of [-1,1])for(let k=0;k<6;k++){m.box(7+d*k,10+k,2,9+d*k,12+k,3,c);if(k%2===0)m.box(7+d*k,12+k,2,8+d*k,15+k,3,c);}
    }
  });

  def('cabin-bench',{name:"Rustic log bench",kind:'floor',group:G,size:[3, 1],vars:PALETTES,seat:6,
    build(m,[w,a,c],s={on:true}){
      m.box(2,0,1,6,5,7,w).box(18,0,1,22,5,7,w).box(0,4,0,24,7,8,w);for(let x=0;x<24;x+=4)m.box(x,7,1,x+3,8,7,c);
    }
  });

  def('cabin-lamp',{name:"Kerosene cabin lamp",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'toggle',on:true,anim:'flame',light:{at:[4,7,4],color:0xffbf79,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      lantern(m,w,a,s);
    }
  });

  def('cabin-basket',{name:"Cabin firewood basket",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'clatter'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,4,8,w);for(const x of [1,4])m.box(x,4,1,x+2,7,7,c).box(x,6,0,x+2,8,1,shade(w,.6));m.box(0,4,3,1,9,5,a).box(7,4,3,8,9,5,a).box(0,9,3,8,10,5,a);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["cabin-stove", "cabin-rocker", "cabin-snowshoes", "cabin-blankets", "cabin-antlers", "cabin-bench", "cabin-lamp", "cabin-basket"]};
})();
