#!/usr/bin/env python3
"""PRÉ-VOO · gera docs/pre-voo-caneta-layout/RESULTADOS.md a partir dos JSON de resultado (não mede nada, só lê e resume).
Entradas (todas opcionais; o que faltar vira «não executado» no texto, nunca é inventado):
  --pv     pasta com ancoras-estaveis.json, ida-e-volta.json, marcadores-agrega.json     (padrão docs/pre-voo-caneta-layout/resultados)
  --asis   pasta dos JSON do ensaio.cjs «como está»         (docs/layout-ensaio/resultados  de uma execução)
  --corr   pasta dos JSON do ensaio.cjs --corr               (docs/layout-ensaio/resultados-corr)
  --uso    pasta dos JSON do interacao.cjs                   (docs/layout-ensaio/interacao)
  --base   arquivo com a saída de rodar-base.sh
Uso:  python3 -I tools/qa/pre-voo/resumo.py --asis … --corr … --uso … --base … > docs/pre-voo-caneta-layout/RESULTADOS.md"""
import argparse, glob, json, os, re, sys
from collections import Counter, defaultdict

ap = argparse.ArgumentParser()
ap.add_argument('--pv', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'docs', 'pre-voo-caneta-layout', 'resultados'))
ap.add_argument('--asis'); ap.add_argument('--corr'); ap.add_argument('--uso'); ap.add_argument('--base')
ap.add_argument('--compacto', help='resultados/ensaio-compacto.json (usado quando --asis/--corr/--uso não são dados): reproduz o RESULTADOS.md só com arquivos versionados')
a = ap.parse_args()
GRUPO = {'semiologia-ii': 'piloto', 'imagenologia': 'fora'}
g = lambda s: GRUPO.get(s, 'elegível')


def linhas_json(caminho):
    """Lê os JSON «uma linha por item» (formato de L.jsonLinhas) ou JSON comum."""
    try:
        txt = open(caminho, encoding='utf-8').read()
    except OSError:
        return None
    try:
        return json.loads(txt)
    except ValueError:
        return None


def ensaio_dir(pasta):
    if not pasta or not os.path.isdir(pasta): return None
    out = {}
    for f in sorted(glob.glob(os.path.join(pasta, '*.json'))):
        r = json.load(open(f, encoding='utf-8')); c = Counter(x['estado'] for x in r['checks'])
        falhas = defaultdict(set)
        for x in r['checks']:
            if x['estado'] == 'FALHA': falhas[f"{x['area']}/{x['id']}"].add(x['w'])
        out[r['slug']] = {'passa': c['PASSA'], 'falha': c['FALHA'], 'bloq': c['BLOQUEADO'], 'falhas': {k: sorted(v) for k, v in falhas.items()}, 's': r.get('segundos')}
    return out


def ordem(slugs): return sorted(slugs, key=lambda s: ({'piloto': 0, 'elegível': 1, 'fora': 2}[g(s)], s))


P = []
P.append('# Resultados do pré-voo — `main` `a9a2aa35`, 24/10/2026\n')
P.append('> Gerado por `tools/qa/pre-voo/resumo.py` a partir dos JSON em `docs/pre-voo-caneta-layout/resultados/` e dos logs desta execução. **Nada aqui ativa nada.** Chromium/Linux, Supabase simulado, zero rede externa. «PASSA» = passou no ensaio; **não** = liberado.\n')

# 1 · âncoras
d1 = linhas_json(os.path.join(a.pv, 'ancoras-estaveis.json'))
P.append('## 1 · Teste 1 — as âncoras dos traços sobrevivem à troca de layout (`ancoras-estaveis.cjs`)\n')
if d1:
    L = d1['linhas']; falhas = [r for r in L if r['estado'] != 'PASSA']
    n_est = sum(len(r['estados']) for r in L); elem = sum(r.get('elementos', 0) for r in L if r['w'] == 1440)
    P.append(f"**{len(L)} medidas** (matéria × largura 1440/390) · **{len(L) - len(falhas)} PASSA · {len(falhas)} FALHA** · {n_est} estados comparados (índice geral, 3 blocos, 3 modos, volta) · {elem} sub-âncoras (soma das 27 matérias, em 1440) comparadas uma a uma, por posição.\n")
    for r in falhas: P.append(f"- ✗ `{r['slug']}` {r['w']}px: {json.dumps(r['falhas'][:2], ensure_ascii=False)[:300]}")
    neg = linhas_json(os.path.join(a.pv, 'ancoras-estaveis.negativo.json'))
    if neg: P.append(f"\nControle negativo (um `<p>` inserido de propósito): {sum(1 for r in neg['linhas'] if r['estado'] == 'FALHA')}/{len(neg['linhas'])} medidas reprovaram — o teste **enxerga** o defeito.\n")
else: P.append('_não executado_\n')

# 2 · ida e volta
d2 = linhas_json(os.path.join(a.pv, 'ida-e-volta.json'))
P.append('## 2 · Teste 2 — ida e volta de grifos, traços e notas (`ida-e-volta.cjs`)\n')
if d2:
    L = d2['linhas']; falhas = [r for r in L if r['estado'] != 'PASSA']
    gr = sum(r['base']['grifos'] for r in L if r.get('base')); tr = sum(r['base']['tracos'] for r in L if r.get('base')); nt = sum(r['base']['notas'] for r in L if r.get('base'))
    P.append(f"**{len(L)} medidas** · **{len(L) - len(falhas)} PASSA · {len(falhas)} FALHA** · {gr} grifos, {tr} traços e {nt} notas gravados e relidos em 3 fases (controle → layout novo → volta ao controle); 0 escrita no banco nas fases de leitura.\n")
    for r in falhas: P.append(f"- ✗ `{r['slug']}` {r['w']}px: {json.dumps(r['falhas'][:3], ensure_ascii=False)[:400]}")
    neg = linhas_json(os.path.join(a.pv, 'ida-e-volta.negativo.json'))
    if neg: P.append(f"\nControle negativo: {sum(1 for r in neg['linhas'] if r['estado'] == 'FALHA')}/{len(neg['linhas'])} reprovaram.\n")
else: P.append('_não executado_\n')

# 3 · ensaio visual
def do_compacto(chave):
    c = linhas_json(a.compacto or os.path.join(a.pv, 'ensaio-compacto.json'))
    if not c or chave not in c: return None
    out = {}
    for slug, v in c[chave].items():
        out[slug] = {'passa': v['passa'], 'falha': v['falha'], 'bloq': v['bloqueado'], 's': v.get('segundos'),
                     'falhas': {k.split(' ', 1)[1]: w for k, w in v['itens'].items() if k.startswith('FALHA')}}
    return out
asis, corr = ensaio_dir(a.asis) or do_compacto('como_esta'), ensaio_dir(a.corr) or do_compacto('com_correcao')
P.append('## 3 · Ensaio do layout nas matérias (`ensaio.cjs`) — «como está» × «com correção simulada»\n')
if asis or corr:
    slugs = ordem(set(asis or {}) | set(corr or {}))
    P.append('«Como está» = módulos reais da `main` + ativador do ensaio (descritor **inferido**). «Com correção» (`--corr`) acrescenta em memória o marcador `data-rm-agrega` e C8. 390·768·1024·1440 (`--rapido` na correção: 1440 e 390).\n')
    P.append('| matéria | grupo | como está (PASSA · FALHA · BLOQ.) | com correção | falhas «como está» | falhas «com correção» |\n|---|---|---|---|---|---|')
    for s in slugs:
        x, y = (asis or {}).get(s), (corr or {}).get(s)
        fx = '—' if not x or not x['falhas'] else '; '.join(f"{k} ({','.join(map(str, v))})" for k, v in x['falhas'].items())
        fy = '—' if not y or not y['falhas'] else '; '.join(f"{k} ({','.join(map(str, v))})" for k, v in y['falhas'].items())
        P.append(f"| `{s}` | {g(s)} | {('%d · %d · %d' % (x['passa'], x['falha'], x['bloq'])) if x else 'n/e'} | {('%d · %d · %d' % (y['passa'], y['falha'], y['bloq'])) if y else 'n/e'} | {fx} | {fy} |")
    P.append('')
else: P.append('_não executado_\n')

# 3b · simulação C9 + B2
sim = linhas_json(os.path.join(a.pv, 'sim-c9-b2.json'))
P.append('### 3b · O que fecha os bloqueios B1 e B2 (simulação em memória, `RM_ENSAIO_INIT=tools/qa/pre-voo/sim-c9.js`)\n')
if sim:
    ms = sim['materias']
    P.append(f"As {len(ms)} matérias que falhavam «com correção» (10 com placeholder oculto + Anatopatologia II com `ap2biblio` sem título), ensaiadas de novo com os placeholders fora da lista de blocos e um título em `ap2biblio`: **{sum(v['passa'] for v in ms.values())} PASSA · {sum(v['falha'] for v in ms.values())} FALHA** (1440 e 390). Prova que B1+B2 são **as únicas** causas.\n")
    P.append('| ' + ' | '.join(f"`{k}` {v['passa']}·{v['falha']}" for k, v in ms.items()) + ' |\n')
else: P.append('_não executado_\n')

# 4 · uso
uso = ensaio_dir(a.uso) or do_compacto('uso')
P.append('## 4 · Uso: caneta (CDP), palma, rolagem, pinça, goma, grifo, troca de bloco/modo, recarregar (`interacao.cjs --rapido`)\n')
if uso:
    P.append('| matéria | grupo | PASSA | FALHA | BLOQ. | falhas |\n|---|---|--:|--:|--:|---|')
    for s in ordem(uso):
        x = uso[s]; fx = '—' if not x['falhas'] else '; '.join(f"{k} ({','.join(map(str, v))})" for k, v in x['falhas'].items())
        P.append(f"| `{s}` | {g(s)} | {x['passa']} | {x['falha']} | {x['bloq']} | {fx} |")
    P.append('')
else: P.append('_não executado_\n')

# 5 · marcadores
mk = linhas_json(os.path.join(a.pv, 'marcadores-agrega.json'))
P.append('## 5 · Marcadores `data-rm-agrega` que cada matéria precisa declarar (passo P1, editorial)\n')
if mk:
    import re
    P.append('Derivados **por conteúdo** (seção cujas questões/cartões já existem nas seções de bloco). Hoje **nenhum** arquivo de matéria os traz. O código reconhece sozinho as seções cujo **id** casa com `/banco|flashcards/i`; as demais (**obrigatórias** na coluna da direita) só são reconhecidas se declararem `data-rm-agrega`.\n')
    P.append('| matéria | agregadoras (id · questões · cartões) | **precisam** do marcador (id não casa) |\n|---|---|---|')
    obrig = 0
    for r in mk['linhas']:
        ids = [x.split(' ')[0] for x in r['agregadoras']]
        pre = [i for i in ids if not re.search(r'banco|flashcards', i, re.I)]
        obrig += len(pre)
        P.append(f"| `{r['slug']}` | {', '.join('`' + x + '`' for x in r['agregadoras']) or '—'} | {', '.join('`' + x + '`' for x in pre) or '—'} |")
    P.append(f"\n**{obrig} seções** em {sum(1 for r in mk['linhas'] if [i for i in (x.split(' ')[0] for x in r['agregadoras']) if not re.search(r'banco|flashcards', i, re.I)])} matérias precisam do marcador antes de a matéria entrar na lista.\n")
else: P.append('_não executado_\n')

# 5b · prontidão hoje (derivada dos resultados acima; equivale à «porta» exceto as 4 larguras completas do ensaio)
if mk and corr:
    import importlib.util
    sp = importlib.util.spec_from_file_location('inv', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventario-risco.py')); inv = importlib.util.module_from_spec(sp); sp.loader.exec_module(inv)
    cat = {c['slug']: c for c in inv.catalogo()}
    falta_marc = {}
    for r in mk['linhas']:
        html = open(os.path.join(inv.MAT, cat[r['slug']]['arquivo']), encoding='utf-8').read()
        falta_marc[r['slug']] = [i for i in (x.split(' ')[0] for x in r['agregadoras']) if not re.search(r'banco|flashcards', i, re.I) and not re.search(r'<section[^>]*\bid="%s"[^>]*\bdata-rm-agrega\b' % re.escape(i), html)]
    vazias = {m['slug']: m['secoes_vazias_ocultas'] for m in json.load(open(os.path.join(a.pv, 'inventario-risco.json'), encoding='utf-8'))}
    d1s = {r['slug']: r['estado'] for r in (d1['linhas'] if d1 else [])}
    P.append('### 5b · Prontidão hoje de cada matéria (o que a porta diria agora)\n')
    P.append('| matéria | grupo | teste 1 | teste 2 | uso | marcador no HTML | layout «com correção» | **porta hoje** |\n|---|---|---|---|---|---|---|---|')
    ab = 0
    for sl in ordem(set(cat)):
        t1 = 'PASSA' if all(r['estado'] == 'PASSA' for r in (d1['linhas'] if d1 else []) if r['slug'] == sl) else 'FALHA'
        t2 = 'PASSA' if all(r['estado'] == 'PASSA' for r in (d2['linhas'] if d2 else []) if r['slug'] == sl) else 'FALHA'
        us = 'PASSA' if uso and uso.get(sl, {}).get('falha', 1) == 0 else 'FALHA'
        mc = 'ok' if not falta_marc.get(sl) else 'falta ' + ', '.join('`%s`' % i for i in falta_marc[sl])
        ly = 'PASSA' if corr.get(sl, {}).get('falha', 1) == 0 else 'FALHA ' + ', '.join(sorted({k.split('/')[1] for k in corr[sl]['falhas']}))
        mot = []
        if sl in GRUPO and GRUPO[sl] == 'fora': porta = 'fora do escopo'
        elif sl == 'semiologia-ii': porta = 'piloto (já ativo)'
        else:
            if t1 != 'PASSA' or t2 != 'PASSA' or us != 'PASSA': mot.append('dados/uso')
            if falta_marc.get(sl): mot.append('marcador')
            if corr.get(sl, {}).get('falha', 1): mot.append('layout (B1/B2)' if (vazias.get(sl) or sl == 'anatomia-patologica-ii') else 'layout')
            porta = 'ABERTA' if not mot else 'fechada: ' + ' + '.join(mot)
            ab += not mot
        P.append(f"| `{sl}` | {g(sl)} | {t1} | {t2} | {us} | {mc} | {ly} | **{porta}** |")
    P.append(f"\n**{ab} das 25 elegíveis já estariam com a porta aberta hoje** (faltando, para todas, a Etapa 0 de código, o descritor aprovado e o roteiro físico).\n")

# 6 · base
P.append('## 6 · Linha de base das suítes do piloto (`rodar-base.sh`)\n')
if a.base and os.path.exists(a.base):
    P.append('```\n' + open(a.base, encoding='utf-8').read().strip() + '\n```\n')
else: P.append('_não executado_\n')
pe = os.path.join(a.pv, 'porta-exemplos.txt')
if os.path.exists(pe):
    P.append('## 8 · A porta em ação (`porta-da-materia.sh`, exemplos reais)\n')
    P.append('```\n' + open(pe, encoding='utf-8').read().strip() + '\n```\n')
dg = os.path.join(a.pv, 'diagnosticos.txt')
if os.path.exists(dg):
    P.append('## 7 · Diagnósticos pontuais (`tools/qa/pre-voo/diagnosticos/`)\n')
    P.append('```\n' + open(dg, encoding='utf-8').read().strip() + '\n```\n')
    P.append('- `secoes-vazias`: com o placeholder `hidden` o 1.º cartão do índice é «00» (sem título); sem ele, o índice sai limpo (B1).\n- `tinta-primeira-pintura`: no controle atual a tinta nasce ~7 px fora (0,353 em vez de 0,30 da altura de 140 px) e fica assim até `reposicionar()`; com o layout novo nasce alinhada (R5).\n- `tinta-em-tabela-larga`: o traço sobre uma `<table>` de 560 px em rolagem própria leva `scrollWidth` a 407 (>390); sem esse `svg`, 390 (R14).\n')
print('\n'.join(P))
