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
