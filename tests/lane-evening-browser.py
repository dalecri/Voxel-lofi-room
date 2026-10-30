"""npm run build && python3 tests/lane-evening-browser.py. The day's gentle close on the Lane: by day the windows are
glass and the lamps are off; in the evening you're invited (once) to wind down. Lights come on, the neighbours head home
(Puddle stays under the awning in the rain), your character sits down with tea on the mended bench, and a short recap
lists only what happened. Goodnight turns the lane to night. Nothing counts streaks; a quiet day is fine."""
import functools,datetime,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
TOWN={'beds':[None,None,None],'bench':{'stage':3,'color':'sage','last':'2026-11-01'},'court':{'picks':[0,0],'last':'2026-11-02'}}
FIXTURE='''if(!localStorage.eFixture){localStorage.eFixture='1';const home={v:1,n:10,name:'Home',wall:{style:'paint',color:0},floor:{style:'oak'},next:2,items:[{id:1,t:'desk',x:6,z:6,c:0,r:0}]};
 for(const [k,v] of Object.entries({'lr.intro':true,'lr.lane':{town:%s},'lr.rooms':[{id:601,name:home.name,n:1}],'lr.room.601':home,'lr.meta':{current:601,phase:'day',weather:'clear',raining:false,realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}'''%json.dumps(TOWN)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');context.add_init_script(FIXTURE)
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.clock.set_fixed_time(datetime.datetime(2026,11,10,13,0))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion')
 lit=lambda:page.evaluate('__lr.room.items.filter(i=>["streetlamp","lanehome","laneshop","lanepost"].includes(i.t)).map(i=>!!i.on)')
 who=lambda:sorted(page.evaluate('Object.values(__lr.laneVisit.actions).filter(a=>a.startsWith("talk:"))'))
 def close():page.keyboard.press('Escape');page.wait_for_function("!document.querySelector('#sheet').classList.contains('open')")

 # By day: glass windows, lamps off, and no wind-down button in the Lane menu.
 page.click('#bLane');assert page.locator('.lane-wind').count()==0;close()
 page.evaluate('__lr.visitLaneRoom("street")');page.wait_for_function('__lr.laneVisit?.place==="street"');assert not any(lit()),lit()
 # A chat with Juniper (on the mended bench by day) so the recap has something to say.
 page.evaluate('__lr.interact(+Object.keys(__lr.laneVisit.actions).find(k=>__lr.laneVisit.actions[k]==="talk:juniper"))');page.locator('#sheetBody .lane-talk-replies button').first.click();close()

 # Evening arrives while you're on the street: the lights are on, and there's one gentle invitation.
 page.evaluate("__lr.setPhase('evening',true)");page.wait_for_function('__lr.room.items.filter(i=>i.t==="streetlamp").every(i=>i.on)')
 assert all(lit()) and who()==['talk:juniper'],(lit(),who())   # with chairs in the courtyard, Juniper reads out there
 page.get_by_text('The lamps are coming on').wait_for()
 # Wind down from the street's bar.
 page.get_by_role('button',name='☕ Wind down',exact=True).click();card=page.locator('#laneClose');card.wait_for()
 assert who()==[],'Juniper heads home'
 st=page.evaluate('({rest:__lr.companion.resting,tea:__lr.companion.brain.state.holdTea,x:__lr.companion.brain.state.x,z:__lr.companion.brain.state.z,pose:__lr.companion.brain.state.pose})')
 assert st['rest'] and st['tea'] and st['pose']=='lounge' and abs(st['x']-6.5)<.3 and abs(st['z']-7.5)<.3,('tea on the mended bench',st)
 text=card.inner_text();assert 'The day, gently' in text and 'You talked with Juniper' in text,text
 for word in ['streak','missed','didn']:assert word not in text.lower(),word
 assert page.evaluate('__lr.laneModel.closedToday')
 # Goodnight: the lane turns to night, and the neighbours stay home.
 card.get_by_role('button',name='Goodnight').click();page.wait_for_function('__lr.meta.phase==="night"');assert card.count()==0
 page.wait_for_function('__lr.room.items.filter(i=>i.t==="streetlamp").every(i=>i.on)');assert who()==[],who()
 # The Lane menu offers another cup, not a second "wind down".
 page.click('#bLane');assert 'Another cup of tea' in page.locator('.lane-wind').inner_text();close()
 # Leaving the street ends the tea break.
 page.evaluate('__lr.returnFromLane()');assert not page.evaluate('__lr.companion.resting')

 # The next evening, rainy, after a quiet day: no catching up, no penalty. Just a kind note. Puddle stays under the awning.
 page.clock.set_fixed_time(datetime.datetime(2026,11,11,19,0));page.evaluate("__lr.meta.weather='rain';__lr.setPhase('evening',true)")
 assert not page.evaluate('__lr.laneModel.closedToday')
 page.click('#bLane');page.locator('.lane-wind').click();card.wait_for()
 assert 'A quiet day. Those count too.' in card.inner_text(),card.inner_text()
 st=page.evaluate('[__lr.companion.brain.state.x,__lr.companion.brain.state.z]');assert abs(st[0]-6.5)<.3,st
 assert who()==['talk:puddle'],('Puddle stays dry under the awning',who())
 card.get_by_role('button',name='Stay a while').click();assert card.count()==0 and page.evaluate('__lr.companion.resting')
 # Taking control again stands you up.
 page.click('#bCharacter');page.wait_for_function('!!__lr.view.fp');assert not page.evaluate('__lr.companion.resting')
 saved=page.evaluate('JSON.parse(localStorage.getItem("lr.lane"))');assert saved.get('closed')=='2026-11-11' and 'streak' not in json.dumps(saved).lower()
 assert not errors,errors
 print('PASS lane evening: daytime glass and lamps off, one evening invitation, lights on, neighbours head home, Puddle stays in the rain, tea on the mended bench, a recap of only what happened, goodnight to night, another cup later, a quiet day is fine, taking control stands you up')
 browser.close();server.shutdown()
