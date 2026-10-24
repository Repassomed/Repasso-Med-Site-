#!/usr/bin/env python3
"""PRÉ-VOO · o docs/layout-ensaio/inventario.json está em dia com o HTML da matéria?
O ensaio de layout (`ensaio.cjs`) e o de uso (`interacao.cjs`) escolhem blocos, agregadoras e alvos a partir desse inventário; se ele ficou velho (seção removida, seção nova, revisão de conteúdo),
os testes quebram ou — pior — passam medindo a matéria errada. Compara os ids das <section id> do inventário com os do arquivo atual. Saída 1 se divergirem (rode `inventario.cjs`).
Uso: python3 -I tools/qa/pre-voo/inventario-fresco.py <slug …>   (sem slug: as 27)"""
import importlib.util, json, os, sys
aqui = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('inv', os.path.join(aqui, 'inventario-risco.py')); inv = importlib.util.module_from_spec(spec); spec.loader.exec_module(inv)
dados = json.load(open(os.path.join(inv.RAIZ, 'docs', 'layout-ensaio', 'inventario.json'), encoding='utf-8'))
no_inv = {m['slug']: [s['id'] for s in m['secoes']] for m in dados['materias']}
cat = {c['slug']: c for c in inv.catalogo()}
alvo = sys.argv[1:] or list(cat)
ruim = 0
for slug in alvo:
    p = inv.Medidor(); p.feed(open(os.path.join(inv.MAT, cat[slug]['arquivo']), encoding='utf-8').read())
    ids = [s['id'] for s in p.secs]
    if ids != no_inv.get(slug):
        ruim += 1
        print(f"✗ {slug}: inventário {len(no_inv.get(slug) or [])} seções × HTML {len(ids)}; só no HTML: {sorted(set(ids) - set(no_inv.get(slug) or []))[:4]}; só no inventário: {sorted(set(no_inv.get(slug) or []) - set(ids))[:4]}")
print(f"{len(alvo)} matéria(s) conferida(s) · inventário velho em {ruim}" + ('' if not ruim else ' → rode: node tools/qa/ensaio-layout/inventario.cjs'))
sys.exit(1 if ruim else 0)
