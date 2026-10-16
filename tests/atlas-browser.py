"""npm run build && python3 tests/atlas-browser.py. Seven sources stubbed; no live external traffic."""
import base64,functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGMMqFjAgA0wYRUdtBIAHTcBeMwxqO4AAAAASUVORK5CYII=')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844});context.add_init_script("if(!sessionStorage.atlasFixture){sessionStorage.atlasFixture='true';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.meta',JSON.stringify({liveExtras:false,realtime:false,phase:'night',visitors:false,mischief:false,calmPerformance:true,music:false,sound:false,stations:[]}));}window.mediaPlays=0;HTMLMediaElement.prototype.play=()=>{mediaPlays++;return Promise.resolve()}")
 requests=[];failure=False
 def route(r):
  u=r.request.url
  if u.startswith('http://127.0.0.1:'):r.continue_();return
  if any(s in u for s in ['www.artic.edu/iiif','covers.openlibrary.org','www.thecocktaildb.com/images']):r.fulfill(content_type='image/png',body=png,headers={'access-control-allow-origin':'*'});return
  requests.append(u)
  if 'radio-browser.info/' in u:body=[{'name':'Fixture radio','url_resolved':'https://radio.example/live','codec':'MP3','bitrate':128,'votes':200}]
  elif 'api.artic.edu/' in u:body={'data':[{'id':123,'title':'Window light','artist_title':'Fixture Painter','image_id':'fixture-image','date_display':'1912'}]}
  elif 'openlibrary.org/search.json' in u:body={'docs':[{'key':'/works/OL1W','title':'PRIVATE_BOOK_TITLE','author_name':['Fixture Author'],'isbn':['9780140328721']}]}
  elif 'noaa.gov/' in u:body=[['time_tag','Kp'],['2026-10-16 00:00:00','7.00']]
  elif 'nager.at/' in u:body=[{'date':'2026-07-01','localName':'Canada Day','name':'Canada Day'}]
  elif 'catfact.ninja/' in u:body={'fact':'Fixture cats have very soft paws.'}
  elif 'thecocktaildb.com/api/' in u:body={'drinks':[{'strDrink':'Moonlight fizz','strCategory':'Mocktail','strInstructions':'Stir and settle in.','strDrinkThumb':'https://www.thecocktaildb.com/images/fixture.png','strIngredient1':'Lime','strMeasure1':'1 wedge','strIngredient3':'Soda','strMeasure3':None}]}
  else:r.abort();return
  r.fulfill(content_type='application/json',body=json.dumps({} if failure else body),headers={'access-control-allow-origin':'*'})
 context.route('**/*',route);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(20000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.atlasUI')
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.setMode('explore',true);window.ids={};for(const [t,o] of [['galleryframe',{k:0,u:5,e:0}],['barcounter',{x:4,z:4}],['bookshelf',{x:1,z:1}],['cat',{x:1,z:6}]]){const i=a.room.make(t,o);if(!a.room.canPlace(i))throw Error('Cannot place '+t);a.room.add(i);ids[t]=i.id;}a.changed();}''')
 assert not requests,requests
 def menu(tab):page.click('#bMenu');page.get_by_role('tab',name=tab,exact=True).click()
 def tap(t):page.evaluate('t=>__lr.interact(ids[t])',t)
 def esc():page.keyboard.press('Escape');page.locator('#sheet').wait_for(state='hidden')
 menu('Sound');assert not requests;page.get_by_role('button',name='lofi',exact=True).click();page.get_by_role('button',name='Add Fixture radio',exact=True).click();assert page.evaluate('__lr.meta.stations.at(-1).url')=='https://radio.example/live';assert page.evaluate('__lr.meta.music') is False;assert page.evaluate('mediaPlays')==0;esc()
 tap('bookshelf');assert 'Your bookshelf' in page.locator('#sheetBody').inner_text();assert not any('openlibrary.org/search' in u for u in requests);page.get_by_role('button',name='Add a book',exact=True).click();page.get_by_role('textbox',name='Find a book',exact=True).fill('soft cats');page.get_by_role('button',name='Search',exact=True).click();page.get_by_role('button',name='Add PRIVATE_BOOK_TITLE',exact=True).click();assert page.evaluate('JSON.parse(localStorage.getItem("lr.bookshelf"))')==['9780140328721'];assert page.locator('.atlas-books img').get_attribute('src')=='https://covers.openlibrary.org/b/isbn/9780140328721-M.jpg';esc()
 tap('barcounter');page.get_by_role('heading',name='Moonlight fizz',exact=True).wait_for();assert page.locator('.atlas-drink li').all_text_contents()==['1 wedge Lime','Soda'];before=len([u for u in requests if 'thecocktaildb.com/api' in u]);page.get_by_role('button',name='Another',exact=True).click();page.get_by_role('heading',name='Moonlight fizz',exact=True).wait_for();assert len([u for u in requests if 'thecocktaildb.com/api' in u])==before+1;esc()
 tap('cat');page.locator('#catFactBubble').wait_for(state='visible');assert 'very soft paws' in page.locator('#catFactBubble').inner_text()
 assert not any(any(s in u for s in ['artic.edu','noaa.gov','nager.at']) for u in requests)
 menu('Settings');live=page.get_by_role('switch',name='Live extras',exact=True);live.click();page.wait_for_function('__lr.atlas.state.kp===7 && __lr.atlas.state.art.title==="Window light"');assert live.get_attribute('aria-checked')=='true';esc();page.wait_for_function('__lr.view.auroraOn===true && !document.querySelector("#aurora").hidden')
 tap('galleryframe');page.wait_for_function('document.querySelector(".atlas-art-detail img")?.naturalWidth===8');assert page.get_by_role('heading',name='Window light',exact=True).is_visible();assert 'Fixture Painter' in page.locator('.atlas-art-detail').inner_text();assert '1912' in page.locator('.atlas-art-detail').inner_text();page.screenshot(path='/tmp/atlas-gallery-390.png');esc()
 page.wait_for_function('''() => {const c=__lr.view.objs.get(ids.galleryframe).userData.parts.privateAtlas?.material.map.image;return c && c.getContext('2d').getImageData(200,250,1,1).data[0]===80;}''');assert page.evaluate('__lr.atlas.holidaysFor(2026)[0].date')=='2026-07-01';page.screenshot(path='/tmp/atlas-aurora-390.png')
 page.evaluate('__lr.setPhase("day",true)');page.wait_for_function('!__lr.view.auroraOn');page.evaluate('__lr.setPhase("night",true)');page.wait_for_function('__lr.view.auroraOn')
 # A reload reuses ambient caches and keeps ISBNs private, without autoplay.
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.atlas');page.wait_for_function('__lr.atlas.state.kp===7');assert page.evaluate('__lr.atlas.savedBooks()')==['9780140328721'];assert page.evaluate('mediaPlays')==0
 menu('Settings');page.get_by_role('switch',name='Live extras',exact=True).click();esc();page.wait_for_function('!__lr.view.auroraOn');assert page.evaluate('__lr.meta.liveExtras') is False
 # Bad/empty on-demand payloads use local fallbacks with usable sheets.
 failure=True;page.evaluate('__lr.atlasUI.openDrink()');page.get_by_role('heading',name='Quiet citrus spritz',exact=True).wait_for();esc();page.evaluate('__lr.atlasUI.openBooks()');page.get_by_role('button',name='Add a book',exact=True).click();page.get_by_role('textbox',name='Find a book',exact=True).fill('unavailable');page.get_by_role('button',name='Search',exact=True).click();page.get_by_text('No books found. Your shelf is still here.',exact=True).wait_for();esc()
 page.evaluate("__lr.room.bookshelf=['PRIVATE_ISBN'];__lr.room.atlas={fact:'PRIVATE_FACT'};__lr.room.items[0].atlas={book:'PRIVATE_BOOK'}")
 code=page.evaluate('__lr.roomCode()');data=page.evaluate('c=>__lr.readCode(c)',code)
 for s in ['PRIVATE_','9780140328721','lr.atlas','lr.bookshelf','Fixture radio']:assert s not in json.dumps(data),s
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 print('PASS: no unsolicited requests while off; explicit radio add without autoplay; private ISBN search/pick/reload; drink/another/fallback; cat fact bubble; gallery sheet; night Kp7 aurora and opt-out; holidays accessor; caches, private shares, no console errors at 390px',flush=True)
 browser.close()
server.shutdown()
