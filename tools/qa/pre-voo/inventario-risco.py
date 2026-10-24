#!/usr/bin/env python3
"""PRÉ-VOO · INVENTÁRIO ESTÁTICO DE RISCO por matéria (sem navegador, sem rede, sem escrever em lugar nenhum além da saída pedida).

Lê o catálogo REAL (index.html × get-materia.js × arquivos de netlify/functions/materias-privadas) e mede, no HTML de cada matéria, o que importa para
grifos, traços da caneta e notas:

  · secoes / ids_duplicados / ids_estranhos / secoes_aninhadas  → o id da <section> é a âncora de TUDO (grifo: block_id; traço e nota: anchor_id);
  · sub_total / sub_em_questoes / sub_em_cartoes / sub_em_details  → o traço guarda «secção>ÍNDICE» e o índice conta p,li,h2-h5,table,figure,blockquote
    de TODA a secção, inclusive dentro de questões, cartões e <details> fechados: editar questões desloca os traços posteriores daquela secção;
  · repetidos_na_secao  → frases idênticas na mesma secção (grifo ambíguo; o motor desambigua por prefixo/sufixo e, na dúvida, deixa pendente);
  · content_visibility → CSS que faz o navegador estimar a altura de secções fora da tela (afeta a medida dos traços até a secção ser rolada);
  · data_rm_content_rev → a secção declara revisão estrutural (traços anteriores à data ficam órfãos de propósito);
  · imagens / tabelas / iframes → itens de reflow tardio (a altura muda depois de carregar → a tinta tem de reposicionar).

Opcional --vivo <json>: contagens AGREGADAS por matéria vindas de consulta SOMENTE LEITURA ao banco ({slug:{hl,hl_users,ink,ink_users,notes}}). Nunca contém texto de aluno.

Uso (da raiz do repositório):
  python3 -I tools/qa/pre-voo/inventario-risco.py [--vivo docs/pre-voo-caneta-layout/dados-vivos.json] [--json saida.json] [--md saida.md]
"""
import argparse, json, os, re, sys
from html.parser import HTMLParser

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SITE = os.path.join(RAIZ, 'Repasso-Med-Site--main', 'Atual - Copia')
MAT = os.path.join(SITE, 'netlify', 'functions', 'materias-privadas')
SUB = {'p', 'li', 'h2', 'h3', 'h4', 'h5', 'table', 'figure', 'blockquote'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
PILOTO, FORA = 'semiologia-ii', {'imagenologia': 'fora da integração por decisão de José', 'bioestadistica': 'sem rota no catálogo'}


def catalogo():
    idx = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    i = idx.index('const CATALOGO = ['); j = idx.index('];', i)
    bloco = idx[i + len('const CATALOGO = '): j + 1]
    itens = re.findall(r'\{[^{}]*\}', bloco)
    out = []
    for it in itens:
        slug = re.search(r"slug\s*:\s*['\"]([^'\"]+)", it); tab = re.search(r"tab\s*:\s*['\"]([^'\"]+)", it); tit = re.search(r"title\s*:\s*['\"]([^'\"]+)", it)
        if slug: out.append({'slug': slug.group(1), 'tab': tab.group(1) if tab else '', 'title': tit.group(1) if tit else ''})
    src = open(os.path.join(SITE, 'netlify', 'functions', 'get-materia.js'), encoding='utf-8').read()
    k = src.index('const FILES = {'); l = src.index('};', k)
    files = dict(re.findall(r"""['"]?([a-z0-9-]+)['"]?\s*:\s*['"]([^'"]+\.html)['"]""", src[k:l]))
    return [dict(c, arquivo=files[c['slug']]) for c in out if c['slug'] in files]


class Medidor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pilha = []          # (tag, flags)
        self.secs = []           # {'id','sub','q','fc','det','textos':[]}
        self.abertas = []        # índices em self.secs das <section id> abertas
        self.ids = []; self.aninhadas = 0; self.imagens = 0; self.tabelas = 0; self.iframes = 0; self.rev = 0
        self.texto_atual = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in VOID:
            if tag == 'img': self.imagens += 1
            return
        cls = (a.get('class') or '').split()
        flags = set()
        if 'quiz-item' in cls: flags.add('q')
        if 'flashcard' in cls: flags.add('fc')
        if tag == 'details': flags.add('det')
        if tag == 'section' and a.get('id'):
            if self.abertas: self.aninhadas += 1
            self.secs.append({'id': a['id'], 'sub': 0, 'q': 0, 'fc': 0, 'det': 0, 'textos': []})
            self.abertas.append(len(self.secs) - 1); self.ids.append(a['id']); flags.add('sec')
            if 'data-rm-content-rev' in a: self.rev += 1
        if tag == 'iframe': self.iframes += 1
        if tag == 'table': self.tabelas += 1
        if tag in SUB and self.abertas:
            # o motor conta a secção MAIS INTERNA que contém o elemento? Não: section.querySelectorAll conta tudo dentro dela; aninhadas contam nas duas
            dentro = set(f for _, fl in self.pilha for f in fl)
            for si in self.abertas:
                s = self.secs[si]; s['sub'] += 1
                if 'q' in dentro or 'q' in flags: s['q'] += 1
                if 'fc' in dentro or 'fc' in flags: s['fc'] += 1
                if 'det' in dentro: s['det'] += 1
            if tag in ('p', 'li'): self.texto_atual = []
        self.pilha.append((tag, flags))

    def handle_data(self, d):
        if self.texto_atual is not None: self.texto_atual.append(d)

    def handle_endtag(self, tag):
        if tag in VOID: return
        for k in range(len(self.pilha) - 1, -1, -1):
            if self.pilha[k][0] == tag:
                _, fl = self.pilha[k]; del self.pilha[k:]
                if 'sec' in fl and self.abertas: self.abertas.pop()
                break
        if tag in ('p', 'li') and self.texto_atual is not None and self.abertas:
            t = re.sub(r'\s+', ' ', ''.join(self.texto_atual)).strip().lower()
            if len(t) >= 40: self.secs[self.abertas[-1]]['textos'].append(t)
            self.texto_atual = None


def medir(m):
    html = open(os.path.join(MAT, m['arquivo']), encoding='utf-8').read()
    p = Medidor(); p.feed(html)
    ids = p.ids
    dup = sorted({i for i in ids if ids.count(i) > 1})
    estranhos = sorted({i for i in ids if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]*', i)})
    rep = 0
    for s in p.secs:
        vistos = {}
        for t in s['textos']: vistos[t] = vistos.get(t, 0) + 1
        rep += sum(n - 1 for n in vistos.values() if n > 1)
    cv = len(re.findall(r'content-visibility\s*:\s*auto', html))
    vazias = re.findall(r'<section[^>]*\bid="([^"]+)"[^>]*\bhidden\b[^>]*>\s*</section>', html)
    return {
        'slug': m['slug'], 'titulo': m['title'], 'arquivo': m['arquivo'], 'kb': round(len(html.encode('utf-8')) / 1024),
        'grupo': 'piloto' if m['slug'] == PILOTO else ('fora' if m['slug'] in FORA else 'elegivel'),
        'secoes': len(ids), 'ids_duplicados': dup, 'ids_estranhos': estranhos, 'secoes_aninhadas': p.aninhadas,
        'sub_total': sum(s['sub'] for s in p.secs), 'sub_max_secao': max([s['sub'] for s in p.secs] or [0]),
        'sub_em_questoes': sum(s['q'] for s in p.secs), 'sub_em_cartoes': sum(s['fc'] for s in p.secs), 'sub_em_details': sum(s['det'] for s in p.secs),
        'secoes_vazias_ocultas': vazias, 'repetidos_na_secao': rep, 'content_visibility': cv, 'data_rm_content_rev': p.rev,
        'imagens': p.imagens, 'tabelas': p.tabelas, 'iframes': p.iframes,
    }


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--vivo'); ap.add_argument('--json'); ap.add_argument('--md')
    a = ap.parse_args()
    vivo = json.load(open(a.vivo, encoding='utf-8')).get('por_materia', {}) if a.vivo else {}
    linhas = []
    for m in catalogo():
        r = medir(m); v = vivo.get(m['slug'], {})
        r['vivo'] = {k: v.get(k, 0) for k in ('hl', 'hl_users', 'ink', 'ink_users', 'notes')}
        linhas.append(r)
    if a.json: json.dump(linhas, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    cab = '| # | matéria (slug) | grupo | seções | sub-âncoras (total · em questões/cartões) | repet. | grifos·traços·notas hoje (alunos) | reflow tardio (img·tab) | alertas |\n|--:|---|---|--:|---|--:|---|---|---|'
    out = [cab]
    for i, r in enumerate(linhas, 1):
        al = []
        if r['ids_duplicados']: al.append('id duplicado ' + ','.join(r['ids_duplicados'][:3]))
        if r['ids_estranhos']: al.append('id fora do padrão ' + ','.join(r['ids_estranhos'][:3]))
        if r['secoes_vazias_ocultas']: al.append('placeholder oculto ' + ','.join(r['secoes_vazias_ocultas']) + ' (B1)')
        if r['secoes_aninhadas']: al.append(f"{r['secoes_aninhadas']} seção(ões) aninhada(s)")
        v = r['vivo']
        out.append(f"| {i} | {r['titulo']} (`{r['slug']}`) | {r['grupo']} | {r['secoes']} | {r['sub_total']} · {r['sub_em_questoes']}/{r['sub_em_cartoes']} | {r['repetidos_na_secao']} | "
                   f"{v['hl']} ({v['hl_users']}) · {v['ink']} ({v['ink_users']}) · {v['notes']} | {r['imagens']}·{r['tabelas']} | {'; '.join(al) or '—'} |")
    texto = '\n'.join(out)
    if a.md: open(a.md, 'w', encoding='utf-8').write(texto + '\n')
    print(texto)
    graves = [r['slug'] for r in linhas if r['ids_duplicados'] or r['ids_estranhos'] or r['secoes_aninhadas']]
    print(f"\n{len(linhas)} matérias · {sum(1 for r in linhas if r['grupo']=='elegivel')} elegíveis · alertas de âncora em: {graves or 'nenhuma'}")


if __name__ == '__main__':
    main()
