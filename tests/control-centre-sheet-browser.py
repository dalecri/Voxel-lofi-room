"""Build www first. Control Centre reuses the real shared sheet and close paths."""
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
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
 context.add_init_script('''if(!localStorage.getItem('sheetFixture')){localStorage.setItem('sheetFixture','true');const r={v:1,name:'Tools room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');page.evaluate('__lr.renderLoop.stop()')
 sheet=page.locator('#sheet');body=page.locator('#sheetBody');home=page.locator('#homeView');button=page.locator('#bHome')
 def open_home():
  button.click();assert page.evaluate('__lr.home.active');assert home.evaluate('e=>e.closest("#sheet")===document.getElementById("sheet")');assert sheet.get_attribute('aria-hidden')=='false';assert home.evaluate('e=>getComputedStyle(e).position')=='static';assert body.locator('.grab').count()==1;assert body.get_by_role('heading',name='Control Centre',exact=True).is_visible();assert body.get_by_text('Your tools and apps.',exact=True).is_visible();assert body.locator('.sheet-close').evaluate('e=>e===document.activeElement')
 def closed():
  assert not page.evaluate('__lr.home.active');assert sheet.get_attribute('aria-hidden')=='true';assert home.count()==0;assert button.evaluate('e=>e===document.activeElement')
 open_home();assert home.locator('.home-section h2').count()==0;assert 'Color means the furniture' not in home.inner_text();assert home.locator('[data-app]').count()>20;assert body.get_by_role('button',name='Set room shortcut',exact=True).is_visible();assert home.get_by_role('button',name='＋ Add your own',exact=True).is_visible();assert page.locator('.home-header,.home-scroll').count()==0;assert page.get_by_role('button',name='← Room',exact=True).count()==0
 search=home.get_by_role('searchbox',name='Find a tool or app',exact=True);search.fill('typewriter');assert home.locator('[data-app]').count()==1;search.fill('nothingmatchesxyz');assert home.locator('[data-app]').count()==0;assert home.get_by_text('No matching apps. Try another word.').is_visible();search.fill('')
 # Shared Close participates in the same keyboard focus loop as the apps.
 settings=body.get_by_role('button',name='Open Settings',exact=True);assert settings.inner_text()=='';assert body.locator('.sheet-close').inner_text()=='';assert body.locator('.home-sheet-actions > button').count()==3;settings.focus();page.keyboard.press('Shift+Tab');assert home.get_by_role('button',name='＋ Add your own',exact=True).evaluate('e=>e===document.activeElement');page.keyboard.press('Tab');assert settings.evaluate('e=>e===document.activeElement');page.keyboard.press('Tab');assert body.get_by_role('button',name='Set room shortcut',exact=True).evaluate('e=>e===document.activeElement');page.keyboard.press('Tab');assert body.locator('.sheet-close').evaluate('e=>e===document.activeElement')
 page.keyboard.press('Escape');closed();open_home();body.get_by_role('button',name='Close dialog',exact=True).click();closed()
 open_home();sheet.click(position={'x':3,'y':3});closed()
 open_home();body.get_by_role('button',name='Open Settings',exact=True).click();assert not page.evaluate('__lr.home.active');assert page.locator('#menu-settings').is_visible();assert page.get_by_role('tab',name='Settings',exact=True).get_attribute('aria-selected')=='true';page.keyboard.press('Escape')
 open_home();home.locator('[data-app=tea]').click();assert not page.evaluate('__lr.home.active');assert body.get_by_role('heading',name='Tea',exact=True).is_visible();assert sheet.evaluate('e=>e.classList.contains("open")');page.keyboard.press('Escape')
 # The typewriter uses this same sheet, flushes on backdrop close and restores focus.
 open_home();home.locator('[data-app=typewriter]').click();editor=page.locator('#lettersView');assert editor.evaluate('e=>e.closest("#sheetBody")!==null && getComputedStyle(e).position==="relative"');page.locator('#letterBody').fill('PRIVATE_SHEET_DRAFT');assert page.locator('#sheetBody').evaluate('e=>{const r=e.getBoundingClientRect();return r.top===0&&Math.abs(r.height-innerHeight)<2}');page.locator('#letterClose').click();assert not page.evaluate('__lr.letters.active || __lr.Sound.writing');assert page.evaluate('localStorage.getItem("lr.letters").includes("PRIVATE_SHEET_DRAFT")');assert page.evaluate('["bHome","bMenu"].includes(document.activeElement.id)'),page.evaluate('document.activeElement.outerHTML')
 # Public close(false) and reopening must survive codeSheet's self-close call.
 open_home();page.evaluate('__lr.home.close(false)');assert not page.evaluate('__lr.home.active');assert sheet.get_attribute('aria-hidden')=='true';open_home();page.evaluate('__lr.home.close()');closed()
 for phase in ['day','night']:
  page.evaluate('p=>{__lr.setPhase(p,true);__lr.view.setPhase(p,true)}',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':900});open_home();assert body.evaluate('e=>e.scrollWidth<=e.clientWidth');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert body.locator('.home-sheet-actions').evaluate('e=>{const [a,b,c]=[...e.children].map(n=>n.getBoundingClientRect());return Math.abs(a.top-b.top)<1 && Math.abs(b.top-c.top)<1 && a.right<=b.left && b.right<=c.left}');assert home.locator('.home-app-controls button').count()==0;page.screenshot(path=f'/tmp/control-centre-sheet-{phase}-{width}.png');page.keyboard.press('Escape');closed()
 hooks=page.evaluate("""() => {
  let opened=0,closed=0,container,tool;
  tool=LRHome.createView({apps:()=>[],actions:{},beforeOpen:()=>opened++,onClose:()=>closed++,dismiss:()=>container.remove(),sheet:(title,sub,build)=>{tool.close(false);container=document.createElement('div');document.body.appendChild(container);build((tag,cls)=>{const el=document.createElement(tag);el.className=cls;container.appendChild(el);return el;});}});
  tool.open();const active=tool.active;tool.close();tool.open();tool.close(false);return {opened,closed,active,detached:!tool.view.isConnected};
 }""");assert hooks=={'opened':2,'closed':1,'active':True,'detached':True},hooks
 assert not errors,errors;browser.close()
server.shutdown()
print('PASS: shared sheet/chrome/grid/search/settings/shortcuts; Escape/Close/API and focus loop; no overlay, self-close recursion or console errors; responsive day/night')
