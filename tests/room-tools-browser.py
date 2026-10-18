"""npm run build && python3 tests/room-tools-browser.py. No network, injected local clock."""
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
 context=browser.new_context(viewport={'width':390,'height':844})
 context.add_init_script('''const RealDate=Date;window.__clock=new RealDate('2026-10-15T14:00:00').getTime();window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[window.__clock]))}static now(){return window.__clock}};localStorage.setItem('lr.intro','true')''')
 page=context.new_page();errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None);page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.name='Tool Room';a.room.n=10;a.meta.visitors=false;a.meta.realtime=false;a.meta.phase='day';a.setMode('explore',true);
  for(const [t,x,z] of [['letterbox',1,1],['minifridge',3,1],['ideajar',5,1],['kettle',7,1],['savingsjar',1,4],['sketchbook',4,4]])a.room.add(a.room.make(t,{x,z}));a.changed();a.roomToolsUI.frame(1);window.__decor=JSON.stringify(a.room.serialize());
  window.tapTool=t=>a.interact(a.room.items.find(i=>i.t===t).id);
 }''')
 # Mail snapshots a typewriter letter and hides it until its local delivery date.
 page.evaluate('''() => {__lr.letters.model.add('Tools');__lr.letters.model.update({letterhead:'PRIVATE_LETTERHEAD',body:'<b>PRIVATE_FUTURE_LETTER</b> with a little <i>hope</i>.'});tapTool('letterbox')}''')
 page.get_by_role('button',name='Use my current typewriter letter',exact=True).click();page.locator('#sheet').get_by_label('Subject',exact=True).fill('<img src="https://example.com/PRIVATE_TITLE_LEAK" onerror="window.__toolUnsafe=true"> PRIVATE_ENVELOPE');page.locator('#sheet').get_by_label('Deliver on',exact=True).fill('2026-10-16')
 page.get_by_role('button',name='Send',exact=True).click();assert page.get_by_role('button',name='Read letter',exact=True).count()==0
 assert 'Sealed until 2026-10-16' in page.locator('#sheetBody').inner_text();assert 'PRIVATE_FUTURE_LETTER' not in page.locator('#sheetBody').inner_text()
 page.evaluate('__lr.letters.model.update({letterhead:"Changed",body:"Changed after sealing"})')
 page.keyboard.press('Escape');page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()");page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI')
 page.evaluate("window.tapTool=t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id);tapTool('letterbox')")
 assert 'Sealed until' in page.locator('#sheetBody').inner_text();assert page.get_by_role('button',name='Read letter',exact=True).count()==0
 page.keyboard.press('Escape')
 print('PASS: mailbox seals a private formatted snapshot, retains it across reload and hides the body before delivery',flush=True)
 # The retro email window: header defaults, inline edits, Save draft round-trips the whole compose state, Send seals and clears it.
 page.evaluate("tapTool('letterbox')");win=page.locator('#sheet .mailwin')
 assert win.locator('.mailwin-bar').inner_text().strip()=='Email'
 assert page.locator('#sheet').get_by_label('From',exact=True).input_value()=='crisdalessio@gmail.com';assert page.locator('#sheet').get_by_label('To',exact=True).input_value()=='Future me';assert page.locator('#sheet').get_by_label('Subject',exact=True).input_value()=='A note for future me'
 assert page.locator('#sheet').get_by_label('Deliver on',exact=True).input_value()=='2026-10-22'
 page.locator('#sheet').get_by_label('From',exact=True).click();page.locator('#sheet').get_by_label('From',exact=True).fill('PRIVATE_FROM@example.com');page.locator('#sheet').get_by_label('To',exact=True).fill('Me, next spring')
 page.locator('#sheet').get_by_label('Subject',exact=True).fill('PRIVATE_DRAFT_SUBJECT');page.locator('#sheet').get_by_label('Message',exact=True).fill('Hey!\n\nPRIVATE_DRAFT_BODY. Stay tuned!');page.locator('#sheet').get_by_label('Deliver on',exact=True).fill('2026-10-20')
 page.get_by_role('button',name='Save draft',exact=True).click();assert 'Draft saved' in win.inner_text()
 page.screenshot(path='/tmp/mailbox-compose-mobile.png')
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI')
 page.evaluate("window.tapTool=t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id);tapTool('letterbox')")
 assert 'Draft restored' in page.locator('#sheet .mailwin').inner_text()
 for label,value in [('From','PRIVATE_FROM@example.com'),('To','Me, next spring'),('Subject','PRIVATE_DRAFT_SUBJECT'),('Message','Hey!\n\nPRIVATE_DRAFT_BODY. Stay tuned!'),('Deliver on','2026-10-20')]:
  assert page.locator('#sheet').get_by_label(label,exact=True).input_value()==value,(label,page.locator('#sheet').get_by_label(label,exact=True).input_value())
 # Today and past dates are refused by the date picker; nothing is sealed and the draft stays.
 before=page.locator('.mailwin-letter').count()
 for bad in ['2026-10-15','2026-10-01']:
  page.locator('#sheet').get_by_label('Deliver on',exact=True).fill(bad);page.get_by_role('button',name='Send',exact=True).click();assert page.locator('.mailwin-letter').count()==before;assert page.evaluate('!!__lr.roomTools.mailDraft')
 page.locator('#sheet').get_by_label('Deliver on',exact=True).fill('2026-10-20');page.get_by_role('button',name='Send',exact=True).click()
 card=page.locator('.mailwin-letter',has_text='PRIVATE_DRAFT_SUBJECT');assert card.count()==1;assert 'Sealed until 2026-10-20' in card.inner_text();assert 'PRIVATE_DRAFT_BODY' not in page.locator('#sheetBody').inner_text()
 assert page.evaluate('__lr.roomTools.mailDraft')==None;assert page.locator('#sheet').get_by_label('Subject',exact=True).input_value()=='A note for future me';assert page.locator('#sheet').get_by_label('Message',exact=True).input_value()==''
 assert page.locator('#sheet').get_by_label('From',exact=True).input_value()=='PRIVATE_FROM@example.com'
 assert page.evaluate("document.documentElement.scrollWidth<=innerWidth && document.querySelector('#sheet .mailwin').getBoundingClientRect().right<=innerWidth")
 page.screenshot(path='/tmp/mailbox-sent-mobile.png');page.keyboard.press('Escape')
 assert not errors,errors
 print('PASS: retro email window: defaults, inline edits, Save draft restores across reload, past dates refused, Send seals and clears the draft at 390px',flush=True)
 # The fridge is for groceries, with no French session attached.
 page.evaluate("tapTool('minifridge')");page.locator('#sheet').get_by_label('Add groceries',exact=True).fill('PRIVATE_MILK');page.get_by_role('button',name='Add to list',exact=True).click()
 page.locator('#sheet').get_by_label('Add groceries',exact=True).fill('Eggs');page.get_by_role('button',name='Add to list',exact=True).click();page.get_by_role('checkbox',name='PRIVATE_MILK',exact=True).check()
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI')
 page.evaluate("window.tapTool=t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id);tapTool('minifridge')")
 assert page.get_by_role('checkbox',name='PRIVATE_MILK',exact=True).is_checked()
 page.get_by_role('button',name='Clear checked items',exact=True).click();assert page.get_by_role('checkbox').count()==1
 assert page.get_by_role('button',name='French word flashcard',exact=True).count()==0;assert not page.evaluate('__lr.french.active');page.keyboard.press('Escape')
 print('PASS: fridge groceries add/check/clear/reload; no French flashcards in groceries',flush=True)
 # Idea jar handles empty state, two ideas and non-repeating shakes.
 page.evaluate("tapTool('ideajar')");assert page.get_by_role('button',name='Shake the jar',exact=True).is_disabled()
 for idea in ['PRIVATE_APP_IDEA','A tiny offline game']:
  page.get_by_role('button',name='Drop in an idea',exact=True).click();page.locator('#sheet').get_by_label('A little idea',exact=True).fill(idea);page.get_by_role('button',name='Drop in jar',exact=True).click()
 page.get_by_role('button',name='Shake the jar',exact=True).click();first=page.locator('.idea-card-text').inner_text();page.get_by_role('button',name='Shake the jar',exact=True).click();assert page.locator('.idea-card-text').inner_text()!=first;page.keyboard.press('Escape')
 # Savings uses cents and fills only private coin parts, not the room model.
 page.evaluate("tapTool('savingsjar');window.__wallet=__lr.shop.balance")
 page.locator('#sheet').get_by_label('Goal name',exact=True).fill('PRIVATE_GOAL');page.locator('#sheet').get_by_label('Target amount',exact=True).fill('100.00');page.get_by_role('button',name='Save goal',exact=True).click()
 for value in ['0.10','0.20','24.70']:
  page.locator('#sheet').get_by_label('Deposit amount',exact=True).fill(value);page.locator('#sheet').get_by_label('Deposit note',exact=True).fill('PRIVATE_DEPOSIT');page.get_by_role('button',name='Log deposit',exact=True).click()
 assert '25.00 of 100.00' in page.locator('#sheetBody').inner_text();assert page.evaluate('__lr.shop.balance===__wallet')
 page.evaluate('__lr.roomToolsUI.frame(1)');assert page.evaluate('''() => {const a=__lr,p=a.view.objs.get(a.room.items.find(i=>i.t==='savingsjar').id).userData.parts;return Array.from({length:8},(_,i)=>p['privateCoin'+i].visible)}''')==[True,True,False,False,False,False,False,False]
 # Capture rendering must not expose a private coin level or unread-mail flag.
 assert page.evaluate('''() => {const v=__lr.view,draw=v.draw;let leaked=false;v.draw=function(){leaked=[...v.objs.values()].some(o=>Object.entries(o.userData.parts).some(([n,p])=>n.startsWith('private')&&p.visible));return draw.call(this)};try{v.snapshot();}finally{v.draw=draw;}return !leaked;}''')
 assert page.evaluate('''() => {const v=__lr.view;v.beginCapture(160,200);__lr.roomToolsUI.frame(1);const safe=[...v.objs.values()].every(o=>Object.entries(o.userData.parts).every(([n,p])=>!n.startsWith('private')||!p.visible));v.endCapture();__lr.roomToolsUI.frame(1);return safe;}''')
 page.screenshot(path='/tmp/savings-tool-mobile.png');page.keyboard.press('Escape')
 print('PASS: idea shake avoids repeats; exact-cent savings deposits fill coin levels and never charge Fireflies',flush=True)
 # Timer persists an absolute deadline, preserves garden tea, and completes once.
 page.evaluate('''() => {__lr.meta.herbs=1;tapTool('kettle');window.__teaChimes=0;const f=__lr.Sound.ritualChime;__lr.Sound.ritualChime=function(){__teaChimes++;return f.call(this)}}''')
 page.get_by_role('button',name='Green tea · 2 min',exact=True).click();page.get_by_role('button',name='Brew tea',exact=True).click();assert page.evaluate('__lr.meta.herbs')==0
 assert page.evaluate('__lr.meta.tea.until>Date.now()');page.evaluate('window.__clock+=61000;__lr.roomToolsUI.tick(true)');assert '0:59' in page.locator('.roomtool-timer').inner_text()
 page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI')
 # Reload resets our test clock, but the saved absolute end time remains identical.
 page.evaluate('''() => {window.tapTool=t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id);window.__clock=__lr.roomTools.tea.endAt+1;window.__teaChimes=0;const f=__lr.Sound.ritualChime;__lr.Sound.ritualChime=function(){__teaChimes++;return f.call(this)};__lr.roomToolsUI.tick(true);__lr.roomToolsUI.tick(true);tapTool('kettle')}''')
 assert page.evaluate('__teaChimes')==1;assert 'Your tea is ready' in page.locator('.tea-note').inner_text();page.get_by_role('button',name='Enjoy the tea',exact=True).click();page.keyboard.press('Escape')
 print('PASS: tea survives reload/background elapsed time, preserves herb brewing and chimes exactly once',flush=True)
 # The replacement grid uses native pointer drawing and survives reload.
 page.evaluate("tapTool('sketchbook')");canvas=page.locator('.pixel-grid');canvas.scroll_into_view_if_needed();box=canvas.bounding_box();page.mouse.click(box['x']+box['width']*.4,box['y']+box['height']*.4);assert page.evaluate('__lr.roomTools.pixels.grid.cells.some(c=>c>=0)');page.locator('#sheetBody').get_by_role('button',name='Undo',exact=True).click();assert page.evaluate('__lr.roomTools.pixels.grid.cells.every(c=>c<0)');page.get_by_role('button',name='Redo',exact=True).click();grid=page.evaluate('__lr.roomTools.pixels.grid');page.keyboard.press('Escape');page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.roomToolsUI');assert page.evaluate('__lr.roomTools.pixels.grid')==grid
 # Delivery after local midnight raises the flag; opening the letter lowers it again.
 page.evaluate('''() => {window.tapTool=t=>__lr.interact(__lr.room.items.find(i=>i.t===t).id);window.__clock=new Date('2026-10-16T00:00:00').getTime();__lr.roomToolsUI.tick(true);__lr.roomToolsUI.frame(1);tapTool('letterbox')}''')
 assert page.evaluate('''() => {const a=__lr;return a.view.objs.get(a.room.items.find(i=>i.t==='letterbox').id).userData.parts.privateMailFlag.visible}''')
 page.get_by_role('button',name='Read letter',exact=True).click();assert 'PRIVATE_FUTURE_LETTER' in page.locator('.roomtool-letter').inner_text();assert page.locator('.roomtool-letter b').count()==1
 assert page.locator('#sheetBody img').count()==0;assert page.evaluate('!window.__toolUnsafe')
 page.evaluate('__lr.roomToolsUI.frame(1)');assert page.evaluate('''() => {const a=__lr;return !a.view.objs.get(a.room.items.find(i=>i.t==='letterbox').id).userData.parts.privateMailFlag.visible}''')
 page.keyboard.press('Escape');page.evaluate('__lr.setMode("edit",true);__lr.roomToolsUI.frame(1)')
 # The fridge now owns a grocery-tool badge instead of a French-widget badge.
 assert page.locator('.roomtool-private:not([hidden])').count()==6
 page.evaluate('''() => {__lr.setMode('explore',true);__lr.room.name='Private Tools';__lr.room.tools=__lr.roomTools.state;__lr.room.items[0].tools=__lr.roomTools.state;}''')
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('code=>__lr.readCode(code)',code)
 assert len(decoded['items'])==6
 for secret in ['PRIVATE','groceries','deliverOn','endAt','strokes','points','deposits','lr.tools']:assert secret not in json.dumps(decoded),secret
 context.close();fresh=browser.new_context();fresh.add_init_script("localStorage.setItem('lr.intro','true')");recipient=fresh.new_page();recipient.on('pageerror',lambda e:errors.append(str(e)))
 recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');recipient.wait_for_function('!!window.__lr')
 recipient.click('#bMenu');recipient.get_by_role('tab',name='Rooms',exact=True).click();recipient.click('#bImportCode');recipient.locator('textarea.code').fill(code);recipient.click('#bOpenCode');recipient.wait_for_function('__lr.room.name==="Private Tools"')
 assert recipient.evaluate('localStorage.getItem("lr.tools")') is None
 assert recipient.evaluate('__lr.roomTools.visual.level')==0;assert not errors,errors;assert not external,external
 print('PASS: sketch persistence/redraw/mobile, local-date delivery/read flag, private edit badges, and fresh LR1 import containing furniture but zero tool data',flush=True)
 browser.close()
server.shutdown()
