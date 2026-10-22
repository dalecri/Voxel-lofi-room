// Game library: the owner's little HTML games as cartridges on a shelf.
// Each cartridge is a plain link that opens its game in a new tab.
(function(root){
  'use strict';
  // OWNER CONFIG: add a game by adding a row. art is a 12x12 pixel sprite.
  const GAMES=[
    {id:'gnomeboy',title:'Gnomeboy',blurb:'A pocket-sized gnome adventure.',url:'https://heycristobal.com/gnomeboy/',shell:'#9fd0a8',label:'#fdf4dc',
      art:['....rrrr....','...rrrrrr...','..rrrrrrrr..','.rrrrrrrrrr.','...ssssss...','..skssssks..','..ssssssss..','..wwssssww..','.wwwwwwwwww.','..wwwwwwww..','..bbb..bbb..','..bbb..bbb..']},
  ];
  const ART_COLORS={r:'#e25b4c',s:'#f4c7a1',k:'#2b2833',w:'#f5f1e8',b:'#4b6fa8'};
  const sprite=rows=>'<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'+rows.flatMap((row,y)=>[...row].flatMap((c,x)=>ART_COLORS[c]?[`<rect x="${x}" y="${y}" width="1" height="1" fill="${ART_COLORS[c]}"/>`]:[])).join('')+'</svg>';
  const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:null;}catch(e){return null;}};
  function render(host,{games=GAMES,onOpen=()=>{}}={}){
    const doc=host.ownerDocument,el=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    host.replaceChildren();
    host.appendChild(el('p','games-intro','Tiny games to play in your browser. Pick a cartridge.'));
    const shelf=el('ul','games-shelf');shelf.setAttribute('aria-label','Games');
    for(const g of games){
      const href=safe(g.url);if(!href)continue;
      const li=el('li','games-slot'),a=el('a','games-cart');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.dataset.game=g.id;
      a.style.setProperty('--shell',g.shell||'#c9c3e6');a.style.setProperty('--label',g.label||'#fdf4dc');a.setAttribute('aria-label',`Play ${g.title} (opens in a new tab)`);
      const grip=el('span','games-grip');grip.setAttribute('aria-hidden','true');
      const label=el('span','games-label'),art=el('span','games-art');art.innerHTML=sprite(g.art||[]);
      label.append(art,el('b','games-title',g.title));
      const blurb=el('span','games-blurb',g.blurb||''),play=el('span','games-play','Play ↗');play.setAttribute('aria-hidden','true');
      a.append(grip,label,blurb,play);a.addEventListener('click',()=>onOpen(g));li.appendChild(a);shelf.appendChild(li);
    }
    const soon=el('li','games-slot games-soon');soon.setAttribute('aria-hidden','true');soon.append(el('span','games-soon-plus','＋'),el('span','','More games soon'));shelf.appendChild(soon);
    host.appendChild(shelf);
  }
  const api={GAMES,sprite,safe,render};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRGames=api;
})(typeof window!=='undefined'?window:globalThis);
