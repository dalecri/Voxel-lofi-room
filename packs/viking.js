// Viking longhouse: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='viking',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[8348233, 9726551, 14206885], [6446157, 8162957, 14932157], [10650203, 7832165, 15194041]];
  LR.addGroup(G,"Viking longhouse");
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));

  def('viking-longfire',{name:"Longhouse hearth",kind:'floor',group:G,size:[3, 1],vars:PALETTES,on:true,tap:'toggle',anim:'fire',light:{at:[12,5,4],color:0xffbc7e,i:4,d:7,flicker:true},emit:{kind:'embers',at:[12,6,4],rate:1,on:true},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,24,3,8,shade(w,.65)).clear(2,1,2,22,3,6);for(let x=3;x<22;x+=4){m.box(x,1,2,x+2,4,6,w).box(x,3,3,x+2,7,5,s.on?a:ink,s.on).set(x,7,3,s.on?c:ink,s.on);}
    }
  });

  def('viking-posts',{name:"Carved longhouse posts",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'thump'},
    build(m,[w,a,c],s={on:true}){
      for(const x of [1,11]){m.box(x,0,2,x+4,24,6,w);for(let y=3;y<23;y+=5)m.box(x-1,y,1,x+5,y+1,7,a);m.box(x,20,6,x+1,22,7,c).box(x+3,20,6,x+4,22,7,c);}
    }
  });

  def('viking-furs',{name:"Longhouse fur throw",kind:'rug',group:G,size:[3, 2],vars:PALETTES,walk:true,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<24;x++)for(let z=0;z<16;z++)if(Math.pow((x-12)/12,2)+Math.pow((z-8)/7,2)<1)m.box(x,0,z,x+1,1+(x+z)%2,z+1,(x*7+z)%8<2?a:c);
    }
  });

  def('viking-shields',{name:"Painted shield wall",kind:'wall',group:G,size:[3, 2],vars:PALETTES,depth:4,tap:'fx',fx:{sfx:'thump'},
    build(m,[w,a,c],s={on:true}){
      for(const cx of [4,12,20])for(let x=cx-4;x<cx+4;x++)for(let y=2;y<12;y++)if(Math.hypot(x-cx,y-7)<5)m.box(x,y,1,x+1,y+1,3,(x+y)%2?a:w);for(const x of [4,12,20])m.box(x-1,6,3,x+1,8,4,c);
    }
  });

  def('viking-horns',{name:"Mead horn table set",kind:'small',group:G,size:[2, 1],vars:PALETTES,tap:'sip',
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,1,8,w);for(const x of [3,10]){m.box(x,1,2,x+2,3,4,w);for(let y=2;y<8;y++)m.box(x+Math.floor(y/3),y,2,x+Math.floor(y/3)+Math.max(1,Math.floor(y/2)),y+1,5,c);m.box(x+1,7,2,x+4,8,5,a);}
    }
  });

  def('viking-runestone',{name:"Gentle runestone",kind:'floor',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'thump',say:['An ancient reminder to take it easy.']},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,1,8,13,7,a).box(1,13,2,7,17,6,a).box(3,3,7,4,13,8,c).box(4,10,7,6,11,8,c).box(1,6,7,3,7,8,c);
    }
  });

  def('viking-bench',{name:"Carved longhouse bench",kind:'floor',group:G,size:[3, 1],vars:PALETTES,seat:7,
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,8,5);for(const x of [0,22])m.box(x,7,0,x+2,13,8,w).set(x,13,1,a);m.box(2,7,1,22,8,7,c);
    }
  });

  def('viking-chest',{name:"Iron-bound longhouse chest",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{door:true,sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,7,8,w);for(const x of [2,12])m.box(x,0,0,x+2,7,9,ink);m.part('door',[0,7,0]);m.box(0,7,0,16,10,8,w);for(const x of [2,12])m.box(x,7,0,x+2,11,8,ink);m.box(7,7,8,9,9,9,c);m.main();
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["viking-longfire", "viking-posts", "viking-furs", "viking-shields", "viking-horns", "viking-runestone", "viking-bench", "viking-chest"]};
})();
