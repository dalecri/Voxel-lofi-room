// Hand-drawn wobble: the room gets an inked outline, wobbly edges that gently
// "boil" like a sketch, and a soft paper grain. Purely a look on the room canvas;
// text and buttons stay crisp. Reduced motion keeps the wobble still.
(function(root){
  'use strict';
  const FRAMES=3,TICK=170;
  // One filter per frame, each with its own noise seed. Each one's noise is fixed,
  // so the browser can keep it; only the chosen frame changes.
  function filters(){
    let out='';
    for(let i=0;i<FRAMES;i++)out+=`<filter id="lr-wobble-${i}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">`+
      '<feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="fat"/>'+
      '<feComposite in="fat" in2="SourceAlpha" operator="out" result="ring"/>'+
      '<feFlood flood-color="#2a2320" flood-opacity=".82"/>'+
      '<feComposite in2="ring" operator="in" result="ink"/>'+
      '<feMerge result="drawn"><feMergeNode in="SourceGraphic"/><feMergeNode in="ink"/></feMerge>'+
      `<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${7+i*13}" result="noise"/>`+
      '<feDisplacementMap in="drawn" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>';
    return out;
  }
  const GRAIN="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .2 0 0 0 0 .16 0 0 0 0 .12 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
  function create({doc=root.document,canvas,reduced=()=>false}){
    let on=false,timer=null,frame=0,defs=null,grain=null;
    function mount(){
      if(defs)return;
      defs=doc.createElementNS('http://www.w3.org/2000/svg','svg');defs.setAttribute('aria-hidden','true');defs.setAttribute('width','0');defs.setAttribute('height','0');
      defs.style.cssText='position:absolute;width:0;height:0;overflow:hidden';defs.innerHTML=filters();doc.body.appendChild(defs);
      grain=doc.createElement('div');grain.id='paperGrain';grain.setAttribute('aria-hidden','true');grain.style.backgroundImage=GRAIN;canvas.after(grain);
    }
    const paint=()=>{canvas.style.filter=on?`url(#lr-wobble-${frame})`:'';};
    function tick(){if(doc.hidden)return;frame=(frame+1)%FRAMES;paint();}
    function schedule(){clearInterval(timer);timer=null;if(on&&!reduced())timer=setInterval(tick,TICK);}
    function set(next){
      on=!!next;if(on)mount();
      doc.body.classList.toggle('hand-drawn',on);frame=0;paint();schedule();
    }
    return {set,get on(){return on;},get frame(){return frame;},refresh:schedule};
  }
  const api={FRAMES,TICK,filters,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRHandDrawn=api;
})(typeof window!=='undefined'?window:globalThis);
