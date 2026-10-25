"""Check the element can actually be reached, including document scrolling."""
def reachable(page, locator, minimum=44):
    locator.evaluate("el=>el.scrollIntoView({block:'center',inline:'nearest'})")
    box=locator.bounding_box()
    assert box and box['height']>=minimum,box
    viewport=page.viewport_size
    assert box['x']>=-1 and box['x']+box['width']<=viewport['width']+1,box
    assert box['y']>=-1 and box['y']+box['height']<=viewport['height']+1,box
    assert locator.evaluate("el=>{const r=el.getBoundingClientRect();const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return top===el||el.contains(top)}"),'control is covered'

def controls_reachable(page,selector):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    for el in page.locator(selector).all():
        if el.is_visible():reachable(page,el)
    page.evaluate('window.scrollTo(0,0)')

def open_mode(page,mode):
    """Use the public three-path menu; activity tests keep their original depth."""
    page.evaluate('ArcoStudyMenu.home()')
    if mode=='song':
        page.get_by_role('button',name='Música',exact=True).click();return
    if mode=='free':
        page.get_by_role('button',name='Treino livre',exact=True).click();return
    page.locator('#study-menu .menu-primary').click()
    if mode=='reading':
        page.get_by_role('button',name='Ler e escrever',exact=True).click();return
    page.locator('#study-string').select_option(value='1')
    page.get_by_text('Outras formas de estudar Ré',exact=True).click()
    page.get_by_role('button',name='Schmoll 24 · Ré e Mi' if mode=='schmoll' else 'Aprender estas notas',exact=True).click()
