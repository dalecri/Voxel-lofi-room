// Game library: the owner's little HTML games as cartridges on a shelf.
// Each cartridge is a plain link that opens its game in a new tab.
(function(root){
  'use strict';
  // OWNER CONFIG: add a game by adding a row. art is a 12x12 pixel sprite.
  // Descriptions and links come from the owner's collection (dalecri/my-collection).
  const GAMES=[
    {id:'gnomeboy',title:'Gnomeboy',blurb:'Launch Barnaby the gnome, glide and dive for acorns.',url:'https://heycristobal.com/gnomeboy/',shell:'#9fd0a8',label:'#fdf4dc',
      art:['....rrrr....','...rrrrrr...','..rrrrrrrr..','.rrrrrrrrrr.','...ssssss...','..skssssks..','..ssssssss..','..wwssssww..','.wwwwwwwwww.','..wwwwwwww..','..bbb..bbb..','..bbb..bbb..']},
    {id:'cozy-2048',title:'Cozy 2048',blurb:'Soft-palette numerical merging.',url:'https://dalecri.github.io/cozy-2048/',shell:'#f6c9a8',label:'#fff6ec',
      art:['............','.oooo..yyyy.','.oooo..yyyy.','.oooo..yyyy.','.oooo..yyyy.','............','............','.pppp..gggg.','.pppp..gggg.','.pppp..gggg.','.pppp..gggg.','............']},
    {id:'lastlight',title:'Last Light',blurb:'Keep your candle burning through a pixel cave.',url:'https://dalecri.github.io/lastlight/lastlight.html',shell:'#c9c3e6',label:'#f6f2ff',
      art:['.....y......','....yoy.....','....yoy.....','.....o......','.....k......','....wwww....','....wwww....','....wwww....','....wwww....','....wwww....','...nnnnnn...','..nnnnnnnn..']},
    {id:'glide',title:'Glide',blurb:'Ride the air as a paper airplane.',url:'https://dalecri.github.io/glide-game/glide.html',shell:'#a9d4ee',label:'#f2f9ff',
      art:['............','..........c.','........ccc.','......cclc..','....ccclc...','..cccclc....','....llc.....','.....lc.....','......c.....','............','.l...l......','............']},
    {id:'skip',title:'Skip',blurb:'Skim and bounce a stone across the water.',url:'https://dalecri.github.io/skip/skip.html',shell:'#a6d8d0',label:'#f1fbf9',
      art:['............','............','.....nn.....','....nnnn....','............','..l..l..l...','.lll.lll.ll.','llllllllllll','cccccccccccc','cccccccccccc','cccccccccccc','............']},
    {id:'gravity-well',title:'Gravity Well',blurb:'Guide stardust into orbit around a growing star.',url:'https://dalecri.github.io/gravity-well/gravity-well.html',shell:'#d8c8f0',label:'#f7f2ff',
      art:['............','..p......p..','.....yy.....','....yyyy....','...yyyyyy...','..pyyyyyyp..','...yyyyyy...','....yyyy....','.....yy.....','..p......p..','............','............']},
    {id:'keep-it-alive',title:'Keep It Alive',blurb:'Help a glowing organism survive.',url:'https://dalecri.github.io/keep-it-alive/keep-it-alive.html',shell:'#b9e6c9',label:'#f2fcf5',
      art:['............','....tttt....','..tttttttt..','.tttttttttt.','.ttkttttktt.','.tttttttttt.','.tttkkkkttt.','.tttttttttt.','..tttttttt..','...t..t..t..','............','............']},
    {id:'fold-sheet',title:'Fold Sheet',blurb:'Fold paper to connect matching dots.',url:'https://dalecri.github.io/fold-sheet/fold-sheet.html',shell:'#f3e3a0',label:'#fffbea',
      art:['............','.wwwwwwww...','.wwwwwwwwl..','.wrwwwwwwll.','.wwwwwwwwwww','.wwwwwwwwwww','.wwwwwwwwwww','.wwwwwwwrwww','.wwwwwwwwwww','.wwwwwwwwwww','............','............']},
    {id:'thread',title:'Thread',blurb:'Wrap a string around pins and catch beads.',url:'https://dalecri.github.io/thread-game/thread.html',shell:'#f2b7c6',label:'#fff3f6',
      art:['............','..k......k..','..rr....rr..','...rr..rr...','....rrrr....','....rrrr....','...rr..rr...','..rr....rr..','..k..y...k..','.....y......','............','............']},
  ];
  const COLLECTION_URL='https://heycristobal.com/my-collection/';
  const ART_COLORS={r:'#e25b4c',s:'#f4c7a1',k:'#2b2833',w:'#f5f1e8',b:'#4b6fa8',o:'#f2a04e',y:'#f6d24a',p:'#b28be0',g:'#7cc48e',n:'#8a5a3c',l:'#8fc3ea',c:'#4b9fd8',t:'#5fcf9f'};
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
    if(games.length%2){const soon=el('li','games-slot games-soon');soon.setAttribute('aria-hidden','true');soon.append(el('span','games-soon-plus','＋'),el('span','','More games soon'));shelf.appendChild(soon);}
    host.appendChild(shelf);
    const all=el('a','games-all','Browse the whole collection ↗');all.href=COLLECTION_URL;all.target='_blank';all.rel='noopener noreferrer';host.appendChild(all);
  }
  const api={GAMES,COLLECTION_URL,sprite,safe,render};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LRGames=api;
})(typeof window!=='undefined'?window:globalThis);
