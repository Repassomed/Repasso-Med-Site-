#!/usr/bin/env python3
"""Gera o valor de `RM_AUDIO_MANIFEST` do piloto Semiología II com os QUATRO .m4a já comprimidos (upload pelo painel do Supabase, sem Python/Git/Node do lado do José).
Quem roda isto é o Claude, a partir de DUAS informações que o José dá pelo Windows: a duração de cada arquivo (Explorador ▸ Detalhes ▸ Duração) e o bloco de cada áudio (ouvindo).

  python3 tools/audio/manifesto_piloto.py --motivo-bloco s2-b01 --blocos-confirmados \\
      --dur motivo=35:12 --dur epoc=31:40 --dur parenquimatoso=14:05 --dur pleural=21:30

Nunca adivinha: «Motivo de Consulta» exige --motivo-bloco (s2-b01 respiratório OU s2-b06 cardíaco) e o conjunto exige --blocos-confirmados (a confirmação do José, por escuta).
Falha FECHADA se faltar duração, se o bloco não existir na matéria, se o leitor REAL do servidor (+ validador do motor) recusar algum item ou se passar do limite da variável do Netlify.
Imprime o JSON compacto e a tabela «nome final do arquivo → caminho no bucket». Não envia nada, não toca no Supabase; o manifesto NÃO é gravado no repositório (a pasta publicada é a raiz)."""
import argparse, json, os, re, shutil, subprocess, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = os.path.join(RAIZ, 'Repasso-Med-Site--main', 'Atual - Copia')
MATERIA = os.path.join(SITE, 'netlify', 'functions', 'materias-privadas', 'semiologia-ii.html')
LIMITE_ENV = 3800
# chave → (nome no Drive, apelido no nome final, bloco candidato PELO NOME — só candidato: quem confirma é a escuta do José)
PILOTO = {
    'motivo': ('Semio_-_Motivo_de_Consulta (1).m4a', 'motivo-consulta', None),          # s2-b01 × s2-b06: não se adivinha
    'epoc': ('Semio_EPOC (1).m4a', 'epoc', 's2-b03'),
    'parenquimatoso': ('Semio - 3 Sindrome Parenquimatoso (1).m4a', 'parenquimatoso', 's2-b04'),
    'pleural': ('Semio_-_4_sindrome_pleual (1).m4a', 'pleural', 's2-b05'),
}


def titulos():
    with open(MATERIA, encoding='utf-8') as f:
        h = f.read()
    return {m.group(1): re.sub(r'<[^>]+>', '', m.group(2)).strip() for m in re.finditer(r'<section[^>]*\bid="(s2-b\d+)"[^>]*>.*?<h2[^>]*>(.*?)</h2>', h, flags=re.S)}


def segundos(txt):
    """«35:12», «1:02:03» ou «2112» → segundos inteiros (> 0, ≤ 6 h)."""
    t = txt.strip()
    if re.fullmatch(r'\d+', t):
        v = int(t)
    elif re.fullmatch(r'\d{1,2}(:\d{2}){1,2}', t):
        p = [int(x) for x in t.split(':')]
        if any(x >= 60 for x in p[1:]):
            raise ValueError(f'duração inválida: {txt!r}')
        v = p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]
    else:
        raise ValueError(f'duração inválida: {txt!r} (use MM:SS, H:MM:SS ou segundos)')
    if not 0 < v <= 21600:
        raise ValueError(f'duração fora de 1 s … 6 h: {txt!r}')
    return v


def montar(durs, motivo_bloco, blocos_confirmados, blocos=None, tit=None):
    erros, itens, plano = [], [], []
    tit = tit or titulos()
    if not blocos_confirmados:
        erros.append('falta --blocos-confirmados: o bloco de cada áudio tem de ser confirmado pelo José ao ouvir (o nome do arquivo não decide)')
    if motivo_bloco not in ('s2-b01', 's2-b06'):
        erros.append('«Motivo de Consulta»: informe --motivo-bloco s2-b01 (respiratório) OU s2-b06 (cardíaco); não se adivinha')
    for k in PILOTO:
        if k not in durs:
            erros.append(f'falta a duração de {k} (--dur {k}=MM:SS)')
    if erros:
        return erros, itens, plano
    for k, (drive, apelido, cand) in PILOTO.items():
        bloco = motivo_bloco if k == 'motivo' else (blocos or {}).get(k, cand)
        if bloco not in tit:
            erros.append(f'{k}: bloco {bloco!r} não existe na matéria'); continue
        n = int(re.search(r'b(\d+)$', bloco).group(1))
        aid = f'{bloco}-{apelido}'
        itens.append({'audio_id': aid, 'block_id': bloco, 'theme': tit[bloco], 'title': 'Audiobook · ' + tit[bloco], 'duration': durs[k], 'order': n, 'version': 'v1', 'path': f'semiologia-ii/{aid}.m4a', 'ready': True})
        plano.append({'drive': drive, 'final': f'{aid}.m4a', 'path': f'semiologia-ii/{aid}.m4a', 'bloco': bloco, 'duracao_s': durs[k]})
    if len({i['order'] for i in itens}) != len(itens):
        erros.append('dois áudios caíram no mesmo bloco: a ordem repetiria')
    if not erros:
        env = json.dumps({'semiologia-ii': itens}, ensure_ascii=False, separators=(',', ':'))
        if len(env.encode('utf-8')) > LIMITE_ENV:
            erros.append(f'manifesto com {len(env.encode("utf-8"))} B passa do limite seguro de {LIMITE_ENV} B (variável do Netlify)')
        elif shutil.which('node') is None:
            erros.append('Node.js não encontrado para validar com o leitor do servidor')
        else:
            js = ("const L=require(process.argv[1]+'/netlify/functions/_audio/lib.js'),R=require(process.argv[1]+'/assets/rm-audio.js');"
                  "const raw=require('fs').readFileSync(0,'utf8');process.stdout.write(String(L.lerManifesto(raw,R.validateItem).length));")
            r = subprocess.run(['node', '-e', js, SITE], input=env, capture_output=True, text=True)
            if r.returncode != 0 or r.stdout.strip() != str(len(itens)):
                erros.append('o leitor do servidor/validador do motor recusou algum item')
    return erros, itens, plano


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dur', action='append', default=[], metavar='chave=MM:SS', help='motivo | epoc | parenquimatoso | pleural')
    ap.add_argument('--motivo-bloco', choices=('s2-b01', 's2-b06')); ap.add_argument('--blocos-confirmados', action='store_true')
    ap.add_argument('--bloco', action='append', default=[], metavar='chave=s2-bNN', help='só se a escuta do José contradisser o bloco candidato')
    a = ap.parse_args(argv)
    durs = {}
    try:
        for x in a.dur:
            k, _, v = x.partition('=')
            if k not in PILOTO:
                print(f'ERRO: chave desconhecida {k!r}'); return 2
            durs[k] = segundos(v)
    except ValueError as e:
        print('ERRO:', e); return 2
    over = dict(x.partition('=')[::2] for x in a.bloco)
    erros, itens, plano = montar(durs, a.motivo_bloco, a.blocos_confirmados, over)
    if erros:
        print('MANIFESTO NÃO GERADO (falha fechada):'); [print(' - ' + e) for e in erros]; return 1
    env = json.dumps({'semiologia-ii': itens}, ensure_ascii=False, separators=(',', ':'))
    print('# RM_AUDIO_MANIFEST (copiar tudo, numa linha):\n' + env + f'\n# {len(env.encode("utf-8"))} bytes\n\n# Nome no Drive → nome FINAL (renomear antes do upload) → caminho no bucket `audiobooks`')
    for p in sorted(plano, key=lambda x: x['bloco']):
        print(f"  {p['drive']}  →  {p['final']}  →  {p['path']}   ({p['bloco']}, {p['duracao_s']} s)")
    return 0


if __name__ == '__main__':
    sys.exit(main())
