"""npm run build && python3 tests/dashboard-browser.py. Offline UI and private LR1 integration."""
import functools,json
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
 context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
 context.add_init_script("localStorage.setItem('lr.intro','true')")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 body=page.locator('#sheetBody');sheet=page.locator('#sheet')
 def tab(name):page.get_by_role('tab',name=name,exact=True).click()
 def escape():page.keyboard.press('Escape');assert 'open' not in sheet.get_attribute('class')
 def tap(t):page.evaluate("t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id)",t)
 page.click('#bMenu');assert page.locator('.menu-nav [role=tab]').evaluate_all('es=>es.map(e=>e.ariaLabel)')==['Today','Rooms','To-Do','Sound','Settings']
 assert page.locator('#sheetBody > h2').inner_text()=='Your Space';assert page.locator('#menu-today .today-sky').is_visible();assert page.locator('.ritual-cards').count()==0;assert page.locator('#menu-today .daily-badge').count()==0
 tab('Rooms');page.locator('#menu-rooms details.preset-group summary').first.click();page.locator('#menu-rooms details.preset-group summary').last.click();assert page.locator('#bImportCode').is_visible();assert page.locator('#bShareCode').is_visible();assert page.locator('.roomstack').count() or 'Your home' in body.inner_text()
 # Every preset remains present and visible in Rooms.
 expected=page.evaluate('Object.values(LR.PRESETS).map(p=>p.name)')
 for name in expected:assert name in page.locator('#menu-rooms').inner_text(),name
 tab('To-Do');assert page.locator('#menu-todo .today-tasks').is_visible();page.keyboard.press('Escape');page.click('#disc');page.click('#bCatDiary');assert page.locator('#catDiary').is_visible();page.click('#bMomentDiary');assert page.locator('#journalFeed .d').count()>50;page.keyboard.press('Escape');assert page.locator('#cozyMoments').is_hidden();page.click('#bMenu')
 tab('Sound');assert page.locator('#stAdd').is_visible();assert not page.locator('#bImportCode').is_visible()
 page.locator('#stName').fill('PRIVATE_STATION');page.locator('#stUrl').fill('https://example.com/stream.mp3');page.click('#stAdd');assert page.get_by_role('tab',selected=True).get_attribute('aria-label')=='Sound';assert 'PRIVATE_STATION' in body.inner_text();body.get_by_role('button',name='Remove',exact=True).click();assert 'PRIVATE_STATION' not in body.inner_text()
 tab('Settings');assert 'Follow the clock' in body.inner_text();assert 'Keys:' in body.inner_text();assert 'Radio stations' not in body.inner_text();escape()
 page.click('#bMenu');assert page.get_by_role('tab',selected=True).get_attribute('aria-label')=='Settings';page.get_by_role('tab',name='Settings',exact=True).focus();page.keyboard.press('ArrowLeft');assert page.get_by_role('tab',selected=True).get_attribute('aria-label')=='Sound';escape()
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');page.click('#bMenu');assert page.get_by_role('tab',selected=True).get_attribute('aria-label')=='Sound';escape()
 print('PASS: five menu sections, every preset, relocated controls, radio add/remove, journal feeds, persistent tab and keyboard navigation',flush=True)
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.name='Private Files';a.room.n=10;a.meta.visitors=false;a.meta.realtime=false;a.setPhase('day',true);a.setMode('explore',true);for(const [t,x,z] of [['phone',1,1],['filecab',3,1],['appportal',5,1],['crt',7,1],['pomodorocandle',1,4]])a.room.add(a.room.make(t,{x,z}));a.changed();window.__opened=[];window.open=(u,target,features)=>{__opened.push({u,target,features});};}''')
 tap('filecab');assert page.get_by_role('tab').all_text_contents()==['Letters','Scenes','Photos'];assert page.locator('.files-empty:visible').inner_text()=='No notes yet — the notetaker is waiting.';assert page.evaluate('localStorage.getItem("lr.letters")') is None
 tab('Scenes');assert 'No scenes yet' in body.inner_text();tab('Photos');assert 'No photos yet' in body.inner_text();escape()
 tap('phone');expected=page.evaluate('LRDashboard.destinations(LR.CAT,__lr.widgets).map(p=>p.label)');assert len(expected)>=7
 for label in expected:assert page.get_by_role('button',name=label,exact=True).is_visible(),label
 page.get_by_role('searchbox',name='Find an app').fill('pomodoro');page.get_by_role('button',name='Pomodoro Terrarium',exact=True).click();assert page.evaluate('__opened.at(-1).u')=='https://heycristobal.com/pomodoro-terrarium/'
 page.get_by_role('searchbox',name='Find an app').fill('');page.get_by_role('button',name='Add your own',exact=True).click();page.get_by_label('Name',exact=True).fill('PRIVATE_CUSTOM_APP');page.get_by_label('URL',exact=True).fill('https://example.com/PRIVATE_APP');page.get_by_role('button',name='Add destination',exact=True).click();assert 'Place a portal' in body.inner_text();page.get_by_role('button',name='Place a portal',exact=True).click();assert page.evaluate('__lr.state.add')=='appportal';assert page.evaluate('__lr.state.mode')=='edit'
 page.evaluate('__lr.setMode("explore",true)');tap('appportal');page.get_by_role('button',name='PRIVATE_CUSTOM_APP',exact=True).click();assert page.evaluate('__opened.at(-1).u')=='https://example.com/PRIVATE_APP';escape()
 tap('appportal');assert page.evaluate('__opened.at(-1).u')=='https://example.com/PRIVATE_APP';tap('crt');assert page.evaluate('__opened.at(-1).u')=='https://www.youtube.com/@twostorytails'
 page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()");page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');page.evaluate("window.__opened=[];window.open=u=>__opened.push(u)");tap('phone');assert page.get_by_role('button',name='PRIVATE_CUSTOM_APP',exact=True).is_visible();page.get_by_role('button',name='PRIVATE_CUSTOM_APP',exact=True).click();assert page.evaluate('__opened.at(-1)')=='https://example.com/PRIVATE_APP';escape();tap('appportal');assert page.evaluate('__opened.at(-1)')=='https://example.com/PRIVATE_APP'
 print('PASS: launcher derives live catalog/widget destinations, search/outbound links, custom persistence, placement suggestion and private direct portal binding',flush=True)
 # Real existing letter editor, then cabinet open/rename/download.
 page.evaluate("__lr.letters.open()");page.locator('#letterBody').fill('PRIVATE_LETTER_BODY with three words');page.evaluate('__lr.letters.flush()');page.click('#letterClose')
 tap('filecab');assert '4 words' in body.inner_text();page.locator('.file-more summary').click();page.get_by_role('button',name='Rename',exact=True).click();page.get_by_label('Title',exact=True).fill('PRIVATE_LETTER_TITLE');page.get_by_role('button',name='Save title',exact=True).click();assert 'PRIVATE_LETTER_TITLE' in body.inner_text()
 page.locator('.file-more summary').click()
 with page.expect_download() as download:page.get_by_role('button',name='Download',exact=True).click()
 content=Path(download.value.path()).read_text();assert 'PRIVATE_LETTER_BODY' in content and '<style>' in content
 # Exercise native and browser sharing with local fixtures, without sending data.
 page.evaluate("window.__native=[];window.__cap=window.Capacitor;window.Capacitor={isNativePlatform:()=>true,registerPlugin:name=>({save:async p=>{__native.push({name,p});return {saved:true}},writeFile:async p=>{__native.push({name,p});return {uri:'file:///cache/test.html'}},share:async p=>{__native.push({name,p})}})}")
 page.get_by_role('button',name='Download',exact=True).click();page.wait_for_function('__native.some(c=>c.name==="LetterFiles")');assert page.evaluate('__native[0].p.html.includes("PRIVATE_LETTER_BODY")')
 page.get_by_role('button',name='Share',exact=True).click();page.wait_for_function('__native.some(c=>c.name==="Share")');assert page.evaluate('__native.find(c=>c.name==="Share").p.files[0]')=='file:///cache/test.html'
 page.evaluate("window.Capacitor=__cap;window.__shared=[];Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async p=>__shared.push({title:p.title,types:p.files.map(f=>f.type)})})")
 page.get_by_role('button',name='Share',exact=True).click();page.wait_for_function('__shared.length===1');assert page.evaluate('__shared[0].types[0]')=='text/html'
 page.get_by_role('button',name='Open',exact=True).click();assert page.locator('#letterBody').inner_text()=='PRIVATE_LETTER_BODY with three words';page.click('#letterClose')
 tap('filecab');tab('Scenes');page.get_by_role('button',name='Save current room as a scene',exact=True).click();assert 'Private Files' in body.inner_text();assert page.evaluate('__lr.files.list("Scenes").length')==1
 page.locator('.file-more:visible summary').click();page.get_by_role('button',name='Rename',exact=True).click();page.get_by_label('Title',exact=True).fill('PRIVATE_SCENE_TITLE');page.get_by_role('button',name='Save title',exact=True).click();page.locator('.file-more:visible summary').click()
 with page.expect_download() as download:page.get_by_role('button',name='Download',exact=True).click()
 content=Path(download.value.path()).read_text();assert 'LR1.' in content and 'PRIVATE_LETTER' not in content and 'PRIVATE_CUSTOM' not in content
 # Opening an archived scene restores its immutable decor snapshot.
 escape();page.evaluate('__lr.room.name="Changed since scene";__lr.changed()');tap('filecab');tab('Scenes');page.get_by_role('button',name='PRIVATE_SCENE_TITLE',exact=True).click();assert page.evaluate('__lr.room.name')=='Private Files'
 page.click('#bPhoto');page.wait_for_function('__lr.files.list("Photos").length===1');assert page.locator('#photo.open').count()==1;page.click('#photoClose')
 tap('filecab');tab('Photos');page.locator('.file-more:visible summary').click()
 with page.expect_download() as download:page.get_by_role('button',name='Download',exact=True).click()
 assert Path(download.value.path()).read_bytes().startswith(b'\x89PNG');page.get_by_role('button',name='Open',exact=True).click();assert page.locator('.file-photo').evaluate('e=>e.complete && e.naturalWidth>0');escape()
 # Cabinet fills privately and stays out of photo/timelapse rendering.
 page.wait_for_timeout(1100);assert page.evaluate('''() => {const a=__lr,o=a.view.objs.get(a.room.items.find(i=>i.t==='filecab').id);return o.userData.parts.privateFiles0.visible}''')
 assert page.evaluate('''() => {const v=__lr.view,draw=v.draw;let safe=true;v.draw=function(){safe=[...v.objs.values()].every(o=>Object.entries(o.userData.parts).every(([n,p])=>!n.startsWith('privateFiles')||!p.visible));return draw.call(this)};try{v.snapshot()}finally{v.draw=draw}return safe}''')
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':844});page.click('#bMenu');tab('Settings');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/dashboard-menu-{width}.png');escape();tap('phone');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/dashboard-launcher-{width}.png');page.get_by_role('searchbox').focus();escape();tap('filecab');tab('Letters');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/dashboard-files-{width}.png');escape()
 page.evaluate('__lr.setPhase("night",true)');page.wait_for_function('document.body.classList.contains("night")');tap('filecab');tab('Letters');page.screenshot(path='/tmp/dashboard-files-night.png');escape();page.evaluate('__lr.setPhase("day",true)')
 page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()");page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr');assert page.evaluate('__lr.files.count')==3
 tap('filecab');tab('Photos');page.locator('.file-more:visible summary').click();page.get_by_role('button',name='Delete',exact=True).click();page.get_by_role('button',name='Keep it',exact=True).click();assert page.evaluate('__lr.files.list("Photos").length')==1;page.locator('.file-more:visible summary').click();page.get_by_role('button',name='Delete',exact=True).click();page.get_by_role('button',name='Delete file',exact=True).click();assert page.evaluate('__lr.files.list("Photos").length')==0;escape()
 print('PASS: existing letter integration, rename/download/open, immutable scene save/restore, automatic photos, PNG export, deletion, private cabinet fill and responsive Escape',flush=True)
 page.evaluate('''() => {const a=__lr,p={letters:JSON.parse(localStorage.getItem('lr.letters')),scenes:JSON.parse(localStorage.getItem('lr.scenes')),photos:'PRIVATE_PHOTO_DATA',portals:JSON.parse(localStorage.getItem('lr.portals'))};Object.assign(a.room,p);Object.assign(a.room.items[0],p);}''')
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',code);assert code.startswith('LR1.')
 for value in ['PRIVATE_LETTER','PRIVATE_SCENE','PRIVATE_PHOTO','PRIVATE_APP','lr.letters','lr.scenes','lr.photos','lr.portals']:assert value not in json.dumps(decoded),value
 decor=page.evaluate('LRWidgets.shareDecor(__lr.room.serialize())');context.close()
 fresh=browser.new_context();fresh.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort());fresh.add_init_script("localStorage.setItem('lr.intro','true')");recipient=fresh.new_page();recipient.on('pageerror',lambda e:errors.append(str(e)))
 recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');recipient.wait_for_function('!!window.__lr');recipient.click('#bMenu');recipient.get_by_role('tab',name='Rooms',exact=True).click();recipient.click('#bImportCode');recipient.locator('textarea.code').fill(code);recipient.click('#bOpenCode');recipient.get_by_role('button',name='Visit this room',exact=True).click();recipient.wait_for_function('__lr.room.name==="Private Files"')
 assert recipient.evaluate('__lr.room.items.length')==len(decor['items']);assert recipient.evaluate('__lr.files.count')==0
 for key in ['lr.letters','lr.scenes','lr.photos','lr.portals']:assert recipient.evaluate('k=>localStorage.getItem(k)',key) is None,key
 recipient.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='filecab').id)");assert 'No letters yet' in recipient.locator('#sheetBody').inner_text();recipient.keyboard.press('Escape');assert not errors,errors
 print('PASS: actual LR1 encode/decode and fresh UI import contain furniture, zero file/custom portal data, no errors',flush=True)
 browser.close()
server.shutdown()
