"""npm run build && python3 tests/widgets-browser.py. CBC responses are controlled fixtures."""
import functools
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
RSS = 'https://www.cbc.ca/webfeed/rss/rss-topstories'
XML = '''<?xml version="1.0"?><rss version="2.0"><channel><title>CBC News</title>
<item><title><![CDATA[OWNER_ONLY_NEWS: A small good thing <b>today</b>]]></title><link>https://www.cbc.ca/news/first</link></item>
<item><title>Another headline</title><link>https://www.cbc.ca/news/second</link></item>
<item><title>Unsafe</title><link>javascript:alert(1)</link></item></channel></rss>'''
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'www')))
Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, timezone_id='America/Toronto')
    context.add_init_script('''
      localStorage.setItem('lr.intro','true');
      window.__widgetNow=Date.parse('2026-10-15T23:59:59-04:00');
      const RealDate=Date;
      window.Date=class extends RealDate { constructor(...a) { super(...(a.length?a:[window.__widgetNow])); } static now(){return window.__widgetNow;} };
    ''')
    calls = []; fail = [False]; errors = []; external = []
    def feed(route):
        calls.append(route.request.url)
        if fail[0]: route.abort('failed')
        else: route.fulfill(status=200, content_type='application/rss+xml', body=XML, headers={'access-control-allow-origin': '*'})
    context.route(RSS, feed)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: external.append(r.url) if not r.url.startswith(('http://127.0.0.1:', 'data:', 'blob:')) else None)
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
    page.wait_for_function('!!window.__lr?.widgetView')
    assert calls == []
    page.evaluate('''() => {
      const a=__lr; a.room.items=[]; a.room.name='Widget room'; a.room.n=10;
      a.room.add(a.room.make('frenchdesk',{x:2,z:0})); a.room.add(a.room.make('newspaper',{x:4,z:4})); a.changed();
      a.setMode('edit',true); window.__decorBefore=JSON.stringify(a.room.serialize());
    }''')
    page.wait_for_function('__lr.widgets.data("newspaper").headlines.length===2')
    page.wait_for_function('document.querySelectorAll(".widget-private:not([hidden])").length===2')
    assert len(calls) == 1
    assert page.evaluate('JSON.stringify(__lr.room.serialize())===__decorBefore')
    assert page.evaluate('''() => __lr.room.items.every(i=>{
      let found=false; __lr.view.objs.get(i.id).traverse(o=>{if(o.name==='widget:'+ (i.t==='frenchdesk'?'fridge-note':'newspaper')) found=true;});return found;
    })''')
    before = page.evaluate('__lr.widgets.data("fridge-note").word')
    page.evaluate('window.__widgetNow+=1000')
    page.wait_for_function('__lr.widgets.data("fridge-note").date==="2026-10-16"')
    assert before != page.evaluate('__lr.widgets.data("fridge-note").word')
    page.evaluate('''() => {__lr.setMode('explore',true); __lr.interact(__lr.room.items.find(i=>i.t==='frenchdesk').id);}''')
    assert page.locator('#frenchView').is_visible();assert page.locator('.french-deck').count()==19
    page.get_by_role('button',name='Close French corner',exact=True).click()
    page.wait_for_function('document.querySelectorAll(".widget-private:not([hidden])").length===0')
    # A real pointer tap on the paper opens the reading sheet.
    point = page.evaluate('''() => {
      const a=__lr, it=a.room.items.find(i=>i.t==='newspaper'), p=a.view.root.localToWorld(a.view.itemPoint(it.id,[4,2,4])).project(a.view.cam), r=a.view.r.domElement.getBoundingClientRect();
      return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
    }''')
    page.mouse.click(point['x'],point['y'])
    page.wait_for_selector('.sheet.open .widget-news')
    links=page.locator('.widget-news a')
    assert links.count()==2
    assert '<b>today</b>' in links.first.inner_text() and links.first.locator('b b').count()==0
    assert links.first.get_attribute('target')=='_blank'
    assert links.first.get_attribute('rel')=='noopener noreferrer'
    assert links.first.get_attribute('href')=='https://www.cbc.ca/news/first'
    assert 'CBC News' in links.first.inner_text()
    assert len(calls)==1
    for width in [320,390,1280]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path='/tmp/widgets-reading.png')
    print('PASS: both physical widgets, private edit badges, local midnight, real newspaper tap, safe links and mobile sheet')
    # Hourly retry fails, including a reload, while the last successful feed survives.
    fail[0]=True
    page.evaluate('window.__widgetNow+=LRWidgets.HOUR')
    page.wait_for_function('__lr.widgets.state.newspaper.failed')
    page.evaluate('__lr.newspaperSheet()')
    assert 'cached' in page.locator('.widget-news').inner_text()
    assert page.locator('.widget-news a').count()==2 and len(calls)==2
    # Serialize and reload with the real application's saved storage.
    page.set_viewport_size({'width':390,'height':844})
    page.reload(wait_until='networkidle')
    page.wait_for_function('!!window.__lr?.widgets')
    assert page.evaluate('__lr.widgets.data("newspaper").headlines.length')==2
    assert len(calls)==2
    print('PASS: cached fallback after network failure and reload; no repeated hourly requests')
    # The privacy projection preserves every existing preset's decor fields.
    presets=page.evaluate("""() => Object.entries(LR.PRESETS).map(([id,preset])=>{
      const r=new LR.Room();preset.make(r);const before=r.serialize();delete before.seed;
      return {id,before:JSON.parse(JSON.stringify(before)),after:LRWidgets.shareDecor(r.serialize())};
    })""")
    for preset in presets:
        assert preset['before']==preset['after'],preset['id']
    assert page.evaluate("""() => {for(const xml of ['not xml','<rss><channel></channel></rss>']) {
      try {LRWidgets.parseRSS(xml);return false;}catch(e){}
    }return true;}""")
    print(f'PASS: share projection preserves all {len(presets)} existing room presets; malformed and empty RSS rejected')
    # Test real compressed LR1 and fallback LR0 encoding with active private state.
    code=page.evaluate('__lr.roomCode()')
    assert code.startswith('LR1.')
    decoded=page.evaluate('code=>__lr.readCode(code)',code)
    assert 'OWNER_ONLY_NEWS' not in str(decoded)
    assert not any(k in str(decoded) for k in ['headlines','widgets','fridge-note','fetchedAt'])
    assert 'seed' not in decoded
    assert [i['t'] for i in decoded['items']]==['frenchdesk','newspaper']
    code0=page.evaluate('''async () => {const old=CompressionStream; window.CompressionStream=undefined;try{return await __lr.roomCode()}finally{window.CompressionStream=old}}''')
    assert code0.startswith('LR0.')
    assert page.evaluate('code=>__lr.readCode(code)',code0)==decoded
    context.close()  # Release the software WebGL renderer before a fresh recipient session.
    fresh=browser.new_context(viewport={'width':390,'height':844})
    fresh.add_init_script("localStorage.setItem('lr.intro','true')")
    fresh.route(RSS, lambda route: route.abort('failed'))
    fresh.route('**/boot.js', lambda route: route.fulfill(content_type='text/javascript', body='await new Promise(resolve=>setTimeout(resolve,1000));\n' + (ROOT / 'www/boot.js').read_text()))
    recipient=fresh.new_page(); recipient.on('pageerror',lambda e:errors.append(str(e)))
    recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
    try:
        recipient.wait_for_function('!!window.__lr')
    except Exception:
        raise AssertionError({'startup_errors':errors})
    recipient.click('#bMenu');recipient.get_by_role('tab',name='Rooms',exact=True).click();recipient.click('#bImportCode'); recipient.locator('textarea.code').fill(code); recipient.click('#bOpenCode')
    recipient.wait_for_function('__lr.room.name==="Widget room"')
    assert recipient.evaluate('__lr.room.items.map(i=>i.t)')==['frenchdesk','newspaper']
    assert 'OWNER_ONLY_NEWS' not in recipient.evaluate('JSON.stringify(localStorage)')
    assert recipient.evaluate('__lr.widgets.data("newspaper").headlines.length')==0
    recipient.evaluate('__lr.newspaperSheet()')
    assert 'No headlines cached yet' in recipient.locator('.widget-news').inner_text()
    assert recipient.locator('.widget-news a').count()==0
    assert not errors, errors
    assert set(external)=={RSS},external
    print('PASS: real LR1/LR0 round trips, fresh-session UI import, no private word/cache/headline payload, empty-cache fallback, delayed renderer startup, no browser errors')
    browser.close()
server.shutdown()
