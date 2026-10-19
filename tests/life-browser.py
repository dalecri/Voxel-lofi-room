"""Run after npm run build; requires Python Playwright and Chromium."""
import functools
import json
import os
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
    context = browser.new_context(reduced_motion='reduce', viewport={'width': 390, 'height': 844})
    context.add_init_script('''
      const RealDate=Date;
      let clock=Number(sessionStorage.getItem('test.clock')) || new RealDate('2026-10-15T12:00:00').getTime();
      window.__advance = ms => { clock+=ms; sessionStorage.setItem('test.clock',clock); };
      window.Date=class extends RealDate { constructor(...a) { super(...(a.length?a:[clock])); } static now() { return clock; } };
      if(!localStorage.getItem('test.seed')) {
        localStorage.setItem('lr.intro','true'); localStorage.setItem('lr.fireflies','200');
        localStorage.setItem('lr.shopOwned','["crown"]'); localStorage.setItem('test.seed','true');
      }
    ''')
    page = context.new_page(); errors = []; failed = []
    page.route('https://gist.githubusercontent.com/**',lambda r:r.fulfill(json={'clips':[]}))
    page.route('https://catfact.ninja/**',lambda r:r.fulfill(json={'fact':'Cats enjoy a quiet room.'}))
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
    page.wait_for_function('!!window.__lr')
    page.evaluate("__lr.setMode('explore',true); __lr.openShop()")
    assert page.locator('.shop-card').count() == 0
    assert 'come back another day' in page.locator('#sheetBody').inner_text()
    page.click('#shopClose')
    page.evaluate('__lr.meta.visitors=false; __lr.tickWorld(200)')
    assert not page.evaluate('__lr.merchant.active')
    page.evaluate('__lr.meta.visitors=true; __lr.tickWorld(200)')
    wares = page.evaluate('__lr.merchant.wares')
    assert len(set(wares)) == 3
    assert 'crown' not in wares
    assert page.evaluate("__lr.room.items.filter(i=>i.t==='merchantcat').length") == 1
    assert page.evaluate("!__lr.room.serialize().items.some(i=>i.t==='merchantcat')")
    page.evaluate("__lr.interact(__lr.room.items.find(i=>i.t==='merchantcat').id)")
    assert page.locator('.shop-card').count() == 3
    item = wares[0]
    price = page.evaluate('(id)=>LRShop.allCatalog.find(c=>c.id===id).price', item)
    before = page.evaluate('__lr.shop.balance')
    page.click(f'[data-shop-buy="{item}"]')
    assert page.evaluate('__lr.shop.balance') == before - price
    assert page.evaluate('(id)=>__lr.shop.owns(id)', item)
    wares = page.evaluate('__lr.merchant.wares')  # purchased traveling colorways leave the satchel immediately
    page.screenshot(path='/tmp/traveling-merchant-mobile.png')
    page.reload(wait_until='networkidle'); page.wait_for_function('!!window.__lr')
    page.evaluate("__lr.setMode('explore',true); __lr.tickWorld(0)")
    assert page.evaluate('__lr.merchant.wares') == wares
    assert page.evaluate('__lr.shop.balance') == before - price
    assert page.evaluate('(id)=>__lr.shop.owns(id)', item)
    # The visitor uses the same walking paths as the resident cats.
    assert page.evaluate('''() => {
      const a=__lr, cat=a.room.items.find(i=>i.t==='merchantcat'), P=a.view.pets.get(cat.id);
      for(let z=0;z<a.room.n;z++) for(let x=0;x<a.room.n;x++) {
        if(a.view.walkCatTo(cat.id,x,z)) {
          const old=[P.x,P.z]; a.view.updatePets(.4,a.view.t+.4);
          return old[0]!==P.x || old[1]!==P.z;
        }
      }
      return false;
    }''')
    page.evaluate('__lr.openShop(); __advance(160000); __lr.tickWorld(1); __advance(30000); __lr.tickWorld(1)')
    assert page.evaluate('__lr.merchant.active')
    page.click('#shopClose')
    page.evaluate('__advance(61000); __lr.tickWorld(1); __lr.openShop()')
    assert page.locator('.shop-card').count() == 0
    assert page.evaluate("!__lr.room.items.some(i=>i.t==='merchantcat')")
    page.click('#shopClose'); page.evaluate('__lr.tickWorld(10000)')
    assert not page.evaluate('__lr.merchant.active')
    page.evaluate('__advance(86400000); __lr.tickWorld(200)')
    assert page.evaluate('__lr.merchant.active')
    print('PASS: merchant arrival, three wares, purchases and reload, walking, lingering, departure and return')

    page.evaluate('''() => {
      const a=__lr, cat=a.room.items.find(i=>i.t==='cat'&&!i.visitor);
      window.__catId=cat.id;
      a.interact(cat.id); a.interact(cat.id);
      const P=a.view.pets.get(cat.id); P.state='nap'; P.reportState='sit'; P.timer=10; P.path=null; P.hop=null;
      a.view.updatePets(.1,a.view.t+.1);
      P.state='eat'; P.reportState='sit'; P.timer=10;
      a.view.updatePets(.1,a.view.t+.1);
    }''')
    entries = page.evaluate('__lr.catJournal.entries')
    assert sum(e['kind'] == 'pet' for e in entries) == 1
    assert any(e['kind'] in ('sunbeam', 'nap') for e in entries)
    assert any(e['kind'] == 'eat' for e in entries)
    page.click('#disc');page.locator('#cozyMoments').wait_for();page.click('#bCatDiary')
    assert page.locator('#catDiary .d').count() == len(entries)
    assert page.locator('#catDiary').evaluate('e=>e.clientWidth >= e.parentElement.clientWidth - 2')
    assert 'evidence' in page.locator('#catDiary').inner_text() or 'fed' in page.locator('#catDiary').inner_text()
    page.screenshot(path='/tmp/cat-journal-mobile.png')
    page.reload(wait_until='networkidle'); page.wait_for_function('!!window.__lr')
    assert len(page.evaluate('__lr.catJournal.entries')) >= len(entries)
    page.click('#disc');page.locator('#cozyMoments').wait_for();page.click('#bCatDiary')
    assert page.locator('#catDiary .d').count() >= len(entries)
    page.click('#bMomentDiary')
    assert page.locator('#journalFeed .d').count() > 50
    page.keyboard.press('Escape')
    print('PASS: cat POV from pets, naps and meals; second journal feed; persistence without changing moments')

    # Arrival/diary checks use reduced motion; explicitly enable motion for ambient visuals.
    page.emulate_media(reduced_motion='no-preference')
    page.wait_for_function('!__lr.view.reducedMotion')
    # Capture the short-lived event synchronously, before a normal render/room sync can clear it.
    scheduled = page.evaluate('''() => {
      __lr.setMode('explore',true); __lr.meta.raining=false; __lr.setPhase('day',true);
      __lr.view.clearLifeEvents();
      document.querySelector('#photo').classList.add('open'); __lr.tickWorld(200);
      const paused=__lr.view.lifeEvents.length===0;
      document.querySelector('#photo').classList.remove('open');
      const before=__lr.shop.balance;
      const old=Math.random; Math.random=()=>.99;
      try { __lr.tickWorld(200); } finally { Math.random=old; }
      return {paused, kinds:__lr.view.lifeEvents.map(e=>e.userData.kind), noReward:__lr.shop.balance===before};
    }''')
    assert scheduled['paused']
    assert 'butterfly' in scheduled['kinds'], scheduled
    assert scheduled['noReward']
    for kind in ('butterfly', 'train', 'leaves'):
        result = page.evaluate('''kind => {
          const v=__lr.view; v.clearLifeEvents();
          if(!v.ambientEvent(kind)) return false;
          const event=v.lifeEvents[0]; window.__disposed=0;
          event.children[0].geometry.addEventListener('dispose',()=>__disposed++);
          v.updateLifeEvents(1);
          const visible=event.children.every(o=>o.material.opacity>0);
          v.updateLifeEvents(20);
          return visible && !event.parent && v.lifeEvents.length===0 && __disposed===1;
        }''', kind)
        assert result, kind
    page.evaluate('''() => {
      const S=__lr.Sound; S.init();
      let calls=0; const create=S.ctx.createBufferSource.bind(S.ctx);
      S.ctx.createBufferSource=()=>{calls++;return create();};
      S.on=false; S.ambientEvent('train'); if(calls) throw Error('muted ambience');
      S.on=true; S.ambientEvent('train'); if(!calls) throw Error('missing train sound');
    }''')
    assert not errors, errors
    assert not failed, failed
    print('PASS: spontaneous butterfly, ambient visuals and cleanup, no currency reward, sound respects mute')
    browser.close()
server.shutdown()
