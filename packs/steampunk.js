// Steampunk workshop: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='steampunk',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[7427647, 10848600, 13154192], [5133652, 11901546, 14471342], [9991767, 9014391, 15391158]];
  LR.addGroup(G,"Steampunk workshop");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};
  const table=(m,w,W=16,D=8,H=10)=>{for(const x of [1,W-3])for(const z of [1,D-3])m.box(x,0,z,x+2,H,z+2,shade(w,.85));m.box(0,H,0,W,H+2,D,w);};
  const pot=(m,x,y,z,col)=>m.box(x,y,z,x+4,y+1,z+4,col).box(x-1,y+1,z-1,x+5,y+5,z+5,col).box(x,y+5,z,x+4,y+6,z+4,shade(col,.65));
  const panel=(m,w,c,W=16,H=16)=>m.box(0,0,0,W,H,2,w).box(1,1,2,W-1,H-1,3,c);

  def('steampunk-gears',{name:"Slow brass gear wall",kind:'wall',group:G,size:[2, 3],vars:PALETTES,depth:4,on:true,tap:'spin',spinOn:.12,spinAxis:'z',
    build(m,[w,a,c],s={on:true}){
      panel(m,w,ink,16,24);m.part('spin',[8,8,3],'z');for(let x=2;x<15;x++)for(let y=2;y<15;y++){const d=Math.hypot(x-8,y-8);if((d<5&&d>2)||(d<7&&(Math.abs(x-8)<2||Math.abs(y-8)<2||Math.abs(Math.abs(x-8)-Math.abs(y-8))<1)))m.set(x,y,3,a);}m.set(8,8,4,c);m.main();for(const cx of [4,12])for(let x=cx-3;x<=cx+3;x++)for(let y=16;y<=22;y++)if(Math.hypot(x-cx,y-19)<3.5)m.set(x,y,3,(x===cx||y===19)?w:c);
    }
  });

  def('steampunk-airship',{name:"Brass airship model",kind:'small',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'whoosh'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,1,16,1,7,w).box(7,1,3,9,5,5,a);m.part('float',[8,8,4]);m.blob(8,10,4,7,4,3,c).box(5,3,2,11,5,6,w);for(const x of [5,10])m.box(x,5,3,x+1,8,4,a);m.box(1,9,3,4,10,5,a).box(8,13,3,10,15,5,a);m.main();
    }
  });

  def('steampunk-bench',{name:"Riveted inventors workbench",kind:'floor',group:G,size:[3, 1],vars:PALETTES,top:11,tap:'fx',fx:{sfx:'clack'},
    build(m,[w,a,c],s={on:true}){
      table(m,w,24,8,9);m.box(0,11,0,24,13,2,a);for(let x=2;x<24;x+=5)m.set(x,12,2,c);m.box(3,11,3,5,15,5,ink).box(2,14,3,7,16,5,a).box(15,11,2,16,13,7,c).box(17,11,4,22,12,6,a);
    }
  });

  def('steampunk-bulbs',{name:"Edison bulb string",kind:'wall',group:G,size:[3, 1],vars:PALETTES,depth:5,on:true,tap:'toggle',anim:'twinkle',light:{at:[12,3,4],color:0xffcf8c,i:2,d:6},
    build(m,[w,a,c],s={on:true}){
      for(let x=0;x<24;x++)m.set(x,6-Math.floor(Math.sin(x/23*Math.PI)*2),1,w);for(const x of [3,8,15,20])m.box(x,3,1,x+1,6,2,a).box(x-1,1,1,x+2,4,4,s.on?c:shade(c,.5),s.on);
    }
  });

  def('steampunk-gauge',{name:"Steam pressure gauge",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'tick'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,1,7,2,7,w).box(3,2,3,5,6,5,a);for(let x=0;x<8;x++)for(let y=5;y<13;y++)if(Math.hypot(x-4,y-9)<4)m.box(x,y,3,x+1,y+1,5,Math.hypot(x-4,y-9)<3?c:a);m.box(3,8,5,5,10,6,ink).box(4,10,5,6,11,6,ink);
    }
  });

  def('steampunk-trunk',{name:"Riveted expedition trunk",kind:'floor',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'creak',door:true},
    build(m,[w,a,c],s={on:true}){
      m.box(0,0,0,16,8,8,w);for(const x of [1,13]){m.box(x,0,0,x+2,8,9,a);for(const y of [1,5])m.set(x,y,9,c);}m.part('door',[0,8,0]);m.box(0,8,0,16,11,8,w);for(const x of [1,13])m.box(x,8,0,x+2,12,8,a);m.box(7,7,8,9,10,9,c);m.main();
    }
  });

  def('steampunk-stool',{name:"Workshop screw stool",kind:'floor',group:G,size:[1, 1],vars:PALETTES,seat:7,
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,3,w);m.box(3,1,3,5,7,5,a);for(const y of [2,4,6])m.box(2,y,3,6,y+1,5,c);disc(m,4,7,4,4,w,2);
    }
  });

  def('steampunk-goggles',{name:"Inventors goggles on hook",kind:'wall',group:G,size:[1, 1],vars:PALETTES,depth:5,tap:'fx',fx:{sfx:'tick2'},
    build(m,[w,a,c],s={on:true}){
      m.box(3,5,0,5,8,2,w).box(0,2,2,8,3,3,w);for(const x of [0,5])m.box(x,1,2,x+3,5,4,a).box(x+1,2,4,x+2,4,5,c);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["steampunk-gears", "steampunk-airship", "steampunk-bench", "steampunk-bulbs", "steampunk-gauge", "steampunk-trunk", "steampunk-stool", "steampunk-goggles"]};
})();
