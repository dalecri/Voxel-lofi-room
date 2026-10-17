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
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
 page.wait_for_function('!!window.__lr?.french && window.LRFrench')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='French Room';a.setMode('explore',true);a.room.add(a.room.make('frenchdesk',{x:2,z:2}));a.changed();}''')
 page.evaluate('__lr.interact(__lr.room.items[0].id)')
 page.locator('#frenchView').wait_for(state='visible')
 page.wait_for_function('__lr.french.model.cards().length===803')
 assert page.locator('.french-deck input').count()==19
 for box in page.locator('.french-deck input').all():
  if box.is_checked():box.uncheck()
 assert page.get_by_role('button',name='Start studying',exact=True).is_disabled()
 page.get_by_label('First words, 15 cards',exact=True).check()
 page.get_by_role('button',name='Start studying',exact=True).click()
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
  name='Still learning' if i%2 else 'Knew it'
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
 today.click()
 page.locator('#frenchView').wait_for(state='visible')
 for width in (320,390):
  page.set_viewport_size({'width':width,'height':844})
  assert page.evaluate('document.querySelector("#frenchView").scrollWidth<=document.querySelector("#frenchView").clientWidth+1 && document.documentElement.scrollWidth<=innerWidth+1')
 page.evaluate("__lr.setPhase('night',true)")
 assert page.locator('.french-card').is_visible()
 assert not errors,errors
 print('PASS: French corner decks, mixed grading, saved card ids, today word, mobile width',flush=True)
 browser.close()
server.shutdown()
