#!/usr/bin/env python3
"""PRÉ-VOO · passo P1 (editorial): a matéria DECLARA as suas seções agregadoras (`data-rm-agrega`) no HTML?
O ensaio com `--corr` simula o marcador em memória; este verificador olha o arquivo de verdade. Obrigatório para as seções agregadoras cujo id NÃO casa com /banco|flashcards/i
(o código reconhece essas pelo nome). A lista vem de resultados/marcadores-agrega.json (derivada por conteúdo; regenere com marcadores-agrega.cjs se o conteúdo mudou).
Uso: python3 -I tools/qa/pre-voo/agrega-no-html.py <slug …>   · saída 1 se faltar alguma declaração"""
import importlib.util, json, os, re, sys
aqui = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('inv', os.path.join(aqui, 'inventario-risco.py')); inv = importlib.util.module_from_spec(spec); spec.loader.exec_module(inv)
lista = {r['slug']: [x.split(' ')[0] for x in r['agregadoras']] for r in json.load(open(os.path.join(inv.RAIZ, 'docs', 'pre-voo-caneta-layout', 'resultados', 'marcadores-agrega.json'), encoding='utf-8'))['linhas']}
cat = {c['slug']: c for c in inv.catalogo()}
ruim = 0
for slug in (sys.argv[1:] or list(cat)):
    html = open(os.path.join(inv.MAT, cat[slug]['arquivo']), encoding='utf-8').read()
    falta = []
    for sid in lista.get(slug, []):
        if re.search(r'banco|flashcards', sid, re.I): continue
        if not re.search(r'<section[^>]*\bid="%s"[^>]*\bdata-rm-agrega\b|<section[^>]*\bdata-rm-agrega\b[^>]*\bid="%s"' % (re.escape(sid), re.escape(sid)), html): falta.append(sid)
    if falta: ruim += 1; print(f'✗ {slug}: falta data-rm-agrega em {falta}')
print(f'{len(sys.argv[1:] or cat)} matéria(s) · com declaração faltando: {ruim}')
sys.exit(1 if ruim else 0)
