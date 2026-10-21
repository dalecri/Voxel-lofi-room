"""npm run build && python3 tests/letters-browser.py. Notetaker: checklists, autosave, safe paste, export, native bridge and privacy."""
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
 context.add_init_script("const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:['2026-10-15T14:00:00']))}static now(){return new RealDate('2026-10-15T14:00:00').getTime()}};localStorage.setItem('lr.intro','true')")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[];outbound=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:outbound.append(r.url) if not r.url.startswith(('http://127.0.0.1:','blob:','data:')) else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.letters');page.evaluate('__lr.renderLoop.stop()')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='Letter Room';a.setMode('explore',true);a.room.add(a.room.make('vintagetypewriter',{x:4,z:4}));a.changed();a.view.setPhase('day',true);a.view.frame(.1,a.view.t+.1);
  window.__sounds={clacks:[],bells:0,returns:0};const S=a.Sound,clack=S.clack,bell=S.typeBell,carriage=S.carriageReturn;
  S.clack=function(...args){__sounds.clacks.push(args);return clack.apply(this,args)};S.typeBell=function(...args){__sounds.bells++;return bell.apply(this,args)};S.carriageReturn=function(...args){__sounds.returns++;return carriage.apply(this,args)};
 }''')
 point=page.evaluate('''() => {const a=__lr,it=a.room.items[0],p=a.view.root.localToWorld(a.view.itemPoint(it.id,[8,5,4])).project(a.view.cam),r=a.view.r.domElement.getBoundingClientRect(),x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;for(let dy=-15;dy<=15;dy+=3)for(let dx=-15;dx<=15;dx+=3)if(a.view.pickItem(x+dx,y+dy)?.id===it.id)return {x:x+dx,y:y+dy};throw Error('no typewriter target')}''')
 page.mouse.click(point['x'],point['y']);page.locator('#lettersView').wait_for(state='visible')
 assert page.evaluate('__lr.letters.active && __lr.Sound.writing')
 sheet=page.locator('#sheetBody');body=page.locator('#letterBody');title=page.locator('#noteTitle')
 # Notes look: honey-gold header and toolbar, big bold title, docked to the bottom edge.
 assert page.locator('#sheetBody > h2').inner_text()=='Notetaker'
 assert page.get_by_role('button',name='All notes',exact=True).is_visible();assert page.get_by_role('button',name='Save as file',exact=True).is_visible();assert page.get_by_role('button',name='More',exact=True).is_visible()
 assert [b.get_attribute('aria-label') for b in page.locator('.note-toolbar > button,.note-toolbar > .note-more-wrap > button').all()]==['Checklist','Save as file','More','New note'];assert page.locator('#noteCamera,#noteAttach,#notePhoto').count()==0
 page.wait_for_function('(()=>{const r=document.querySelector("#sheetBody").getBoundingClientRect();return Math.abs(r.bottom-innerHeight)<2 && r.top>0})()')
 assert title.evaluate('e=>Number(getComputedStyle(e).fontWeight)>=700 && parseFloat(getComputedStyle(e).fontSize)>=26')
 assert page.locator('.note-toolbar button').first.evaluate('e=>getComputedStyle(e).color')=='rgb(210, 166, 90)'
 assert body.evaluate('e=>e.classList.contains("is-empty")')
 assert page.locator('.note-toolbar > button,.note-toolbar > .note-more-wrap > button').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44)')
 # Title, then a checklist with ticks that save.
 title.fill('PRIVATE_NOTE_TITLE');title.press('Enter');assert body.evaluate('e=>e===document.activeElement')
 page.click('#noteChecklist')
 for i,t in enumerate(['PRIVATE_ITEM_ONE','second thing','third thing']):
  page.keyboard.type(t,delay=5)
  if i<2:page.keyboard.press('Enter')
 items=body.locator('ul li');assert items.count()==3
 b=items.nth(0).bounding_box();page.mouse.click(b['x']+12,b['y']+14);assert items.nth(0).get_attribute('data-checked')=='true'
 page.mouse.click(b['x']+12,b['y']+14);assert items.nth(0).get_attribute('data-checked') is None;page.mouse.click(b['x']+12,b['y']+14)
 # Ctrl+Enter ticks the item under the caret.
 items.nth(1).click();page.keyboard.press('Control+Enter');assert items.nth(1).get_attribute('data-checked')=='true'
 assert page.locator('#noteChecklist').get_attribute('aria-pressed')=='true'
 page.wait_for_function('localStorage.getItem("lr.letters")?.includes("data-checked")')
 page.screenshot(path='/tmp/notetaker-list-mobile.png')
 # Reload straight after typing: the pagehide flush keeps the tail.
 items.nth(2).click();page.keyboard.press('End');page.keyboard.type(' RELOAD_TAIL');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.letters');page.evaluate('__lr.renderLoop.stop()')
 page.evaluate('__lr.letters.open()');body=page.locator('#letterBody');assert 'RELOAD_TAIL' in body.inner_text();assert page.locator('#noteTitle').input_value()=='PRIVATE_NOTE_TITLE'
 assert body.locator('li[data-checked=true]').count()==2;assert 'Letter Room' in page.evaluate('__lr.letters.model.get().letterhead')
 print('PASS: furniture tap opens the Notetaker; notes look; title; checklists tick by tap and Ctrl+Enter; immediate-reload autosave',flush=True)
 # Paste keeps simple styles and lists; scripts, handlers and remote images never survive.
 page.evaluate('''() => {const b=document.querySelector('#letterBody');b.focus();const r=document.createRange();r.selectNodeContents(b);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r);const d=new DataTransfer();d.setData('text/html','<p>PRIVATE_PASTE <strong>Bonjour</strong> <span style="font-style:italic">café</span><img src="https://example.com/NOTE_LEAK" onerror="window.__unsafe=1"><a href="javascript:window.__unsafe=1">x</a><script>window.__unsafe=1</script></p><ul><li data-checked="true" onclick="window.__unsafe=1">pasted done</li></ul>');b.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true,cancelable:true}));}''')
 assert page.evaluate('!window.__unsafe');assert body.locator('script,a,iframe,[style],[onerror],[onclick]').count()==0
 assert body.locator('img[src^="https:"]').count()==0;assert body.locator('li[data-checked=true]').filter(has_text='pasted done').count()==1
 assert body.locator('strong,b').filter(has_text='Bonjour').count()==1
 print('PASS: sanitized paste keeps lists, drops remote images and scripts',flush=True)
 # Save as file: a standalone page in the same notes look.
 with page.expect_download() as downloaded:page.get_by_role('button',name='Save as file',exact=True).click()
 download=downloaded.value;assert download.suggested_filename=='note-2026-10-15.html';download.save_as('/tmp/note-2026-10-15.html')
 html=Path('/tmp/note-2026-10-15.html').read_text();assert 'PRIVATE_NOTE_TITLE' in html and 'café' in html and 'Letter Room' in html and 'data-checked="true"' in html
 assert 'NOTE_LEAK' not in html and '<script>' not in html and 'javascript:' not in html
 exported=context.new_page();exported.set_content(html);assert 'PRIVATE_ITEM_ONE' in exported.locator('article').inner_text();assert exported.locator('li[data-checked=true]').count()>=2;exported.close()
 page.evaluate('''() => {window.__cap=window.Capacitor;window.__native=[];window.Capacitor={isNativePlatform:()=>true,registerPlugin:name=>({save:async data=>{__native.push({name,...data});return {saved:true}}})};}''')
 page.get_by_role('button',name='Save as file',exact=True).click();page.wait_for_function('__native.length===1')
 native=page.evaluate('__native[0]');assert native['name']=='LetterFiles' and native['filename']=='note-2026-10-15.html' and native['html']==html
 page.evaluate('''() => {window.Capacitor.registerPlugin=()=>({save:async()=>({saved:false})})}''')
 page.get_by_role('button',name='Save as file',exact=True).click();page.wait_for_function('document.querySelector("#letterStatus").textContent==="Export cancelled"')
 page.evaluate('''() => {window.Capacitor.registerPlugin=()=>({save:async()=>{throw Error('provider unavailable')}})}''')
 page.get_by_role('button',name='Save as file',exact=True).click();page.wait_for_function('document.querySelector("#letterStatus").textContent.includes("Your note is still here")')
 page.evaluate('window.Capacitor=__cap')
 print('PASS: standalone HTML export in the notes look; Android file-picker bridge receives identical HTML; cancel and failure keep the note',flush=True)
 # More menu: Escape closes only the menu; arrows move between items.
 page.click('#noteMore');menu=page.locator('.note-menu');assert menu.is_visible();assert page.get_by_role('menuitem',name='Send to future you',exact=True).evaluate('e=>e===document.activeElement')
 page.keyboard.press('ArrowDown');assert page.get_by_role('menuitem',name='Delete note',exact=True).evaluate('e=>e===document.activeElement')
 page.keyboard.press('Escape');assert menu.is_hidden();assert page.evaluate('__lr.letters.active');assert page.locator('#noteMore').evaluate('e=>e===document.activeElement')
 # All notes: a second note, open, delete with a confirm.
 page.click('#letterNew');assert page.locator('#noteTitle').input_value()=='';assert page.locator('#noteTitle').evaluate('e=>e===document.activeElement')
 page.locator('#noteTitle').fill('Second note');page.locator('#letterBody').fill('Other words');page.evaluate('__lr.letters.flush()')
 page.get_by_role('button',name='All notes',exact=True).click();rows=page.locator('.note-row');assert rows.count()==2;assert page.locator('#noteCount').inner_text().startswith('2 notes')
 assert page.locator('.note-toolbar #noteChecklist').evaluate('e=>getComputedStyle(e).visibility')=='hidden'
 page.get_by_role('button',name='Open PRIVATE_NOTE_TITLE',exact=True).click();assert page.locator('#noteTitle').input_value()=='PRIVATE_NOTE_TITLE';assert page.locator('.note-list').is_hidden()
 page.get_by_role('button',name='All notes',exact=True).click();d=page.get_by_role('button',name='Delete Second note',exact=True);d.click();assert d.inner_text()=='Delete?';d.click();assert rows.count()==1
 page.keyboard.press('Escape');assert page.locator('.note-list').is_hidden();assert page.evaluate('__lr.letters.active')
 # Delete from the menu asks twice and leaves a fresh note.
 page.click('#noteMore');page.get_by_role('menuitem',name='Delete note',exact=True).click();assert page.get_by_role('menuitem',name='Delete for good?',exact=True).count()==1;page.keyboard.press('Escape')
 print('PASS: More menu keys; new note; All notes open/delete with confirm; Escape steps back before closing',flush=True)
 # Sizes, themes and night: no overflow, toolbar inside the screen.
 for phase in ['day','night']:
  page.evaluate('phase=>{__lr.setPhase(phase,true);__lr.view.setPhase(phase,true)}',phase)
  for width,height in [(320,844),(390,400),(1280,844)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert sheet.evaluate('e=>e.scrollWidth<=e.clientWidth')
   assert page.locator('#letterNew').bounding_box()['y']+page.locator('#letterNew').bounding_box()['height']<=height+1
   assert page.locator('#letterScroll').bounding_box()['height']>=40
   page.screenshot(path=f'/tmp/notetaker-{phase}-{width}-{height}.png')
 page.set_viewport_size({'width':390,'height':844})
 page.evaluate("document.body.dataset.toolTheme='dark'");assert sheet.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(38, 40, 80)';page.evaluate("document.body.dataset.toolTheme='pastel'")
 # Close returns focus; nothing private reaches a shared room code.
 page.click('#letterClose');assert not page.evaluate('__lr.letters.active || __lr.Sound.writing')
 code=page.evaluate('__lr.roomCode()');raw=json.dumps(page.evaluate('code=>__lr.readCode(code)',code))+str(code)
 assert all(s not in raw for s in ['PRIVATE_NOTE_TITLE','PRIVATE_ITEM_ONE','PRIVATE_PASTE'])
 assert not outbound,outbound;assert not errors,errors
 browser.close()
server.shutdown()
print('PASS: Notetaker sizes day/night, dark tool colors, close, private notes stay out of room codes, no network, no errors',flush=True)
