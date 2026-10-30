"""Build www first. Tasks and Notes are Tools; Today retains its task widget."""
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
 context.add_init_script('''if(!localStorage.getItem('sheetFixture')){localStorage.setItem('sheetFixture','true');const r={v:1,name:'Tools room',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.portals':{next:2,custom:[{id:'custom-1',label:'Navigation fixture',url:'https://example.com/navigation'}],bindings:{}},'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.home');page.evaluate('__lr.renderLoop.stop()')
 home=page.locator('#homeView');body=page.locator('#sheetBody');back=page.get_by_role('button',name='Back to Control Centre',exact=True)
 def open_home():page.click('#bHome');home.wait_for()
 def launch(app):
  home.locator('.home-search').fill('');home.locator('[data-app='+app+']').click();back.wait_for();assert_header()
 def assert_header():
  row=page.locator('.control-return-actions,[data-control-header].has-control-return');assert row.count()==1
  # One layout snapshot: a sheet whose content settles (e.g. captions loading) shifts every box together.
  box=page.evaluate("""()=>{const row=document.querySelector('.control-return-actions,[data-control-header].has-control-return'),r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}};
   const nav=document.querySelector('#sheetBody > .menu-nav');return {b:r(document.querySelector('button[aria-label="Back to Control Centre"]')),x:r(row.querySelector('.sheet-close,.french-close,.barnaby-close,.cozy-pop-close,#shopClose,#crownClose,#photoClose')),r:r(row),t:r(row.querySelector('h2')),nav:r(nav)}}""")
  b,x,r,t=box['b'],box['x'],box['r'],box['t']
  assert abs(b['y']-x['y'])<=1 and b['x']<x['x'],(b,x)
  assert abs(b['x']-r['x'])<=1 and abs(x['x']+x['width']-r['x']-r['width'])<=1
  if t:assert abs(t['x']+t['width']/2-r['x']-r['width']/2)<=1;assert abs(t['y']+t['height']/2-b['y']-b['height']/2)<=1
  if box['nav']:assert r['y']+r['height']<=box['nav']['y']+1
 def returned(app,query=''):
  back.click();home.wait_for();assert page.evaluate('__lr.home.active');assert home.locator('.home-search').input_value()==query;assert home.locator('[data-app='+app+']').evaluate('e=>e===document.activeElement');assert back.count()==0
 open_home()
 assert home.locator('[data-app=todo]').is_visible()
 assert home.locator('[data-app=typewriter]').is_visible()
 assert 'Notes' in home.locator('[data-app=typewriter]').inner_text()
 launch('todo');assert page.get_by_role('tab',name='To-Do',exact=True).count()==0
 page.get_by_role('textbox',name='A little task',exact=True).fill('RESTORED_TOOL_TASK');page.get_by_role('button',name='＋ Add',exact=True).click();assert page.locator('.today-task-text',has_text='RESTORED_TOOL_TASK').count()==1
 page.get_by_role('tab',name='Google',exact=True).click();page.get_by_role('button',name='Connect Google',exact=True).wait_for();page.get_by_role('tab',name='My list',exact=True).click();returned('todo')
 launch('typewriter');page.locator('#letterBody').fill('RESTORED_NOTES');returned('typewriter')
 page.keyboard.press('Escape');page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click();assert page.locator('[data-widget=tasks] .today-google-focus').count()==1;assert page.get_by_role('tab',name='To-Do',exact=True).count()==0
 page.keyboard.press('Escape');open_home();launch('todo');assert page.locator('.today-task-text',has_text='RESTORED_TOOL_TASK').count()==1;returned('todo')
 assert not errors,errors
 browser.close();server.shutdown()
