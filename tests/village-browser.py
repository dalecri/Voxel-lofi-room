"""npm run build && python3 tests/village-browser.py"""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script('''if(!sessionStorage.villageFixture){sessionStorage.villageFixture='true';const rooms=[{id:101,name:'Little bedroom'},{id:102,name:'Tea room'},{id:103,name:'Reading nook'},{id:104,name:'Garden plot'}];
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':rooms.map(r=>({...r,n:0})),'lr.meta':{current:101,realtime:false,phase:'day',dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));
 for(let i=0;i<rooms.length;i++)localStorage.setItem('lr.room.'+rooms[i].id,JSON.stringify({v:1,name:rooms[i].name,n:10,wall:{style:'paint',color:i},floor:{style:'oak'},items:[]}));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(25000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.view')
 # Saved-room fixtures include tabletop, wall furniture, open plots and private
 # surfaces. Use the real placement model so the thumbnail follows its transforms.
 page.evaluate('''() => {const a=__lr,C=LR.CAT,configs=[['bed','gamingdesk','typewriter','filecab'],['talaveratable','kettle','minifridge'],['libcase','armchair','whiteboard'],['sakura','terrarium']];
 for(let i=0;i<a.rooms.length;i++){const r=new LR.Room();r.name=a.rooms[i].name;r.wall={style:i===3?'none':'paint',color:i};r.floor={style:'oak'};const types=configs[i].filter(t=>C[t]);for(let j=0;j<types.length;j++){const it=r.make(types[j],C[types[j]].kind==='wall'?{k:0,u:2,e:2,c:0}:{x:(j%2)*4+1,z:Math.floor(j/2)*4+1,c:0});r.add(it);
 if(types[j]==='typewriter'){const desk=r.items.find(i=>i.t==='gamingdesk');if(desk)Object.assign(it,{p:desk.id,lx:0,lz:0});}}
 localStorage.setItem('lr.room.'+a.rooms[i].id,JSON.stringify(r.serialize()));}
 a.room.load(JSON.parse(localStorage.getItem('lr.room.101')));a.changed();
 window.thumbCalls=0;const fn=a.view.roomThumb;a.view.roomThumb=function(...args){window.thumbCalls++;return fn.apply(this,args);};}''')
 def menu():page.click('#bMenu');page.get_by_role('tab',name='Rooms',exact=True).click()
 def esc():page.keyboard.press('Escape')
 menu();assert page.locator('.stackwrap,.isostage,.slice').count()==0;assert page.locator('.village-room').count()==4;assert page.locator('.village-room.here').inner_text().startswith('Little bedroom');assert 'you are here' in page.locator('.village-room.here').inner_text()
 assert page.locator('.village-bridge').count()==0
 for name in ['Little bedroom','Tea room','Reading nook','Garden plot']:assert page.get_by_role('button',name=name,exact=False).count()>=1
 page.wait_for_function('document.querySelector(".village-room img")?.naturalWidth===240')
 # Laziness: the bottom-most diorama is outside the scroll viewport and is not rendered.
 assert page.locator('.village-room').last.locator('img').get_attribute('src') is None
 for card in page.locator('.village-room').all():card.scroll_into_view_if_needed();card.locator('img').wait_for(state='visible');page.wait_for_function('id=>document.querySelector(`[data-room-id="${id}"] img`).naturalWidth===240',arg=card.get_attribute('data-room-id'))
 assert page.locator('.village-room.ready').count()==4
 print('lazy dioramas rendered',flush=True)
 result=page.evaluate('''() => {const v=__lr.view,r={...__lr.room.serialize(),id:101};const a=v.roomThumb(r),n=v.thumbR.info.render.frame;const b=v.roomThumb(structuredClone(r));if(a!==b||v.thumbR.info.render.frame!==n)throw Error('Not cached');r.items[0].c=1;const c=v.roomThumb(r);if(v.thumbR.info.render.frame!==n+1||a===c)throw Error('Decor not regenerated');const state=[v.size(),v.room,v.root.children.length];v.roomThumb({...r,id:500,n:24});if(v.size()!==state[0]||v.room!==state[1]||v.root.children.length!==state[2])throw Error('Live room mutated');const oldView=LR.viewNow,windowType=Object.keys(LR.CAT).find(t=>LR.CAT[t].dyn&&LR.CAT[t].kind==='wall');const windowRoom={...r,id:700,items:[{id:1,t:windowType,c:0,on:true,k:0,u:2,e:1,seed:123}]};const city=v.roomThumb({...windowRoom,view:'city'}),forest=v.roomThumb({...windowRoom,view:'forest'});if(city===forest||LR.viewNow!==oldView)throw Error('Window view polluted');v.thumb(r.items[0]);if(v.thumbR.domElement.width!==120)throw Error('Picker size polluted');return true;}''');assert result
 # Link/unlink updates a currently open map through changed(), not only on reopen.
 page.evaluate('''() => {const a=__lr,t=Object.keys(LR.CAT).find(k=>LR.CAT[k].tap==='portal'&&LR.CAT[k].kind==='floor');window.testDoor=a.room.add(a.room.make(t,{x:7,z:7,link:102}));testDoor.link=102;a.changed();}''');page.wait_for_function('document.querySelectorAll(".village-bridge").length===1')
 assert page.locator('.village-bridge').get_attribute('data-from')=='101';assert page.locator('.village-bridge').get_attribute('data-to')=='102'
 page.evaluate('testDoor.link=0;__lr.changed()');page.wait_for_function('document.querySelectorAll(".village-bridge").length===0');page.evaluate('testDoor.link=102;__lr.changed()');page.wait_for_function('document.querySelectorAll(".village-bridge").length===1')
 for width in [320,390,960]:
  page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(300)
  assert page.evaluate('''() => {const cards=[...document.querySelectorAll('.village-room')].map(e=>e.getBoundingClientRect());return cards.every((a,i)=>cards.slice(i+1).every(b=>a.right<=b.left+.1||b.right<=a.left+.1||a.bottom<=b.top+.1||b.bottom<=a.top+.1)) && document.documentElement.scrollWidth<=innerWidth;}''')
  page.locator('.village-room').first.scroll_into_view_if_needed();page.screenshot(path=f'/tmp/village-day-{width}.png')
 page.locator('[data-room-id="102"] .village-visit').click();page.wait_for_function('__lr.meta.current===102');assert not page.locator('#sheet').evaluate("e=>e.classList.contains('open')");assert not page.locator('#lvSave').count()
 menu();assert page.locator('[data-room-id="102"]').evaluate("e=>e.classList.contains('here')");assert page.locator('.village-bridge').count()==1
 page.evaluate("__lr.setPhase('night',true);__lr.view.setPhase('night',true)");page.set_viewport_size({'width':390,'height':844});page.locator('[data-room-id="102"]').scroll_into_view_if_needed();page.screenshot(path='/tmp/village-night-390.png');esc();assert not errors,errors
 # Reopening the map restores the current room's cached picture.
 menu();page.locator('[data-room-id="102"]').scroll_into_view_if_needed();page.wait_for_function('document.querySelector(`[data-room-id="102"] img`).naturalWidth===240');esc();assert not errors,errors
 print('PASS: cached 240px room decor, invalidation, lazy loading, unchanged live room/picker, door bridges/update/unlink, non-overlap at desktop/mobile, real travel and day/night/Escape without errors',flush=True)
 browser.close()
server.shutdown()
