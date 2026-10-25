"""Three-path menu, persisted string, fresh single-string phrases and offline samples."""
import argparse,functools,http.server,pathlib,threading,json
from playwright.sync_api import sync_playwright
from ui_checks import controls_reachable,open_mode
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');a=p.parse_args();site=pathlib.Path(a.site).resolve();out=pathlib.Path('test-artifacts');out.mkdir(exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{site.name}/'
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for w,h in [(360,640),(667,320),(740,360)]:
  context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);assert page.locator('#study-menu .menu-actions>button').count()==3
  assert page.locator('#study-menu .menu-primary').inner_text()=='Meu estudo · corda Ré'
  controls_reachable(page,'#study-menu button');page.screenshot(path=str(out/f'menu-home-{w}.png'),full_page=True)
  page.locator('#study-menu .menu-primary').click()
  for string,name in enumerate(['Sol','Ré','Lá','Mi']):
   page.locator('#study-string').select_option(value=str(string));assert page.locator('#study-menu .menu-actions>button').count()==3
   assert page.locator('.menu-extra').count()==(1 if string==1 else 0)
   page.get_by_role('button',name='Conhecer as notas',exact=True).click();assert page.locator('#study-menu h1').inner_text().startswith(name)
   page.get_by_role('button',name='▶ Ouvir esta nota',exact=True).click();page.wait_for_function("document.querySelector('.menu-audio-status').textContent.includes('Violino real')")
   page.get_by_role('button',name='Conhecer a segunda nota',exact=True).click();assert page.locator('#study-menu .menu-intro').inner_text()==f'Corda {name} · 1º dedo'
   page.get_by_role('button',name='← Voltar',exact=True).click();page.get_by_role('button',name='Ler e escrever',exact=True).click()
   page.get_by_role('button',name='Ler e dizer o nome',exact=True).click();assert page.evaluate("notes.find(n=>n.id===document.querySelector('#reading').dataset.noteId).string")==string
   page.get_by_role('button',name='← Meu estudo',exact=True).click();page.get_by_role('button',name='← Voltar',exact=True).click();assert page.locator('#study-string').input_value()==str(string)
  page.screenshot(path=str(out/f'menu-study-mi-{w}.png'),full_page=True)
  # An old session must not supply another string or exercise kind to phrases.
  open_mode(page,'free');page.locator('#continue-session').click();old=page.evaluate('studySession.startedAt')
  page.locator('#back-to-guide').click();page.locator('#study-menu .menu-primary').click();page.locator('#study-string').select_option(value='0');page.get_by_role('button',name='Frases nesta corda',exact=True).click()
  assert page.evaluate("isPhrase&&phrase.length===2&&phrase.every(n=>n.string===0)")
  assert page.evaluate('studySession.startedAt')!=old
  if w>h:
   page.wait_for_function("document.querySelector('.training-card').getBoundingClientRect().top<20")
   for selector in ['#staff','#answers']:
    box=page.locator(selector).bounding_box();assert box['y']>=0 and box['y']+box['height']<=h,box
  page.screenshot(path=str(out/f'menu-phrases-{w}.png'))
  page.locator('#back-to-guide').click();assert page.locator('#study-string').input_value()=='0'
  page.locator('#study-string').select_option(value='2');page.reload();assert page.locator('#study-menu .menu-primary').inner_text()=='Meu estudo · corda Lá'
  page.get_by_role('button',name='Música',exact=True).click();assert page.locator('#song h1').inner_text()=='Brilha, estrelinha';page.get_by_role('button',name='← Voltar',exact=True).click()
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null');context.set_offline(True);page.reload();page.locator('#study-menu .menu-primary').click();assert page.locator('#study-string').input_value()=='2'
  page.get_by_role('button',name='Conhecer as notas',exact=True).click();page.get_by_role('button',name='▶ Ouvir esta nota',exact=True).click();page.wait_for_function("document.querySelector('.menu-audio-status').textContent.includes('Violino real')")
  assert not errors,errors;context.close()
 browser.close()
server.shutdown();print('PASS simple menu,all strings,context,fresh phrase session,landscape,preferences,offline real audio')
