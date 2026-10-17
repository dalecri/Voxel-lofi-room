"""npm run build && python3 tests/pixel-maker-browser.py. Focus Garden growth, background deadlines, pocketing, labels and Today shortcut."""
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
 context.add_init_script('if(!sessionStorage.gardenClock)sessionStorage.gardenClock=String(new Date(2026,9,17,14).getTime());const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[Number(sessionStorage.gardenClock)]))}static now(){return Number(sessionStorage.gardenClock)}};window.__advanceFocus=ms=>sessionStorage.gardenClock=String(Number(sessionStorage.gardenClock)+ms)')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 page.evaluate("const a=__lr;a.room.items=[];window.bed=a.room.add(a.room.make('focusgarden',{x:3,z:3}));a.changed();window.dispatchEvent(new Event('pagehide'));a.interact(bed.id)")
 body=page.locator('#sheetBody');garden=page.locator('.focus-garden');assert garden.is_visible();assert garden.get_attribute('data-state')=='idle';assert page.evaluate('!LR.CAT.focuscandle')
 page.get_by_role('button',name='15 min',exact=True).click();page.get_by_role('button',name='Start',exact=True).click();assert garden.get_attribute('data-state')=='running';assert page.evaluate('__lr.focusGarden.active.minutes')==15
 plant=page.evaluate('__lr.focusGarden.active.plant');bed_id=page.evaluate('bed.id');deadline=page.evaluate('__lr.focusGarden.active.end');assert page.evaluate('id=>__lr.room.get(id).p',plant)==bed_id
 def advance(ms):page.evaluate('ms=>{__advanceFocus(ms);__lr.updateRituals();__lr.view.frame(.1,__lr.view.t+.1);__lr.todayUI.refresh()}',ms)
 advance(225000);assert garden.get_attribute('data-stage')=='1';assert page.evaluate('id=>__lr.view.objs.get(id).userData.parts.growth1.visible&&!__lr.view.objs.get(id).userData.parts.growth2.visible',plant)
 page.keyboard.press('Escape');page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click();assert page.locator('.today-garden').is_visible();assert 'Back to garden' in page.locator('.today-garden').inner_text();page.locator('.today-garden').click();assert garden.is_visible()
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.focusGarden.active.end')==deadline;assert page.evaluate('__lr.room.items.filter(i=>i.t==="focusbloom").length')==1;page.evaluate('id=>__lr.gardenUI.open(id)',bed_id)
 advance(225000);assert garden.get_attribute('data-stage')=='2';advance(225000);assert garden.get_attribute('data-stage')=='3'
 page.evaluate('()=>{window.chimes=0;const original=__lr.Sound.ritualChime.bind(__lr.Sound);__lr.Sound.ritualChime=function(){chimes++;return original()}}')
 advance(225000);assert garden.get_attribute('data-state')=='bloomed';assert garden.get_attribute('data-stage')=='4';assert page.evaluate('__lr.focusGarden.state.totalBlooms')==1;assert page.evaluate('chimes')==1;page.evaluate('__lr.updateFocusGarden(true)');assert page.evaluate('chimes')==1
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.activityLog")).flatMap(d=>d.events).filter(k=>k==="focus").length')==1
 assert 'It burst into bloom' in page.locator('#toasts').inner_text();assert page.evaluate('__lr.companion.brain.state.message')=='Look at that. A whole little bloom.'
 page.keyboard.press('Escape');page.evaluate('id=>__lr.interact(id)',plant);assert '15 minutes' in page.locator('#toasts').inner_text()
 page.evaluate('id=>__lr.gardenUI.open(id)',bed_id);page.get_by_role('button',name='25 min',exact=True).click();page.get_by_role('button',name='Plant another seed',exact=True).click();early=page.evaluate('__lr.focusGarden.active.plant');advance(60000);page.get_by_role('button',name='End session',exact=True).click();assert page.evaluate('id=>__lr.room.get(id)',early) is None;assert page.evaluate('__lr.focusGarden.state.totalBlooms')==1;assert page.evaluate('__lr.companion.brain.state.message')=='Good stretch. The seed will wait.';assert 'Tucked back into your pocket for later' in page.locator('#toasts').inner_text()
 for i in range(3):
  page.get_by_role('button',name='15 min',exact=True).click();garden.get_by_role('button',name='Start' if i==0 else 'Plant another seed',exact=True).click();advance(900000)
 assert page.evaluate('__lr.focusGarden.state.totalBlooms')==4;assert page.evaluate('__lr.focusGarden.state.blossomsGrown')==1;assert page.evaluate('__lr.room.items.filter(i=>i.t==="focuscherry").length')==1
 assert page.evaluate('(()=>{const it=__lr.room.items.find(i=>i.t==="focuscherry");return __lr.care.kindOf(it)==="plant"&&__lr.view.careVis.get(it.id).s!==undefined})()')
 for width in [390,1280]:
  page.set_viewport_size({'width':width,'height':844});assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/focus-garden-{width}.png')
 page.keyboard.press('Escape');page.evaluate('__lr.view.frame(1,__lr.view.t+1);__lr.view.draw()');page.screenshot(path='/tmp/focus-garden-room.png');raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'focusgarden' in raw;assert 'totalBlooms' not in raw;assert 'sessions' not in raw;assert 'minutes' not in raw
 assert not errors,errors;print('PASS Focus Garden quarters, staged voxel plant, reload/deadline, Today shortcut, one completion/chime/calendar event, label, warm pocketing, fourth-session cherry, mobile/desktop and privacy',flush=True)
 browser.close()
server.shutdown()
