// Bakery and patisserie: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='bakery',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[11832420, 12291979, 15851450], [9859933, 9216920, 15655883], [13018493, 8887216, 16115920]];
  LR.addGroup(G,"Bakery and patisserie");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);

  def('bakery-display',{name:"Patisserie pastry display",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:14,tap:'fx',fx:{sfx:'crunch',say:['Choosing is half the pastry ritual.']},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,7,8,w).box(0,7,0,24,8,8,c);for(const x of [0,23])m.box(x,8,0,x+1,15,8,w);m.box(0,14,0,24,15,8,c).box(0,8,0,24,14,1,0xb9d0cd);for(const x of [3,10,17]){m.box(x,8,2,x+4,9,7,c).blob(x+2,10,4,2,2,2,a).box(x+1,12,3,x+3,13,5,cream);}m.box(0,8,7,24,9,8,w);
    }
  });

  def('bakery-oven',{name:"Warm bakery deck oven",kind:'floor',group:G,size:[2, 1],vars:PALETTES,on:true,tap:'toggle',anim:'flame',light:{at:[8,7,8],color:0xffc08b,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,17,8,a);for(const y of [2,9]){m.box(1,y,8,15,y+5,9,ink).box(2,y+1,9,12,y+3,10,s.on?0xc18d60:shade(w,.6),s.on).box(3,y+3,10,11,y+4,11,w).set(14,y+2,9,c);}m.box(0,17,0,16,18,8,c);
    }
  });

  def('bakery-lamps',{name:"Bakery pendant pair",kind:'wall',group:G,size:[3, 2],vars:PALETTES,depth:8,on:true,tap:'toggle',anim:'flame',light:{at:[12,4,5],color:0xffdba4,i:2,d:6},
    build(m,[w,a,c],s={on:true}){
      m.box(0,15,0,24,16,2,w);for(const x of [6,18]){m.box(x,6,3,x+1,16,4,w);for(let y=3;y<8;y++)disc(m,x,y,4,8-y,a);disc(m,x,3,4,4,s.on?c:shade(c,.5));m.set(x,3,4,c,s.on);}
    }
  });

  def('bakery-flour',{name:"Stacked flour sacks",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      for(const [x,y] of [[0,0],[8,0],[4,8]]){m.box(x,y,0,x+7,y+8,7,c).box(x+1,y+8,1,x+6,y+9,6,w).box(x+2,y+2,7,x+5,y+6,8,a).set(x+3,y+4,8,c);}
    }
  });

  def('bakery-rolling',{name:"Bakers rolling station",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:12,tap:'fx',fx:{sfx:'clack'},
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,8,10);m.box(2,12,1,14,13,7,c).blob(7,13,4,3,1,2,a).box(15,13,1,19,15,7,w).box(16,13,0,18,14,8,c).box(21,12,2,23,17,4,a);
    }
  });

  def('bakery-cake',{name:"Celebration cake stand",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'tick2'},
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,3,w);m.box(3,1,3,5,4,5,a);disc(m,4,4,4,4,c);disc(m,4,5,4,3,a,4);disc(m,4,9,4,3,c);m.set(4,10,4,w).set(2,10,4,w).set(5,10,3,w);
    }
  });

  def('bakery-menu',{name:"Chalk patisserie menu",kind:'wall',group:G,size:[2, 2],vars:PALETTES,depth:3,
    build(m,[w,a,c],s={on:true}){
      panel(m,w,0x405350);for(const y of [3,7,11])m.box(3,y,3,9,y+1,4,c).box(11,y,3,13,y+1,4,a);m.box(3,13,3,13,14,4,a);
    }
  });

  def('bakery-bread',{name:"Fresh bread basket",kind:'small',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'crunch'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,2,8,w).box(0,2,0,16,3,1,a).box(0,2,7,16,3,8,a);for(const x of [1,6,11]){m.blob(x+2,4,4,2,2,3,c);for(const z of [2,5])m.box(x+1,5,z,x+3,6,z+1,w);}
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["bakery-display", "bakery-oven", "bakery-lamps", "bakery-flour", "bakery-rolling", "bakery-cake", "bakery-menu", "bakery-bread"]};
})();
