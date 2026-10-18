"""npm run build && python3 tests/letters-browser.py. Local writing, downloads, native bridge and LR1 privacy."""
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
 page=context.new_page();errors=[];outbound=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:outbound.append(r.url) if not r.url.startswith(('http://127.0.0.1:','blob:','data:')) else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.letters')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='Letter Room';a.setMode('explore',true);a.room.add(a.room.make('vintagetypewriter',{x:4,z:4}));a.changed();a.view.setPhase('day',true);a.view.frame(.1,a.view.t+.1);
  window.__sounds={clacks:[],bells:0,returns:0};const S=a.Sound,clack=S.clack,bell=S.typeBell,carriage=S.carriageReturn;
  S.clack=function(...args){__sounds.clacks.push(args);return clack.apply(this,args)};S.typeBell=function(...args){__sounds.bells++;return bell.apply(this,args)};S.carriageReturn=function(...args){__sounds.returns++;return carriage.apply(this,args)};
 }''')
 point=page.evaluate('''() => {const a=__lr,it=a.room.items[0],p=a.view.root.localToWorld(a.view.itemPoint(it.id,[8,5,4])).project(a.view.cam),r=a.view.r.domElement.getBoundingClientRect(),x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;for(let dy=-15;dy<=15;dy+=3)for(let dx=-15;dx<=15;dx+=3)if(a.view.pickItem(x+dx,y+dy)?.id===it.id)return {x:x+dx,y:y+dy};throw Error('no typewriter target')}''')
 page.mouse.click(point['x'],point['y']);page.locator('#lettersView').wait_for(state='visible')
 assert page.evaluate('__lr.letters.active && __lr.Sound.writing')
 assert page.evaluate('__sounds.returns')==1 and page.evaluate('__sounds.clacks[0]')==[1,False]
 win=page.locator('#lettersView .mailwin');assert win.locator('.mailwin-typewriter').count()==1;assert 'Typewriter' in win.locator('.mailwin-name').text_content()
 assert page.locator('.letter-machine .letter-roller').count()==1;assert page.locator('.letter-keyboard').get_attribute('aria-hidden')=='true';assert page.locator('.letter-machine .letter-tools').count()==1;assert page.locator('.letter-machine #letterSave').count()==1
 assert page.locator('#letterKeyboard').count()==0;assert page.locator('#lettersView').evaluate('e=>e.closest("#sheetBody")!==null && getComputedStyle(e).position==="relative"');assert page.locator('#sheetBody > .grab').count()==1;assert page.locator('#letterClose svg').count()==1
 assert page.locator('#lettersView').get_by_label('From',exact=True).input_value()=='crisdalessio@gmail.com'
 assert page.locator('#lettersView').get_by_label('To',exact=True).input_value()=='Me'
 subject=page.locator('#lettersView').get_by_label('Subject',exact=True);body=page.locator('#letterBody')
 assert 'Letter Room' in page.evaluate('__lr.letters.model.get().letterhead')
 assert 'crisdalessio@gmail.com' not in page.evaluate('localStorage.getItem("lr.letters")')
 subject.fill('PRIVATE_LETTERHEAD');body.click();page.keyboard.type('PRIVATE_LETTER_BODY Dear friend, ',delay=12)
 for label,text in [('Bold','bold words'),('Italic','italic words'),('Underline','underlined words')]:
  page.get_by_role('button',name=label,exact=True).click();page.keyboard.type(text,delay=12);page.get_by_role('button',name=label,exact=True).click();page.keyboard.type(' ')
 page.get_by_role('button',name='Date stamp',exact=True).click()
 assert 'October 15, 2026' in body.inner_text()
 assert body.locator('b,strong').filter(has_text='bold words').count()>=1
 assert body.locator('i,em').filter(has_text='italic words').count()>=1
 assert body.locator('u').filter(has_text='underlined words').count()>=1
 page.wait_for_function('localStorage.getItem("lr.letters")?.includes("underlined words")')
 assert page.evaluate('__sounds.clacks.length')<len(body.inner_text())
 assert page.evaluate('__sounds.clacks.every(c=>c[0]===1 && c[1]===false)')
 # Actual wrapping, not a character-count approximation, rings the carriage bell.
 page.evaluate('window.__bellBefore=__sounds.bells');body.click();page.keyboard.press('Control+End');page.keyboard.type(' The paper carries a very long sentence past its right margin and onto another line. '*3,delay=14)
 assert page.evaluate('__sounds.bells>__bellBefore')
 page.evaluate('__lr.Sound.setMusic(true)');assert page.evaluate('__lr.Sound.music && __lr.Sound.writing')
 page.screenshot(path='/tmp/typewriter-letter-mobile.png')
 # Reload immediately after the last input, before the debounce can run.
 page.keyboard.type(' RELOAD_TAIL');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.letters')
 page.evaluate('__lr.interact(__lr.room.items[0].id)')
 # The working room may have been replaced on reload before its ordinary decor autosave.
 if not page.evaluate('__lr.letters.active'):page.evaluate('__lr.letters.open()')
 body=page.locator('#letterBody');assert 'RELOAD_TAIL' in body.inner_text();assert subject.input_value()=='PRIVATE_LETTERHEAD'
 assert 'Letter Room' in page.evaluate('__lr.letters.model.get().letterhead')
 assert body.locator('b,strong').filter(has_text='bold words').count()>=1
 print('PASS: real typewriter tap, pixel window, subject title, B/I/U, cursor date, throttled clacks, actual-wrap bell, music and immediate-reload autosave',flush=True)
 # Paste only the three supported styles. No scripts, remote images, links or event handlers survive.
 page.evaluate('''() => {const b=document.querySelector('#letterBody');b.focus();document.execCommand('selectAll');const d=new DataTransfer();d.setData('text/html','<p>PRIVATE_LETTER_BODY <strong>Bonjour</strong> <span style="font-style:italic;text-decoration:underline">café</span><img src="https://example.com/LETTER_LEAK" onerror="window.__unsafe=1"><script>window.__unsafe=2</script><a href="javascript:alert(1)">safe text</a></p>');d.setData('text/plain','PRIVATE_LETTER_BODY Bonjour café safe text');b.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true,cancelable:true}));}''')
 assert page.evaluate('!window.__unsafe')
 assert body.locator('img,script,a,iframe,[style],[onerror]').count()==0
 assert body.locator('strong,b').count()>=1 and body.locator('i,em').count()>=1 and body.locator('u').count()>=1
 with page.expect_download() as downloaded:page.get_by_role('button',name='Save as file',exact=True).click()
 download=downloaded.value;assert download.suggested_filename=='letter-2026-10-15.html';download.save_as('/tmp/letter-2026-10-15.html')
 html=Path('/tmp/letter-2026-10-15.html').read_text();assert 'café' in html and 'PRIVATE_LETTERHEAD' in html and 'Letter Room' in html and '<style>' in html
 assert 'LETTER_LEAK' not in html and '<script>' not in html and 'javascript:' not in html
 exported=context.new_page();exported.set_content(html)
 assert 'Bonjour' in exported.locator('article').inner_text()
 assert exported.locator('strong,b').first.evaluate('e=>Number(getComputedStyle(e).fontWeight)>=600')
 assert exported.locator('i,em').first.evaluate('e=>getComputedStyle(e).fontStyle')=='italic'
 assert 'underline' in exported.locator('u').first.evaluate('e=>getComputedStyle(e).textDecorationLine')
 exported.close()
 # Native branch sends the same UTF-8 HTML to Android's document picker plugin.
 page.evaluate('''() => {window.__cap=window.Capacitor;window.__native=[];window.Capacitor={isNativePlatform:()=>true,registerPlugin:name=>({save:async data=>{__native.push({name,...data});return {saved:true}}})};}''')
 page.get_by_role('button',name='Save as file',exact=True).click();page.wait_for_function('__native.length===1')
 native=page.evaluate('__native[0]');assert native['name']=='LetterFiles' and native['filename']=='letter-2026-10-15.html' and native['html']==html
 page.evaluate('''() => {window.Capacitor.registerPlugin=()=>({save:async()=>({saved:false})})}''')
 page.get_by_role('button',name='Save as file',exact=True).click();page.wait_for_function('document.querySelector("#letterStatus").textContent==="Export cancelled"')
 page.evaluate('''() => {window.Capacitor.registerPlugin=()=>({save:async()=>{throw Error('provider unavailable')}})}''')
 page.get_by_role('button',name='Save as file',exact=True).click();page.wait_for_function('document.querySelector("#letterStatus").textContent.includes("Your draft is still here")')
 assert page.evaluate('localStorage.getItem("lr.letters").includes("Bonjour")')
 page.evaluate('window.Capacitor=__cap')
 print('PASS: sanitized rich paste; readable standalone HTML download with intact formatting/UTF-8; Android file-picker bridge receives identical HTML',flush=True)
 # Letters list rename/open/delete is separate from room names and room undo.
 page.get_by_role('button',name='Letters',exact=True).click();assert page.locator('#letterList .letter-stack').count()==1
 assert page.evaluate('''() => {const stack=getComputedStyle(document.querySelector('.letter-stack')),input=getComputedStyle(document.querySelector('.letter-row input'));return stack.borderTopWidth==='2px' && /vt323|monospace|courier/i.test(input.fontFamily)}''')
 rename=page.locator('.letter-row input').first;rename.fill('PRIVATE_LETTER_TITLE');rename.press('Tab')
 page.get_by_role('button',name='New letter',exact=True).click();body.fill('SECOND_PRIVATE_DRAFT');page.get_by_role('button',name='Letters',exact=True).click()
 page.get_by_role('button',name='Open PRIVATE_LETTER_TITLE',exact=True).click();assert 'Bonjour' in body.inner_text()
 page.get_by_role('button',name='Letters',exact=True).click();second=page.locator('.letter-row').filter(has=page.get_by_role('button',name='Delete Untitled letter',exact=True))
 second.get_by_role('button',name='Delete Untitled letter',exact=True).click();second.get_by_role('button',name='Delete Untitled letter',exact=True).click()
 assert page.locator('.letter-row').count()==1;page.keyboard.press('Escape');assert page.evaluate('__lr.letters.active')
 for width,height in [(320,844),(390,400),(1280,844)]:
  page.set_viewport_size({'width':width,'height':height});body.click();page.keyboard.press('Control+End')
  bounds=page.locator('.letter-tools').bounding_box();assert bounds['y']>=0 and bounds['y']+bounds['height']<=height
  assert page.evaluate('''() => {const scroll=document.querySelector('#letterScroll').getBoundingClientRect(),sheet=document.querySelector('#sheetBody').getBoundingClientRect();return scroll.height>0 && scroll.height<=innerHeight*.49 && sheet.top>0}''')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  for phase in ['day','night']:
   page.evaluate('phase=>__lr.view.setPhase(phase,true)',phase)
   assert page.locator('#lettersView .mailwin').evaluate('e=>getComputedStyle(e).borderTopWidth')=='0px'
   assert page.locator('.letter-tools button').first.evaluate('e=>e.getBoundingClientRect().height>=44')
   page.screenshot(path=f'/tmp/paper-typewriter-{phase}-{width}-{height}.png')
 page.keyboard.press('Escape');assert page.evaluate('!__lr.letters.active && !__lr.Sound.writing')
 # Send to future opens the real mailbox window with a snapshot, then a later edit stays behind.
 page.evaluate('__lr.letters.open()')
 page.evaluate('''() => { HTMLInputElement.prototype.showPicker=function(){this.setAttribute('data-picker','opened');this.focus()}; }''')
 page.locator('#letterSend').click();page.locator('#sheet.open .mailwin').wait_for()
 assert page.locator('#lettersView').is_hidden()
 assert page.locator('#sheet .mailwin-envelope').count()==1 and page.locator('#sheet .letter-tools').count()==0
 assert 'Email' in page.locator('#sheet .mailwin-name').inner_text()
 due=page.locator('#sheet input[type=date]');assert due.get_attribute('data-picker')=='opened' and due.input_value()
 mail=page.locator('#sheet textarea.mailwin-body');assert mail.evaluate('el=>el.readOnly');assert 'PRIVATE_LETTER_BODY' in mail.input_value()
 page.evaluate('''() => {const m=__lr.letters.model,cur=m.get();m.update({letterhead:cur.letterhead,body:'<p>EDITED_LATER</p>',title:'Edited later'})}''')
 assert 'PRIVATE_LETTER_BODY' in mail.input_value() and 'EDITED_LATER' not in mail.input_value()
 page.locator('#sheet button.mailwin-send').click()
 page.wait_for_function('''() => {const m=__lr.roomTools.state.mail[0];return !!m && m.status==="sealed" && m.html.includes("PRIVATE_LETTER_BODY") && !m.html.includes("EDITED_LATER") && !m.body.includes("EDITED_LATER")}''')
 page.keyboard.press('Escape')
 page.evaluate('''() => {const a=__lr;a.room.name='Letter Share';a.room.items=[];a.room.add(a.room.make('vintagetypewriter',{x:4,z:4}));a.room.letters={body:'PRIVATE_LETTER_BODY'};a.room.items[0].draft={body:'PRIVATE_LETTER_BODY'};a.changed();}''')
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('code=>__lr.readCode(code)',code)
 assert decoded['items'][0]['t']=='vintagetypewriter';assert 'PRIVATE_LETTER' not in json.dumps(decoded) and 'SECOND_PRIVATE' not in json.dumps(decoded) and 'EDITED_LATER' not in json.dumps(decoded)
 context.close()
 fresh=browser.new_context();fresh.add_init_script("localStorage.setItem('lr.intro','true')");recipient=fresh.new_page();recipient.on('pageerror',lambda e:errors.append(str(e)))
 recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');recipient.wait_for_function('!!window.__lr')
 recipient.click('#bMenu');recipient.get_by_role('tab',name='Rooms',exact=True).click();recipient.click('#bImportCode');recipient.locator('textarea.code').fill(code);recipient.click('#bOpenCode');recipient.get_by_role('button',name='Visit this room',exact=True).click();recipient.wait_for_function('__lr.room.name==="Letter Share"')
 assert recipient.evaluate('localStorage.getItem("lr.letters")') is None
 assert 'PRIVATE_LETTER' not in recipient.evaluate('JSON.stringify(localStorage)')
 assert not errors,errors;assert not outbound,outbound
 print('PASS: letters list rename/open/delete, mobile/keyboard-height toolbar, Escape, and LR1 fresh import without any letter text or new remote requests',flush=True)
 browser.close()
server.shutdown()
