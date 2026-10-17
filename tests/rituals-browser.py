"""Run after npm run build; requires Python Playwright and Chromium."""
import functools
import json
import os
import re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
known = re.findall(r"\['([a-z0-9]+)',\s*'", (ROOT / 'main.js').read_text())
for pack in (ROOT / 'packs').glob('*.js'):
    known += re.findall(r"\['([a-z0-9]+)',\s*'", pack.read_text())


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
        localStorage.setItem('lr.intro','true'); localStorage.setItem('lr.meta',JSON.stringify({visitors:false}));
        localStorage.setItem('lr.found', JSON.stringify(KNOWN));
        localStorage.setItem('test.seed','true');
      }
    '''.replace('KNOWN', json.dumps(known)))
    page = context.new_page(); errors = []; failed = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append(r.url))
    page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='networkidle')
    page.wait_for_function('!!window.__lr')
    assert page.evaluate('!LR.CAT.focuscandle && !LRLauncher.TOOLS.some(t=>t.id==="focus")')
    page.evaluate("__lr.setMode('explore',true); __lr.setPhase('day',true); __lr.view.setPhase('day',true); window.__phase=__lr.meta.phase; window.__weather=__lr.meta.weather; window.__baseExposure=__lr.view.r.toneMappingExposure")
    page.evaluate('__lr.dashboard.launcher()');page.get_by_role('button',name='Breathing room',exact=True).click(); page.click('#breathStart')
    page.wait_for_function('!!window.__lr.Sound.breathVoice')
    page.evaluate('__lr.view.frame(1,__lr.view.t+1)')
    assert page.locator('#breathingHud').is_visible()
    assert page.evaluate("document.body.classList.contains('breathing') && document.querySelector('header').inert")
    assert page.evaluate('__lr.view.breathCircle.visible && __lr.view.breathDim===1')
    assert page.evaluate('__lr.view.r.toneMappingExposure < __baseExposure')
    assert page.locator('#breathCue').inner_text() == 'Breathe in'
    assert page.evaluate('__lr.view.breathCircle.scale.x') == .8
    page.screenshot(path='/tmp/breathing-room-mobile.png')
    page.evaluate('__advance(4000); __lr.updateRituals(); __lr.view.frame(.1,__lr.view.t+.1)')
    assert page.locator('#breathCue').inner_text() == 'Breathe out'
    assert page.evaluate('__lr.view.breathCircle.scale.x') == 1.3
    assert page.evaluate('__lr.view.breathLevel') == 1
    page.keyboard.press('x')
    assert page.evaluate('__lr.state.mode') == 'explore'
    page.keyboard.press('Escape')
    assert not page.locator('#breathingHud').is_visible()
    assert page.evaluate('!__lr.Sound.breathVoice && !__lr.view.breathCircle.visible')
    page.evaluate('__lr.view.frame(1,__lr.view.t+1)')
    assert page.evaluate('__lr.view.breathDim') == 0
    assert page.evaluate('__lr.meta.phase===__phase && __lr.meta.weather===__weather && !document.querySelector("header").inert')
    assert page.evaluate('Math.abs(__lr.view.r.toneMappingExposure-__baseExposure)<1e-8')
    print('PASS: breathing circle, moon-blue dimming, synchronized phase and tone, blocked editing, Escape, lighting and control restoration')

    page.evaluate("() => { window.__chimes=0; const chime=__lr.Sound.ritualChime.bind(__lr.Sound); __lr.Sound.ritualChime=()=>{__chimes++;chime();}; }")
    page.evaluate('__lr.dashboard.launcher()');page.get_by_role('button',name='Breathing room',exact=True).click(); page.click('#breathStart')
    page.evaluate('__advance(599999); __lr.updateRituals()')
    assert page.locator('#breathingHud').is_visible()
    page.evaluate('__advance(1); __lr.updateRituals(); __lr.updateRituals()')
    assert not page.locator('#breathingHud').is_visible()
    assert page.evaluate('__chimes') == 1
    assert not page.evaluate('__lr.Sound.breathVoice')
    # A muted session remains fully usable and never creates a breathing oscillator.
    page.evaluate('__lr.Sound.on=false')
    page.evaluate('__lr.dashboard.launcher()');page.get_by_role('button',name='Breathing room',exact=True).click(); page.click('#breathStart')
    assert page.evaluate('__lr.rituals.breath.active && !__lr.Sound.breathVoice')
    page.click('#breathStop')
    assert not page.evaluate('__lr.rituals.breath.active')
    page.evaluate('__lr.Sound.on=true; __lr.startBreathing()')
    page.reload(wait_until='networkidle'); page.wait_for_function('!!window.__lr')
    assert page.evaluate('!__lr.rituals.breath.active && !__lr.Sound.breathVoice && !document.body.classList.contains("breathing")')
    assert not errors, errors
    assert not failed, failed
    print('PASS: exact ten-minute ending, one soft chime, silent mode, manual exit and safe reload')
    browser.close()
server.shutdown()
