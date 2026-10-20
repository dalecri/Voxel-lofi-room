"""npm run build && python3 tests/press-browser.py — seeded house press: every story type, claps, shrink, 390px and desktop."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
# Sunday 2026-10-25: the Daily News for today and the Sunday Drift for the week of 10-19 to 10-25.
def act(*rows):
 out={}
 for date,kind,n in rows:out.setdefault(date,[]).extend([kind]*n)
 return [{'date':d,'events':e} for d,e in sorted(out.items())]
activity=act(*[(f'2026-10-{d}','tea',1) for d in range(21,26)],*[(f'2026-10-{d}','tea',1) for d in (13,15)],('2026-10-25','letter',1),('2026-10-25','focus',3),('2026-10-20','focus',2),('2026-10-14','focus',1),('2026-10-16','plant',1),('2026-10-17','plant',1),('2026-10-18','plant',1),('2026-10-01','french',1),('2026-10-22','cat',2))
SEED={'lr.intro':True,'lr.rooms':[{'id':101,'name':'Press room','n':0},{'id':102,'name':'PRIVATE_ATTIC','n':12}],'lr.room.101':{'v':1,'name':'Press room','n':10,'wall':{'style':'paint','color':0},'floor':{'style':'oak','color':0},'items':[]},
 'lr.menuTab':'Journal','lr.meta':{'current':101,'sound':False,'music':False,'realtime':False,'phase':'day','visitors':False,'mischief':False,'calmPerformance':True},
 'lr.activityLog':activity,'lr.tools':{'tally':{'date':'2026-10-25','count':62}},'lr.press':{'reps':{'2026-10-20':50}},
 'lr.calendarEvents':{'v':1,'next':3,'items':[{'id':'local-1','title':'French class','date':'2026-10-25'},{'id':'local-2','title':'Vet visit','date':'2026-10-29'}]},
 'lr.catJournal':[{'time':0,'cat':1,'name':'Diego','kind':'mischief','coat':0,'text':'Knocked over the mug. No regrets.'},{'time':0,'cat':2,'name':'Neo','kind':'eat','coat':1,'text':'Inspected dinner. Ate the evidence.'}],
 'lr.scenes':{'files':[{'id':'old-scene','title':'A year-old corner','createdAt':0,'decor':{'v':1,'name':'Old','n':10,'wall':{'style':'paint','color':0},'floor':{'style':'oak','color':0},'items':[]}}]}}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for width in [390,1280]:
  c=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  c.add_init_script("""const RealDate=Date;window.__clock=new RealDate(2026,9,25,9).getTime();window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[__clock]))}static now(){return __clock}};
   if(!localStorage.getItem('pressFixture')){const seed=%s;seed['lr.catJournal'].forEach((e,i)=>e.time=new RealDate(2026,9,24,20,i).getTime());seed['lr.scenes'].files[0].createdAt=new RealDate(2025,9,25,12).getTime();
   for(const [k,v] of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));localStorage.setItem('pressFixture','true');}""" % json.dumps(SEED))
  external=[];c.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else (external.append(r.request.url),r.abort())[-1])
  c.route('**/twostorycaptions.json',lambda r:r.fulfill(json={'exportedFrom':'TwoStoryCaptions','exportedAt':'','clips':[]}))
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.press');page.evaluate('__lr.renderLoop.stop()')
  # Live forecast data as the weather service would have stored it (no fetch in this test); reprint today's brief with it.
  page.evaluate("__lr.meta.liveWeather=true;__lr.meta.weatherDetails={forecast:[{date:'2026-10-25',high:9.2,low:3.4,condition:'rain'}]};localStorage.removeItem('lr.digest');__lr.digest.ensure()")
  assert page.evaluate('__lr.digest.issues.length')==1
  # Sunday morning: one Daily Brief at the door with the daily front and the weekly pages.
  page.evaluate('__lr.digestUI.open()');paper=page.locator('.drift-paper');paper.wait_for()
  assert not paper.evaluate("e=>e.classList.contains('is-slim')");assert page.locator('.drift-masthead').inner_text()=='Daily Brief'
  types=paper.locator('[data-type]').evaluate_all('es=>es.map(e=>e.dataset.type)')
  for t in ['streak','first','record','drought','diary','forecast','saga','week','roundup','gossip','behind','memory','ahead']:assert t in types,(t,types)
  lead=paper.locator('.brief-lead');assert lead.count()==1;assert lead.get_attribute('data-type')!='diary';assert lead.locator('.press-clap').count()==1
  text=paper.inner_text()
  for s in ['Tea, 5 days running','First letter on record','No watering in 7 days','Today in the house','French class on the calendar, rain on the way.','Rain on the way, 3° to 9°','Knocked over the mug','Inspected dinner','Sunday edition',
            'The pet columns','Week 1 of Sunbeam Reviews','Week 1 of The Dinner-Time Campaign','Week 1 of The Gravity Hearings','Week 1 of The Late-Night Fridge Inquiry','Tea up: 5 this week, 2 the week before','Records roundup','PRIVATE_ATTIC','busiest day']:assert s.lower() in text.lower(),(s,text)
  assert 'Daily News' not in page.content();assert page.locator('.journal-paper').count()==0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
  assert paper.locator('.press-clap').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height>=44&&e.getBoundingClientRect().width>=44)')
  assert paper.locator('.drift-column').count()==4
  paper.screenshot(path=f'/tmp/press-brief-{width}.png')
  # Clap for the drought desk; it persists across reload and boosts the type.
  paper.locator('.drift-section[data-type=drought] .press-clap').click();assert paper.locator('.drift-section[data-type=drought] .press-clap').get_attribute('aria-pressed')=='true'
  assert page.evaluate("JSON.parse(localStorage.getItem('lr.press')).claps.drought")==1
  paper.locator('.drift-section[data-type=roundup] .press-clap').click();assert page.evaluate("JSON.parse(localStorage.getItem('lr.press')).claps.roundup")==1
  page.keyboard.press('Escape')
  # A section ignored four editions running shrinks quietly.
  page.evaluate("const s=JSON.parse(localStorage.getItem('lr.press'));s.ignored.streak=4;localStorage.setItem('lr.press',JSON.stringify(s))")
  page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.press');page.evaluate('__lr.renderLoop.stop()');page.evaluate('__lr.digestUI.open()')
  assert page.locator('.drift-paper [data-type=streak].is-shrunk').count()==1
  assert page.locator('.drift-section[data-type=drought] .press-clap').get_attribute('aria-pressed')=='true'
  # Nothing from the press reaches a shared room code.
  raw=page.evaluate('async()=>JSON.stringify(await __lr.readCode(await __lr.roomCode()))')
  assert all(s not in raw for s in ['PRIVATE_','Dinner','press','claps'])
  page.keyboard.press('Escape');assert not external,external;assert not errors,errors;c.close()
 browser.close()
server.shutdown();print('PASS Daily Brief: Sunday edition with streak/first/record/drought/diary front, today box, four seeded sagas, week/roundup/gossip/behind/memory/ahead pages, claps persist, ignored section shrinks, private codes, 390px and desktop',flush=True)
