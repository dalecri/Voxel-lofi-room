"""npm run build && python3 tests/habits-browser.py. Habit Pots in Control Centre: add, place, check in, almanac, undo, rename, retire, privacy; nothing on Today."""
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
 def shot(n):
  if SHOTS:page.screenshot(path=f'{SHOTS}/{n}.png')
 def hub():
  page.keyboard.press('Escape');page.click('#bHome');tile=page.locator('#homeView [data-app=habits]');assert tile.is_visible();tile.click();assert page.locator('.habit-home').is_visible()
 # Nothing about habits on the Today dashboard.
 page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click();assert page.locator('.today-habits,.today-habit').count()==0
 hub();home=page.locator('.habit-home');assert page.locator('#sheetBody .control-back').count()==1
 old=home.locator('[data-habit="habit-old"]');assert 'No home yet' in old.inner_text()
 # Unplaced habit offers placement instead of a check-in.
 old.locator('.habit-tend').click();assert page.locator('.habit-place-offer').is_visible();assert page.evaluate('__lr.habits.checkedToday("habit-old")') is False
 page.get_by_role('button',name='Place it here').click();pot=page.evaluate('__lr.habits.get("habit-old").item');assert page.evaluate('id=>__lr.room.get(id).t',pot)=='habitpot'
 page.evaluate('__lr.view.frame(.1,__lr.view.t+.1)');assert page.evaluate('id=>{const p=__lr.view.objs.get(id).userData.parts;return [1,2,3,4].map(n=>p["growth"+n].visible)}',pot)==[True,True,False,False]
 # A hostile name renders as text everywhere.
 hub();home.get_by_role('button',name='Add a habit').click();assert page.locator('.habit-new').is_visible();page.get_by_label('Habit name').fill('<img src=x onerror=f()>');page.get_by_role('radio',name='Blossom').click();shot('habits-new')
 page.get_by_role('button',name='Place it').click();assert page.locator('#toasts img').count()==0;assert '<img src=x' in page.locator('#toasts').inner_text()
 new=page.evaluate('__lr.habits.list().at(-1)');assert new['c']==1 and new['item'] is not None;assert len(new['days'])==0
 # Tap the pot: check in once, then a totals toast; one activity event.
 page.evaluate('id=>__lr.interact(id)',new['item']);assert 'grew a little. A little sprout.' in page.locator('#toasts').inner_text()
 page.evaluate('id=>__lr.interact(id)',new['item']);assert '1 day in all' in page.locator('#toasts').inner_text()
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.activityLog")).flatMap(d=>d.events).filter(k=>k==="habit").length')==1
 page.evaluate('__lr.view.frame(.1,__lr.view.t+.1)');assert page.evaluate('id=>__lr.view.objs.get(id).userData.parts.growth1.visible&&!__lr.view.objs.get(id).userData.parts.growth2.visible',new['item'])
 # The share code carries a plain pot and nothing about habits.
 assert 'habit-' not in json.dumps(page.evaluate('__lr.room.serialize()'))
 # The list: checked row, check-in from the list repaints it, and the almanac.
 hub();row=home.locator(f'[data-habit="{new["id"]}"]');assert 'is-checked' in row.get_attribute('class');assert 'Tended today' in row.inner_text();assert row.locator('img').count()==0
 oldrow=home.locator('[data-habit="habit-old"]');assert 'Not yet today' in oldrow.inner_text();oldrow.locator('.habit-tend').click();assert 'is-checked' in home.locator('[data-habit="habit-old"]').get_attribute('class');shot('habits-home')
 row.locator('.habit-more').click()
 alm=page.locator('.habit-almanac');assert alm.is_visible();assert alm.locator('.habit-name').inner_text()=='<img src=x onerror=f()>';assert alm.locator('img').count()==0
 assert alm.locator('.habit-cell').count()==105;assert alm.locator('.habit-cell.is-today.is-checked').count()==1;assert alm.locator('.habit-cell.is-future.is-checked').count()==0
 shot('habits-almanac')
 # Hold the pot itself for its almanac too.
 page.keyboard.press('Escape');page.evaluate('id=>__lr.habitsUI.openAlmanac(id)',new['id']);alm=page.locator('.habit-almanac')
 alm.get_by_role('button',name='Undo today').click();assert page.evaluate(f'__lr.habits.checkedToday("{new["id"]}")') is False;assert alm.get_by_role('button',name='Undo today').count()==0
 alm.get_by_role('button',name='Rename').click();page.locator('.habit-rename-form input').fill('Stretch');page.get_by_role('button',name='Save').click();assert alm.locator('.habit-name').inner_text()=='Stretch'
 alm.get_by_role('button',name='Retire habit').click();alm.get_by_role('button',name='Retire for good?').click();assert page.evaluate(f'__lr.habits.get("{new["id"]}")') is None;assert page.evaluate('id=>__lr.room.get(id)',new['item']) is None
 alm.get_by_role('button',name='‹ All habits').click();assert page.locator('.habit-home [data-habit]').count()==1
 # Removing a pot keeps the habit's history, unplaced.
 page.keyboard.press('Escape');page.evaluate('id=>{__lr.room.remove(id);__lr.changed();__lr.updateFocusGarden(true)}',pot);assert page.evaluate('__lr.habits.get("habit-old").item') is None;assert len(page.evaluate('__lr.habits.get("habit-old").days'))==5
 # Cap: six habits, then the shelf message instead of Add.
 page.evaluate('for(let i=0;i<5;i++)__lr.habits.add({name:"H"+i})');hub();assert home.get_by_role('button',name='Add a habit').count()==0;assert 'Six habits is plenty' in home.inner_text()
 page.evaluate('__lr.habitsUI.openNew()');assert 'Six habits is plenty' in page.locator('#toasts').inner_text()
 assert not errors,errors;print('habits browser ok')
 browser.close()
