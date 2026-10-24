#!/usr/bin/env python3
"""PRÉ-VOO · AS ÂNCORAS QUE OS ALUNOS JÁ GRAVARAM AINDA EXISTEM NO HTML ATUAL?
Entrada: JSON (arquivo ou stdin) com a saída de dados-vivos.sql: [{"k":"hl|ink|note","subject_slug":"…","ancora":"secao" ou "secao>indice","n":N}, …]
Para cada linha confere (1) a <section id> existe no arquivo da matéria; (2) se a âncora tem «>índice», que o índice < número de sub-âncoras da secção.
O que NÃO dá para provar: que o elemento no índice é o MESMO em que o aluno desenhou (o banco não guarda assinatura de conteúdo) — por isso o plano exige
data-rm-content-rev em qualquer edição estrutural de secção com traço.
Uso: python3 -I tools/qa/pre-voo/ids-vs-banco.py linhas.json     (saída 1 se alguma âncora sumiu)"""
import json, sys, os, importlib.util
aqui = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('inv', os.path.join(aqui, 'inventario-risco.py')); inv = importlib.util.module_from_spec(spec); spec.loader.exec_module(inv)
cat = {c['slug']: c for c in inv.catalogo()}
dados = json.load(open(sys.argv[1], encoding='utf-8')) if len(sys.argv) > 1 else json.load(sys.stdin)
if isinstance(dados, dict): dados = dados['linhas']
cache = {}
def secoes(slug):
    if slug not in cache:
        p = inv.Medidor(); p.feed(open(os.path.join(inv.MAT, cat[slug]['arquivo']), encoding='utf-8').read())
        cache[slug] = {s['id']: s['sub'] for s in p.secs}
    return cache[slug]
ruins, total = [], 0
for r in dados:
    slug, anc, n = r['subject_slug'], r.get('ancora') or '', r['n']; total += n
    if slug not in cat: ruins.append((r['k'], slug, anc, n, 'matéria fora do catálogo')); continue
    sec, _, ix = anc.partition('>'); S = secoes(slug)
    if not sec: continue                                # nota sem âncora (permitido)
    if sec not in S: ruins.append((r['k'], slug, anc, n, 'seção não existe mais')); continue
    if ix and (not ix.isdigit() or int(ix) >= S[sec]): ruins.append((r['k'], slug, anc, n, f'índice fora da seção ({S[sec]} sub-âncoras)'))
print(f'{len(dados)} âncoras distintas · {total} registros · problemas: {len(ruins)}')
for x in ruins: print('  ✗', *x)
sys.exit(1 if ruins else 0)
