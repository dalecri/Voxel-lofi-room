"""Build www first. Native menu/search/sky composition and persistence."""
import functools
from io import BytesIO
from PIL import Image, ImageChops
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
 context=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.getItem('layoutFixture')){localStorage.setItem('layoutFixture','true');const r={v:1,name:'Layout room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.menuTab':'Today','lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate('__lr.renderLoop.stop()');page.click('#bMenu')
 body=page.locator('#sheetBody');tabs=page.get_by_role('tablist',name='Menu sections');icon=page.get_by_role('button',name='Search your space',exact=True);search=page.locator('.space-search .home-search')
 assert body.evaluate('e=>e.firstElementChild.classList.contains("menu-nav")')
 assert tabs.locator('button').all_text_contents()==['']*5;assert tabs.locator('button').evaluate_all('es=>es.map(b=>b.getAttribute("aria-label"))')==['Today','Rooms','To-Do','Sound','Settings'];assert tabs.evaluate('e=>[...e.children].every(b=>b.title===b.getAttribute("aria-label")&&b.querySelector("svg[aria-hidden=true]"))')
 assert tabs.evaluate('e=>[...e.children].every(b=>b.getAttribute("role")==="tab" && document.getElementById(b.getAttribute("aria-controls")).getAttribute("role")==="tabpanel")')
 close=page.get_by_role('button',name='Close',exact=True);actions=page.get_by_role('group',name='Sheet actions',exact=True)
 assert actions.locator('button').count()==2;assert actions.locator('button').first.get_attribute('aria-label')=='Search your space';assert actions.locator('button').last.get_attribute('aria-label')=='Close';assert close.inner_text()=='';assert close.locator('svg').count()==1
 assert icon.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)';assert close.evaluate('e=>getComputedStyle(e).backgroundColor')!='rgba(0, 0, 0, 0)';assert page.locator('.menu-nav').evaluate('e=>getComputedStyle(e).backgroundColor!==getComputedStyle(e.closest("#sheetBody")).backgroundColor')
 assert icon.bounding_box()['width']==close.bounding_box()['width']==44;assert icon.bounding_box()['y']==close.bounding_box()['y'];assert icon.bounding_box()['x']<close.bounding_box()['x'];assert actions.bounding_box()['x']+actions.bounding_box()['width']>body.bounding_box()['x']+body.bounding_box()['width']-35
 assert page.locator('#sheetBody > .today-greeting').count()==0;assert page.locator('.today-sky .today-welcome h2').is_visible();assert page.locator('.today-date, .today-date-row').count()==0;assert page.locator('.today-welcome .today-condition').is_visible()
 assert tabs.evaluate('e=>e.parentElement.classList.contains("menu-nav")');assert actions.evaluate('e=>e.parentElement.classList.contains("menu-nav")');assert abs(tabs.bounding_box()['y']-actions.bounding_box()['y'])<=5
 assert body.locator(':scope > h2').count()==0;assert 'A little space for your day.' not in body.inner_text()
 assert icon.get_attribute('aria-expanded')=='false';assert search.is_hidden();assert page.locator('.home-results').is_hidden();assert page.locator('.space-search').is_hidden()
 icon.click();assert icon.get_attribute('aria-expanded')=='true';assert search.evaluate('e=>document.activeElement===e');assert page.locator('.home-results').get_attribute('aria-live')=='polite'
 search.fill('kettle');assert page.locator('.home-result-group').count()>0;icon.click();assert icon.get_attribute('aria-expanded')=='true';assert search.input_value()=='kettle';assert search.evaluate('e=>document.activeElement===e')
 page.keyboard.press('Escape');assert icon.get_attribute('aria-expanded')=='false';assert search.is_hidden();assert search.input_value()=='';assert page.locator('.home-results').inner_text()=='';assert icon.evaluate('e=>document.activeElement===e');assert page.locator('#sheet').evaluate('e=>e.classList.contains("open")')
 icon.click();icon.click();assert icon.get_attribute('aria-expanded')=='false'
 page.get_by_role('tab',name='Today',exact=True).focus();page.keyboard.press('End');assert page.get_by_role('tab',name='Settings',exact=True).get_attribute('aria-selected')=='true';page.keyboard.press('Home');assert page.get_by_role('tab',name='Today',exact=True).get_attribute('aria-selected')=='true';page.keyboard.press('ArrowRight');assert page.get_by_role('tab',name='Rooms',exact=True).get_attribute('aria-selected')=='true';assert page.evaluate('JSON.parse(localStorage.getItem("lr.menuTab"))')=='Rooms'
 page.keyboard.press('Escape');page.click('#bMenu');assert page.get_by_role('tab',name='Rooms',exact=True).get_attribute('aria-selected')=='true'
 page.get_by_role('tab',name='Settings',exact=True).click();page.get_by_role('switch',name='Cat mischief (cats sometimes knock things over)',exact=True).click();assert page.get_by_role('tab',name='Settings',exact=True).get_attribute('aria-selected')=='true';assert body.evaluate('e=>e.firstElementChild.classList.contains("menu-nav")')
 page.get_by_role('tab',name='To-Do',exact=True).first.click();assert page.locator('#menu-todo .today-tasks').is_visible() and page.locator('#menu-today .today-tasks').count()==0;page.get_by_role('tab',name='Google',exact=True).click();tasks=page.locator('#menu-todo .google-tasks');assert tasks.evaluate('e=>e.parentElement.classList.contains("task-google-page")&&!!e.closest(".task-notebook")');assert page.locator('.today-sky .today-google-focus .google-tasks').count()==1;assert page.locator('.space-today > .google-tasks').count()==0
 assert tasks.evaluate('e=>{const s=getComputedStyle(e);return s.borderTopWidth==="0px"&&s.backgroundColor==="rgba(0, 0, 0, 0)"}')
 assert tasks.get_by_role('button',name='Connect Google',exact=True).is_enabled();assert not page.locator('.today-tasks .today-task-form').is_visible();page.get_by_role('tab',name='My list',exact=True).click();assert not tasks.is_visible();assert page.locator('.today-tasks .today-task-form').is_visible();assert page.locator('.today-tasks').evaluate('e=>e.parentElement.id==="menu-todo"');assert page.locator('#menu-today .today-rituals').count()==1;assert page.locator('.today-quick [data-ritual]').evaluate_all('es=>es.map(e=>e.dataset.ritual).join(",")')=='tea,garden,letter,ideas'
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true);__lr.todayUI.refresh()}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':1000});expected_height=None;expected_top=None
   for name in ['Today','Rooms','To-Do','Sound','Settings']:
    page.get_by_role('tab',name=name,exact=True).click()
    if name=='To-Do':
     page.locator('#menu-todo .task-starters').evaluate('e=>e.open=false');assert body.evaluate('e=>getComputedStyle(e.querySelector(".task-notebook")).backgroundColor===getComputedStyle(e).backgroundColor');page.screenshot(path=f'/tmp/todo-themed-{phase}-{width}.png')
    rect=body.bounding_box();nav_top=page.locator('.menu-nav').bounding_box()['y']
    if expected_height is None:expected_height=rect['height'];expected_top=nav_top
    assert abs(rect['height']-expected_height)<1,(name,rect['height'],expected_height);assert abs(nav_top-expected_top)<1,(name,nav_top,expected_top)
   # The entire sticky header (including gutters) must stay unchanged as
   # contrasting content scrolls beneath it, rather than leaking past the glass.
   page.locator('#menu-settings').evaluate('e=>{const probe=document.createElement("div");probe.id="nav-scroll-probe";probe.style.cssText="height:1600px;background:repeating-linear-gradient(red 0 80px,cyan 80px 160px);color:black;font-size:32px";probe.textContent="Scrolling content must stay below navigation";e.prepend(probe)}')
   header_images=[]
   for scroll in [100,260]:
    body.evaluate('(e,y)=>e.scrollTop=y',scroll)
    assert body.evaluate('e=>e.scrollTop')==scroll
    r=body.bounding_box();n=page.locator('.menu-nav').bounding_box()
    header_images.append(Image.open(BytesIO(page.screenshot(clip={'x':r['x']+1,'y':r['y']+1,'width':r['width']-14,'height':n['y']+n['height']+5-r['y']}))).convert('RGB'))
   assert ImageChops.difference(*header_images).getbbox() is None,(phase,width,'content leaked into nav header')
   page.locator('#nav-scroll-probe').evaluate('e=>e.remove()')
   body.evaluate('e=>e.scrollTop=0');assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/dashboard-layout-{phase}-{width}.png');nav=page.locator('.menu-nav');assert nav.locator('.menu-actions').bounding_box()['x']>=tabs.bounding_box()['x']+tabs.bounding_box()['width']-1;assert nav.evaluate('e=>e.scrollWidth<=e.clientWidth');assert nav.evaluate('e=>getComputedStyle(e).backdropFilter.includes("blur(18px)")');assert nav.evaluate('e=>{const s=getComputedStyle(e);return s.borderTopWidth==="1px"&&s.backgroundImage.includes("linear-gradient")&&s.boxShadow.includes("inset")}');assert tabs.evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 page.get_by_role('tab',name='Today',exact=True).click();body.evaluate('e=>e.scrollTop=260');page.screenshot(path='/tmp/dashboard-nav-glass-scrolled.png');assert page.locator('.menu-nav').evaluate('e=>getComputedStyle(e).position')=='sticky'
 page.set_viewport_size({'width':320,'height':900});page.get_by_role('tab',name='Settings',exact=True).click();page.wait_for_function('(()=>{const t=document.querySelector(".menu-tabs [aria-selected=true]").getBoundingClientRect(),b=document.querySelector(".menu-tabs").getBoundingClientRect();return t.left>=b.left-1&&t.right<=b.right+1})()');page.get_by_role('tab',name='Today',exact=True).click()
 page.reload(wait_until='networkidle');page.click('#bMenu');assert page.get_by_role('tab',name='Today',exact=True).get_attribute('aria-selected')=='true';assert page.get_by_role('button',name='Search your space',exact=True).get_attribute('aria-expanded')=='false'
 assert not errors,errors;browser.close()
server.shutdown()
print('PASS: search focus/toggle/Escape/results; top tabs/keyboard/persistence/rerender; Google Tasks as a tab on the To-Do notepad; local notebook retained; mobile/desktop day/night, no errors')
