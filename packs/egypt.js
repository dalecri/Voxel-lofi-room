// Ancient Egypt: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='egypt',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[12755825, 6527643, 15325358], [10520416, 11434079, 14995352], [13743496, 8097444, 15787205]];
  LR.addGroup(G,"Ancient Egypt");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);

  def('egypt-sarcophagus',{name:"Painted sarcophagus",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'thump'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,15,3,7,w).box(2,3,1,13,5,7,c).box(3,5,2,11,6,6,a).box(11,5,2,14,7,6,c).box(12,7,3,13,8,5,a);for(let x=3;x<10;x+=2)m.box(x,6,2,x+1,7,6,w);
    }
  });

  def('egypt-glyphs',{name:"Hieroglyph wall panel",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:3,
    build(m,[w,a,c],s={on:true}){
      panel(m,w,c,16,24);for(let x=3;x<14;x+=4)for(let y=3;y<22;y+=5){m.box(x,y,3,x+1,y+3,4,a).box(x-1,y+1,3,x+2,y+2,4,a).set(x+1,y+3,3,w);}
    }
  });

  def('egypt-jars',{name:"Four canopic jars",kind:'small',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'tick2'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,1,8,w);for(const x of [1,5,9,13]){m.box(x,1,2,x+2,5,5,c).box(x-1,5,2,x+3,7,5,a).set(x,6,5,ink).box(x,7,2,x+2,8+x%3,4,w);}
    }
  });

  def('egypt-scrolls',{name:"Papyrus scroll shelf",kind:'wall',group:G,size:[2, 1],vars:PALETTES,depth:6,tap:'fx',fx:{sfx:'flip'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,2,6,w);for(const x of [2,6,10])m.box(x,2,1,x+3,5,6,c).box(x,3,0,x+3,4,1,a);
    }
  });

  def('egypt-scarab',{name:"Scarab amulet stand",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'tick2'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,8,2,8,w).box(3,2,3,5,8,5,c).blob(4,9,4,3,2,2,a).box(3,9,6,5,11,7,c);for(const y of [8,10])m.box(0,y,4,8,y+1,5,c);
    }
  });

  def('egypt-palm',{name:"Courtyard potted palm",kind:'floor',group:G,size:[2, 2],vars:PALETTES,plant:true,tap:'water',
    build(m,[w,a,c],s={on:true}){
      disc(m,8,0,8,5,w,5);disc(m,8,5,8,4,a,1,3);m.box(7,5,7,9,22,9,w);for(const [x,z] of [[1,7],[7,1],[7,10],[10,7]])m.box(x,21,z,x+6,23,z+3,green);m.box(5,23,5,11,25,11,shade(green,1.15));
    }
  });

  def('egypt-stool',{name:"Woven Egyptian stool",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:6,
    build(m,[w,a,c],s={on:true}){
      table(m,w,8,8,4);for(let x=1;x<7;x++)for(let z=1;z<7;z++)m.set(x,6,z,(x+z)%2?a:c);
    }
  });

  def('egypt-lotus',{name:"Lotus offering bowl",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'water',burst:'drip'},
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,4,w,2);disc(m,4,2,4,3,a);m.blob(4,3,4,2,1,2,c).set(4,4,4,brass);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["egypt-sarcophagus", "egypt-glyphs", "egypt-jars", "egypt-scrolls", "egypt-scarab", "egypt-palm", "egypt-stool", "egypt-lotus"]};
})();
