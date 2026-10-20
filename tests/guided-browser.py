"""Exercise the deployed Pages package under its real subpath on mobile."""
import argparse, functools, http.server, json, pathlib, threading
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');args=p.parse_args()
site=pathlib.Path(args.site).resolve();screens=pathlib.Path('test-artifacts');screens.mkdir(exist_ok=True)
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent))
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/{site.name}/'
manifest=json.loads((site/'audio/manifest.json').read_text());assert len(manifest)==20
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for width,height in [(360,640),(390,740)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(url);page.get_by_role('button',name='Aprender estas notas',exact=True).click()
  assert page.locator('#guided h1').inner_text()=='Ré fica abaixo da pauta'
  with page.expect_response(lambda r:manifest['1-0']['url'] in r.url and r.status==200):
   page.get_by_role('button',name='▶ Ouvir Ré',exact=True).click()
  page.wait_for_function("document.querySelector('#guided .g-audio-status').textContent.includes('Violino real')")
  cta=page.get_by_role('button',name='Ver a nota subir para Mi',exact=True).bounding_box();assert cta['y']+cta['height']<=height
  page.screenshot(path=str(screens/f'discovery-re-{width}.png'))
  page.get_by_role('button',name='Ver a nota subir para Mi',exact=True).click()
  assert page.locator('.g-moving-note.is-mi').count()==1
  page.emulate_media(reduced_motion='reduce')
  assert page.locator('.g-moving-note').evaluate("el=>getComputedStyle(el).transitionDuration")=='0s'
  page.emulate_media(reduced_motion='no-preference')
  page.screenshot(path=str(screens/f'discovery-mi-{width}.png'),animations='disabled')
  page.get_by_role('button',name='Experimentar na pauta',exact=True).click()
  assert page.locator('.g-anchor').count()==1
  for target in page.locator('.g-note-target').all():assert target.bounding_box()['height']>=44
  page.locator('.g-note-target[data-note="1-0"]').click()
  assert 'Essa nota está abaixo' in page.locator('.g-touch-feedback').inner_text()
  assert page.locator('.g-note-target').count()==2
  assert not page.evaluate("JSON.parse(localStorage.getItem('arco-guided-v1')).results.length")
  page.locator('.g-note-target[data-note="1-1"]').focus();page.keyboard.press('Enter')
  cta=page.get_by_role('button',name='Tentar sem destaque',exact=True).bounding_box();assert cta['y']+cta['height']<=height
  page.screenshot(path=str(screens/f'touch-line-{width}.png'))
  page.get_by_role('button',name='Tentar sem destaque',exact=True).click()
  assert page.locator('.g-anchor').count()==0
  page.locator('.g-note-target[data-note="1-0"]').click()
  page.screenshot(path=str(screens/f'touch-space-{width}.png'))
  page.get_by_role('button',name='Agora reconhecer os nomes',exact=True).click()
  assert page.locator('.g-answers button').count()==2
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  assert page.locator('.g-answers').bounding_box()['y']+page.locator('.g-answers').bounding_box()['height']<=height
  page.screenshot(path=str(screens/f'quiz-{width}.png'))
  page.get_by_role('button',name='Ver apoio',exact=True).click()
  assert 'Esta é' not in page.locator('.g-help').inner_text()
  for i in range(6):
   page.get_by_role('button',name='▶ Ouvir',exact=True).click()
   correct=page.evaluate("JSON.parse(localStorage.getItem('arco-guided-v1')).queue[JSON.parse(localStorage.getItem('arco-guided-v1')).index]")
   page.locator('.g-answers').get_by_role('button',name={'1-0':'Ré','1-1':'Mi'}[correct],exact=True).click()
   if i==0:page.screenshot(path=str(screens/f'feedback-{width}.png'))
   page.get_by_role('button',name='Fechar esta rodada' if i==5 else 'Próxima nota',exact=True).click()
  assert 'Você reconheceu todas as notas' in page.locator('#guided').inner_text()
  assert 'Vamos comparar' not in page.locator('#guided').inner_text()
  assert 'O som e as dicas ajudaram' in page.locator('#guided').inner_text()
  page.screenshot(path=str(screens/f'summary-audio-{width}.png'))
  page.get_by_role('button',name='Praticar estas notas de novo',exact=True).click()
  for i in range(6):
   correct=page.evaluate("JSON.parse(localStorage.getItem('arco-guided-v1')).queue[JSON.parse(localStorage.getItem('arco-guided-v1')).index]")
   page.locator('.g-answers').get_by_role('button',name={'1-0':'Mi','1-1':'Ré'}[correct],exact=True).click()
   page.get_by_role('button',name='Fechar esta rodada' if i==5 else 'Próxima nota',exact=True).click()
  assert 'Vamos comparar' in page.locator('#guided').inner_text()
  page.get_by_role('button',name='Conhecer Fá♯',exact=True).click()
  assert 'Fá♯' in page.locator('#guided h1').inner_text()
  page.reload();assert 'SEU PASSO 2 DE 4' in page.locator('#guided').inner_text()
  page.get_by_role('button',name='Treino livre · notas e frases',exact=True).click()
  assert page.locator('#session-home').is_visible()
  page.get_by_role('button',name='← Aprender com orientação',exact=True).click()
  assert page.locator('#guided').is_visible()
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller !== null')
  context.set_offline(True);page.reload();assert page.locator('#guided h1').is_visible()
  page.get_by_role('button',name='Aprender estas notas',exact=True).click()
  page.get_by_role('button',name='▶ Ouvir Ré',exact=True).click()
  page.wait_for_function("document.querySelector('#guided .g-audio-status').textContent.includes('Violino real')")
  context.set_offline(False)
  page.evaluate("localStorage.setItem('arco-guided-v1',JSON.stringify({...JSON.parse(localStorage.getItem('arco-guided-v1')),stage:5,visited:5}))")
  page.reload();page.get_by_role('button',name='Aprender estas notas',exact=True).click()
  for name in ['Conhecer Mi','Conhecer Fá♯','Conhecer Sol','Conhecer Lá','Comparar as duas','Agora vou reconhecer']:
   page.get_by_role('button',name=name,exact=True).click()
  assert page.locator('.g-answers button').count()==5
  for button in page.locator('#guided button').all():
   if button.is_visible():assert button.bounding_box()['height']>=44
  bounds=page.locator('.g-answers').bounding_box();assert bounds['y']+bounds['height']<=height
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(screens/f'five-notes-{width}.png'))
  page.get_by_role('button',name='Pausar',exact=True).click()
  page.get_by_role('button',name='Experimentar Ré e Mi',exact=True).click()
  assert page.locator('#guided h1').inner_text()=='Ré fica abaixo da pauta'
  page.reload();assert 'SEU PASSO 4 DE 4' in page.locator('#guided').inner_text()
  assert not errors,errors
  context.close()
 browser.close()
server.shutdown()
print('PASS mobile layouts, lesson, support, round, progression, reload, free mode, real audio and offline')
