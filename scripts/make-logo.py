"""python3 scripts/make-logo.py
Renders the Lofi Rooms logo (scripts/logo.html: a lit window at night, a cat on the sill) into
every icon the app uses, then run `npm run icons` to rebuild the Android launcher icons and splash:
  assets/icon.png            512px rounded icon: favicon, share-card sign-off, link preview
  resources/icon-only.png    1024px full-bleed icon
  resources/icon-foreground.png / icon-background.png   Android adaptive icon layers
  resources/splash.png / splash-dark.png                2732px splash screens"""
import base64,functools,io
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/scripts/logo.html');page.wait_for_function('window.ready')
 out={k:Image.open(io.BytesIO(base64.b64decode(v.split(',')[1]))) for k,v in page.evaluate('make()').items()}
 browser.close()
assert not errors,errors
out['icon'].resize((512,512),Image.LANCZOS).save(ROOT/'assets'/'icon.png',optimize=True)
out['full'].convert('RGB').save(ROOT/'resources'/'icon-only.png',optimize=True)
out['fg'].save(ROOT/'resources'/'icon-foreground.png',optimize=True)
out['bg'].convert('RGB').save(ROOT/'resources'/'icon-background.png',optimize=True)
for name in ['splash.png','splash-dark.png']:out['splash'].convert('RGB').save(ROOT/'resources'/name,optimize=True)
print('logo rendered: assets/icon.png and resources/*.png; now run npm run icons')
