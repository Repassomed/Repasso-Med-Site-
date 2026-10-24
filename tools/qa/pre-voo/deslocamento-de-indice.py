#!/usr/bin/env python3
"""PRÉ-VOO · UMA EDIÇÃO DE CONTEÚDO DESLOCA OS TRAÇOS DA CANETA? (candidato a verificação do Guard — aqui só como ferramenta, nada é alterado)
O traço é gravado como «secção>índice» (índice = posição do elemento p,li,h2-h5,table,figure,blockquote dentro da secção). Inserir ou remover UM desses elementos antes do ponto
desenhado faz o traço passar a apontar para o vizinho — em silêncio, porque o banco não guarda o conteúdo do elemento. Esta ferramenta compara, secção a secção, a lista ordenada
(tag + 48 primeiros caracteres) entre duas refs do git e diz onde o índice andou.
  · «sem traço»  = a secção não tem traço gravado hoje (docs/pre-voo-caneta-layout/dados-vivos-ancoras.json): informativo;
  · «COM TRAÇO»  = a secção tem traço gravado: precisa de data-rm-content-rev (revisão estrutural declarada: traços anteriores à data ficam órfãos de propósito, nunca realocados) ou
                   de confirmação de que o deslocamento só acontece DEPOIS do elemento desenhado (indice-seguro).
Uso (da raiz):  python3 -I tools/qa/pre-voo/deslocamento-de-indice.py --base origin/main --head HEAD [--vivo docs/pre-voo-caneta-layout/dados-vivos-ancoras.json]
Saída 1 só se uma secção COM TRAÇO mudou antes de um índice gravado e sem data-rm-content-rev na versão nova."""
import argparse, importlib.util, json, os, re, subprocess, sys
aqui = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('inv', os.path.join(aqui, 'inventario-risco.py')); inv = importlib.util.module_from_spec(spec); spec.loader.exec_module(inv)


class Itens(inv.Medidor):
    def __init__(self):
        super().__init__(); self.lista = {}; self.abertos = []; self.rev_por_secao = {}
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        super().handle_starttag(tag, attrs)
        if tag == 'section' and a.get('id'):
            self.lista.setdefault(a['id'], []); self.rev_por_secao[a['id']] = a.get('data-rm-content-rev')
        if tag in inv.SUB and self.abertas and tag not in inv.VOID:
            it = [tag, '']
            for si in self.abertas: self.lista[self.secs[si]['id']].append(it)
            self.abertos.append(it)
    def handle_data(self, d):
        super().handle_data(d)
        for it in self.abertos:
            if len(it[1]) < 60: it[1] += d
    def handle_endtag(self, tag):
        super().handle_endtag(tag)
        if tag in inv.SUB and self.abertos: self.abertos.pop()


def sig(html):
    p = Itens(); p.feed(html)
    return {k: [t + ':' + re.sub(r'\s+', ' ', x).strip()[:48] for t, x in v] for k, v in p.lista.items()}, p.rev_por_secao


def git(*a):
    return subprocess.run(['git', *a], capture_output=True, text=True, cwd=inv.RAIZ)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default='origin/main'); ap.add_argument('--head', default='HEAD'); ap.add_argument('--vivo')
    a = ap.parse_args()
    vivo = {}
    if a.vivo:
        for r in json.load(open(a.vivo, encoding='utf-8'))['linhas']:
            if r['k'] == 'ink': vivo.setdefault(r['subject_slug'], {}).setdefault(r['ancora'].partition('>')[0], []).append(r['ancora'])
    rel = os.path.relpath(inv.MAT, inv.RAIZ).replace(os.sep, '/')
    mudados = [l for l in git('diff', '--name-only', f'{a.base}...{a.head}', '--', rel).stdout.split('\n') if l.endswith('.html')]
    arq2slug = {c['arquivo']: c['slug'] for c in inv.catalogo()}
    ruim = 0; estavel = []
    for f in mudados:
        nome = os.path.basename(f); slug = arq2slug.get(nome)
        if not slug: continue
        antes = git('show', f'{a.base}:{f}').stdout; depois = git('show', f'{a.head}:{f}').stdout
        if not antes or not depois: continue
        sa, _ = sig(antes); sb, rev = sig(depois)
        for sec, la in sa.items():
            lb = sb.get(sec)
            if lb is None: print(f'  {slug}/{sec}: SEÇÃO REMOVIDA' + (' — COM TRAÇO' if sec in vivo.get(slug, {}) else '')); ruim += sec in vivo.get(slug, {}); continue
            if la == lb: continue
            ta, tb = [x.split(':', 1)[0] for x in la], [x.split(':', 1)[0] for x in lb]
            com = sec in vivo.get(slug, {})
            ancs = vivo.get(slug, {}).get(sec, []); idx = [int(x.partition('>')[2]) for x in ancs if '>' in x]; secao = any('>' not in x for x in ancs)
            if ta == tb:   # mesmo nº de elementos e mesma sequência de tags: o texto foi reescrito NO LUGAR, o índice continua apontando para o mesmo «espaço»
                estavel.append(f'{slug}/{sec}'); continue
            i = next((k for k in range(min(len(ta), len(tb))) if ta[k] != tb[k]), min(len(ta), len(tb)))
            atinge = any(k >= i for k in idx)
            nota = (' — COM TRAÇO por índice ATINGIDO (posição ≥ %d)' % i if atinge else (' — COM TRAÇO, mas só ancorado na secção ou antes da mudança' if com else ' — sem traço'))
            print(f'  {slug}/{sec}: ESTRUTURA mudou a partir do índice {i} ({len(la)} → {len(lb)} elementos){nota}')
            if atinge and not rev.get(sec): ruim += 1; print('      ✗ sem data-rm-content-rev nesta secção')
    if estavel: print(f'  texto reescrito no mesmo lugar (índices estáveis): {len(estavel)} secção(ões)')
    print(f'{len(mudados)} arquivo(s) de matéria alterado(s) · secções COM TRAÇO atingidas sem data-rm-content-rev: {ruim}')
    sys.exit(1 if ruim else 0)

if __name__ == '__main__':
    main()
