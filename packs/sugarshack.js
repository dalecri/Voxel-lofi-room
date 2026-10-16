// Sugar shack: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='sugarshack',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[11500368, 13137234, 15060656], [7360573, 8428423, 15326919], [12887930, 10187143, 16115399]];
  LR.addGroup(G,"Sugar shack");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const lantern=(m,w,a,s)=>{m.box(1,0,1,7,2,7,w).box(1,11,1,7,13,7,w).box(3,13,3,5,16,5,w);for(const x of [1,6])for(const z of [1,6])m.box(x,2,z,x+1,11,z+1,w);m.box(2,3,2,6,10,6,s.on?a:shade(a,.5),s.on);};

  def('sugarshack-evaporator',{name:"Maple evaporator",kind:'floor',group:G,size:[3, 2],vars:PALETTES,tap:'toggle',on:true,anim:'fire',emit:{kind:'steam',at:[12,14,8],rate:1,on:true},light:{at:[8,4,12],color:0xffb96b,i:3,d:5,flicker:true},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,23,10,15,ink).box(2,2,14,10,6,16,s.on?a:ink,s.on).box(0,10,0,24,12,16,w).box(1,12,1,23,13,15,brass);for(let x=2;x<23;x+=5)m.box(x,13,2,x+1,15,14,ink);m.box(19,13,1,22,25,4,ink).box(18,25,0,23,26,5,w);
    }
  });

  def('sugarshack-tap',{name:"Maple tap and bucket",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:7,tap:'fx',fx:{sfx:'plop',burst:'drip',say:['A patient little drop of spring.']},
    build(m,[w,a,c],s={on:true}){
      m.box(2,0,0,6,16,2,w).box(3,11,2,5,12,6,brass).box(2,3,3,7,4,7,a).box(1,4,3,2,8,7,a).box(6,4,3,7,8,7,a).box(2,4,6,6,8,7,a).box(2,4,3,6,8,4,a).box(2,9,3,7,10,4,ink);
    }
  });

  def('sugarshack-taffy',{name:"Taffy-on-snow trough",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:6,tap:'fx',fx:{sfx:'crunch',say:['A ribbon of maple on fresh snow.']},
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,8,4);m.box(1,6,1,23,7,7,cream);for(let x=3;x<23;x+=5)m.box(x,7,2,x+2,8,6,a).box(x,8,5,x+1,11,6,w);
    }
  });

  def('sugarshack-wood',{name:"Split firewood stack",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'clatter'},
    build(m,[w,a,c],s={on:true}){
      for(let y=0;y<9;y+=3)for(let x=1;x<15;x+=4)m.box(x,y,1,x+3,y+3,7,shade(w,.8)).box(x,y,7,x+3,y+3,8,c);m.box(0,0,0,16,1,8,ink);
    }
  });

  def('sugarshack-curtain',{name:"Maple plaid curtains",kind:'wall',group:G,size:[2, 2],vars:PALETTES,depth:3,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,15,0,16,16,2,w);for(let x=0;x<16;x++)for(let y=0;y<15;y++)if(x<6||x>9)m.set(x,y,2,x%4===0||y%4===0?c:a);
    }
  });

  def('sugarshack-syrup',{name:"Syrup bottle shelf",kind:'wall',group:G,size:[2, 1],vars:PALETTES,depth:6,tap:'fx',fx:{sfx:'pour'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,2,6,w).box(1,2,0,3,4,2,w).box(13,2,0,15,4,2,w);for(let x=2;x<15;x+=4)m.box(x,2,2,x+3,6,5,a).box(x+1,6,3,x+2,8,4,brass).box(x,3,5,x+3,5,6,c);
    }
  });

  def('sugarshack-pancakes',{name:"Pancake breakfast table",kind:'floor',group:G,size:[2, 2],vars:PALETTES,top:12,tap:'fx',fx:{sfx:'crunch',say:['The first stack belongs to nobody in a hurry.']},
    build(m,[w,a,c],s={on:true}){
      table(m,w,16,16,10);disc(m,7,12,7,5,c);for(let y=13;y<17;y++)disc(m,7,y,7,3,y%2?a:shade(a,1.2));m.box(6,17,6,8,18,8,cream);m.box(12,12,2,15,16,5,a).box(13,16,3,14,18,4,brass);
    }
  });

  def('sugarshack-lantern',{name:"Sugar shack hanging lantern",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:8,tap:'toggle',on:true,anim:'flame',light:{at:[4,7,4],color:0xffc77c,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      lantern(m,w,a,s);m.box(3,15,0,5,16,4,w);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["sugarshack-evaporator", "sugarshack-tap", "sugarshack-taffy", "sugarshack-wood", "sugarshack-curtain", "sugarshack-syrup", "sugarshack-pancakes", "sugarshack-lantern"]};
})();
