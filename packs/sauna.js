// Finnish sauna: eight ordinary, free pieces. Three coordinated palettes, eight voxels per cell.
(function(){
  const LR=typeof module!=='undefined'&&module.exports?require('../room.js'):window.LR;
  const {def,shade}=LR,G='sauna',ink=0x343039,cream=0xf4e8d0,brass=0xc6a364,green=0x7b986d;
  const PALETTES=[[12227948, 9149329, 15655366], [9992279, 11571841, 15259061], [13677451, 9017256, 16050126]];
  LR.addGroup(G,"Finnish sauna");
  const disc=(m,x,y,z,r,col,h=1,inside=0)=>{for(let i=-r;i<=r;i++)for(let j=-r;j<=r;j++)if(Math.hypot(i,j)<=r&&Math.hypot(i,j)>=inside)m.box(x+i,y,z+j,x+i+1,y+h,z+j+1,col);};

  def('sauna-benches',{name:"Tiered cedar sauna benches",kind:'floor',group:G,size:[3, 2],vars:PALETTES,seat:9,top:10,
    build(m,[w,a,c],s={on:true}){
      for(const x of [1,21])m.box(x,0,1,x+2,9,7,w).box(x,0,10,x+2,4,15,w);for(let z=0;z<8;z+=2)m.box(0,9,z,24,11,z+1,w);for(let z=9;z<16;z+=2)m.box(0,4,z,24,6,z+1,w);m.box(0,0,0,24,2,1,a);
    }
  });

  def('sauna-kiuas',{name:"Kiuas stove with warm stones",kind:'floor',group:G,size:[2, 1],vars:PALETTES,on:true,tap:'toggle',anim:'flame',light:{at:[8,9,4],color:0xf4b486,i:2,d:5,flicker:true},emit:{kind:'steam',at:[8,15,4],rate:1,on:true},
    build(m,[w,a,c],s={on:true}){
      m.box(2,0,1,14,11,7,shade(w,.5));for(let x=2;x<14;x+=3)m.box(x,1,7,x+1,10,8,a);m.box(4,2,8,12,5,9,s.on?0xc28a61:ink,s.on);for(const x of [3,7,11])for(const z of [2,5])m.blob(x,12,z,2,2,2,(x+z)%2?a:c);
    }
  });

  def('sauna-bucket',{name:"Sauna bucket and ladle",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'water',burst:'steam'},
    build(m,[w,a,c],s={on:true}){
      disc(m,4,0,4,3,w,6);disc(m,4,6,4,3,a,1,2);for(const y of [1,4])disc(m,4,y,4,3,c,1,2);m.box(6,4,3,7,13,4,w).box(5,11,2,8,13,5,a);m.box(0,5,3,1,10,5,c).box(0,9,3,8,10,4,c).box(7,5,3,8,10,5,c);
    }
  });

  def('sauna-thermometer',{name:"Cedar wall thermometer",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:3,
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,0,7,16,2,w).box(2,1,2,6,15,3,c).box(3,3,3,4,13,4,a).box(2,2,3,5,4,4,a);for(let y=5;y<15;y+=3)m.box(5,y,3,6,y+1,4,ink);
    }
  });

  def('sauna-towels',{name:"Sauna towel hooks",kind:'wall',group:G,size:[2, 2],vars:PALETTES,depth:4,tap:'fx',fx:{sfx:'blanket'},
    build(m,[w,a,c],s={on:true}){
      m.box(0,12,0,16,15,2,w);for(const x of [2,10]){m.box(x,11,1,x+1,14,4,a).box(x-1,1,3,x+4,12,4,c);m.box(x-1,3,4,x+4,4,5,a);}
    }
  });

  def('sauna-headrest',{name:"Cedar slatted headrest",kind:'small',group:G,size:[2, 1],vars:PALETTES,tap:'fx',fx:{sfx:'creak'},
    build(m,[w,a,c],s={on:true}){
      for(const z of [1,6])m.box(0,0,z,16,3,z+1,w);for(let x=0;x<16;x+=3)m.box(x,2+Math.floor(x/6),0,x+2,4+Math.floor(x/6),8,x%2?a:w);
    }
  });

  def('sauna-felt',{name:"Sauna felt hat and slippers",kind:'small',group:G,size:[1, 1],vars:PALETTES,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      m.box(1,0,0,7,2,5,a).box(2,2,1,6,5,4,c).box(3,5,2,5,7,3,c);for(const x of [0,5])m.box(x,0,5,x+3,1,8,w).box(x,1,5,x+3,3,7,c);
    }
  });

  def('sauna-birch',{name:"Birch whisk wall bundle",kind:'wall',group:G,size:[1, 2],vars:PALETTES,depth:4,tap:'fx',fx:{sfx:'rustle'},
    build(m,[w,a,c],s={on:true}){
      m.box(3,0,1,5,9,3,w);for(let y=6;y<16;y++)for(let x=0;x<8;x++)if(Math.abs(x-4)<(16-y)*.45)m.box(x,y,2,x+1,y+1,4,(x+y)%3?green:a);m.box(2,5,3,6,6,4,c);
    }
  });

  if(typeof module!=='undefined'&&module.exports)module.exports={group:G,ids:["sauna-benches", "sauna-kiuas", "sauna-bucket", "sauna-thermometer", "sauna-towels", "sauna-headrest", "sauna-felt", "sauna-birch"]};
})();
