"""npm run build && python3 tests/tally-browser.py. Private mechanical reps and local-midnight rollover."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']);c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
 c.add_init_script("""const RealDate=Date;window.__clock=new RealDate(2026,9,17,23,58).getTime();window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[__clock]))}static now(){return __clock}};localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({sound:false,music:false,realtime:false,phase:'day',visitors:false,mischief:false,calmPerformance:true}));""")
 external=[];c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (external.append(r.request.url),r.abort())[-1]);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 def ready():page.wait_for_function('!!window.__lr?.roomToolsUI');page.evaluate('__lr.renderLoop.stop()')
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready();page.evaluate("""()=>{const a=__lr;a.room.items=[];a.room.name='Clicker room';for(let c=0;c<3;c++)a.room.add(a.room.make('tallycounter',{x:2+c*2,z:3,c}));a.changed();window.counterId=a.room.items[0].id;a.interact(counterId);window.effects={clicks:[],cheers:0,hops:0};a.Sound.init=()=>{};a.Sound.on=true;a.Sound.click=on=>effects.clicks.push(on);a.Sound.chime=()=>effects.cheers++;a.companion.hop=()=>effects.hops++;}""")
 tool=page.locator('.pushup-tally');count=tool.locator('.tally-count');add=tool.get_by_role('button',name='Add one pushup',exact=True);undo=tool.get_by_role('button',name='Undo one pushup',exact=True)
 assert count.inner_text()=='0';assert undo.is_disabled();add.focus();page.keyboard.press('Enter');assert count.inner_text()=='1';assert page.evaluate('effects.clicks')==[True]
 for i in range(36):add.click()
 assert tool.locator('.tally-progress').inner_text()=='37 / 50';undo.click();assert count.inner_text()=='36';assert page.evaluate('effects.clicks.length')==37
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');ready();page.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='tallycounter').id)");assert count.inner_text()=='36'
 page.evaluate("()=>{window.effects={clicks:[],cheers:0,hops:0};__lr.Sound.init=()=>{};__lr.Sound.on=true;__lr.Sound.click=on=>effects.clicks.push(on);__lr.Sound.chime=()=>effects.cheers++;__lr.companion.hop=()=>effects.hops++;}")
 for i in range(14):add.click()
 assert count.inner_text()=='50';assert page.evaluate('effects')=={'clicks':[True]*14,'cheers':1,'hops':1},page.evaluate('effects');assert page.evaluate("__lr.calendarModel.activity().find(r=>r.date==='2026-10-17').events.filter(k=>k==='pushups').length")==1
 undo.click();add.click();add.click();assert count.inner_text()=='51';assert page.evaluate('effects.cheers')==1;assert page.evaluate('effects.hops')==1
 for phase in ['day','night']:
  page.evaluate('p=>__lr.setPhase(p,true)',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/pushup-tally-{phase}-{width}.png')
 raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))');assert 'tallycounter' in raw;assert all(s not in raw for s in ['"tally":','"count":','"completed":']);assert page.evaluate("localStorage.getItem('lr.tally')") is None
 page.evaluate('__clock=new Date(2026,9,18,0,0,1).getTime();__lr.roomToolsUI.tick(false)');assert count.inner_text()=='0';assert undo.is_disabled();assert tool.locator('.tally-progress').inner_text()=='0 / 50';assert page.evaluate("JSON.parse(localStorage.getItem('lr.tools')).tally.date")=='2026-10-18'
 page.keyboard.press('Escape');page.click('#bHome');tile=page.locator('#homeView [data-app=tally]');assert tile.is_visible();assert tile.locator('img').count()==1;tile.click();assert count.inner_text()=='0'
 assert not errors,errors;assert not external,external;print('PASS clicker variants, native keyboard/count/undo, once-only cheer and calendar day, reload/midnight, Control Centre, private shares, day/night mobile and desktop',flush=True);b.close()
server.shutdown()
