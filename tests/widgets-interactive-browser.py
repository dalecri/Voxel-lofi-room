"""npm run build && python3 tests/widgets-interactive-browser.py. All outbound destinations are intercepted."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
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
        requests.append((request.url,request.resource_type));assert request.resource_type=='document',(request.url,request.resource_type)
        route.fulfill(content_type='text/html',body='<title>Outbound destination fixture</title>')
    context.route('**/*',outbound)
    page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
    page.wait_for_function('!!window.__lr?.widgets')
    page.evaluate('''() => {
      const a=__lr;a.room.items=[];a.room.n=10;a.room.name='All widgets';
      for(const [t,o] of [['frenchdesk',{x:0,z:0}],['newspaper',{x:3,z:4}],['pomodorocandle',{x:5,z:5}],['crt',{x:4,z:0}],['libcase',{x:7,z:0}],['gamingdesk',{x:0,z:4}],['arcade',{x:7,z:3}],['terrarium',{x:6,z:6}]]) a.room.add(a.room.make(t,o));
      a.changed();a.setMode('edit',true);
    }''')
    try:
        page.wait_for_function('document.querySelectorAll(".widget-private:not([hidden])").length===2 && !!__lr.widgets.data("fridge-note").word',timeout=12000)
    except Exception:
        print('startup diagnostics',errors,page.evaluate('({badges:document.querySelectorAll(".widget-private").length,state:__lr.widgets.state})'),flush=True)
        page.screenshot(path='/tmp/widgets-phase2-error.png')
        raise
    assert page.evaluate('''() => __lr.room.items.filter(it=>LRWidgets.attached(it.t)).every(it=>{
      const def=LRWidgets.attached(it.t);let mesh=null;__lr.view.objs.get(it.id).traverse(o=>{if(o.name==='widget:'+def.id)mesh=o;});
      return !!mesh && (def.surface==='portal'?mesh.material.transparent:true);
    })''')
    before=page.evaluate('JSON.stringify(__lr.room.serialize())')
    page.evaluate('__lr.setMode("explore",true)')
    def tap(type):
        page.evaluate('type=>__lr.interact(__lr.room.items.find(it=>it.t===type).id)',type)
    body=page.locator('#sheetBody')
    # The Retro TV kept its place in the room but is plain furniture now: no badge, no link.
    assert page.evaluate("!LRWidgets.attached('crt')")
    assert page.evaluate("['newspaper','pomodorocandle','terrarium','gamingdesk','libcase'].every(t=>!LRWidgets.attached(t))")
    # Native arcade gameplay wins over the configured outbound portal.
    pages=len(context.pages)
    tap('arcade')
    assert len(context.pages)==pages
    assert page.evaluate('''() => {const a=__lr,it=a.room.items.find(i=>i.t==='arcade');return it.on && a.view.objs.get(it.id).userData.playUntil>a.view.t}''')
    # Gameplay switches the cabinet on. Only that expected decor change is allowed.
    before=page.evaluate('before=>{const d=JSON.parse(before);d.items.find(i=>i.t==="arcade").on=true;return JSON.stringify(d)}',before)
    page.evaluate("LRWidgets.PORTALS.push({furnitureId:'gamingdesk',label:'First channel',url:'https://example.com/first-channel'},{furnitureId:'gamingdesk',label:'Second channel',url:'https://example.com/second-channel'})")
    tap('gamingdesk');assert body.locator('.widget-destinations a').count()==2
    assert 'Choose a destination' in body.inner_text()
    for width in [320,390,1280]:
        page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    with context.expect_page() as opened:body.get_by_role('link',name='Second channel').click()
    tab=opened.value;tab.wait_for_load_state();assert tab.url=='https://example.com/second-channel';tab.close()
    assert page.evaluate('JSON.stringify(__lr.room.serialize())')==before
    print('PASS: decorative retired portals, native arcade gameplay, explicit multi-link picker and mobile layout; decor untouched',flush=True)
    # Put unique private text and URLs in the state before exercising the actual encoder.
    page.evaluate("LRWidgets.PORTALS.push({furnitureId:'libcase',label:'PRIVATE_PHASE2_PLAN',url:'https://example.com/PRIVATE_PHASE2_LINK'});__lr.widgets.refresh(__lr.room.items.map(i=>i.t))")
    private=page.evaluate('localStorage.getItem("lr.widgets")')
    assert 'PRIVATE_PHASE2_PLAN' in private and 'PRIVATE_PHASE2_LINK' in private
    code=page.evaluate('__lr.roomCode()');assert code.startswith('LR1.')
    decoded=page.evaluate('code=>__lr.readCode(code)',code)
    assert len(decoded['items'])==8
    assert 'widgets' not in decoded and all('widgets' not in item for item in decoded['items'])
    for value in ['PRIVATE_PHASE2','headlines','fetchedAt','https:']:
        assert value not in str(decoded),value
    code0=page.evaluate('''async()=>{const old=CompressionStream;window.CompressionStream=undefined;try{return await __lr.roomCode()}finally{window.CompressionStream=old}}''')
    assert page.evaluate('code=>__lr.readCode(code)',code0)==decoded
    assert len([r for r in requests if r[1]!='document'])==0
    context.close()
    fresh=browser.new_context(viewport={'width':390,'height':844});fresh.add_init_script("localStorage.setItem('lr.intro','true')");fresh.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
    recipient=fresh.new_page();recipient.on('pageerror',lambda e:errors.append(str(e)))
    recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');recipient.wait_for_function('!!window.__lr')
    recipient.click('#bMenu');recipient.get_by_role('tab',name='Lane',exact=True).click();recipient.click('#bImportCode');recipient.locator('textarea.code').fill(code);recipient.click('#bOpenCode');recipient.get_by_role('button',name='Visit this room',exact=True).click();recipient.wait_for_function('__lr.room.name==="All widgets"')
    assert recipient.evaluate('__lr.room.items.length')==8
    assert 'PRIVATE_PHASE2' not in recipient.evaluate('JSON.stringify(localStorage)')
    assert not errors,errors
    print('PASS: remaining local widgets and decorative retired assets in LR1/LR0 round trips and fresh-session UI import; no private payload or extra fetches',flush=True)
    browser.close()
server.shutdown()
