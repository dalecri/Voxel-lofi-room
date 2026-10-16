"""npm run build && python3 tests/performance-browser.py"""
import functools,base64
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(reduced_motion='reduce',viewport={'width':960,'height':640},device_scale_factor=2)
 context.add_init_script("""localStorage.setItem('lr.intro','true');localStorage.setItem('lr.mode','\"explore\"');
 if(!sessionStorage.perfFixture){localStorage.setItem('lr.reducedMotion','true');sessionStorage.perfFixture='true';const r={v:1,name:'Still night',n:10,wall:{style:'paint',color:0},floor:{style:'oak'},items:[]};for(const [k,v] of Object.entries({'lr.rooms':[{id:101,name:r.name,n:0}],'lr.room.101':r,'lr.meta':{current:101,realtime:false,dreamy:false,visitors:false,mischief:false,phase:'night',weather:'clear',glow:false}}))localStorage.setItem(k,JSON.stringify(v));}
 
 const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[2026,9,16,2,0,0]));}static now(){return new RealDate(2026,9,16,2).getTime();}};""")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(e.stack));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.set_default_timeout(30000)
 print('loading',flush=True)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.renderLoop');print('loaded',flush=True)
 page.evaluate("""() => {const a=__lr;a.room.items=[];a.meta.realtime=false;a.meta.dreamy=false;a.meta.visitors=false;a.meta.mischief=false;a.meta.weather='clear';a.meta.raining=false;a.setMode('explore',true);a.setPhase('night',true);a.view.setWeather('clear');a.view.setRain(false);a.changed();} """)
 # Quiet, reduced-motion, clear night: nothing visible moves. Opening Home also
 # suppresses speech/Z particles, as it already did before performance scheduling.
 page.click('#bHome');print('waiting for static night',flush=True)
 try:page.wait_for_function('__lr.renderLoop.sleeping',timeout=60000)
 except Exception:
  print(page.evaluate('({sources:__lr.activity.sources,state:__lr.companion.brain.state,weather:__lr.view.weather,night:__lr.view.ph.night})'),flush=True);raise
 print('static night slept',flush=True)
 count=page.evaluate('__lr.renderLoop.frames');page.wait_for_timeout(1200);assert page.evaluate('__lr.renderLoop.frames')-count<=1
 # Instrument real draw submissions as well as scheduler diagnostics.
 page.evaluate('''() => {const v=__lr.view,draw=v.draw;window.draws=0;v.draw=function(...args){window.draws++;return draw.apply(this,args);};}''')
 page.wait_for_timeout(1200);assert page.evaluate('draws')<=1
 print('zero submissions',flush=True)
 # Pointer/camera events schedule the next animation frame immediately.
 page.mouse.move(80,80);page.wait_for_function('draws>0');page.wait_for_function('__lr.renderLoop.sleeping')
 page.evaluate('__lr.view.yawGoal+=.4;__lr.activity.wake()');page.wait_for_function('Math.abs(__lr.view.yawGoal-__lr.view.yaw)<.001');page.wait_for_function('__lr.renderLoop.sleeping')
 page.evaluate('__lr.view.fx.spawn(5,1,5,0,.1,0,0xffffff,.06,1,0,0,1)');assert not page.evaluate('__lr.renderLoop.sleeping');page.wait_for_function('__lr.activity.sources.includes("particles")');page.wait_for_function('__lr.renderLoop.sleeping')
 print('camera and particle wake passed',flush=True)
 page.keyboard.press('Escape');page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click();page.get_by_role('button',name='Calm performance',exact=True).click()
 assert page.evaluate('__lr.view.r.getPixelRatio()')==1
 assert page.evaluate('__lr.view.r.toneMapping===THREE.NoToneMapping && !__lr.view.r.shadowMap.autoUpdate')
 assert 'next app load' in page.locator('#menu-settings').inner_text()
 assert page.evaluate('__lr.view.sun.shadow.mapSize.x')==1024
 assert page.evaluate('__lr.view.composer===null')
 assert page.evaluate('__lr.activity.quietMs')==1000
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.meta")).calmPerformance')
 assert page.evaluate('JSON.parse(localStorage.getItem("lr.reducedMotion"))') is True
 print('calm enabled',flush=True)
 # Count actual depth-map target submissions, not calls that return early from
 # WebGLShadowMap.render. Repeated still draws must reuse the existing texture.
 shadows=page.evaluate('''() => {const a=__lr,v=a.view;v.draw();v.draw();let passes=0;const setTarget=v.r.setRenderTarget;v.r.setRenderTarget=function(target,...rest){if(target&&target===v.sun.shadow.map)passes++;return setTarget.call(this,target,...rest);};try{for(let i=0;i<20;i++)v.draw();const still=passes;a.activity.wake();for(let i=0;i<8;i++)v.draw();const event=passes;v.root.position.x+=.1;for(let i=0;i<8;i++)v.draw();const moved=passes;v.root.position.x-=.1;v.draw();passes=0;const intensity=v.sun.intensity;for(let i=0;i<8;i++){v.sun.intensity+=.01;v.draw();}v.sun.intensity=intensity;return {still,event,moved,flicker:passes};}finally{v.r.setRenderTarget=setTarget;}}''')
 assert shadows=={'still':0,'event':1,'moved':2,'flicker':0},shadows
 print('static depth maps reuse, wake and moving-caster invalidation passed',flush=True)
 page.evaluate('__lr.room.n=20;__lr.changed()');assert page.evaluate('__lr.view.sun.shadow.mapSize.x')==1024;page.evaluate('__lr.room.n=10;__lr.changed()')
 # Turning it off restores bloom and normal quality without touching motion.
 page.get_by_role('button',name='Calm performance',exact=True).click();assert page.evaluate('__lr.view.r.getPixelRatio()')==2;assert page.evaluate('__lr.view.r.shadowMap.autoUpdate && __lr.view.r.toneMapping===THREE.ACESFilmicToneMapping');assert page.evaluate('__lr.view.sun.shadow.mapSize.x')==2048;assert page.evaluate('!!__lr.view.composer')
 page.get_by_role('button',name='Calm performance',exact=True).click();page.keyboard.press('Escape');page.click('#bHome');page.wait_for_function('__lr.renderLoop.sleeping')
 print('quality restore passed',flush=True)
 # Photo capture must produce pixels even from a sleeping render loop.
 result=page.evaluate('''() => {const a=__lr,s=a.view.snapshot();a.view.beginCapture(320,240);a.view.frame(.033,a.view.t+.033);const size=[a.view.r.domElement.width,a.view.r.domElement.height];return {s:s.length,size};}''');assert result['s']>1000;assert result['size']==[320,240]
 page.wait_for_timeout(2200);assert not page.evaluate('__lr.renderLoop.sleeping');assert 'capture' in page.evaluate('__lr.activity.sources');page.evaluate('__lr.view.endCapture()')
 page.wait_for_function('__lr.renderLoop.sleeping');page.keyboard.press('Escape');page.click('#bPhoto');page.wait_for_function('document.querySelector("#photo").classList.contains("open")');assert page.evaluate('!__lr.renderLoop.sleeping');page.keyboard.press('Escape')
 print('capture passed',flush=True)
 # Rain, beat mode and first-person cat view each prohibit sleeping.
 page.evaluate("__lr.view.setWeather('rain');window.frameStart=performance.now();window.frameCount=__lr.renderLoop.frames");page.wait_for_timeout(2500);fps=page.evaluate('(__lr.renderLoop.frames-frameCount)*1000/(performance.now()-frameStart)');assert 0<fps<=32,fps;print('active Calm submissions/sec:',round(fps,1),flush=True);assert not page.evaluate('__lr.renderLoop.sleeping');assert 'weather' in page.evaluate('__lr.activity.sources')
 page.evaluate("__lr.view.setWeather('clear');__lr.view.music=true;__lr.meta.music=true;__lr.Sound.beat=()=>.4")
 # Use actual controls for the explicit preference; no Calm override.
 page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click();page.get_by_role('button',name='Reduced motion',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(2200);assert not page.evaluate('__lr.renderLoop.sleeping');assert 'beat' in page.evaluate('__lr.activity.sources')
 page.evaluate('''() => {const a=__lr,type=Object.keys(LR.CAT).find(k=>LR.CAT[k].kind==='pet'&&!LR.CAT[k].robot);const it=a.room.add(a.room.make(type,{x:3,z:3}));a.changed();if(!a.view.enterCatView(it.id))throw Error('Cat view did not open');}''');page.wait_for_timeout(2200);assert not page.evaluate('__lr.renderLoop.sleeping');assert 'camera' in page.evaluate('__lr.activity.sources');page.evaluate('__lr.view.exitCatView()')
 # Persisted toggle is applied before the first frame after reload.
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.renderLoop');assert page.evaluate('__lr.meta.calmPerformance');assert page.evaluate('!__lr.view.reducedMotion');assert page.evaluate('__lr.view.composer===null');assert page.evaluate('__lr.view.sun.shadow.mapSize.x')==1024
 assert page.evaluate('!__lr.view.r.getContext().getContextAttributes().antialias');assert page.evaluate('__lr.view.r.getContext().getContextAttributes().powerPreference')=='low-power'
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1200);page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click();assert page.get_by_role('button',name='Calm performance',exact=True).is_visible();assert page.evaluate('__lr.view.r.getPixelRatio()')==1;page.screenshot(path='/tmp/calm-performance-mobile.png');page.keyboard.press('Escape');assert not errors,errors
 page.set_viewport_size({'width':1440,'height':900})
 pictures=page.evaluate('''() => {const a=__lr,v=a.view;LR.PRESETS.study.make(a.room);a.room.items=a.room.items.filter(i=>LR.CAT[i.t].kind!=='pet');a.changed();a.meta.realtime=false;a.meta.dreamy=false;const shots={};for(const phase of ['day','night']){a.setPhase(phase,true);v.setPhase(phase,true);v.setCalmPerformance(false);a.activity.setCalm(false);v.frame(0,v.t);shots[phase+'-normal']=v.snapshot();v.setCalmPerformance(true);a.activity.setCalm(true);v.frame(0,v.t);shots[phase+'-calm']=v.snapshot();}return shots;}''')
 for name,data in pictures.items():Path('/tmp/calm2-'+name+'-1440.png').write_bytes(base64.b64decode(data.split(',')[1]))
 assert not errors,errors
 print('PASS: static scene sleeps without GPU submissions, pointer/camera wake, four quality levers and reload persistence, unchanged motion preference, photo/capture while idle, weather/beat stay active, desktop/mobile without errors',flush=True)
 browser.close()
server.shutdown()
