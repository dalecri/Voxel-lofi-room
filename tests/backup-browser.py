"""npm run build && python3 tests/backup-browser.py. Back up my home downloads one file; Restore brings it back, replacing newer changes, and restarts."""
import functools,json,os,tempfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'www')))
Thread(target=server.serve_forever,daemon=True).start()
tmp=tempfile.mkdtemp()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 context=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':844},accept_downloads=True)
 context.add_init_script("if(!sessionStorage.fx){sessionStorage.fx='1';localStorage.setItem('lr.intro','true');localStorage.setItem('lr.googleCalendarToken',JSON.stringify('TOKEN'));}")
 context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:') else r.abort())
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
 page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle');page.wait_for_function('!!window.__lr?.dashboard')
 page.evaluate('__lr.habits.add({name:"Stretch"});__lr.room.name="Backup Den";__lr.changed()')
 def settings():page.click('#bMenu');page.get_by_role('tab',name='Settings',exact=True).click()
 settings();backup=page.locator('#bBackup');assert 'Back up my home' in backup.inner_text() and 'Last backup' not in backup.inner_text()
 with page.expect_download() as dl:backup.click()
 d=dl.value;assert d.suggested_filename.startswith('lofi-rooms-backup-') and d.suggested_filename.endswith('.json')
 path=os.path.join(tmp,d.suggested_filename);d.save_as(path);data=json.load(open(path))
 assert data['format']=='lofi-rooms-backup' and 'lr.habits' in data['data'] and 'lr.googleCalendarToken' not in data['data'] and 'TOKEN' not in json.dumps(data)
 assert 'Backed up' in page.locator('#toasts').inner_text();assert 'Last backup today' in page.locator('#bBackup').inner_text()
 # Change things after the backup, then restore.
 page.keyboard.press('Escape');page.evaluate('__lr.habits.add({name:"After backup"});localStorage.setItem("lr.zzNew",JSON.stringify(1))')
 settings()
 with page.expect_file_chooser() as fc:page.locator('#bRestore').click()
 fc.value.set_files(path);restore=page.locator('.backup-restore');restore.wait_for();assert 'saved items' in restore.locator('.backup-summary').inner_text()
 with page.expect_navigation():page.get_by_role('button',name='Restore and restart').click()
 page.wait_for_function('!!window.__lr?.dashboard')
 names=page.evaluate('__lr.habits.list().map(h=>h.name)');assert names==['Stretch'],names
 assert page.evaluate('localStorage.getItem("lr.zzNew")') is None;assert page.evaluate('JSON.parse(localStorage.getItem("lr.googleCalendarToken"))')=='TOKEN'
 page.wait_for_timeout(900);assert 'Your backup is restored' in page.locator('#toasts').inner_text()
 # A file that isn't a backup is turned away without touching anything.
 bad=os.path.join(tmp,'notes.json');open(bad,'w').write('{"hello":1}');settings()
 with page.expect_file_chooser() as fc:page.locator('#bRestore').click()
 fc.value.set_files(bad);page.wait_for_timeout(300);assert 'isn’t a Lofi Rooms backup' in page.locator('#toasts').inner_text();assert page.locator('.backup-restore').count()==0
 assert not errors,errors;print('PASS backup: one-file download without tokens, restore replaces newer changes and restarts, strangers refused')
 browser.close()
