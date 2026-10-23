"""Read/write checks in portrait and landscape; self-report is separate from correctness."""
import argparse,functools,http.server,pathlib,threading,json
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');a=p.parse_args();site=pathlib.Path(a.site).resolve();out=pathlib.Path('test-artifacts');out.mkdir(exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{site.name}/';manifest=json.loads((site/'audio/manifest.json').read_text())
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for w,h in [(360,640),(740,360)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.get_by_role('button',name='Ler e escrever · Mi e Sol',exact=True).click()
  def visible_controls():
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for el in page.locator('#reading button').all():
    if el.is_visible():
     box=el.bounding_box();assert box['height']>=44;assert box['y']>=0 and box['y']+box['height']<=h,box
  visible_controls();page.screenshot(path=str(out/f'reading-home-{w}.png'))
  page.get_by_role('button',name='Ler e dizer o nome',exact=True).click();note=page.locator('#reading').get_attribute('data-note-id')
  assert page.locator('#reading .reading-controls button').count()==2
  page.get_by_role('button',name='Revelar nome',exact=True).click()
  assert page.locator('.reading-feedback').inner_text().startswith({'1-1':'Mi4','1-3':'Sol4'}[note])
  with page.expect_response(lambda r:manifest[note]['url'] in r.url and r.status==200):page.get_by_role('button',name='▶ Ouvir nota',exact=True).click()
  page.wait_for_function("document.querySelector('.reading-audio-status').textContent.includes('Violino real')")
  visible_controls();page.screenshot(path=str(out/f'reading-reveal-{w}.png'))
  page.get_by_role('button',name='Quero rever',exact=True).click();assert page.locator('#reading').get_attribute('data-note-id')==note
  assert page.evaluate("JSON.parse(localStorage.getItem('arco-reading-v1')).attempts.at(-1).result")=='self-review'
  page.get_by_role('button',name='Ir para escrita',exact=True).click();note=page.locator('#reading').get_attribute('data-note-id')
  page.get_by_role('button',name='Confirmar posição',exact=True).click()
  assert 'Confira:' in page.locator('.reading-feedback').inner_text()
  assert page.evaluate("JSON.parse(localStorage.getItem('arco-reading-v1')).attempts.at(-1).result")=='review'
  page.get_by_role('button',name='Tentar esta de novo',exact=True).click();assert page.locator('#reading').get_attribute('data-note-id')==note
  assert '3ª linha' in page.locator('#reading-position').inner_text()
  page.get_by_role('button',name='Ver apoio de posição',exact=True).click()
  for _ in range(4-{'1-1':0,'1-3':2}[note]):page.get_by_role('button',name='↓ Descer um lugar',exact=True).click()
  visible_controls();page.screenshot(path=str(out/f'reading-write-{w}.png'))
  page.get_by_role('button',name='Confirmar posição',exact=True).click();assert 'Isso.' in page.locator('.reading-feedback').inner_text()
  record=page.evaluate("JSON.parse(localStorage.getItem('arco-reading-v1')).attempts.at(-1)");assert record['result']=='correct' and record['supported']
  page.get_by_role('button',name='← Meu estudo',exact=True).click();page.locator('#reading-si').check()
  page.get_by_role('button',name='Escrever na pauta',exact=True).click();page.get_by_role('button',name='← Meu estudo',exact=True).click();assert page.locator('#reading-si').is_checked()
  page.get_by_role('button',name='← Voltar',exact=True).click();assert page.locator('#guided').is_visible()
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null');ctx.set_offline(True);page.reload()
  page.get_by_role('button',name='Ler e escrever · Mi e Sol',exact=True).click();page.get_by_role('button',name='Ler e dizer o nome',exact=True).click();page.get_by_role('button',name='Revelar nome',exact=True).click();page.get_by_role('button',name='▶ Ouvir nota',exact=True).click()
  page.wait_for_function("document.querySelector('.reading-audio-status').textContent.includes('Violino real')")
  assert not errors,errors;ctx.close()
 browser.close()
server.shutdown();print('PASS read/write portrait,landscape,repeat,support,self-report,real audio and offline')
