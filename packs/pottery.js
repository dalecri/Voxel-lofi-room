// Pottery studio: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='pottery',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[12096882, 13207400, 15195336], [7365977, 8560022, 15787730], [12034701, 9209762, 14273467]];
  LR.addGroup(G,"Pottery studio");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));

  def('pottery-wheel',{name:"Studio pottery wheel",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'spin',spinIdle:0,top:11,
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,15,3,7,w).box(3,3,2,6,9,6,ink).box(12,3,2,14,10,6,w).box(1,9,0,15,11,8,c);m.part('spin',[6,11,4]);disc(m,6,11,4,4,ink);pot(m,4,12,2,a);m.main();
    }
  });

  def('pottery-kiln',{name:"Electric pottery kiln",kind:'floor',group:G,size:[2, 2],vars:PALETTES,tap:'toggle',on:true,anim:'flame',light:{at:[8,6,15],color:0xffb06b,i:2,d:4},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,15,16,15,c).box(2,16,2,14,18,14,w).box(3,3,15,13,13,16,w).box(4,4,16,12,12,17,s.on?a:ink,s.on);for(let x=4;x<13;x+=4)m.box(x,0,0,x+1,16,1,ink);m.box(12,11,16,14,13,17,brass);
    }
  });

  def('pottery-shelves',{name:"Pottery drying shelves",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:24,
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,2,25,8,w).box(22,0,0,24,25,8,w);for(const y of [1,12,23]){m.box(0,y,0,24,y+1,8,w);if(y<23)for(const x of [3,11,18])pot(m,x,y+1,2,a);}
    }
  });

  def('pottery-clay',{name:"Clay bucket pair",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'plop'},
    build(m,[w,a,c],s={on:true}){
      pot(m,1,0,1,a);pot(m,3,1,3,c);m.box(1,5,0,2,9,1,w).box(5,5,0,6,9,1,w).box(1,9,0,6,10,1,w);
    }
  });

  def('pottery-tools',{name:"Pottery tool rack",kind:'wall',group:G,size:[2, 1],vars:PALETTES,depth:4,
    build(m,[w,a,c],s={on:true}){
      m.box(0,5,0,16,7,2,w);for(let x=1;x<15;x+=3)m.box(x,1,2,x+1,6,3,brass).box(x-1,0,2,x+2,2,3,a);
    }
  });

  def('pottery-glaze',{name:"Glazing worktable",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:12,tap:'fx',fx:{sfx:'pour'},
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,8,10);for(let x=1;x<22;x+=6)pot(m,x,12,2,x%2?a:c);m.box(18,12,0,20,13,8,brass);
    }
  });

  def('pottery-apron',{name:"Clay-splashed apron",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:3,
    build(m,[w,a,c],s={on:true}){
      m.box(3,14,0,5,16,2,w).box(2,8,2,6,14,3,a).box(1,1,2,7,9,3,a).box(2,4,3,6,7,4,c).set(4,11,3,c).set(1,6,3,c);
    }
  });

  def('pottery-stool',{name:"Potter\u2019s round stool",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:7,
    build(m,[w,a,c],s={on:true}){
      for(const x of [1,5])for(const z of [1,5])m.box(x,0,z,x+2,6,z+2,w);disc(m,4,6,4,4,a,2);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["pottery-wheel", "pottery-kiln", "pottery-shelves", "pottery-clay", "pottery-tools", "pottery-glaze", "pottery-apron", "pottery-stool"]};
})();
