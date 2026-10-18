"""npm run build && python3 tests/widgets-interactive-browser.py. All outbound destinations are intercepted."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
RSS='https://www.cbc.ca/webfeed/rss/rss-topstories'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':390,'height':844})
    context.add_init_script("localStorage.setItem('lr.intro','true')")
    requests=[];errors=[]
    def outbound(route):
        request=route.request
        if request.url.startswith('http://127.0.0.1:'):return route.continue_()
        requests.append((request.url,request.resource_type))
        if request.url==RSS:
            route.fulfill(content_type='application/rss+xml',headers={'access-control-allow-origin':'*'},body='<rss><channel><item><title>PRIVATE_PHASE2_NEWS</title><link>https://www.cbc.ca/news/test</link></item></channel></rss>')
        else:
            assert request.resource_type=='document', (request.url,request.resource_type)
            route.fulfill(content_type='text/html',body='<title>Outbound destination fixture</title>')
    context.route('**/*',outbound)
    page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
    page.wait_for_function('!!window.__lr?.widgets')
    page.evaluate('''() => {
      const a=__lr;a.room.items=[];a.room.n=10;a.room.name='All widgets';
      for(const [t,o] of [['frenchdesk',{x:0,z:0}],['newspaper',{x:3,z:4}],['tstcorkboard',{k:0,u:3,e:3}],['pomodorocandle',{x:5,z:5}],['crt',{x:4,z:0}],['libcase',{x:7,z:0}],['gamingdesk',{x:0,z:4}],['arcade',{x:7,z:3}],['terrarium',{x:6,z:6}]]) a.room.add(a.room.make(t,o));
      a.changed();a.setMode('edit',true);
    }''')
    try:
        page.wait_for_function('document.querySelectorAll(".widget-private:not([hidden])").length===9 && __lr.widgets.data("newspaper").headlines.length===1',timeout=12000)
    except Exception:
        print('startup diagnostics',errors,page.evaluate('({badges:document.querySelectorAll(".widget-private").length,state:__lr.widgets.state})'),flush=True)
        page.screenshot(path='/tmp/widgets-phase2-error.png')
        raise
    assert page.evaluate('''() => __lr.room.items.every(it=>{
      const def=LRWidgets.attached(it.t);let mesh=null;__lr.view.objs.get(it.id).traverse(o=>{if(o.name==='widget:'+def.id)mesh=o;});
      return !!mesh && (def.surface==='portal'?mesh.material.transparent:true);
    })''')
    before=page.evaluate('JSON.stringify(__lr.room.serialize())')
    page.evaluate('__lr.setMode("explore",true)')
    def tap(type):
        page.evaluate('type=>__lr.interact(__lr.room.items.find(it=>it.t===type).id)',type)
    tap('tstcorkboard')
    body=page.locator('#sheetBody')
    for text in ['@twostorytails','twice weekly','Nature-documentary deadpan','Corporate-CEO satire','Next post:']:
        assert text in body.inner_text(),text
    for label,url in [('Instagram','https://www.instagram.com/twostorytails'),('TikTok','https://www.tiktok.com/@twostorytails')]:
        link=body.get_by_role('link',name=label,exact=True)
        assert link.get_attribute('target')=='_blank' and link.get_attribute('rel')=='noopener noreferrer'
        with context.expect_page() as opened: link.click()
        tab=opened.value;tab.wait_for_load_state();assert tab.url==url;assert tab.evaluate('window.opener===null');tab.close()
    page.evaluate('document.querySelector("#sheet").classList.remove("open")')
    print('PASS: posting plan renders, nine private badges, portal shimmer and both exact social links open isolated tabs',flush=True)
    # A real candle tap starts the flame feedback before window.open runs.
    point=page.evaluate('''() => {
      const a=__lr,it=a.room.items.find(i=>i.t==='pomodorocandle');
      const p=a.view.root.localToWorld(a.view.itemPoint(it.id,[4,6,4])).project(a.view.cam),r=a.view.r.domElement.getBoundingClientRect();
      const open=window.open;window.__launches=[];
      window.open=(...args)=>{const flame=a.view.objs.get(it.id).userData.parts.portalflame;__launches.push({args,scale:flame.scale.y});return open(...args)};
      return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
    }''')
    url=page.evaluate('LRWidgets.POMODORO_URL')
    with context.expect_page() as opened:page.mouse.click(point['x'],point['y'])
    tab=opened.value;tab.wait_for_load_state();assert tab.url==url;assert tab.evaluate('window.opener===null');tab.close()
    launch=page.evaluate('__launches[0]');assert launch['scale']>1.15;assert launch['args']==[url,'_blank','noopener,noreferrer']
    assert page.evaluate('!LR.CAT.pomodorocandle.focusRitual')
    for portal in page.evaluate('LRWidgets.PORTALS'):
        if portal['furnitureId']=='arcade':continue
        if page.evaluate('type=>LRAtlas.BOOKSHELVES.includes(type)',portal['furnitureId']):
            tap(portal['furnitureId'])
            with context.expect_page() as opened:body.get_by_role('link',name=portal['label'],exact=True).click()
        else:
            with context.expect_page() as opened:tap(portal['furnitureId'])
        tab=opened.value;tab.wait_for_load_state();assert tab.url==portal['url'];assert tab.evaluate('window.opener===null');tab.close()
    # Native arcade gameplay wins over the configured outbound portal.
    pages=len(context.pages)
    tap('arcade')
    assert len(context.pages)==pages
    assert page.evaluate('''() => {const a=__lr,it=a.room.items.find(i=>i.t==='arcade');return it.on && a.view.objs.get(it.id).userData.playUntil>a.view.t}''')
    # Gameplay switches the cabinet on. Only that expected decor change is allowed.
    before=page.evaluate('before=>{const d=JSON.parse(before);d.items.find(i=>i.t==="arcade").on=true;return JSON.stringify(d)}',before)
    page.evaluate("LRWidgets.PORTALS.push({furnitureId:'crt',label:'Second channel',url:'https://example.com/second-channel'})")
    tap('crt');assert body.locator('.widget-news a').count()==2
    assert 'Choose a destination' in body.inner_text()
    for width in [320,390,1280]:
        page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    with context.expect_page() as opened:body.get_by_role('link',name='Second channel').click()
    tab=opened.value;tab.wait_for_load_state();assert tab.url=='https://example.com/second-channel';tab.close()
    assert page.evaluate('JSON.stringify(__lr.room.serialize())')==before
    print('PASS: real candle tap, flame feedback before launch, all four outbound portals and native arcade gameplay, multi-link picker and mobile layout; decor untouched',flush=True)
    # Put unique private text and URLs in the state before exercising the actual encoder.
    page.evaluate("LRWidgets.TST_CONTENT.nextPost='PRIVATE_PHASE2_PLAN';LRWidgets.TST_CONTENT.links.push({label:'Private draft',url:'https://example.com/PRIVATE_PHASE2_LINK'});__lr.widgets.refresh(__lr.room.items.map(i=>i.t))")
    private=page.evaluate('localStorage.getItem("lr.widgets")')
    assert 'PRIVATE_PHASE2_PLAN' in private and 'PRIVATE_PHASE2_LINK' in private
    code=page.evaluate('__lr.roomCode()');assert code.startswith('LR1.')
    decoded=page.evaluate('code=>__lr.readCode(code)',code)
    assert len(decoded['items'])==9
    assert 'widgets' not in decoded and all('widgets' not in item for item in decoded['items'])
    for value in ['PRIVATE_PHASE2','headlines','fetchedAt','twice weekly','https:']:
        assert value not in str(decoded),value
    code0=page.evaluate('''async()=>{const old=CompressionStream;window.CompressionStream=undefined;try{return await __lr.roomCode()}finally{window.CompressionStream=old}}''')
    assert page.evaluate('code=>__lr.readCode(code)',code0)==decoded
    assert len([r for r in requests if r[1]!='document'])==1
    context.close()
    fresh=browser.new_context(viewport={'width':390,'height':844});fresh.add_init_script("localStorage.setItem('lr.intro','true')");fresh.route(RSS,lambda r:r.abort('failed'))
    recipient=fresh.new_page();recipient.on('pageerror',lambda e:errors.append(str(e)))
    recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');recipient.wait_for_function('!!window.__lr')
    recipient.click('#bMenu');recipient.get_by_role('tab',name='Rooms',exact=True).click();recipient.click('#bImportCode');recipient.locator('textarea.code').fill(code);recipient.click('#bOpenCode');recipient.get_by_role('button',name='Visit this room',exact=True).click();recipient.wait_for_function('__lr.room.name==="All widgets"')
    assert recipient.evaluate('__lr.room.items.length')==9
    assert 'PRIVATE_PHASE2' not in recipient.evaluate('JSON.stringify(localStorage)')
    assert not errors,errors
    print('PASS: all five widget types active in LR1/LR0 round trips and fresh-session UI import; no private payload or extra fetches',flush=True)
    browser.close()
server.shutdown()
