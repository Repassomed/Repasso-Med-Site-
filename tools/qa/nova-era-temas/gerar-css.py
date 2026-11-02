#!/usr/bin/env python3
"""Gera assets/temas/rm-tema-<slug>.css (só variáveis --rm-*; nenhuma regra toca conteúdo).
Uso: python3 tools/qa/nova-era-temas/gerar-css.py   (reescreve os dois arquivos; idempotente)"""
import os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'Repasso-Med-Site--main', 'Atual - Copia', 'assets', 'temas')

def hx(c): c = c.lstrip('#'); return tuple(int(c[i:i+2], 16) for i in (0, 2, 4))
def to(t): return '#%02X%02X%02X' % tuple(max(0, min(255, round(v))) for v in t)
def mix(a, b, k): a, b = hx(a), hx(b); return to(tuple(a[i] * (1 - k) + b[i] * k for i in range(3)))
def lum(c):
    def f(v): v /= 255; return v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4
    r, g, b = hx(c); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)

def pal(n, base, head=None):
    head = head or mix(base, '#000000', .18)
    claro = lum(head) > .35
    hfg = '#2A1E04' if claro else '#fff'
    strong = mix(base, '#000000', .38)
    return (f"  --rm-pal-{n}: {base}; --rm-pal-{n}-head: {head}; --rm-pal-{n}-hfg: {hfg}; --rm-pal-{n}-first: {mix(base, '#FFFFFF', .88)}; --rm-pal-{n}-ffg: {mix(base, '#000000', .62)}; "
            f"--rm-pal-{n}-zebra: {mix(base, '#FFFFFF', .96)}; --rm-pal-{n}-edge: {mix(base, '#FFFFFF', .66)}; --rm-pal-{n}-line: {mix(base, '#FFFFFF', .84)}; --rm-pal-{n}-strong: {strong}; "
            f"--rm-pal-{n}-tint: {mix(base, '#FFFFFF', .91)}; --rm-pal-{n}-tag: {'#2A1E04' if lum(base) > .3 else '#fff'};")

TEMAS = {
  'anatomia-patologica-practica': dict(
    titulo='AP I Práctica · eosina y hematoxilina de lámina (rosa-granate)',
    surface='#EEDDE1', side='#F8EEF0', edge='#D6B1BB', card='#EAD1D7', rule='#E2C4CB', accent='#A23A60', accent_d='#6F2543', ring='#E4C5CD',
    tagr='4px', vigr='50%',
    pals=['#B03A5B', '#5B4FA8', '#C48A1C', '#2F8A86', '#2F6FB0', '#4C8F4F']),
  'histologia-i': dict(
    titulo='Histología I · hematoxilina (violeta) y plano de corte',
    surface='#E0DBF0', side='#EFECF8', edge='#B9B0DC', card='#DCD6EF', rule='#CBC3E6', accent='#5B4FA8', accent_d='#3A307A', ring='#CFC6EA',
    tagr='11px', vigr='16px',
    pals=['#6A55B8', '#C2467A', '#2F6FB0', '#2F8A86', '#C48A1C', '#D5603F']),
}

for slug, t in TEMAS.items():
    sel = f'html.rm-sis[data-rm-tema="{slug}"][data-rm-tema]'
    L = [f'/* REPASSO MED · rm-tema-{slug}.css — identidade visual da Nova Era para esta matéria.',
         f'   {t["titulo"]}.',
         '   ARQUIVO GERADO por tools/qa/nova-era-temas/gerar-css.py (não editar à mão: altere o gerador).',
         '   SÓ variáveis --rm-* dentro de `html.rm-sis[data-rm-tema="…"]`; nenhuma regra toca conteúdo, ids ou dados do aluno.',
         '   O seletor repete [data-rm-tema] para vencer o bloco-base de rm-materia-sistema.css em qualquer ordem de carga.',
         '   Notas P4 e cartões de recursos NÃO mudam com a matéria (regra do sistema): não são redefinidos aqui. */',
         sel + ' {',
         f"  --rm-surface: {t['surface']}; --rm-side: {t['side']}; --rm-side-edge: {t['edge']}; --rm-side-card: {t['card']}; --rm-side-rule: {t['rule']};",
         f"  --rm-accent: {t['accent']}; --rm-accent-d: {t['accent_d']}; --rm-marker: #E9B949;",
         f"  --rm-tag-radius: {t['tagr']}; --rm-vig-radius: {t['vigr']}; --rm-vig-ring: {t['ring']};"]
    for i, b in enumerate(t['pals'], 1): L.append(pal(i, b))
    L.append('}')
    L.append('')
    p = os.path.join(ROOT, f'rm-tema-{slug}.css')
    open(p, 'w', encoding='utf8').write('\n'.join(L))
    print('escrito', os.path.normpath(p))
