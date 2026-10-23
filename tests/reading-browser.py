"""Four-string pitch reading/writing, selection, accidentals, ledger notes and offline."""
import argparse,functools,http.server,pathlib,threading,json
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');a=p.parse_args();site=pathlib.Path(a.site).resolve();out=pathlib.Path('test-artifacts');out.mkdir(exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{site.name}/';manifest=json.loads((site/'audio/manifest.json').read_text())
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for w,h in [(360,640),(740,360)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.get_by_role('button',name='Ler e escrever · cordas',exact=True).click()
  def visible_controls():
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for el in page.locator('#reading button').all():
    if el.is_visible():
     box=el.bounding_box();assert box['height']>=44;assert box['y']>=0 and box['y']+box['height']<=h,box
  def current():return page.evaluate("notes.find(n=>n.id===document.querySelector('#reading').dataset.noteId)")
  def home():page.get_by_role('button',name='← Meu estudo',exact=True).click()
  def configure(preset,count='2'):
   page.get_by_text('Escolher cordas e notas',exact=True).click();page.locator('#reading-preset').select_option(value=preset);page.locator('#reading-count').select_option(value=count);page.get_by_text('Escolher cordas e notas',exact=True).click()
  def write_to(id):
   page.get_by_role('button',name='Escrever na pauta',exact=True).click()
   for _ in range(36):
    if current()['id']==id:return
    page.get_by_role('button',name='Confirmar posição',exact=True).click();page.get_by_role('button',name='Próxima nota',exact=True).click()
   raise AssertionError('target missing '+id)
  def position_note(note):
   delta=note['step']-30-4
   for _ in range(abs(delta)):page.get_by_role('button',name='↑ Subir um lugar' if delta>0 else '↓ Descer um lugar',exact=True).click()
  assert page.locator('#reading-pool').inner_text()=='Ré4 · Mi4';visible_controls();page.screenshot(path=str(out/f'reading-home-{w}.png'))
  # Every single-string setting changes the actual questions immediately.
  for string in ['0','1','2','3']:
   configure(string);page.get_by_role('button',name='Ler e dizer o nome',exact=True).click();assert str(current()['string'])==string
   page.get_by_role('button',name='Revelar nome',exact=True).click();note=current()
   with page.expect_response(lambda r:manifest[note['id']]['url'] in r.url and r.status==200):page.get_by_role('button',name='▶ Ouvir nota',exact=True).click()
   page.wait_for_function("document.querySelector('.reading-audio-status').textContent.includes('Violino real')")
   page.get_by_role('button',name='Quero rever',exact=True).click();assert current()['id']==note['id'];home()
  configure('compare','5');page.get_by_text('Escolher cordas e notas',exact=True).click();assert 'Corda Ré' in page.locator('.reading-string-reference').inner_text() and 'Corda Lá' in page.locator('.reading-string-reference').inner_text();page.get_by_text('Escolher cordas e notas',exact=True).click()
  write_to('1-2');note=current();position_note(note)
  page.get_by_role('button',name='Confirmar posição',exact=True).click();assert 'Falta o sustenido' in page.locator('.reading-feedback').inner_text()
  assert page.evaluate("JSON.parse(localStorage.getItem('arco-reading-v1')).attempts.at(-1).result")=='review'
  page.get_by_role('button',name='Tentar esta de novo',exact=True).click();assert current()['id']==note['id'];position_note(note);page.locator('#reading-accidental').click();assert page.locator('.reading-sharp').count()==1
  visible_controls();page.screenshot(path=str(out/f'reading-sharp-{w}.png'))
  page.get_by_role('button',name='Confirmar posição',exact=True).click();assert 'Isso.' in page.locator('.reading-feedback').inner_text();home()
  for preset,target,ledger in [('0','0-0',2),('3','3-4',1)]:
   configure(preset,'5');write_to(target);note=current();position_note(note)
   assert page.locator('.reading-ledger').count()==ledger
   visible_controls();page.screenshot(path=str(out/f'reading-extreme-{preset}-{w}.png'))
   page.get_by_role('button',name='Ver apoio de posição',exact=True).click();page.get_by_role('button',name='Confirmar posição',exact=True).click()
   assert 'Isso.' in page.locator('.reading-feedback').inner_text();assert page.evaluate("JSON.parse(localStorage.getItem('arco-reading-v1')).attempts.at(-1).supported")
   home()
  page.get_by_text('Escolher cordas e notas',exact=True).click();page.locator('#reading-preset').select_option(value='custom');page.locator('[data-reading-string="3"]').click();assert page.locator('[data-reading-string="3"]').is_checked();page.locator('[data-reading-string="1"]').check();page.locator('[data-reading-string="3"]').uncheck();page.get_by_text('Escolher cordas e notas',exact=True).click()
  page.get_by_role('button',name='← Voltar',exact=True).click();assert page.locator('#guided').is_visible()
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null');ctx.set_offline(True);page.reload()
  page.get_by_role('button',name='Ler e escrever · cordas',exact=True).click();assert page.locator('#reading-pool').inner_text()=='Ré4 · Mi4 · Fá♯4 · Sol4 · Lá4'
  page.get_by_role('button',name='Ler e dizer o nome',exact=True).click();page.get_by_role('button',name='Revelar nome',exact=True).click();page.get_by_role('button',name='▶ Ouvir nota',exact=True).click()
  page.wait_for_function("document.querySelector('.reading-audio-status').textContent.includes('Violino real')")
  assert not errors,errors;ctx.close()
 browser.close()
server.shutdown();print('PASS four strings,selection,sharp judgment,ledger extremes,retry,preferences,orientation,real audio and offline')
