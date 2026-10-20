"""npm run build && python3 tests/french-browser.py. Offline Wordnest cards, a paper desk, and today's word."""
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
 context=browser.new_context(viewport={'width':390,'height':844})
 context.add_init_script("localStorage.setItem('lr.intro','true')")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'exportedFrom':'TwoStoryCaptions','clips':[]}) if 'twostorycaptions.json' in r.request.url else r.abort())
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
 page.wait_for_function('!!window.__lr?.french && window.LRFrench')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='French Room';a.setMode('explore',true);a.room.add(a.room.make('frenchdesk',{x:2,z:2}));a.room.add(a.room.make('minifridge',{x:6,z:2}));a.changed();}''')
 # Fridge opens groceries with its sound and magnets, never French.
 page.evaluate("window.fridgeSounds=[];const oldFridge=__lr.Sound.fridge;__lr.Sound.fridge=(on)=>{fridgeSounds.push(on);oldFridge.call(__lr.Sound,on)};__lr.interact(__lr.room.items.find(i=>i.t==='minifridge').id)")
 assert page.get_by_role('textbox',name='Add groceries',exact=True).is_visible();assert page.get_by_role('button',name='Photo magnets',exact=True).is_visible();assert page.get_by_role('button',name='French word flashcard',exact=True).count()==0;assert not page.evaluate('__lr.french.active');assert page.evaluate('fridgeSounds.includes(true)');page.keyboard.press('Escape')
 # The note lies on the desk's free corner, not on the fridge door.
 page.evaluate('__lr.widgetView.frame()')
 assert page.evaluate("(()=>{const d=__lr.room.items.find(i=>i.t==='frenchdesk'),f=__lr.room.items.find(i=>i.t==='minifridge');let note=null,bad=false;__lr.view.objs.get(d.id).traverse(o=>{if(o.name==='widget:fridge-note')note=o});__lr.view.objs.get(f.id).traverse(o=>{if(o.name.startsWith('widget:'))bad=true});return !!note&&!bad&&Math.abs(note.rotation.x+Math.PI/2)<.001&&note.position.y>1.5&&note.position.y<1.53})()")
 page.wait_for_function('__lr.widgets.data("fridge-note").word')
 # The Control Centre previews the desk and launches the same full session.
 page.click('#bHome');tile=page.locator('#sheet [data-app=french]');image=tile.locator('.home-furniture');assert image.get_attribute('data-furniture')=='frenchdesk';assert not image.evaluate('e=>e.classList.contains("absent")');tile.click();page.locator('#frenchView').wait_for(state='visible');assert page.evaluate('__lr.french.model.view().mode')=='study';assert page.locator('.french-card').is_visible();assert page.locator('#sheet #frenchView').count()==1;assert page.locator('#frenchView').evaluate('e=>getComputedStyle(e).position')=='relative';assert page.locator('.french-chrome').evaluate('e=>getComputedStyle(e).position')!='fixed';page.get_by_role('button',name='Close French corner',exact=True).click();assert page.locator('#sheet').get_attribute('aria-hidden')=='true'
 page.evaluate('__lr.interact(__lr.room.items[0].id)')
 page.locator('#frenchView').wait_for(state='visible')
 page.wait_for_function('__lr.french.model.cards().length===803')
 assert page.locator('.french-card').is_visible();assert page.locator('.french-card').evaluate('e=>e===document.activeElement');page.get_by_role('button',name='Choose decks',exact=True).click();assert page.locator('.french-deck input').count()==19
 for box in page.locator('.french-deck input').all():
  if box.is_checked():box.uncheck()
 assert page.get_by_role('button',name='Start studying',exact=True).is_disabled()
 page.get_by_label('First words, 15 cards',exact=True).check()
 page.get_by_role('button',name='Start studying',exact=True).click()
 assert page.get_by_role('button',name='Skip',exact=True).count()==0
 for name in ['Still learning','Mark as learned']:
  control=page.locator('#frenchView').get_by_role('button',name=name,exact=True)
  assert control.is_visible() and control.locator('svg').count()==1
  assert control.evaluate('e=>e.getBoundingClientRect().width===44&&e.getBoundingClientRect().height===44')
 # Both controls work immediately, without requiring a flip first.
 for name,status in [('Still learning','learning'),('Mark as learned','known')]:
  word_id=page.evaluate('__lr.french.model.view().card.id')
  page.locator('#frenchView').get_by_role('button',name=name,exact=True).click()
  assert page.evaluate('(id)=>__lr.french.model.progress().cards[id].status',word_id)==status
 graded=[]
 for i in range(5):
  word=page.locator('.french-word').inner_text()
  assert word==page.evaluate('__lr.french.model.view().card.fr')
  page.locator('.french-card').click()
  assert page.locator('.french-flip').evaluate('node=>node.classList.contains("is-back")')
  back=page.evaluate('(()=>{const card=__lr.french.model.view().card;return {en:card.en,ex:card.ex,exEn:card.exEn,say:card.say,ipa:card.ipa}})()')
  assert page.locator('.french-meaning').text_content()==back['en']
  assert page.locator('.french-example').text_content()==back['ex']
  assert page.locator('.french-translation').text_content()==back['exEn']
  assert page.locator('.french-say').text_content()==back['say']
  assert page.locator('.french-ipa').text_content()==back['ipa']
  name='Still learning' if i%2 else 'Mark as learned'
  page.get_by_role('button',name=name,exact=True).click()
  graded.append({'word':word,'status':'learning' if i%2 else 'known'})
 saved=page.evaluate('JSON.parse(localStorage.getItem("lr.french.progress"))')
 assert saved['v']==1
 by_word={card['fr']:card['id'] for card in page.evaluate('__lr.french.model.cards()')}
 last={}
 for row in graded:last[row['word']]=row['status']
 for word,status in last.items():assert saved['cards'][by_word[word]]['status']==status
 assert any(row['status']=='known' for row in saved['cards'].values()) and any(row['status']=='learning' for row in saved['cards'].values())
 page.get_by_role('button',name='Close French corner',exact=True).click()
 page.wait_for_function('!__lr.french.active')
 page.reload(wait_until='networkidle')
 page.wait_for_function('!!window.__lr?.french')
 page.wait_for_function('__lr.french.model.cards().length===803')
 again=page.evaluate('JSON.parse(localStorage.getItem("lr.french.progress")).cards')
 assert again.keys()==saved['cards'].keys()
 same=page.evaluate('''() => {const cards=__lr.french.model.cards();const a=LRFrench.wordOfDay(cards,'2026-10-17'),b=LRFrench.wordOfDay(cards,'2026-10-17');return a.id===b.id && a.id!==LRFrench.wordOfDay(cards,'2026-10-18').id;}''')
 assert same
 page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()
 today=page.locator('.french-today')
 assert today.locator('b').inner_text() and today.locator('small').inner_text()
 today.click();assert today.get_attribute('aria-pressed')=='true';assert today.locator('.french-example').is_visible()
 # Quick controls are siblings of the flip button and share Wordnest progress.
 quick=page.locator('.french-today-card');word_id=today.get_attribute('data-card-id');known=quick.get_by_role('button',name='Mark as learned',exact=True);learning=quick.get_by_role('button',name='Still learning',exact=True)
 assert today.locator('button').count()==0
 known.click();assert page.evaluate('(id)=>__lr.french.model.progress().cards[id].status',word_id)=='known';assert today.get_attribute('data-card-id')!=word_id;assert today.get_attribute('aria-pressed')=='false';learning_id=today.get_attribute('data-card-id')
 learning.click();assert page.evaluate('(id)=>__lr.french.model.progress().cards[id].status',learning_id)=='learning';assert today.get_attribute('data-card-id') not in [word_id,learning_id];assert today.get_attribute('aria-pressed')=='false';assert quick.get_by_role('button',name='Next word →',exact=True).count()==0
 for _ in range(page.evaluate('LRFrench.GAP')):known.click()
 assert today.get_attribute('data-card-id')==learning_id;assert learning.get_attribute('aria-pressed')=='true';assert not page.evaluate('__lr.french.active')
 for width in (320,390,1280):
  page.set_viewport_size({'width':width,'height':844});quick.scroll_into_view_if_needed();assert quick.evaluate('e=>e.scrollWidth<=e.clientWidth');assert quick.locator('.french-quick-actions').evaluate('e=>[...e.children].every(b=>b.getBoundingClientRect().width>=44)');page.screenshot(path=f'/tmp/french-quick-{width}.png')
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.french');page.wait_for_function('__lr.french.model.cards().length===803');assert page.evaluate('(id)=>__lr.french.model.progress().cards[id].status',word_id)=='known';assert page.evaluate('(id)=>__lr.french.model.progress().cards[id].status',learning_id)=='learning';assert page.evaluate('__lr.french.model.quickWord().id')!=word_id
 page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click()

 page.evaluate('__lr.french.open()')
 page.locator('#frenchView').wait_for(state='visible')
 assert page.locator('.french-card').is_visible()
 for width in (320,390,1280):
  page.set_viewport_size({'width':width,'height':844})
  assert page.locator('#sheetBody').bounding_box()['height']<=page.viewport_size['height']*.84+1;assert page.locator('#sheetBody').bounding_box()['y']>0;assert page.locator('.french-chrome').bounding_box()['y']>=page.locator('#sheetBody').bounding_box()['y'];assert page.locator('.french-close').bounding_box()['y']>=page.locator('#sheetBody').bounding_box()['y'];page.screenshot(path=f'/tmp/french-sheet-{width}.png')
  assert page.evaluate('document.querySelector("#frenchView").scrollWidth<=document.querySelector("#frenchView").clientWidth+1 && document.documentElement.scrollWidth<=innerWidth+1')
 page.evaluate("__lr.setPhase('night',true)")
 assert page.locator('.french-card').is_visible()
 close=page.get_by_role('button',name='Close French corner',exact=True);close.focus();page.keyboard.press('Shift+Tab');assert page.get_by_role('button',name='Choose decks',exact=True).evaluate('e=>e===document.activeElement');page.keyboard.press('Tab');assert close.evaluate('e=>e===document.activeElement');page.keyboard.press('Escape');assert not page.evaluate('__lr.french.active');assert page.locator('#sheet').get_attribute('aria-hidden')=='true';assert page.locator('#bHome').evaluate('e=>e===document.activeElement')
 page.evaluate('__lr.french.open()');page.locator('#sheet').click(position={'x':5,'y':5});assert not page.evaluate('__lr.french.active');page.evaluate('__lr.french.open();__lr.calendar.openDay("2026-10-20")');assert not page.evaluate('__lr.french.active');assert page.locator('#frenchView').count()==0;page.keyboard.press('Escape')
 # The final mastered card leaves a calm empty state and a usable keyboard focus.
 page.evaluate("__lr.french.close();__lr.french.model.setCards([{id:'quick-final',deck:'d',fr:'Merci',en:'Thank you'}]);__lr.french.refresh()")
 page.click('#bMenu');page.get_by_role('tab',name='Today',exact=True).click();page.locator('.french-today-card .french-review-known').click();assert page.locator('.french-review-done').is_visible();assert page.locator('.french-quick-actions').is_hidden();assert page.locator('.french-review-done').evaluate('e=>e===document.activeElement')
 assert not errors,errors
 print('PASS: direct French study sheet, decks, grading and persistence, Today word, focus trap/return, backdrop/Escape/Close, sheet switching, phone/desktop bounds',flush=True)
 browser.close()
server.shutdown()
