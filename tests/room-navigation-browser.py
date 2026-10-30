"""Toolbar order, tool-only radio, combined capture and room-level universal search."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')));Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.characterFixture){localStorage.characterFixture='1';const base={v:1,n:10,wall:{style:'paint',color:0},floor:{style:'oak'},next:4};const a={...base,name:'Character home',items:[{id:1,t:'roomdoor',k:0,u:3,e:0,c:0,r:0,link:102},{id:2,t:'desk',x:2,z:5,c:0,r:0},{id:3,t:'roomgate',x:7,z:7,c:0,r:0}]},b={...base,name:'Cat home',items:[{id:1,t:'roomdoor',k:0,u:3,e:0,c:0,r:0,link:101},{id:2,t:'cat',x:6,z:6,c:0,r:0}]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:a.name,n:2},{id:102,name:b.name,n:2}],'lr.room.101':a,'lr.room.102':b,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,sound:false,music:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.add_init_script('localStorage.setItem("lr.fireflies","10000");localStorage.setItem("lr.shortLinks","false")')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.companion');assert page.evaluate('__lr.room.items.some(i=>i.t==="cat")') is False


 assert page.locator('header .chips > button').evaluate_all('es=>es.map(e=>e.id)')==['bHome','bLane','bShare','bMenu','bUndo']
 assert page.locator('#bPhoto,#bMusic,#rotL,#rotR').count()==0
 page.click('#bMenu');assert page.locator('.menu-tabs [role=tab]').evaluate_all('es=>es.map(e=>e.getAttribute("aria-label"))')==['Today','Settings'];page.keyboard.press('Escape')
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':900});page.click('#bHome');home=page.locator('#homeView');home.wait_for();assert home.locator('.home-settings,.home-shortcut').count()==0
  assert home.locator('input').count()==0
  assert page.locator('#sheetBody').evaluate('e=>e.scrollWidth<=e.clientWidth');page.screenshot(path=f'/tmp/clean-control-centre-{width}.png');page.keyboard.press('Escape')
 page.click('#bSearch');search=page.locator('#universalSearch input');search.wait_for();search.fill('Lofi radio');page.screenshot(path='/tmp/universal-room-search.png');page.locator('#universalSearch').get_by_role('button',name='Lofi radio',exact=True).click();page.locator('.radio-library').wait_for();page.keyboard.press('Escape');assert page.locator('#universalSearch').is_hidden()
 page.click('#bHome');page.locator('[data-app=sound]').click();page.locator('#menu-sound .radio-library').wait_for();back=page.get_by_role('button',name='Back to Control Centre',exact=True);back.wait_for()
 page.get_by_role('button',name='Play radio',exact=True).click();assert page.evaluate('__lr.meta.music');page.get_by_role('button',name='Pause radio',exact=True).click();assert not page.evaluate('__lr.meta.music')
 page.get_by_role('button',name='Add station',exact=True).click();page.locator('#stName').fill('Fixture station');page.locator('#stUrl').fill('https://example.test/radio');page.locator('#stAdd').click();assert page.locator('.radio-library-station',has_text='Fixture station').count()==1
 back.click();page.locator('#homeView').wait_for();page.keyboard.press('Escape')
 page.click('#bShare');page.locator('.capture-tabs').wait_for();page.get_by_role('button',name='Photo',exact=True).click();page.locator('.capture-photo[src]').wait_for();page.get_by_role('button',name='Save to album',exact=True).click();assert page.evaluate('__lr.files.list("Photos").length')==1
 page.get_by_role('button',name='Share room',exact=True).click();page.locator('.share-card-img[src]').wait_for();assert page.locator('.capture-tabs').count()==1;page.keyboard.press('Escape')
 page.click('#bLane');page.locator('.lane-street').wait_for();assert page.locator('#lane-house').is_hidden();page.screenshot(path='/tmp/lane-directory.png');page.locator('.lane-front[data-place=house]').click();assert page.locator('#lane-house').is_visible();assert 'Your rooms' in page.locator('#lane-house').inner_text()
 assert not errors,errors
 browser.close();server.shutdown()
