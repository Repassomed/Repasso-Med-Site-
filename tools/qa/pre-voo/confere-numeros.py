#!/usr/bin/env python3
"""PRÉ-VOO · RELATÓRIO, ARQUIVOS E CARTÃO CONCORDAM? Lê os JSON de resultado e confere que (1) cada bateria está COMPLETA (nº de medidas = matérias × larguras, não parcial,
27 matérias) e (2) os números que o PLANO.md e o RESULTADOS.md afirmam são os dos arquivos. Saída 1 se algo discordar. Motivo: uma rodada parcial (uma matéria) já sobrescreveu o
arquivo completo uma vez e o texto continuou dizendo «54/54».
Uso (da raiz): python3 -I tools/qa/pre-voo/confere-numeros.py"""
import json, os, re, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'docs', 'pre-voo-caneta-layout')
def carregar(nome):
    txt = open(os.path.join(R, 'resultados', nome), encoding='utf-8').read()
    return json.loads(txt)
erros = []
def exige(c, m):
    print(('  ✓ ' if c else '  ✗ ') + m)
    if not c: erros.append(m)
plano = open(os.path.join(R, 'PLANO.md'), encoding='utf-8').read(); res = open(os.path.join(R, 'RESULTADOS.md'), encoding='utf-8').read()
for nome, rot in (('ancoras-estaveis.json', 'teste 1'), ('ida-e-volta.json', 'teste 2')):
    d = carregar(nome); L = d['linhas']
    exige(not d.get('parcial') and d.get('materias') == 27 and len(L) == 54, f'{rot}: bateria completa ({len(L)} medidas, {d.get("materias")} matérias, parcial={d.get("parcial")}, commit {d.get("commit")})')
    exige(len({r['slug'] for r in L}) == 27 and all(r['estado'] == 'PASSA' for r in L), f'{rot}: 27 matérias distintas, todas PASSA')
    exige(f'**{len(L)} medidas**' in res and f'**{len(L)} PASSA · 0 FALHA**' in res, f'{rot}: RESULTADOS.md diz {len(L)} medidas / {len(L)} PASSA')
c = carregar('ensaio-compacto.json')
uso = c['uso']; tot = sum(v['passa'] for v in uso.values())
exige(len(uso) == 27 and sum(v['falha'] for v in uso.values()) == 0, f'uso: 27 matérias, 0 falha ({tot} verificações)')
fmt = lambda n: f'{n:,}'.replace(',', ' ')
exige(fmt(tot) in plano, f'PLANO.md cita {fmt(tot)} verificações de uso')
sim = carregar('sim-c9-b2.json')['materias']; st = sum(v['passa'] for v in sim.values())
exige(len(sim) == 11 and sum(v['falha'] for v in sim.values()) == 0 and fmt(st) in plano, f'simulação C9+B2: 11 matérias, 0 falha, {fmt(st)} verificações citadas no PLANO.md')
ce = c['como_esta']; cc = c['com_correcao']
exige(len(ce) == 27 and len(cc) == 27, 'ensaio: 27 matérias «como está» e 27 «com correção»')
exige(sum(v['falha'] for v in cc.values()) == 52, f'«com correção»: 52 falhas (B1 ×10 matérias × 5 + B2 ×2), conferido: {sum(v["falha"] for v in cc.values())}')
print(f'\n{len(erros)} discordância(s)')
sys.exit(1 if erros else 0)
