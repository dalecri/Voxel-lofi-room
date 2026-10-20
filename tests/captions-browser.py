"""Build www first. All caption text here is synthetic; never fetch the owner's gist."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
fixture={'exportedFrom':'TwoStoryCaptions','exportedAt':'2026-10-18T12:00:00Z','clips':[
 {'id':str(i),'desc':f'Synthetic idea {i}\nUnchanged words <b>not markup</b>','status':'published' if i==0 else 'idea','created':f'2026-10-18T12:{i//60:02}:{i%60:02}Z','selectedTones':['Relatable'],'platform':'Both','captions':['First option','Second option'] if i%2 else None}
 for i in range(200)],'brands':[],'tasks':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for width in [320,390,1280]:
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',timezone_id='America/Toronto')
  context.add_init_script('''const RealDate=Date;window.captionShift=0;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[RealDate.now()+window.captionShift]));}static now(){return RealDate.now()+window.captionShift;}};if(!localStorage.getItem('captionFixture')){localStorage.setItem('captionFixture','true');const r={v:1,name:'Newsroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.menuTab':'Today','lr.meta':{current:101,phase:'night',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});''')
  context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
  request={'count':0,'bad':False}
  def caption_route(route):
   request['count']+=1
   if request['bad']:route.fulfill(status=200,body='{broken',content_type='application/json')
   else:route.fulfill(json=fixture)
  context.route('**/twostorycaptions.json',caption_route)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()');page.click('#bMenu')
  # Today has a compact desk that only shows the saved export (no fetch on open); the full studio remains a separate tool.
  page.get_by_role('tab',name='To-Do',exact=True).click();assert page.locator('#sheetBody .caption-studio, #sheetBody .journal-paper').count()==0;page.wait_for_timeout(600);assert request['count']==0;assert 'Tap ↻' in page.locator('.today-caption-empty').first.text_content();page.keyboard.press('Escape')
  # Control Center opens the caption studio, which fetches once.
  page.click('#bHome');page.locator('#homeView [data-app=captions]').click();page.wait_for_function('document.querySelectorAll(".caption-clip").length===3')
  desk=page.locator('.caption-studio');assert request['count']==1;assert desk.locator('h4').inner_text()=='Caption studio';assert desk.locator('.studio-house svg rect').count()>40
  start=page.evaluate('Math.floor(Date.UTC(new Date().getFullYear(),new Date().getMonth(),new Date().getDate())/86400000)*3%199');pool=list(reversed(fixture['clips'][1:]));selected=[pool[(start+i)%199] for i in range(3)]
  assert desk.locator('.caption-desc').all_text_contents()==[c['desc'] for c in selected];assert desk.locator('.caption-desc b').count()==0
  assert desk.locator('.caption-options li').count()==2*sum(bool(c['captions']) for c in selected);tag=desk.locator('.caption-tag').first.inner_text();assert tag=='Relatable',tag;assert desk.locator('.caption-platform').first.inner_text()=='Both'
  has_caption=next(i for i,c in enumerate(selected) if c['captions']);no_caption=next(i for i,c in enumerate(selected) if not c['captions'])
  desk.locator('.caption-copy').nth(has_caption).click();assert page.evaluate('window.copied')=='First option';assert desk.locator('.caption-copy').nth(has_caption).inner_text()=='Copied'
  desk.locator('.caption-copy').nth(no_caption).click();assert page.evaluate('window.copied')==selected[no_caption]['desc']
  page.evaluate("navigator.clipboard.writeText=async()=>{throw Error('old WebView')};document.execCommand=()=>{window.fallback=document.activeElement.value;return true;}")
  desk.locator('.caption-copy').nth(no_caption).click();assert page.evaluate('window.fallback')==selected[no_caption]['desc']
  request['bad']=True;desk.locator('.caption-refresh').click();page.wait_for_function('document.querySelector(".caption-desk-status").textContent.startsWith("Cached")');assert desk.locator('.caption-clip').count()==3
  desk.locator('.caption-desc').first.scroll_into_view_if_needed();page.screenshot(path=f'/tmp/caption-desk-{width}.png');assert desk.evaluate('e=>e.scrollWidth<=e.clientWidth')
  page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.captionStudio()');page.locator('.caption-clip').first.wait_for();assert page.locator('.caption-desk-status').inner_text().startswith('Cached');assert desk.locator('.caption-desc').all_text_contents()==[c['desc'] for c in selected]
  page.evaluate('window.captionShift=86400000');desk.locator('.caption-refresh').click();page.wait_for_function('!document.querySelector(".caption-refresh").disabled');assert desk.locator('.caption-desc').all_text_contents()==[pool[(start+3+i)%199]['desc'] for i in range(3)]
  page.evaluate("localStorage.removeItem('lr.captionDesk')");request['bad']=False;before=request['count'];page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');page.wait_for_load_state('networkidle');assert request['count']==before;assert page.locator('.caption-studio').count()==0
  # The clapperboard furniture opens the same studio.
  page.keyboard.press('Escape');page.evaluate('''() => {const a=__lr;a.setMode('explore',true);const it=a.room.make('captionboard',{x:2,z:2});a.room.add(it);a.changed();a.interact(it.id);}''');page.wait_for_function('document.querySelectorAll(".caption-clip").length===3');assert request['count']==before+1
  page.locator('.caption-studio').screenshot(path=f'/tmp/caption-studio-{width}.png');assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth')
  for phase in ['day','night']:
   page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
   assert desk.evaluate('e=>getComputedStyle(e).color===getComputedStyle(document.getElementById("sheetBody")).color');assert desk.locator('h4').evaluate('e=>getComputedStyle(e).fontFamily.includes("Fredoka")');assert desk.locator('.caption-desc').first.evaluate('e=>getComputedStyle(e).fontFamily.includes("Nunito")');assert desk.locator('.caption-clip').first.evaluate('e=>getComputedStyle(e).borderRadius')=='24px';assert desk.get_by_role('button',name='Refresh captions',exact=True).bounding_box()['width']>=44
   assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');assert page.locator('#sheetBody').bounding_box()['width']<=560;page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');page.screenshot(path=f'/tmp/caption-dashboard-{phase}-{width}.png')

  page.keyboard.press('Escape');assert not errors,errors;context.close()
 browser.close()
server.shutdown()
print('PASS: compact Today desk and full studio from Control Center and the clapperboard; 3 deterministic daily clips; verbatim safe text; options/copy/fallback; cache/reload/malformed JSON; mobile/desktop, no console errors')
