"""npm run build && python3 tests/house-browser.py. Quiet saved rooms, recoverable drafts, bedroom startup and radio cards."""
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
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 def ready():page.wait_for_function('!!window.__lr?.dashboard')
 def menu(tab):
  page.click('#bMenu');assert not errors,errors;page.get_by_role('tab',name=tab,exact=True).click()
 def esc():page.keyboard.press('Escape')
 def template():
  menu('Rooms');page.locator('#menu-rooms .preset-group').first.locator('summary').click();page.locator('.card').filter(has_text='Lofi Study').click()
 context.add_init_script("HTMLMediaElement.prototype.play=function(){return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){}")
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');ready()
 assert page.evaluate('__lr.meta.current')==101;assert page.evaluate('JSON.parse(localStorage.getItem("lr.room.102")).name')=='Living draft restored'
 menu('Rooms');assert page.locator('#menu-rooms .preset-group').count()==2;assert page.locator('#menu-rooms .preset-group[open]').count()==0
 assert not page.locator('.card').filter(has_text='Lofi Study').is_visible()
 for group in page.locator('#menu-rooms .preset-group').all():group.locator('summary').click();assert group.locator('.card').first.is_visible();group.locator('summary').click()
 page.get_by_role('combobox',name='Main bedroom',exact=True).select_option('102');assert page.evaluate('JSON.parse(localStorage.getItem("lr.mainBedroom"))')==102;esc();page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.meta.current')==102
 menu('Rooms');page.get_by_role('combobox',name='Main bedroom',exact=True).select_option('101');esc()
 page.evaluate('__lr.room.name="AUTO_SAVED_LIVING";__lr.changed()');page.wait_for_function('JSON.parse(localStorage.getItem("lr.room.102")).name==="AUTO_SAVED_LIVING"')
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.rooms")).find(r=>r.id===102).name')=='AUTO_SAVED_LIVING'
 page.evaluate('__lr.room.name="LAST_SECOND_LIVING";__lr.changed()');menu('Rooms');page.locator('.village-room').filter(has_text='Bedroom').locator('.village-visit').click();assert page.evaluate('__lr.meta.current')==101;assert page.locator('#lvSave').count()==0
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.room.102")).name')=='LAST_SECOND_LIVING'
 # Saved-room startup always opens the selected bedroom, not the last visited room.
 menu('Rooms');page.locator('.village-room').filter(has_text='LAST_SECOND_LIVING').locator('.village-visit').click();assert page.evaluate('__lr.meta.current')==102
 page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.meta.current')==101
 # Radio cards work for old stations without an icon and newly added stations.
 menu('Sound');assert page.locator('.station-card').count()==1;page.get_by_role('button',name='Next station from Lofi radio',exact=True).click()
 page.get_by_role('button',name='Edit icon for Old station',exact=True).click();page.get_by_role('button',name='Use 🌙 for Old station',exact=True).click();assert page.locator('.station-card').filter(has_text='Old station').locator('.station-dial').inner_text()=='🌙'
 page.locator('#stName').fill('Night garden');page.locator('#stUrl').fill('https://example.com/night.mp3');page.get_by_role('combobox',name='New station icon',exact=True).select_option('🌿');page.click('#stAdd');assert page.locator('.station-card').count()==1;page.get_by_role('button',name='Previous station from Old station',exact=True).click()
 page.get_by_role('button',name='Stop Lofi radio',exact=True).click();page.get_by_role('button',name='Play Lofi radio',exact=True).click();assert page.evaluate('__lr.meta.music && __lr.meta.station===0');assert page.locator('.station-card.playing').count()==1;page.get_by_role('button',name='Stop Lofi radio',exact=True).click();assert not page.evaluate('__lr.meta.music')
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase);assert page.locator('body').evaluate("(e,p)=>e.classList.contains('night')===(p==='night')",phase)
  for width in [390,1280]:
   page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/radio-cards-{phase}-{width}.png')
 esc();page.reload(wait_until='networkidle');ready();menu('Sound');page.get_by_role('button',name='Next station from Lofi radio',exact=True).click();assert page.locator('.station-dial').inner_text()=='🌙';page.get_by_role('button',name='Next station from Old station',exact=True).click();assert page.locator('.station-dial').inner_text()=='🌿';page.locator('.station-card').filter(has_text='Night garden').get_by_role('button',name='Remove',exact=True).click();assert page.locator('.station-card').count()==1;esc()
 # Unsaved work stays unsaved, still asks, and survives opening the main bedroom.
 template();page.evaluate('__lr.room.name="UNSAVED_EXPERIMENT";__lr.changed()');draft_id=page.evaluate('__lr.meta.current');template();assert page.locator('#lvSave').is_visible();page.click('#lvStay');assert page.evaluate('__lr.meta.current')==draft_id
 page.evaluate("window.dispatchEvent(new Event('pagehide'))");page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.meta.current')==101
 menu('Rooms');page.get_by_role('button',name='Resume unsaved room: UNSAVED_EXPERIMENT',exact=True).click();assert page.evaluate('__lr.meta.current')==draft_id;assert page.evaluate('__lr.room.name')=='UNSAVED_EXPERIMENT';assert not page.evaluate('localStorage.getItem("lr.pendingDraft")')
 assert not page.evaluate('id=>__lr.rooms.some(r=>r.id===id)',draft_id)
 template();assert page.locator('#lvSave').is_visible();page.click('#lvSave');assert page.evaluate('id=>__lr.rooms.some(r=>r.id===id)',draft_id)
 # Bedroom setting is device-only and resetting it restores last-room startup.
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',code)
 for key in ['mainBedroom','pendingDraft','stations']:assert key not in json.dumps(decoded)
 menu('Rooms');page.get_by_role('combobox',name='Main bedroom',exact=True).select_option('');esc();current=page.evaluate('__lr.meta.current');page.reload(wait_until='networkidle');ready();assert page.evaluate('__lr.meta.current')==current
 # Old versions kept edits only in lr.draft. Adopt that working copy on boot,
 # even before the owner touches anything in this version.
 context.close();legacy=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 legacy.add_init_script("if(!sessionStorage.legacy){sessionStorage.legacy='true';const saved={v:1,name:'Old saved room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:501,name:saved.name,n:0}],'lr.room.501':saved,'lr.meta':{current:501,realtime:false,visitors:false,dreamy:false,phase:'day'},'lr.draft':{id:501,base:'previous-version-baseline',data:{...saved,name:'Restored working copy'}}}))localStorage.setItem(k,JSON.stringify(v));}")
 legacy.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());old=legacy.new_page();old.on('pageerror',lambda e:errors.append(str(e)));old.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');old.wait_for_function('!!window.__lr');old.wait_for_function('JSON.parse(localStorage.getItem("lr.room.501")).name==="Restored working copy"');assert old.evaluate('JSON.parse(localStorage.getItem("lr.rooms"))[0].name')=='Restored working copy'
 assert not errors,errors
 print('PASS: collapsed template groups, radio icon/card play/remove/persistence, timed and travel autosave, chosen bedroom on reload, unsaved confirmations and draft recovery, private preferences, mobile/day/night',flush=True)
 browser.close()
server.shutdown()
