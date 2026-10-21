"""npm run build && python3 tests/habits-browser.py. Habit Pots: add, place, check in, almanac, undo, rename, retire, privacy."""
import functools,json,os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];SHOTS=os.environ.get('SHOTS')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script('''if(!sessionStorage.fx){sessionStorage.fx='1';const a={v:1,name:'Bedroom',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.mode':'explore','lr.rooms':[{id:101,name:a.name,n:0}],'lr.room.101':a,'lr.mainBedroom':101,'lr.meta':{current:101,visitors:false,realtime:false,dreamy:false,phase:'day'},'lr.habits':{habits:[{id:'habit-old',name:'Read',c:2,room:null,item:null,created:'2026-09-01',days:{'2026-10-01':true,'2026-10-02':true,'2026-10-03':true,'2026-10-20':true}}]}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def today():page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()
 def shot(n):
  if SHOTS:page.screenshot(path=f'{SHOTS}/{n}.png')
 today();row=page.locator('.today-habits');assert row.is_visible()
 old=row.locator('[data-habit="habit-old"]');assert 'no home yet' in old.inner_text();assert row.get_by_role('button',name='Add a habit').count()==1
 # Unplaced habit offers placement instead of a check-in.
 old.click();assert page.locator('.habit-place-offer').is_visible();assert page.evaluate('__lr.habits.checkedToday("habit-old")') is False
 page.get_by_role('button',name='Place it here').click();pot=page.evaluate('__lr.habits.get("habit-old").item');assert page.evaluate('id=>__lr.room.get(id).t',pot)=='habitpot'
 page.evaluate('__lr.view.frame(.1,__lr.view.t+.1)');assert page.evaluate('id=>{const p=__lr.view.objs.get(id).userData.parts;return [1,2,3,4].map(n=>p["growth"+n].visible)}',pot)==[True,True,False,False]
 # A hostile name renders as text everywhere.
 today();row.get_by_role('button',name='Add a habit').click();page.get_by_label('Habit name').fill('<img src=x onerror=f()>');page.get_by_role('radio',name='Blossom').click();shot('habits-new')
 page.get_by_role('button',name='Place it').click();assert page.locator('#toasts img').count()==0;assert '<img src=x' in page.locator('#toasts').inner_text()
 new=page.evaluate('__lr.habits.list().at(-1)');assert new['c']==1 and new['item'] is not None;assert len(new['days'])==0
 # Tap the pot: check in once, then a totals toast; one activity event.
 page.evaluate('id=>__lr.interact(id)',new['item']);assert 'grew a little. A little sprout.' in page.locator('#toasts').inner_text()
 page.evaluate('id=>__lr.interact(id)',new['item']);assert '1 day in all' in page.locator('#toasts').inner_text()
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.activityLog")).flatMap(d=>d.events).filter(k=>k==="habit").length')==1
 page.evaluate('__lr.view.frame(.1,__lr.view.t+.1)');assert page.evaluate('id=>__lr.view.objs.get(id).userData.parts.growth1.visible&&!__lr.view.objs.get(id).userData.parts.growth2.visible',new['item'])
 # The share code carries a plain pot and nothing about habits.
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode?__lr.readCode(c):null',code)
 if decoded is not None:assert 'habit-' not in json.dumps(decoded) and 'Read' not in json.dumps(decoded)
 assert 'lr.habits' not in json.dumps(page.evaluate('__lr.room.serialize()'))
 # Chips: checked dot, and the almanac on a long press.
 today();chip=row.locator(f'[data-habit="{new["id"]}"]');assert 'is-checked' in chip.get_attribute('class');assert 'tended today' in chip.inner_text();chip.scroll_into_view_if_needed();shot('habits-today')
 chip.scroll_into_view_if_needed();box=chip.bounding_box();page.mouse.move(box['x']+20,box['y']+20);page.mouse.down();page.wait_for_timeout(700);page.mouse.up()
 alm=page.locator('.habit-almanac');assert alm.is_visible();assert alm.locator('.habit-name').inner_text()=='<img src=x onerror=f()>';assert alm.locator('img').count()==0
 assert alm.locator('.habit-cell').count()==105;assert alm.locator('.habit-cell.is-today.is-checked').count()==1;assert alm.locator('.habit-cell.is-future.is-checked').count()==0
 shot('habits-almanac')
 alm.get_by_role('button',name='Undo today').click();assert page.evaluate(f'__lr.habits.checkedToday("{new["id"]}")') is False;assert alm.get_by_role('button',name='Undo today').count()==0
 alm.get_by_role('button',name='Rename').click();page.locator('.habit-rename-form input').fill('Stretch');page.get_by_role('button',name='Save').click();assert alm.locator('.habit-name').inner_text()=='Stretch'
 alm.get_by_role('button',name='Retire habit').click();alm.get_by_role('button',name='Retire for good?').click();assert page.evaluate(f'__lr.habits.get("{new["id"]}")') is None;assert page.evaluate('id=>__lr.room.get(id)',new['item']) is None
 # Removing a pot keeps the habit's history, unplaced.
 page.keyboard.press('Escape');page.evaluate('id=>{__lr.room.remove(id);__lr.changed();__lr.updateFocusGarden(true)}',pot);assert page.evaluate('__lr.habits.get("habit-old").item') is None;assert len(page.evaluate('__lr.habits.get("habit-old").days'))==4
 # Cap: six habits, then the shelf message.
 page.evaluate('for(let i=0;i<5;i++)__lr.habits.add({name:"H"+i})');today();assert row.get_by_role('button',name='Add a habit').count()==0
 page.evaluate('__lr.habitsUI.openNew()');assert 'Six habits is plenty' in page.locator('#toasts').inner_text()
 assert not errors,errors;print('habits browser ok')
 browser.close()
