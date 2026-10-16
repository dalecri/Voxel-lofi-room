"""Browser regressions: npm run build && python3 tests/shop-browser.py.

Requires Python Playwright and Chromium (CHROMIUM_PATH defaults to /usr/bin/chromium).
Uses an ephemeral local server and isolated browser storage, never a live deployment.
"""
import functools
import json
import os
from pathlib import Path
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
# Seed known moments so incidental cat naps don't change the balances under test.
known = re.findall(r"\['([a-z0-9]+)',\s*'", (ROOT / 'main.js').read_text())
for pack in (ROOT / 'packs').glob('*.js'):
    known += re.findall(r"\['([a-z0-9]+)',\s*'", pack.read_text())


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / 'www')))
Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'


def boot(browser, missing=(), balance=None, mobile=False):
    context = browser.new_context(reduced_motion='reduce', viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 900})
    seed = {'lr.intro': True, 'lr.found': [k for k in known if k not in missing],
            'lr.merchant': {'date': '2026-10-15', 'wares': ['crown', 'galaxy', 'bluefire'], 'until': 0},
            'lr.daily': {'date': '2026-10-15', 'id': 'tea', 'done': True}}
    if balance is not None:
        seed['lr.fireflies'] = balance
    context.add_init_script('''
      const RealDate = Date;
      let clock = new RealDate('2026-10-15T12:00:00').getTime();
      window.__advanceDay = n => { clock += n * 86400000; };
      window.Date = class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [clock])); }
        static now() { return clock; }
      };
      if (!localStorage.getItem('shop.test.seeded')) {
        const seed = SEED;
        seed['lr.merchant'].until = Date.now() + 180000;
        Object.entries(seed).forEach(([k,v]) => localStorage.setItem(k, JSON.stringify(v)));
        localStorage.setItem('shop.test.seeded', 'true');
      }
    '''.replace('SEED', json.dumps(seed)))
    page = context.new_page()
    errors, failed = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.goto(URL, wait_until='networkidle')
    page.wait_for_function('!!window.__lr')
    page.evaluate("__lr.setMode('explore',true); __lr.tickWorld(0)")
    return context, page, errors, failed


def balance(page):
    return page.evaluate('window.__lr.shop.balance')


def clean(context, errors, failed):
    assert not errors, errors
    assert not failed, failed
    context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True,
                                args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'])
    c, page, errors, failed = boot(browser, missing=('photo',))
    assert balance(page) == 30
    page.evaluate('''() => {
      const a = window.__lr;
      window.__writes = [];
      const set = Store.set;
      Store.set = (k,v) => { __writes.push(k); set(k,v); };
      a.discover('photo'); a.discover('photo');
    }''')
    assert balance(page) == 35
    assert page.locator('.toast.firefly').filter(has_text='+5').count() == 1
    page.evaluate("localStorage.setItem('lr.daily', JSON.stringify({date:'2026-10-15',id:'tea',done:false})); __lr.discover('tea'); __lr.discover('tea')")
    assert balance(page) == 50
    page.evaluate('''() => {
      const a=__lr, plant=a.room.items.find(i=>LR.CAT[i.t].tap==='water');
      window.__plant=plant.id; a.interact(plant.id); a.interact(plant.id);
    }''')
    assert balance(page) == 52
    # More genuine watering interactions reach, but never exceed, the regular allowance.
    page.evaluate('''() => {
      const a=__lr;
      const plantType=a.room.items.find(i=>LR.CAT[i.t].tap==='water').t;
      for(let k=0;k<20;k++) a.room.add(a.room.make(plantType,{x:k%10,z:Math.floor(k/10)+5}));
      a.changed(); a.care.tick(0);
      for(const it of a.room.items.filter(i=>LR.CAT[i.t].tap==='water')) a.interact(it.id);
    }''')
    assert balance(page) == 80
    assert page.evaluate('__lr.shop.earnedToday') == 50
    assert page.evaluate("__writes.includes('lr.fireflies') && __writes.includes('lr.fireflyDay')")
    page.reload(wait_until='networkidle'); page.wait_for_function('!!window.__lr')
    assert balance(page) == 80
    assert page.evaluate('__lr.shop.earnedToday') == 50
    page.evaluate("__lr.interact(__lr.room.items.find(i=>LR.CAT[i.t].tap==='water').id)")
    assert balance(page) == 80
    clean(c, errors, failed)
    print('PASS: moment, Daily Moment, watering, duplicate prevention, cap, Store writes and balance reload')

    c, page, errors, failed = boot(browser)
    page.evaluate("localStorage.setItem('lr.daily',JSON.stringify({date:'2026-10-15',id:'watered',done:false})); __lr.interact(__lr.room.items.find(i=>LR.CAT[i.t].tap==='water').id)")
    assert balance(page) == 47  # the first watering today also completes the daily
    clean(c, errors, failed)
    print('PASS: first-day watering completes the Daily Moment')

    c, page, errors, failed = boot(browser)
    page.evaluate("localStorage.setItem('lr.dailyStreak',JSON.stringify({n:6,last:'2026-10-14'})); localStorage.setItem('lr.daily',JSON.stringify({date:'2026-10-15',id:'tea',done:false})); __lr.discover('tea'); __lr.discover('tea')")
    assert balance(page) == 70  # 30 + 15 + 25
    page.evaluate("__advanceDay(7); localStorage.setItem('lr.dailyStreak',JSON.stringify({n:13,last:'2026-10-21'})); localStorage.setItem('lr.daily',JSON.stringify({date:'2026-10-22',id:'tea',done:false})); __lr.discover('tea')")
    assert balance(page) == 110
    page.evaluate("__advanceDay(2); localStorage.setItem('lr.daily',JSON.stringify({date:'2026-10-24',id:'tea',done:false})); __lr.discover('tea')")
    assert balance(page) == 125
    assert page.evaluate("JSON.parse(localStorage.getItem('lr.dailyStreak')).n") == 1
    clean(c, errors, failed)
    print('PASS: seventh and fourteenth day bonuses, no duplicate completion, missed-day reset')

    c, page, errors, failed = boot(browser, missing=('photo', 'lucky'))
    page.click('#bHome');page.locator('#homeView [data-app=merchant]').click()
    assert page.locator('.shop-card').count() == 3
    assert page.locator('[data-shop-buy="crown"]').is_disabled()
    page.click('#shopClose')
    page.evaluate("__lr.discover('photo'); __lr.discover('lucky')")
    assert balance(page) == 40
    page.click('#bHome');page.locator('#homeView [data-app=merchant]').click()
    page.click('[data-shop-buy="crown"]')
    assert balance(page) == 0
    assert page.locator('[data-shop-item="crown"]').evaluate("e=>e.classList.contains('purchased')")
    assert page.locator('[data-shop-buy="crown"]').is_disabled()
    assert not page.evaluate("__lr.shop.buy('crown')")
    page.click('#shopClose')
    page.evaluate("__lr.state.group='market'; __lr.setMode('edit',true)")
    assert page.locator('#row .swatch').filter(has_text='Cat crown').count() == 1
    assert page.locator('#row .swatch').filter(has_text='Tiny UFO').count() == 0
    page.locator('#row .swatch').filter(has_text='Cat crown').click()
    assert page.evaluate("__lr.state.add") == 'shopcrown'
    page.evaluate('''() => {
      const a=__lr; const it=a.room.add(a.room.make('shopcrown',{x:8,z:8}));
      a.changed(); a.interact(it.id);
    }''')
    page.locator('#crownCats button').first.click()
    assert page.locator('#crownCats button[aria-pressed="true"]').count() == 1
    assert page.evaluate("__lr.room.items.some(i=>i.t==='cat' && i.crown && __lr.view.objs.get(i.id).userData.key.includes('crown'))")
    page.click('#crownClose'); page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()")
    page.reload(wait_until='networkidle'); page.wait_for_function('!!window.__lr')
    assert balance(page) == 0
    assert page.evaluate("__lr.shop.owns('crown') && __lr.room.items.some(i=>i.t==='cat' && i.crown)")
    page.evaluate("__lr.state.group='market'; __lr.setMode('edit',true)")
    assert page.locator('#row .swatch').filter(has_text='Cat crown').count() == 1
    clean(c, errors, failed)
    print('PASS: first-session purchase, animation, picker unlock, crowned cat rendering and saved reload at zero balance')

    c, page, errors, failed = boot(browser, balance=10000, mobile=True)
    # The stall is freely placeable and opens exactly the same shop as the menu.
    page.evaluate("const a=__lr; const stall=a.room.add(a.room.make('marketstall',{x:7,z:7})); a.changed(); a.interact(stall.id)")
    assert page.locator('#shopBalance').inner_text() == '10000 Fireflies'
    assert page.evaluate("document.querySelector('#sheetBody').scrollWidth <= document.querySelector('#sheetBody').clientWidth")
    page.screenshot(path='/tmp/firefly-shop-mobile.png')
    count=page.evaluate("LRShop.catalog.length")
    spent=page.evaluate("LRShop.catalog.reduce((sum,c)=>sum+c.price,0)")
    visits=(count+2)//3
    for visit in range(visits):
        for item in page.evaluate('__lr.merchant.wares'):
            page.click(f'[data-shop-buy="{item}"]')
        if visit < visits-1:
            page.click('#shopClose')
            page.evaluate("__advanceDay(1); __lr.setMode('explore',true); __lr.tickWorld(200); __lr.openShop()")
    assert page.evaluate("JSON.parse(localStorage.getItem('lr.shopOwned')).length") == count
    assert balance(page) == 10000-spent
    page.click('#shopClose')
    page.evaluate('''() => {
      const a=__lr; a.room.items=[]; a.room.n=24;
      const types=LRShop.catalog.filter(c=>c.piece).map(c=>c.piece);
      types.forEach((t,k)=>a.room.add(a.room.make(t,{x:(k%7)*3,z:Math.floor(k/7)*3,on:LR.CAT[t].on||false})));
      a.changed(); a.setPhase('night',true);
      for(const it of a.room.items.filter(i=>LR.CAT[i.t].roomEffect)) a.interact(it.id);
      a.state.group='market'; a.setMode('edit',true);
    }''')
    assert page.locator('#row .swatch').count() == page.evaluate('LRShop.catalog.filter(c=>c.piece).length+1')
    page.wait_for_timeout(1000)
    assert page.evaluate("__lr.room.items.filter(i=>LR.CAT[i.t].roomEffect).every(i=>i.on)")
    # Cosmetic fireplaces retain the base fireplace's moment behavior.
    page.evaluate('''() => {
      const a=__lr, fire=a.room.items.find(i=>i.t==='shopbluefire');
      fire.on=false; a.changed(); a.care.tick(0);
      localStorage.setItem('lr.daily',JSON.stringify({date:a.ensureDaily().date,id:'fire',done:false}));
      a.interact(fire.id);
    }''')
    assert balance(page) == 10000-spent+15
    page.evaluate("__lr.state.tool='paint'; __lr.state.paintTab='walls'; __lr.setMode('edit',true)")
    page.locator('#row .swatch').filter(has_text='Constellation').click()
    page.get_by_role('button', name='Floor', exact=True).click()
    page.locator('#row .swatch').filter(has_text='Moonstone').click()
    page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()")
    page.reload(wait_until='networkidle'); page.wait_for_function('!!window.__lr')
    assert page.evaluate("__lr.room.wall.style==='shopstars' && __lr.room.floor.style==='shoppearl'")
    assert page.evaluate("__lr.room.items.filter(i=>LR.CAT[i.t].roomEffect).every(i=>i.on)")
    page.evaluate("for(const it of __lr.room.items.filter(i=>LR.CAT[i.t].roomEffect)) __lr.interact(it.id)")
    assert page.evaluate("__lr.room.items.filter(i=>LR.CAT[i.t].roomEffect).every(i=>!i.on)")
    clean(c, errors, failed)
    print('PASS: free stall, all cosmetics purchased and rendered, mobile layout, effects toggled, finishes applied and persisted')
    browser.close()
server.shutdown()
