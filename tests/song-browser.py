"""Song UI regression: mobile score, real recording, stop, review, and offline."""
import argparse, functools, http.server, json, pathlib, threading
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');args=p.parse_args()
site=pathlib.Path(args.site).resolve();screens=pathlib.Path('test-artifacts');screens.mkdir(exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{site.name}/'
manifest=json.loads((site/'audio/manifest.json').read_text())
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for width,height in [(360,640),(390,740)]:
  context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url)
  page.evaluate("localStorage.setItem('arco-learning-v1',JSON.stringify({sentinel:'preserve'}))")
  page.get_by_role('button',name='Minha música · Brilha, estrelinha',exact=True).click()
  assert 'cordas Lá e Mi' in page.locator('#song').inner_text()
  cta=page.get_by_role('button',name='Começar este compasso',exact=True).bounding_box();assert cta['y']+cta['height']<=height
  page.get_by_role('button',name='Começar este compasso',exact=True).click()
  assert page.locator('.song-answers button').count()==6
  bounds=page.locator('.song-answers').bounding_box();assert bounds['y']+bounds['height']<=height
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(screens/f'song-quiz-{width}.png'))
  with page.expect_response(lambda r:manifest['2-0']['url'] in r.url and r.status==200):
   page.get_by_role('button',name='▶ Compasso',exact=True).click()
  page.wait_for_function("document.querySelector('.song-audio-status').textContent.includes('Violino real')")
  assert page.locator('.song-answers button').first.is_disabled()
  page.wait_for_function("document.querySelector('.song-current').textContent.includes('nota 2')")
  page.get_by_role('button',name='Parar',exact=True).click()
  assert page.locator('.song-current').inner_text()=='Nota 1 de 4'
  page.wait_for_timeout(800);assert page.locator('.song-current').inner_text()=='Nota 1 de 4'
  page.get_by_text('Conferir dedos e cordas',exact=True).click();page.locator('#song-finger-live').check()
  assert 'Lá' in page.locator('#song-score').inner_text() and 'Mi' in page.locator('#song-score').inner_text()
  page.screenshot(path=str(screens/f'song-fingers-{width}.png'))
  page.get_by_text('Conferir dedos e cordas',exact=True).click()
  for i,name in enumerate(['Si','Lá','Mi','Mi']):
   page.locator('.song-answers').get_by_role('button',name=name,exact=True).click()
   if i==0:
    page.screenshot(path=str(screens/f'song-feedback-{width}.png'))
    cta=page.get_by_role('button',name='Próxima nota',exact=True).bounding_box();assert cta['y']+cta['height']<=height
   page.get_by_role('button',name='Concluir compasso' if i==3 else 'Próxima nota',exact=True).click()
  assert page.evaluate("JSON.parse(localStorage.getItem('arco-song-v1')).bars['1'].needsReview")
  page.get_by_role('button',name='Ver minha música',exact=True).click()
  page.get_by_role('button',name='Rever 1 compasso',exact=True).click()
  for i,name in enumerate(['Lá','Lá','Mi','Mi']):
   page.locator('.song-answers').get_by_role('button',name=name,exact=True).click()
   page.get_by_role('button',name='Concluir compasso' if i==3 else 'Próxima nota',exact=True).click()
  assert not page.evaluate("JSON.parse(localStorage.getItem('arco-song-v1')).bars['1'].needsReview")
  page.get_by_role('button',name='Ver minha música',exact=True).click()
  page.get_by_text('Escolher compasso e apoio',exact=True).click();page.locator('#song-select').select_option(label='40')
  selected=page.locator('#song-select').input_value()
  assert selected=='23',{'selected':selected,'errors':errors}
  page.get_by_role('button',name='Começar este compasso',exact=True).click()
  title=page.locator('#song h1').inner_text()
  if title!='Compasso 40':
   page.screenshot(path=str(screens/f'song-select-failure-{width}.png'),full_page=True)
   (screens/f'song-select-failure-{width}.html').write_text(page.content())
  assert title=='Compasso 40',{'selected':selected,'title':title,'errors':errors}

  assert '𝄐' in page.locator('#song-score').inner_text()
  assert page.locator('.song-score-note ellipse[fill="white"]').count()==1
  page.screenshot(path=str(screens/f'song-final-{width}.png'))
  page.get_by_role('button',name='▶ Bloco · uma passagem',exact=True).click()
  page.wait_for_function("document.querySelector('.song-current').textContent.includes('compasso 37')")
  page.get_by_role('button',name='← Música',exact=True).click()
  page.wait_for_timeout(800);assert page.locator('#song h1').inner_text()=='Brilha, estrelinha'
  assert page.evaluate("JSON.parse(localStorage.getItem('arco-learning-v1')).sentinel")=='preserve'
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller !== null')
  context.set_offline(True);page.reload()
  page.get_by_role('button',name='Minha música · Brilha, estrelinha',exact=True).click()
  assert '1 de 24 compassos praticados' in page.locator('#song').inner_text()
  page.get_by_role('button',name='Começar este compasso',exact=True).click()
  page.get_by_role('button',name='▶ Compasso',exact=True).click()
  page.wait_for_function("document.querySelector('.song-audio-status').textContent.includes('Violino real')")
  page.get_by_role('button',name='Parar',exact=True).click()
  assert not errors,errors
  context.close()
 browser.close()
server.shutdown();print('PASS song mobile, real audio, sequential answers, stop, review, notation, history and offline')
