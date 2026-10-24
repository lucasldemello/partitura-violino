"""All practice modes: large landscape scores and controls reachable by page scroll."""
import argparse,functools,http.server,pathlib,threading
from playwright.sync_api import sync_playwright
from ui_checks import controls_reachable,reachable
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');a=p.parse_args();site=pathlib.Path(a.site).resolve();out=pathlib.Path('test-artifacts');out.mkdir(exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{site.name}/'
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for w,h in [(360,640),(667,320),(740,360)]:
  context=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def score(selector,mode,top=True):
   page.evaluate('scrollTo(0,0)');svg=page.locator(selector);box=svg.bounding_box()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   if w>h:
    assert box['width']>=390 if mode!='free' else box['width']>=340,box
    if top:assert box['y']<=85,box
    assert svg.locator('ellipse').first.bounding_box()['width']>=16
   if mode=='song' and w>h:
    answers=page.locator('.song-answers').bounding_box();assert answers['y']+answers['height']<=h,answers
   # All note heads/ledger endpoints stay inside the SVG viewport.
   assert svg.evaluate("el=>{const v=el.viewBox.baseVal;return [...el.querySelectorAll('ellipse')].every(n=>{const b=n.getBBox();return b.y>=v.y-1&&b.y+b.height<=v.y+v.height+1})}")
   page.screenshot(path=str(out/f'ux-{mode}-{w}.png'),full_page=True)
  page.goto(url);page.get_by_role('button',name='Schmoll 24 · Ré e Mi',exact=True).click();score('.schmoll-score svg','schmoll');controls_reachable(page,'#schmoll button')
  page.get_by_role('button',name='← Sair',exact=True).click();page.get_by_role('button',name='Ler e escrever · cordas',exact=True).click();page.get_by_role('button',name='Escrever na pauta',exact=True).click()
  for _ in range(7):page.get_by_role('button',name='↑ Subir um lugar',exact=True).click()
  score('.reading-staff svg','reading-high');controls_reachable(page,'#reading button')
  for _ in range(16):page.get_by_role('button',name='↓ Descer um lugar',exact=True).click()
  score('.reading-staff svg','reading-low');before=page.locator('.reading-staff ellipse').get_attribute('cy');page.set_viewport_size({'width':h,'height':w});assert page.locator('.reading-staff ellipse').get_attribute('cy')==before;page.set_viewport_size({'width':w,'height':h})
  page.get_by_role('button',name='Confirmar posição',exact=True).click();controls_reachable(page,'#reading button');score('.reading-staff svg','reading-feedback');page.get_by_role('button',name='← Meu estudo',exact=True).click();page.get_by_role('button',name='← Voltar',exact=True).click()
  page.get_by_role('button',name='Minha música · Brilha, estrelinha',exact=True).click();page.get_by_role('button',name='Começar este compasso',exact=True).click();score('#song-score svg','song');controls_reachable(page,'#song button')
  page.locator('.song-answers button').first.click();score('#song-score svg','song-feedback');controls_reachable(page,'#song button');page.get_by_role('button',name='← Música',exact=True).click();page.get_by_role('button',name='← Voltar',exact=True).click()
  page.get_by_role('button',name='Aprender estas notas',exact=True).click();page.get_by_role('button',name='Ver a nota subir para Mi',exact=True).click();page.get_by_role('button',name='Experimentar na pauta',exact=True).click();page.locator('.g-note-target[data-note="1-1"]').click();page.get_by_role('button',name='Tentar sem destaque',exact=True).click();page.locator('.g-note-target[data-note="1-0"]').click();page.get_by_role('button',name='Agora reconhecer os nomes',exact=True).click();score('.g-question-staff svg','guided');controls_reachable(page,'#guided button');page.get_by_role('button',name='Pausar',exact=True).click()
  page.get_by_role('button',name='Treino livre · notas e frases',exact=True).click();page.locator('#continue-session').click();score('#staff svg','free',False);controls_reachable(page,'.training-card button');assert page.locator('.training-card').evaluate("el=>getComputedStyle(el).overflowY")=='visible'
  assert not errors,errors;context.close()
 browser.close()
server.shutdown();print('PASS global UX:5 modes,portrait/short landscape,score scale,ledger clipping,scroll access and rotation')
