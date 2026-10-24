"""Schmoll experiment: separate reading/rhythm/model/check; real sound, neutral score."""
import argparse,functools,http.server,pathlib,threading
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');a=p.parse_args();site=pathlib.Path(a.site).resolve();out=pathlib.Path('test-artifacts');out.mkdir(exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{site.name}/'
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 for w,h in [(360,640),(740,360)]:
  ctx=browser.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.evaluate("window.schmollHeard=[];window.schmollOnsets=[];const priorPlay=play;play=async function(n){window.schmollHeard.push(n.id);window.schmollOnsets.push(performance.now());return priorPlay(n)}")
  page.get_by_role('button',name='Schmoll 24 · Ré e Mi',exact=True).click()
  def controls_fit():
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for el in page.locator('#schmoll button').all():
    if el.is_visible():
     box=el.bounding_box();assert box['height']>=44;assert box['y']>=0 and box['y']+box['height']<=h,box
  controls_fit();assert page.locator('.schmoll-badge.with-color').count()==1
  assert page.locator('.schmoll-score ellipse').evaluate_all("els=>els.every(el=>getComputedStyle(el).fill==='rgb(34, 34, 34)')")
  page.locator('.schmoll-color-option input').uncheck();assert page.locator('.schmoll-badge.with-color').count()==0
  page.screenshot(path=str(out/f'schmoll-observe-{w}.png'))
  page.get_by_role('button',name='Próxima etapa',exact=True).click()
  assert page.locator('.schmoll-score g text').count()==0
  page.get_by_role('button',name='Revelar nomes',exact=True).click();assert page.locator('.schmoll-score g text').all_text_contents()==['Ré','Mi','Ré','Mi']
  page.get_by_role('button',name='Próxima etapa',exact=True).click();page.get_by_role('button',name='▶ Ouvir quatro pulsos',exact=True).click();controls_fit()
  page.wait_for_function("window.schmollHeard.length===4");assert page.evaluate('window.schmollHeard')==['1-0']*4
  page.wait_for_function("document.querySelector('#schmoll-stop').hidden")
  gaps=page.evaluate('window.schmollOnsets.slice(1).map((t,i)=>t-window.schmollOnsets[i])');assert all(500<=g<=900 for g in gaps),gaps
  assert 'Violino real' in page.locator('.schmoll-audio-status').inner_text();controls_fit();page.screenshot(path=str(out/f'schmoll-rhythm-{w}.png'))
  page.get_by_role('button',name='Próxima etapa',exact=True).click();page.evaluate('window.schmollHeard=[]');page.get_by_role('button',name='▶ Ouvir o modelo',exact=True).click()
  controls_fit();page.wait_for_function('window.schmollHeard.length===4');assert page.evaluate('window.schmollHeard')==['1-0','1-1','1-0','1-1'];page.wait_for_function("document.querySelector('#schmoll-stop').hidden")
  page.evaluate('window.schmollHeard=[]');page.get_by_role('button',name='▶ Ouvir o modelo',exact=True).click();page.wait_for_function('window.schmollHeard.length===1')
  page.get_by_role('button',name='Conferir sem apoio',exact=True).click();page.wait_for_timeout(800);assert page.evaluate('window.schmollHeard.length')==1
  assert page.locator('.schmoll-badge').count()==0 and page.locator('.schmoll-score g text').count()==0
  positions=page.locator('.schmoll-score ellipse').evaluate_all("els=>els.map(el=>el.getAttribute('cy'))");assert positions==['127','136','136','127']
  controls_fit();page.screenshot(path=str(out/f'schmoll-check-{w}.png'))
  page.get_by_role('button',name='Revelar nomes',exact=True).click();assert page.locator('.schmoll-score g text').all_text_contents()==['Mi','Ré','Ré','Mi']
  page.get_by_role('button',name='Precisei de menos ajuda',exact=True).click();assert page.evaluate("JSON.parse(localStorage.getItem('arco-schmoll-v1')).responses.at(-1).response")=='less-help'
  page.get_by_role('button',name='← Etapa anterior',exact=True).click();page.evaluate('window.schmollHeard=[]');page.get_by_role('button',name='▶ Ouvir o modelo',exact=True).click();page.wait_for_function('window.schmollHeard.length===1')
  page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden")
  page.wait_for_timeout(800);assert page.evaluate('window.schmollHeard.length')==1
  page.get_by_role('button',name='← Sair',exact=True).click();assert page.locator('#guided').is_visible()
  page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null');ctx.set_offline(True);page.reload()
  page.get_by_role('button',name='Schmoll 24 · Ré e Mi',exact=True).click();page.get_by_role('button',name='▶ Ouvir Ré · Mi · Ré · Mi',exact=True).click();page.wait_for_function("document.querySelector('.schmoll-audio-status').textContent.includes('Violino real')")
  page.get_by_role('button',name='← Sair',exact=True).click();assert page.locator('#guided').is_visible();assert not errors,errors;ctx.close()
 browser.close()
server.shutdown();print('PASS Schmoll stages,rhythm/model sequences,cancel,visibility,neutral score,selfreport,mobile,offline')
