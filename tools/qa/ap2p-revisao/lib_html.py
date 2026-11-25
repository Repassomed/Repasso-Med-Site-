# AP II Práctica · helpers de HTML (vistas con foto, atlas interactivo, fichas). Todo en castellano simple, voseo del sitio.
import html, re
IMG = '/assets/img/anatoprat2/'
def esc(s): return html.escape(s, quote=True)
def src(slug):
    """slug corto = foto del teléfono (lam-fotos-<slug>); stem completo 'lam-...' = laminario de la cátedra"""
    return IMG + (slug if slug.startswith('lam-') else 'lam-fotos-' + slug) + '.webp'

def view(slug, titulo, alt, extra=''):
    return ('    <figure class="ap2p-view" onclick="this.classList.toggle(\'ap2p-big\')">\n'
            f'      <img src="{src(slug)}" alt="{esc(alt)}" loading="lazy" decoding="async">\n'
            f'      <figcaption><b>{titulo}</b>{extra}</figcaption>\n    </figure>\n')

def plano(s):
    """el atlas del sitio escribe la leyenda con textContent: nada de HTML en nombre ni explicación"""
    return re.sub(r'<[^>]+>', '', s)

def atlas(slug, alt_base, puntos, hint='👆 TOCÁ LOS NÚMEROS · detalles a mayor aumento'):
    """puntos = [(x%, y%, nombre, explicación)] ; coordenadas sobre la imagen cuadrada recortada."""
    pts = ''.join(
        f'<button class="rmatlas-pt" type="button" style="left:{x}%;top:{y}%" data-n="{i}" data-x="{x}" data-y="{y}" data-name="{esc(plano(n))}" data-expl="{esc(plano(e))}">{i}</button>'
        for i, (x, y, n, e) in enumerate(puntos, 1))
    nombres = '; '.join(plano(p[2]).lower() for p in puntos)
    alt = esc(f'{alt_base} Lleva puntos numerados que señalan: {nombres}.')
    return ('  <div class="rmatlas"><div class="rmatlas-h">🗺️ Atlas interactivo · <b>TOCÁ LOS NÚMEROS</b></div><div class="rmatlas-grid"><div class="rmatlas-overview">'
            f'<img class="rmatlas-base" src="{src(slug)}" alt="{alt}" loading="lazy" decoding="async">{pts}'
            f'<div class="rmatlas-hint">{hint}</div></div>'
            '<div class="rmatlas-detail"><div class="rmatlas-zoomstage"><img class="rmatlas-zoomimg" alt="" aria-hidden="true"><div class="rmatlas-zhint">Tocá un número para ampliar la región</div></div>'
            '<div class="rmatlas-legend"></div><div class="rmatlas-expl"></div></div></div></div>\n')

def fichas_tabla(filas):
    """filas = [(campo, valor_html)]"""
    return ('<div class="ap2p-tab ap2p-ficha">\n<div class="ap2p-tab-h">🧾 Ficha oficial de la lámina</div>\n<div class="rmc-scroll"><table>\n<tbody>\n' +
            ''.join(f'<tr><td><b>{c}</b></td><td>{v}</td></tr>\n' for c, v in filas) + '</tbody>\n</table></div>\n</div>\n')
