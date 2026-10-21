"""npm run build && python3 tests/tst-published-browser.py. TwoStoryTails grid: seeded posts, filters, paging, post edits, studio Published and back."""
import functools,os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];SHOTS=os.environ.get('SHOTS')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
EXPORT={'exportedFrom':'TwoStoryCaptions','exportedAt':'2026-10-21T10:00:00Z','clips':[
 {'id':'clip-a','desc':'Neo inspecting a leaf like a detective','status':'','created':'2026-10-20','selectedTones':['deadpan'],'platform':'TikTok','captions':['Neo has opened an <b>investigation</b> into breakfast.']},
 {'id':'clip-b','desc':'Ramses at 5am','status':'','created':'2026-10-19','selectedTones':[],'platform':'','captions':[]},
 {'id':'clip-c','desc':'Already out','status':'published','created':'2026-10-18','selectedTones':[],'platform':'','captions':[]}]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844})
 context.add_init_script("if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.mode',JSON.stringify('explore'));}")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json=EXPORT) if 'twostorycaptions' in r.request.url else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard');page.evaluate('__lr.renderLoop.stop()')
 def shot(n):
  if SHOTS:page.screenshot(path=f'{SHOTS}/{n}.png')
 # Control Centre tile opens the grid.
 page.click('#bHome');tile=page.locator('#homeView [data-app=tst]');assert 'TwoStoryTails' in tile.inner_text();tile.click()
 grid=page.locator('.tst-published');assert grid.is_visible();assert page.locator('#sheetBody').get_attribute('data-tool')=='tst'
 total=page.evaluate('__lr.tstPublished.posts.length');assert total==116;assert grid.locator('.tst-count').text_content()=='116 posts'
 assert grid.locator('.tst-tile').count()==30;assert page.locator('#sheetBody .control-back').count()==1
 for label in ['Instagram','TikTok']:assert page.get_by_role('link',name=label,exact=True).get_attribute('rel')=='noopener noreferrer'
 grid.get_by_role('button',name='Show more (86 left)').click();assert grid.locator('.tst-tile').count()==60;shot('tst-grid')
 # Filters: a cat, then a category on top.
 neo=page.evaluate('__lr.tstPublished.posts.filter(p=>p.cats.includes("neo")).length');grid.locator('.tst-cat',has_text='Neo').click()
 assert grid.locator('.tst-count').text_content()==f'{neo} posts';assert grid.locator('.tst-tile').count()==min(neo,30)
 both=page.evaluate('__lr.tstPublished.posts.filter(p=>p.cats.includes("neo")&&p.category==="food").length');grid.locator('.tst-chip',has_text='Food & treats').click()
 assert grid.locator('.tst-tile').count()==both;assert all(t.get_attribute('data-category')=='food' for t in grid.locator('.tst-tile').all())
 grid.locator('.tst-cat',has_text='Neo').click();grid.locator('.tst-chip',has_text='Food & treats').click();assert grid.locator('.tst-count').text_content()=='116 posts'
 # A post: edit text, cats and category; it sticks after reload.
 grid.locator('.tst-tile[data-post="seed-002"]').click();post=page.locator('.tst-post');assert post.is_visible()
 post.get_by_role('button',name='Edit text').click();post.locator('.tst-edit').fill('my cat has main character energy and i am the snack intern');post.get_by_role('button',name='Save text').click()
 post.locator('.tst-cat',has_text='Cali').click();post.get_by_role('radio',name='Chaos').click();shot('tst-post')
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 saved=page.evaluate('__lr.tstPublished.get("seed-002")');assert saved['text'].endswith('snack intern') and saved['cats']==['cali'] and saved['category']=='chaos' and saved['icon']=='bolt'
 # Caption studio: Published moves a clip into the grid, first.
 page.evaluate('__lr.captionStudio()');page.wait_for_function('document.querySelectorAll(".caption-clip").length===2')
 studio=page.locator('.caption-studio');assert studio.get_by_role('button',name='Mark as published: Neo inspecting a leaf like a detective').is_visible();shot('tst-studio')
 studio.get_by_role('button',name='Mark as published: Neo inspecting a leaf like a detective').click()
 assert page.locator('.caption-clip').count()==1;assert 'Moved to your TwoStoryTails grid' in page.locator('#toasts').inner_text()
 first=page.evaluate('__lr.tstPublished.posts[0]');assert first['clip']=='clip-a' and first['from']=='studio' and first['text']=='Neo has opened an <b>investigation</b> into breakfast.' and first['cats']==['neo'] and first['category']=='food'
 page.evaluate('__lr.openPublished()');t=page.locator('.tst-tile').first;assert t.get_attribute('data-post')==first['id'];assert t.locator('b').count()==0;assert '<b>investigation</b>' in t.inner_text()
 assert page.locator('.tst-count').text_content()=='117 posts'
 # Back to studio returns the clip.
 t.click();page.get_by_role('button',name='Back to studio').click();page.get_by_role('button',name='Move it back?').click()
 assert page.evaluate('__lr.tstPublished.posts.length')==116;page.evaluate('__lr.captionStudio()');page.wait_for_function('document.querySelectorAll(".caption-clip").length===2')
 # Nothing about the grid lands in room data.
 assert 'tstPublished' not in page.evaluate('JSON.stringify(__lr.room.serialize())')
 assert not errors,errors;print('PASS TwoStoryTails grid: 116 seeded posts, filters and paging, edits persist, studio Published and back to studio')
 browser.close()
