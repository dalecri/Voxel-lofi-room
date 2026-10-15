"""npm run build && python3 tests/dialogs-browser.py. Template transition and sheet keyboard regressions."""
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
    sheet=page.locator('#sheet')
    def closed():
        assert 'open' not in (sheet.get_attribute('class') or '')
    def template():
        page.click('#bMenu')
        page.locator('.card').filter(has_text='Lofi Study').click()
    template()
    closed()
    # Exercise the reported saved template path with each of its three buttons.
    for action in ['lvStay','lvSave','lvDrop','Escape']:
        page.click('#bSave')
        page.evaluate('a=>{__lr.room.name="Edited "+a;__lr.changed()}',action)
        previous=page.evaluate('__lr.meta.current')
        template()
        assert 'Keep your changes?' in page.locator('#sheetBody').inner_text()
        if action=='Escape':
            # A sheet must take priority over the crate's capturing key handler.
            page.evaluate('__lr.openCrate()')
            page.locator('#lvStay').focus()
            page.keyboard.press('Escape')
            assert page.locator('#crate').evaluate('e=>e.classList.contains("open")')
            page.click('#crateClose')
        else: page.click('#'+action)
        closed()
        current=page.evaluate('__lr.meta.current')
        assert (current==previous)==(action in ['lvStay','Escape'])
        if action=='lvSave':
            assert page.evaluate('id=>JSON.parse(localStorage.getItem("lr.room."+id)).name',previous)=='Edited lvSave'
    print('PASS: saved template confirmation Save, Don’t save, Stay and Escape; correct room transitions and persistence',flush=True)
    # Close remains functional even if an optional audio cue fails.
    page.click('#bSave')
    page.evaluate('__lr.room.name="Audio unavailable";__lr.changed()')
    template()
    page.evaluate('() => {window.__slide=__lr.Sound.slide;__lr.Sound.slide=()=>{throw Error("audio unavailable")}}')
    page.click('#lvStay');closed()
    page.evaluate('() => {__lr.Sound.slide=__slide}')
    for width in [320,390,1280]:
        page.set_viewport_size({'width':width,'height':844})
        for action in ['button','Escape']:
            page.click('#bMenu');page.click('#bShareCode')
            page.locator('textarea.code').wait_for()
            assert page.locator('textarea.code').input_value().startswith('LR1.')
            if action=='button':page.get_by_role('button',name='Close dialog',exact=True).click()
            else:
                page.locator('textarea.code').focus()
                page.keyboard.press('Escape')
            closed()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    print('PASS: share Close and focused-textarea Escape at 320/390/1280 widths; audio failure cannot trap confirmation; no JS errors',flush=True)
    browser.close()
server.shutdown()
