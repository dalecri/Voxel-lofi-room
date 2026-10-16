"""npm run build && python3 tests/costumes-browser.py. Local-only wardrobe/pose/privacy integration."""
import functools,json
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
 context=browser.new_context(viewport={'width':390,'height':844})
 context.add_init_script("if(!sessionStorage.wardrobeFixture){sessionStorage.wardrobeFixture='true';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.wardrobe',JSON.stringify({selected:'cat',owned:['cat']}));}")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.wardrobe')
 # Contact sheet uses the same definitions, rig and pose function as the live companion.
 images=page.evaluate('''() => {
  const a=__lr, images=[];
  for(const c of LRCostumes.COSTUMES) for(const name of ['idle','walk','sit','sleep']) {
   const url=a.view.thumb({t:'pose-preview:'+c.id,on:true},LRCompanion.definitionFor(c.id,true),obj=>{
    LRCompanion.attachRig(obj);const pose=new THREE.Group();obj.add(pose);pose.add(obj.userData.inner);
    const state={pose:name==='idle'||name==='walk'?'stand':name,mode:name==='walk'?'wander':'idle',elapsed:1.25,tilt:0,weight:0,blink:false,pageTurn:0,sipping:false};
    LRCompanion.applyPose(obj,pose,state,false);
    if(obj.userData.pose!==name)throw Error('pose mapping '+name);
    const parts=obj.userData.parts;
    if(parts.lids.parent!==parts.head)throw Error('hood/blink rig hierarchy');
    if(name==='sit'&&parts.legs.rotation.x!==-Math.PI/2)throw Error('sit rig');
    if(name==='sleep'&&pose.rotation.x!==-Math.PI/2)throw Error('sleep rig');
    for(const part of [parts.head,parts.leftarm,parts.rightarm])for(const value of part.position.toArray())if(!Number.isFinite(value))throw Error('non-finite transform');
   }); images.push({costume:c.name,pose:name,url});
  }
  return images;
 }''')
 gallery=context.new_page();gallery.set_viewport_size({'width':760,'height':1230})
 gallery.set_content('<body style="background:#d8cddd;font:14px sans-serif;color:#302a38;margin:12px"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+''.join('<div style="text-align:center;background:#f3ebdf;border-radius:12px"><img width="120" height="120" src="'+r['url']+'"><br>'+r['costume']+' · '+r['pose']+'</div>' for r in images)+'</div></body>')
 gallery.screenshot(path='/tmp/companion-costume-poses.png',full_page=True);gallery.close()
 print('PASS: eight looks across idle/walk/sit/sleep, shared rig transforms; contact sheet /tmp/companion-costume-poses.png',flush=True)
 # Real furniture tap dispatch and a real companion canvas tap both open the picker.
 page.evaluate('''() => {const a=__lr;a.room.items=[];a.room.n=10;a.room.name='Wardrobe room';a.meta.current++;a.meta.phase='day';a.meta.weather='clear';a.meta.realtime=false;a.setMode('explore',true);a.changed();a.companion.frame(.1);a.view.frame(.1,a.view.t+.1);}''')
 point=page.evaluate('''() => {const a=__lr,p=a.companion.object.localToWorld(new THREE.Vector3(0,1.6,.38)).project(a.view.cam),r=a.view.r.domElement.getBoundingClientRect();const x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;for(let dy=-15;dy<=15;dy+=3)for(let dx=-15;dx<=15;dx+=3)if(a.companion.hit(x+dx,y+dy))return {x:x+dx,y:y+dy};throw Error('no bot target');}''')
 page.mouse.click(point['x'],point['y']);page.locator('.wardrobe-card').first.wait_for()
 assert page.evaluate('JSON.stringify(__lr.wardrobe.slots)===JSON.stringify(LRCostumes.slotsFor("cat"))')
 assert page.evaluate('!("selected" in JSON.parse(localStorage.getItem("lr.wardrobe")))')
 assert page.get_by_role('tab').all_text_contents()==['All','Hats','Tops','Badges','Accessories']
 page.get_by_role('tab',name='Accessories',exact=True).click();assert page.locator('[data-slot="accessory"][data-costume="plain"]').get_attribute('aria-pressed')=='true'
 page.get_by_role('tab',name='Hats',exact=True).click()
 hat=lambda id:page.locator('[data-slot="hood"][data-costume="'+id+'"]')
 assert hat('bear').is_disabled();assert '40 Fireflies' in hat('bear').inner_text();assert '7-day' in hat('rabbit').inner_text()
 before=page.evaluate('JSON.stringify(__lr.wardrobe.slots)');hat('bear').evaluate('e=>e.click()');assert page.evaluate('JSON.stringify(__lr.wardrobe.slots)')==before
 preview=page.locator('.wardrobe-preview');assert preview.evaluate('e=>e.complete&&e.naturalWidth===360')
 old=preview.get_attribute('src');hat('automata').click();assert preview.get_attribute('src')!=old;assert hat('automata').get_attribute('aria-pressed')=='true';assert hat('automata').locator('.wardrobe-check').count()==1
 # Tapping an equipped item removes only that layer.
 hat('automata').click();assert page.evaluate('__lr.wardrobe.slots.hood')=='plain';assert hat('plain').get_attribute('aria-pressed')=='true'
 hat('cat').click();page.get_by_role('tab',name='Tops',exact=True).click();old=preview.get_attribute('src');page.locator('[data-slot="suit"][data-costume="automata"]').click();assert preview.get_attribute('src')!=old
 assert page.evaluate('__lr.wardrobe.slots.hood==="cat" && __lr.wardrobe.slots.suit==="automata" && JSON.stringify(__lr.companion.slots)===JSON.stringify(__lr.wardrobe.slots)')
 # Live rig geometry must agree with independently composing the same picks.
 assert page.evaluate('''() => {const a=__lr,expected=a.view.makeObject({t:'test-mixed-expected',on:true},null,true,LRCompanion.definitionForSlots(a.wardrobe.slots));return ['head','leftarm','leftleg'].every(k=>JSON.stringify(expected.userData.parts[k].children[0].geometry.attributes.position.array)===JSON.stringify(a.companion.object.userData.parts[k].children[0].geometry.attributes.position.array));}''')
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':844});page.locator('#sheetBody').evaluate('e=>e.scrollTop=0');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert preview.is_visible();page.screenshot(path=f'/tmp/wardrobe-slots-{width}.png')
 # The shared sheet tab keyboard handler supports clothing categories too.
 page.get_by_role('tab',name='Tops',exact=True).focus();page.keyboard.press('ArrowRight');assert page.get_by_role('tab',name='Badges',exact=True).get_attribute('aria-selected')=='true'
 page.keyboard.press('Escape')
 page.evaluate('''() => {const a=__lr;a.room.add(a.room.make('companionwardrobe',{x:1,z:1}));a.changed();a.interact(a.room.items.find(i=>i.t==='companionwardrobe').id);}''')
 assert page.locator('[data-slot="hood"][data-costume="cat"]').get_attribute('aria-pressed')=='true';assert page.locator('[data-slot="suit"][data-costume="automata"]').get_attribute('aria-pressed')=='true'
 page.get_by_role('button',name='✦ Shop',exact=True).click();assert page.locator('#shopBalance').is_visible()
 page.keyboard.press('Escape');page.locator('#bSave').evaluate("e=>e.hidden?window.dispatchEvent(new Event('pagehide')):e.click()");page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.wardrobe')
 assert page.evaluate('__lr.wardrobe.slots.hood==="cat" && __lr.wardrobe.slots.suit==="automata" && JSON.stringify(__lr.companion.slots)===JSON.stringify(__lr.wardrobe.slots)')
 print('PASS: legacy migration, real companion/dresser taps, slot tabs/checkmarks/bare toggle, locked conditions, mixed preview and matching live rig, reload, 320/390/1280px',flush=True)
 # Buy an offered outfit through the actual merchant button, granting and equipping at once.
 page.evaluate('''() => {const a=__lr;a.setMode('explore',true);a.merchant.tick(200,true,1);a.tickWorld(0);for(let k=0;k<10;k++)a.shop.earn('moment');a.openShop();}''')
 outfit=page.evaluate('''() => LRShop.catalog.find(c=>c.costume && __lr.merchant.offers(c.id))''')
 assert outfit
 old=page.evaluate('__lr.shop.balance');page.locator('[data-shop-buy="'+outfit['id']+'"]').click()
 assert page.evaluate('__lr.shop.balance')==old-outfit['price']
 assert page.evaluate('id=>__lr.wardrobe.owns(id) && __lr.wardrobe.selected===id && __lr.companion.costume===id',outfit['costume'])
 page.reload(wait_until='networkidle');page.wait_for_function('!!window.__lr?.wardrobe')
 assert page.evaluate('__lr.shop.balance')==old-outfit['price']
 assert page.evaluate('__lr.companion.costume')==outfit['costume']
 print('PASS: Firefly shop purchase unlocks, auto-equips and persists without a second charge',flush=True)
 # A new data-only costume works through the same picker and renderer without code changes.
 page.evaluate('''() => {LRCostumes.COSTUMES.push({id:'PRIVATE_TEST_COSTUME',name:'Test leaf',unlock:{type:'free'},layers:{hood:{color:0x8aaa77,shapes:[{shape:'box',at:[3,20,3],size:[2,2,2],color:0x658855}]}}});__lr.wardrobeSheet();}''')
 page.locator('[data-slot="hood"][data-costume="PRIVATE_TEST_COSTUME"]').click()
 assert page.evaluate('__lr.companion.slots.hood')=='PRIVATE_TEST_COSTUME'
 for width in [320,390,1280]:
  page.set_viewport_size({'width':width,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.keyboard.press('Escape')
 page.evaluate("__lr.room.items[0].wardrobe={slots:{hood:'PRIVATE_TEST_COSTUME'}};__lr.room.wardrobe={slots:{hood:'PRIVATE_TEST_COSTUME'}}")
 code=page.evaluate('__lr.roomCode()');decoded=page.evaluate('code=>__lr.readCode(code)',code)
 assert decoded['items'][0]['t']=='companionwardrobe'
 assert all(key not in json.dumps(decoded) for key in ['PRIVATE_TEST_COSTUME','costume-bear','slots','selected','owned','lr.wardrobe'])
 context.close()
 fresh=browser.new_context(viewport={'width':390,'height':844});fresh.add_init_script("localStorage.setItem('lr.intro','true')")
 recipient=fresh.new_page();recipient.on('pageerror',lambda e:errors.append(str(e)))
 recipient.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
 try:recipient.wait_for_function('!!window.__lr')
 except Exception:
  print('fresh startup errors',errors,recipient.evaluate('({THREE:!!window.THREE,LR:!!window.LR,companion:!!window.LRCompanion,wardrobe:!!window.LRCostumes})'),flush=True);raise
 recipient.click('#bMenu');recipient.get_by_role('tab',name='Rooms',exact=True).click();recipient.click('#bImportCode');recipient.locator('textarea.code').fill(code);recipient.click('#bOpenCode');recipient.wait_for_function('__lr.room.name==="Wardrobe room"')
 assert recipient.evaluate('__lr.companion.costume')=='plain'
 assert 'PRIVATE_TEST_COSTUME' not in recipient.evaluate('JSON.stringify(localStorage)')
 assert not errors,errors
 print('PASS: one data-only entry appears and equips; mobile widths; private wardrobe excluded from LR1 and fresh-session UI import',flush=True)
 browser.close()
server.shutdown()
