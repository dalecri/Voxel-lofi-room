// Moroccan riad: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='riad',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[10385236, 5348247, 15258538], [8149832, 11366248, 15325116], [12096872, 7375021, 15655627]];
  LR.addGroup(G,"Moroccan riad");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));
  const lantern=(m,w,a,s)=>{m.box(1,0,1,7,2,7,w).box(1,11,1,7,13,7,w).box(3,13,3,5,16,5,w);for(const x of [1,6])for(const z of [1,6])m.box(x,2,z,x+1,11,z+1,w);m.box(2,3,2,6,10,6,s.on?a:shade(a,.5),s.on);};

  def('riad-fountain',{name:"Zellige tile fountain",kind:'floor',group:G,size:[2, 2],vars:PALETTES,tap:'fx',fx:{sfx:'water',burst:'drip',say:['A small courtyard, a little cool water.']},on:true,emit:{kind:'drip',at:[8,14,8],rate:3,on:true},
    build(m,[w,a,c],s={on:true}){
      disc(m,8,0,8,7,w,2);disc(m,8,2,8,7,a,3,5);disc(m,8,2,8,4,0x83bbc0);m.box(7,3,7,9,13,9,c);disc(m,8,12,8,3,a);m.set(8,13,8,cream);for(const x of [2,6,10,14])m.set(x,4,13,c);
    }
  });

  def('riad-lantern',{name:"Pierced brass riad lantern",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'toggle',on:true,anim:'twinkle',light:{at:[4,7,4],color:0xffcb7e,i:2,d:5},
    build(m,[w,a,c],s={on:true}){
      lantern(m,brass,a,s);for(let y=3;y<11;y+=3)m.box(1,y,1,7,y+1,2,w).box(1,y,6,7,y+1,7,w);
    }
  });

  def('riad-pouf',{name:"Embroidered leather pouf",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:5,
    build(m,[w,a,c],s={on:true}){
      m.blob(4,2,4,4,3,4,a).box(1,4,1,7,5,7,a);m.box(3,5,1,5,6,7,c).box(1,5,3,7,6,5,c).set(4,6,4,w);
    }
  });

  def('riad-mirror',{name:"Arched riad mirror",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:3,
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<16;x++)for(let y=0;y<24;y++){const top=y>16&&Math.hypot(x-7.5,y-16)>8;if(!top)m.set(x,y,2,x<2||x>13||y<2||y>16&&Math.hypot(x-7.5,y-16)>6?w:0xb6c8ce);}m.box(3,4,3,4,15,4,c);
    }
  });

  def('riad-rug',{name:"Riad diamond rug",kind:'rug',group:G,size:[3, 2],vars:PALETTES,walk:true,
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<24;x++)for(let z=0;z<16;z++)m.set(x,0,z,x<2||x>21||z<2||z>13?w:Math.abs(x-12)+Math.abs(z-8)<7?c:((x+z)%4===0?a:shade(a,.8)));
    }
  });

  def('riad-tea',{name:"Mint tea brass tray",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'sip',
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,4,brass);m.blob(3,3,3,2,2,2,a).box(2,5,2,4,6,4,w).box(5,1,5,7,4,7,c).set(5,4,5,green).box(4,3,2,7,4,3,brass);
    }
  });

  def('riad-cushion',{name:"Riad patterned floor cushion",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:2,walk:true,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,2,8,a);for(let x=1;x<7;x++)for(let z=1;z<7;z++)if((x+z)%3===0)m.set(x,2,z,c);m.set(4,3,4,w);
    }
  });

  def('riad-table',{name:"Carved octagonal tea table",kind:'floor',group:G,size:[2, 2],vars:PALETTES,top:9,
    build(m,[w,a,c],s={on:true}){
      for(const x of [3,11])for(const z of [3,11])m.box(x,0,z,x+2,8,z+2,w);for(let x=0;x<16;x++)for(let z=0;z<16;z++)if(Math.abs(x-7.5)+Math.abs(z-7.5)<11)m.box(x,8,z,x+1,10,z+1,(x+z)%5===0?a:w);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["riad-fountain", "riad-lantern", "riad-pouf", "riad-mirror", "riad-rug", "riad-tea", "riad-cushion", "riad-table"]};
})();
