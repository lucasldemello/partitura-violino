"""Finite rounds, voluntary expansion and transfer from the note presentation."""
import argparse,functools,http.server,pathlib,threading
from playwright.sync_api import sync_playwright
from ui_checks import open_mode,controls_reachable
p=argparse.ArgumentParser();p.add_argument('--site',default='_site');a=p.parse_args();site=pathlib.Path(a.site).resolve();out=pathlib.Path('test-artifacts');out.mkdir(exist_ok=True)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(site.parent)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{site.name}/'
with sync_playwright() as pw:
 browser=pw.chromium.launch();context=browser.new_context(viewport={'width':360,'height':640},is_mobile=True,has_touch=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url)
 open_mode(page,'reading');page.get_by_role('button',name='Escrever na pauta',exact=True).click()
 for count in [2,3,4,5]:
  seen=[]
  for i in range(count*2):
   assert page.locator('#reading-progress').inner_text()==f'Nota {i+1} de {count*2}'
   note=page.locator('#reading').get_attribute('data-note-id');seen.append(note)
   page.get_by_role('button',name='Confirmar posição',exact=True).click()
   if i==0:
    page.get_by_role('button',name='Tentar esta de novo',exact=True).click();assert page.locator('#reading').get_attribute('data-note-id')==note
    assert page.locator('#reading-progress').inner_text()==f'Nota 1 de {count*2}'
    page.get_by_role('button',name='Confirmar posição',exact=True).click()
   page.get_by_role('button',name='Ver resumo' if i==count*2-1 else 'Próxima nota',exact=True).click()
  assert page.locator('#reading h1').inner_text()=='Rodada concluída'
  assert len(set(seen))==count and all(seen.count(n)==2 for n in set(seen))
  controls_reachable(page,'#reading button');page.screenshot(path=str(out/f'reading-round-{count}.png'),full_page=True)
  if count<5:
   page.get_by_role('button',name='Adicionar '+{2:'Fá♯4',3:'Sol4',4:'Lá4'}[count],exact=True).click()
   assert page.locator('#reading h1').inner_text()=='Conheça a próxima nota'
   assert page.locator('#reading').get_attribute('data-screen')=='preview'
   page.get_by_role('button',name=f'Treinar {count+1} notas por corda',exact=True).click()
  else:assert page.get_by_role('button',name='Adicionar',exact=False).count()==0
 # Read mode also ends; asking to see the same note again does not advance it.
 page.get_by_role('button',name='Escolher cordas e notas',exact=True).click();page.get_by_role('button',name='Ler e dizer o nome',exact=True).click()
 first=page.locator('#reading').get_attribute('data-note-id');page.get_by_role('button',name='Revelar nome',exact=True).click();page.get_by_role('button',name='Quero rever',exact=True).click()
 assert page.locator('#reading').get_attribute('data-note-id')==first and page.locator('#reading-progress').inner_text()=='Nota 1 de 10'
 for _ in range(10):page.get_by_role('button',name='Revelar nome',exact=True).click();page.get_by_role('button',name='Reconheci',exact=True).click()
 assert page.locator('#reading h1').inner_text()=='Rodada concluída'
 context.close()
 # Fresh user: seeing all five notes must make all five available for practice.
 context=browser.new_context(viewport={'width':740,'height':360},is_mobile=True,has_touch=True);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url);page.locator('#study-menu .menu-primary').click();page.get_by_role('button',name='Conhecer as notas',exact=True).click()
 for i in range(5):
  assert page.locator('.menu-note-progress').inner_text()==f'Nota {i+1} de 5'
  if i<4:page.get_by_role('button',name='Conhecer a segunda nota' if i==0 else 'Conhecer mais uma nota',exact=True).click()
 page.get_by_role('button',name='Concluir apresentação',exact=True).click();assert page.locator('#study-menu h1').inner_text()=='5 notas apresentadas'
 page.get_by_role('button',name='Praticar as 5 notas',exact=True).click();assert page.locator('#reading-pool').inner_text()=='Ré4 · Mi4 · Fá♯4 · Sol4 · Lá4'
 page.reload();open_mode(page,'reading');assert page.locator('#reading-pool').inner_text()=='Ré4 · Mi4 · Fá♯4 · Sol4 · Lá4'
 page.get_by_role('button',name='Escrever na pauta',exact=True).click();assert page.locator('#reading-progress').inner_text()=='Nota 1 de 10';controls_reachable(page,'#reading button');page.screenshot(path=str(out/'reading-round-landscape.png'),full_page=True)
 assert not errors,errors;context.close();browser.close()
server.shutdown();print('PASS finite read/write rounds,retry progress,voluntary2→5 expansion,presentation transfer and persistence')
