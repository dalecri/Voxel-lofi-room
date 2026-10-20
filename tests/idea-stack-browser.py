"""npm run build && python3 tests/idea-stack-browser.py. Fanned private ideas, cycle/shake/drop and a readable top card."""
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
 context.add_init_script('''if(!sessionStorage.houseFixture){sessionStorage.houseFixture='true';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]},b={...a,name:'Living room'};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0},{id:102,name:b.name,n:0}],'lr.room.101':a,'lr.room.102':b,'lr.draft':{id:102,base:'',data:{...b,name:'Living draft restored'}},'lr.mainBedroom':101,'lr.meta':{current:102,visitors:false,realtime:false,dreamy:false,phase:'day',stations:[{name:'Old station',url:'https://example.com/old.mp3'}]}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 page.evaluate("const a=__lr;a.room.items=[];a.room.n=10;const jar=a.room.add(a.room.make('ideajar',{x:3,z:3}));a.changed();window.ideaEffects={plop:0,rustle:0,excite:0,burst:0};for(const [obj,key] of [[a.Sound,'plop'],[a.Sound,'rustle'],[a.view,'excite'],[a.view,'burst']]){const original=obj[key].bind(obj);obj[key]=(...args)=>{ideaEffects[key]++;return original(...args)}};a.interact(jar.id)")
 body=page.locator('#sheetBody');front=page.locator('.idea-front');card=page.locator('.idea-card-text');form=page.locator('.idea-drop-form');shake=page.get_by_role('button',name='Shake the jar',exact=True)
 assert '0 sparks' in body.locator('h2').inner_text();assert shake.is_disabled();assert not form.is_visible();page.get_by_role('button',name='The jar is empty. Drop in your first spark.',exact=True).click();assert form.is_visible();assert page.get_by_label('A little idea',exact=True).evaluate('e=>e===document.activeElement')
 texts=['First little spark','A cozy app idea','PRIVATE_IDEA_FULL_TEXT\n'+('Keep this thought. '*80),'<script>window.ideaInjected=true</script>','A tiny neighbourhood cookbook']
 def add(text):
  if not form.is_visible():page.get_by_role('button',name='Drop in an idea',exact=True).click()
  page.get_by_label('A little idea',exact=True).fill(text);page.get_by_role('button',name='Drop in jar',exact=True).click();assert card.inner_text()==text.strip();assert front.evaluate('e=>e.classList.contains("is-dropped")');assert page.locator('.idea-card-label').last.inner_text()=='LATEST DROP';assert not form.is_visible()
 for text in texts:add(text)
 assert page.evaluate('ideaEffects.plop')==5;assert '5 sparks' in body.locator('h2').inner_text();assert page.locator('.idea-back').count()==3;assert page.locator('.idea-card-date').inner_text().startswith('Added ');assert page.evaluate('window.ideaInjected') is None
 # Each card keeps its own palette when cycled, moved to the back, or reloaded.
 palettes={}
 for _ in texts:
  idea_id=front.get_attribute('data-idea');palettes[idea_id]=front.evaluate('e=>e.style.backgroundImage')
  assert 'radial-gradient' in palettes[idea_id] and 'color-mix' in palettes[idea_id]
  assert page.locator('.idea-cycle').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
  page.get_by_role('button',name='Next idea',exact=True).click()
 assert len(set(palettes.values()))==len(texts)
 assert front.evaluate('e=>e.style.backgroundImage')==palettes[front.get_attribute('data-idea')]
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');page.locator('.idea-stack').scroll_into_view_if_needed();page.screenshot(path=f'/tmp/idea-stack-{phase}-{width}.png')
 # Browsing follows newest-first order and never changes the shake ledger.
 ledger=page.evaluate('__lr.roomTools.state.lastIdea');page.get_by_role('button',name='Next idea',exact=True).click();assert card.inner_text()==texts[3];page.get_by_role('button',name='Next idea',exact=True).click();assert card.inner_text()==texts[2].strip();assert card.evaluate('e=>getComputedStyle(e).overflow')=='visible';assert page.evaluate('__lr.roomTools.state.lastIdea')==ledger;assert body.evaluate('e=>e.scrollWidth<=e.clientWidth')
 shake.click();first=front.get_attribute('data-idea');assert first==page.evaluate('__lr.roomTools.state.lastIdea');assert page.locator('.idea-card-label').last.inner_text()=='LAST SHAKEN';shake.click();second=front.get_attribute('data-idea');assert second!=first;assert second==page.evaluate('__lr.roomTools.state.lastIdea');assert page.evaluate('ideaEffects.rustle')==2;assert page.evaluate('ideaEffects.excite')==2;assert page.evaluate('ideaEffects.burst')==2
 next_id=page.evaluate('LRRoomTools.ideaCards(__lr.roomTools.state.ideas,__lr.roomTools.state.lastIdea).next.id');page.get_by_role('button',name='Remove idea',exact=True).click();assert front.get_attribute('data-idea')==next_id;assert page.evaluate('__lr.roomTools.state.ideas.length')==4
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'PRIVATE_IDEA_FULL_TEXT' not in raw;assert 'lastIdea' not in raw
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');ready();page.evaluate("__lr.roomToolsUI.open('ideas')");assert page.evaluate('__lr.roomTools.state.ideas.length')==4;assert front.get_attribute('data-idea')==page.evaluate('__lr.roomTools.state.ideas[0].id')
 assert front.evaluate('e=>e.style.backgroundImage')==palettes[front.get_attribute('data-idea')]
 page.emulate_media(reduced_motion='reduce');shake.click();assert front.evaluate('e=>getComputedStyle(e).animationName')=='none'
 while page.evaluate('__lr.roomTools.state.ideas.length'):page.get_by_role('button',name='Remove idea',exact=True).click()
 assert shake.is_disabled();assert '0 sparks' in body.locator('h2').inner_text();assert page.get_by_role('button',name='The jar is empty. Drop in your first spark.',exact=True).is_visible();assert not errors,errors
 print('PASS empty invite, newest drop/count/date, fan capped at three, literal/long readable text, cycle order, non-repeating shake/ledger/rustle/jar FX, top removal, reload/privacy, reduced motion and mobile/desktop day/night',flush=True);browser.close()
server.shutdown()
