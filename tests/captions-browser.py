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
 {'id':str(i),'desc':f'Synthetic idea {i}\nUnchanged words <b>not markup</b>','status':'published' if i==0 else 'idea','created':f'2026-10-18T12:{i//60:02}:{i%60:02}Z','selectedTones':['Relatable'],'platform':'Both','captions':['First option','Second option'] if i==199 else None}
 for i in range(200)],'brands':[],'tasks':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 for width in [390,1280]:
  context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
  context.add_init_script('''if(!localStorage.getItem('captionFixture')){localStorage.setItem('captionFixture','true');const r={v:1,name:'Newsroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.menuTab':'Today','lr.meta':{current:101,phase:'night',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});''')
  context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
  request={'count':0,'bad':False}
  def caption_route(route):
   request['count']+=1
   if request['bad']:route.fulfill(status=200,body='{broken',content_type='application/json')
   else:route.fulfill(json=fixture)
  context.route('**/twostorycaptions.json',caption_route)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr');page.click('#bMenu');assert request['count']==0
  page.get_by_role('tab',name='Journal',exact=True).click();page.wait_for_function('document.querySelectorAll(".caption-clip").length===199')
  desk=page.locator('.caption-desk');assert request['count']==1;assert desk.locator('h4').inner_text()=='The caption desk'
  assert desk.locator('.caption-desc').first.inner_text()==fixture['clips'][199]['desc'];assert desk.locator('.caption-desc b').count()==0
  assert desk.locator('.caption-options li').count()==2;assert desk.locator('.caption-tag').first.inner_text()=='Relatable';assert desk.locator('.caption-platform').first.inner_text()=='Both'
  desk.locator('.caption-copy').first.click();assert page.evaluate('window.copied')=='First option';assert desk.locator('.caption-copy').first.inner_text()=='Copied'
  desk.locator('.caption-copy').nth(1).click();assert page.evaluate('window.copied')==fixture['clips'][198]['desc']
  page.evaluate("navigator.clipboard.writeText=async()=>{throw Error('old WebView')};document.execCommand=()=>{window.fallback=document.activeElement.value;return true;}")
  desk.locator('.caption-copy').nth(2).click();assert page.evaluate('window.fallback')==fixture['clips'][197]['desc']
  request['bad']=True;desk.locator('.caption-refresh').click();page.wait_for_function('document.querySelector(".caption-desk-status").textContent.startsWith("Cached")');assert desk.locator('.caption-clip').count()==199
  desk.locator('.caption-desc').first.scroll_into_view_if_needed();page.screenshot(path=f'/tmp/caption-desk-{width}.png');assert desk.evaluate('e=>e.scrollWidth<=e.clientWidth')
  page.reload(wait_until='networkidle');page.click('#bMenu');page.locator('.caption-clip').first.wait_for();assert page.locator('.caption-desk-status').inner_text().startswith('Cached')
  page.evaluate("localStorage.removeItem('lr.captionDesk')");page.reload(wait_until='networkidle');page.click('#bMenu');page.wait_for_function('document.querySelector(".caption-desk-status").textContent.includes("offline")');assert page.locator('.news-masthead').is_visible();assert page.locator('.caption-clip').count()==0
  page.keyboard.press('Escape');assert not errors,errors;context.close()
 browser.close()
server.shutdown()
print('PASS: Journal-only fetch; all 199 unpublished clips; verbatim safe text; options/copy/fallback; cache/reload/malformed JSON; mobile/desktop, no console errors')
