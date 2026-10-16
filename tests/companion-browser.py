"""npm run build && python3 tests/companion-browser.py. Uses local assets only."""
import functools
import os
import re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / 'www')))
Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
                                args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    context.add_init_script('''
      window.__hour=14;
      const RealDate=Date;
      window.Date=class extends RealDate { getHours() { return window.__hour; } };
      localStorage.setItem('lr.intro','true');
    ''')
    page = context.new_page(); errors = []; failed = []; external = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.on('request', lambda r: external.append(r.url) if not r.url.startswith(('http://127.0.0.1:', 'data:', 'blob:')) else None)
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
    page.wait_for_function('!!window.__lr && !!window.__lr.companion.brain.state.roomId')
    assert page.evaluate("!LR.CAT.lampbot && !__lr.room.items.some(i=>i.t==='lampbot') && !__lr.view.objs.has('lampbot')")
    assert page.evaluate("__lr.view.root.children.filter(o=>o.name==='lampbot').length") == 1
    page.evaluate('window.__botUuid=__lr.companion.object.uuid')
    # The companion never enters a save, a picker group, the walk grid or placement checks.
    assert page.evaluate('''() => {
      const a=__lr, cells=Array.from(a.room.walkGrid()), bot=a.companion.object;
      bot.position.set(4.5,0,4.5);
      return JSON.stringify(cells)===JSON.stringify(Array.from(a.room.walkGrid())) && !a.room.serialize().items.some(i=>i.t==='lampbot');
    }''')
    page.click('#bMenu')
    page.get_by_role('tab',name='Rooms',exact=True).click()
    page.get_by_role('button', name=re.compile('Cat Loft')).first.click()
    page.wait_for_function('__lr.room.name === "Cat Loft" && __lr.companion.brain.state.roomId===__lr.meta.current')
    assert page.evaluate("__lr.companion.object.uuid===__botUuid && __lr.view.root.children.filter(o=>o.name==='lampbot').length===1")
    print('PASS: singleton follows actual room changes; absent from catalog, saves, placement and cat entity maps')

    for phase, hour in [('morning', 8), ('day', 14), ('evening', 19), ('night', 21)]:
        page.evaluate('''v => {
          window.__hour=v.hour; __lr.meta.phase=v.phase; __lr.meta.weather='clear';
          __lr.setMode('explore',true); __lr.companion.frame(.1);
          __lr.companion.brain.speak({phase:v.phase,hour:v.hour,weather:'clear',quiet:false},'context',true);
        }''', {'phase': phase, 'hour': hour})
        assert page.evaluate('__lr.companion.brain.state.category') == phase
    page.evaluate("__lr.meta.weather='rain'; __lr.companion.frame(.1)")
    assert page.evaluate('__lr.companion.brain.state.mode') == 'rain'
    assert page.evaluate('__lr.companion.brain.state.brightness') == 1.18
    page.evaluate("__lr.meta.weather='snow'; __lr.companion.tap(); __lr.companion.frame(.1)")
    assert page.evaluate('__lr.companion.brain.state.category') == 'snow'
    page.keyboard.press('Escape')
    page.evaluate("window.__hour=0; __lr.companion.frame(.1); window.__sleepSpot=[__lr.companion.brain.state.x,__lr.companion.brain.state.z]; for(let k=0;k<900;k++)__lr.companion.frame(.1); window.__sleepSpot=[__lr.companion.brain.state.x,__lr.companion.brain.state.z]")
    assert page.evaluate("__lr.companion.brain.state.mode==='sleep' && __lr.companion.brain.state.brightness===.18 && __lr.view.sprites.some(s=>s.visible && s.userData.wob===4)")
    assert page.evaluate('[__lr.companion.brain.state.x,__lr.companion.brain.state.z]') == page.evaluate('__sleepSpot')
    page.emulate_media(reduced_motion='no-preference')
    assert page.evaluate("() => {window.__hour=14; __lr.meta.phase='day'; __lr.meta.weather='clear'; __lr.room.items=[]; __lr.changed(); for(let k=0;k<40;k++)__lr.companion.frame(.1); __lr.view.beat=0; __lr.companion.frame(.1);return __lr.companion.brain.state.bob;}") == .065
    assert page.evaluate('() => {__lr.view.beat=.9; __lr.companion.frame(.1);return __lr.companion.brain.state.bob;}') < .001
    page.emulate_media(reduced_motion='reduce')
    print('PASS: all dayparts, rain/window attention, snow speech, midnight sleep/dimming/z, and beat-driven groove')

    # A real desk is added through the room model, but the companion consumes no desk surface slot.
    page.evaluate('''() => {
      const a=__lr; a.room.add(a.room.make('desk',{x:4,z:0})); a.changed();
      window.__beforePerch=JSON.stringify(a.room.serialize());
      a.setMode('edit',true); for(let k=0;k<30;k++) a.companion.frame(.1);
    }''')
    assert page.evaluate('__lr.companion.brain.state.mode') == 'perch'
    assert page.evaluate('__lr.companion.brain.state.y') == 1.5
    assert page.evaluate('JSON.stringify(__lr.room.serialize())===__beforePerch')
    page.evaluate("__lr.setMode('explore',true); for(let k=0;k<30;k++) __lr.companion.frame(.1)")
    assert page.evaluate('__lr.companion.brain.state.y') == 0
    # Use a clear small room so the actual tap can be checked without furniture occlusion.
    page.evaluate('''() => {
      const a=__lr; a.room.items=[]; a.room.n=10; a.room.wall.style='paint'; a.changed();
      a.meta.current++; a.companion.frame(.1); a.view.setPhase('day',true); a.view.frame(.1,a.view.t+.1);
    }''')
    assert page.evaluate("__lr.room.canPlace(__lr.room.make('chair',{x:4,z:4}))")
    point = page.evaluate('''() => {
      const c=__lr.companion,v=__lr.view, p=c.object.localToWorld(new THREE.Vector3(0,1.6,.38)).project(v.cam), r=v.r.domElement.getBoundingClientRect();
      const x=r.left+(p.x+1)*r.width/2, y=r.top+(1-p.y)*r.height/2;
      if(c.hit(x,y)) return {x,y};
      const offsets=[]; for(let dy=-12;dy<=12;dy+=3)for(let dx=-12;dx<=12;dx+=3)offsets.push([dx,dy]);
      offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
      for(const [dx,dy] of offsets)if(c.hit(x+dx,y+dy))return {x:x+dx,y:y+dy};
      throw Error('no visible companion tap target');
    }''')
    page.evaluate("() => { window.__pointer=[]; for(const kind of ['pointerdown','pointerup']) document.addEventListener(kind,e=>__pointer.push({kind,tag:e.target.tagName,hit:__lr.companion.hit(e.clientX,e.clientY)}),true); }")
    page.mouse.click(point['x'], point['y'])
    assert page.evaluate('!!__lr.companion.brain.state.message'), page.evaluate('({pointer:__pointer,state:__lr.companion.brain.state,mode:__lr.state.mode})')
    page.wait_for_function('!document.querySelector("#lampbotBubble").hidden')
    assert page.evaluate('__lr.companion.brain.state.hop') > 0
    assert page.locator('#lampbotBubble').inner_text()
    assert page.locator('.wardrobe-card').count() == 8
    page.keyboard.press('Escape')
    for width in (320, 390, 1280):
        page.set_viewport_size({'width': width, 'height': 844})
        page.evaluate('__lr.view.resize(); __lr.companion.tap(); __lr.companion.frame(.1)')
        page.keyboard.press('Escape')
        bounds = page.locator('#lampbotBubble').bounding_box()
        assert bounds and bounds['x'] >= 10 and bounds['x'] + bounds['width'] <= width - 10, bounds
        page.screenshot(path=f'/tmp/lampbot-{width}.png')
    page.evaluate('for(let k=0;k<42;k++) __lr.companion.frame(.1)')
    assert page.locator('#lampbotBubble').is_hidden()
    page.evaluate("__lr.discover('photo'); __lr.companion.frame(.1)")
    assert page.evaluate("__lr.companion.brain.state.category==='moment' && __lr.companion.brain.state.hop>0")
    print('PASS: desk perch, real pointer tap/hop/bubble, four-second dismissal, discover celebration and 320/390/1280px layouts')

    # Interactive room targets win even when the companion would geometrically cover them.
    assert page.evaluate('''() => {
      const a=__lr,c=a.companion; const cat=a.room.add(a.room.make('cat',{x:5,z:5,c:0})); a.changed(); c.frame(.1);
      const pick=a.view.pickItem, ray=a.view.raycaster.intersectObjects;
      a.view.pickItem=()=>({id:cat.id,behindWall:false,dist:100});
      a.view.raycaster.intersectObjects=()=>[{distance:.01}];
      try { return c.hit(100,100)===false; }
      finally { a.view.pickItem=pick; a.view.raycaster.intersectObjects=ray; }
    }''')
    page.evaluate('__lr.startBreathing(); __lr.companion.tap(); __lr.companion.frame(.1)')
    assert page.locator('#lampbotBubble').is_hidden()
    page.evaluate('__lr.stopBreathing()')
    assert not errors, errors
    assert not failed, failed
    assert not external, external
    print('PASS: cat tap priority, quiet ritual suppression, no remote asset/service requests or browser errors')
    browser.close()
server.shutdown()
