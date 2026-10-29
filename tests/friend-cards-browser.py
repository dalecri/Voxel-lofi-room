"""Offline invitations: receipt, archive, visit, privacy and reduced motion."""
import functools,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(viewport={'width':390,'height':844})
 context.add_init_script('''if(!localStorage.getItem('cardsFixture')){localStorage.setItem('cardsFixture','true');const r={v:1,name:'My saved home',n:10,next:1,view:'city',seed:1,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.intro':true,'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.meta':{current:101,phase:'day',realtime:false,dreamy:false,visitors:false,mischief:false,calmPerformance:true}}))localStorage.setItem(k,JSON.stringify(v));}''')
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.fulfill(json={'clips':[]}))
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.friendCardsUI')
 home=page.evaluate('localStorage.getItem("lr.room.101")')
 friend={'v':1,'gid':515,'name':'Moss Landing','n':10,'next':4,'view':'city','wall':{'style':'paint','color':2},'floor':{'style':'walnut'},'items':[{'id':1,'t':'sofa','x':1,'z':1,'c':1},{'id':2,'t':'plant','x':6,'z':5,'c':0},{'id':3,'t':'floorlamp','x':5,'z':1,'c':0,'on':True}]}
 def encode(data):return page.evaluate("d=>'LR0.'+btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(d)))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')",data)
 code=encode(friend)
 def collection():
  page.click('#bMenu');page.get_by_role('tab',name='Lane',exact=True).click();page.click('#bImportCode')
 collection();page.locator('#friendRoomCode').fill('not a room code');page.click('#bOpenCode');page.get_by_text('That room code doesn’t look right',exact=True).wait_for(state='visible');assert page.evaluate('__lr.friendCards.list().length')==0
 page.locator('#friendRoomCode').fill(code);page.click('#bOpenCode');page.locator('.friend-card-stage.is-arriving').wait_for()
 assert page.locator('.friend-card-visit').is_disabled();assert page.locator('.friend-card-info').get_attribute('aria-hidden')=='true'
 assert page.evaluate('__lr.room.name')=='My saved home';assert page.evaluate('__lr.meta.current')==101
 page.screenshot(path='/tmp/friend-card-arriving.png')
 page.wait_for_function('!document.querySelector(".friend-card-visit").disabled')
 assert page.locator('.friend-card-info h3').inner_text()=='Moss Landing';assert page.locator('.friend-room-preview').get_attribute('src').startswith('data:image/png')
 assert '3 pieces' in page.locator('.friend-card-meta').inner_text();assert page.evaluate('__lr.friendCards.list().length')==1
 page.get_by_role('button',name='Saved cards',exact=True).click();assert page.locator('.friend-saved-row').count()==1;assert not page.locator('#friendCodeForm').is_visible()
 page.get_by_role('button',name='Open Moss Landing card',exact=True).click();page.wait_for_function('!document.querySelector(".friend-card-visit").disabled');assert page.locator('.is-arriving').count()==0
 page.get_by_role('button',name='Visit this room',exact=True).click();page.wait_for_function('__lr.room.name==="Moss Landing"');assert page.evaluate('__lr.meta.visit.gid')==515;assert json.loads(page.evaluate('localStorage.getItem("lr.room.101")'))==json.loads(home)
 page.click('#bMenu');page.get_by_role('tab',name='Lane',exact=True).click();page.locator('.rooms-card[data-room-id="101"] .rooms-visit').click();page.wait_for_function('__lr.room.name==="My saved home"')
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.friendCards');assert page.evaluate('__lr.friendCards.list().length')==1
 collection();page.get_by_role('button',name='Add a room code',exact=True).click();page.locator('#friendRoomCode').fill(code);page.click('#bOpenCode');page.wait_for_function('!document.querySelector(".friend-card-visit").disabled');assert page.locator('.is-arriving').count()==0;assert page.evaluate('__lr.friendCards.list().length')==1
 page.add_style_tag(content='#toasts,#lampbotBubble{visibility:hidden!important}')
 for phase in ['day','night']:
  page.evaluate('p=>__lr.setPhase(p,true)',phase)
  for width in [320,390,1280]:
   page.set_viewport_size({'width':width,'height':844});page.locator('.friend-card-visit').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=f'/tmp/friend-card-{phase}-{width}.png')
 # A new code respects reduced motion, and closing during arrival never steals focus.
 page.emulate_media(reduced_motion='reduce');page.wait_for_function('__lr.view.reducedMotion');page.get_by_role('button',name='Saved cards',exact=True).click();page.get_by_role('button',name='Add a room code',exact=True).click();page.locator('#friendRoomCode').fill(encode({**friend,'gid':516,'name':'Willow studio'}));page.click('#bOpenCode');page.wait_for_function('!document.querySelector(".friend-card-visit").disabled');assert page.locator('.is-arriving').count()==0
 page.get_by_role('button',name='Saved cards',exact=True).click();assert page.locator('.friend-saved-row').count()==2
 remove=page.get_by_role('button',name='Remove Willow studio card',exact=True);remove.click();assert remove.inner_text()=='Remove?';remove.click();assert page.locator('.friend-saved-row').count()==1
 page.emulate_media(reduced_motion='no-preference');page.wait_for_function('!__lr.view.reducedMotion')
 page.get_by_role('button',name='Add a room code',exact=True).click();page.locator('#friendRoomCode').fill(encode({**friend,'gid':517,'name':'Pine deck'}));page.evaluate('() => {window.__lateFlips=0;const originalFlip=__lr.Sound.flip;__lr.Sound.flip=function(...args){__lateFlips++;return originalFlip.apply(this,args)};}');page.click('#bOpenCode');page.locator('.friend-card-stage.is-arriving').wait_for();page.locator('#sheetBody > .sheet-close').click();page.wait_for_timeout(1400)
 assert page.evaluate('!document.querySelector("#sheet").classList.contains("open") && document.activeElement.id==="bMenu" && __lateFlips===0')
 shared=page.evaluate('__lr.roomCode()');decoded=page.evaluate('c=>__lr.readCode(c)',shared);assert 'Moss Landing' not in json.dumps(decoded) and 'friendCards' not in decoded
 assert page.evaluate('__lr.room.name')=='My saved home'
 assert not errors,errors
 print('PASS: arriving pixel envelope, explicit visit, saved archive/reload/reopen/dedup/delete, home and guest book preserved, privacy and reduced motion; mobile/desktop day/night, no errors')
 browser.close()
server.shutdown()
