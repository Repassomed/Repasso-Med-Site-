#!/usr/bin/env python3
"""Monta o JSON candidato de RM_AUDIO_MANIFEST a partir do relatorio.json (preparar) + vínculos CONFIRMADOS.

NÃO define variável, NÃO envia arquivo, NÃO toca no Supabase: só escreve (fora do Git) `manifesto.json` e `plano-upload.md`.
Falha FECHADA: sem vínculo confirmado por escuta/transcrição + escuta humana OK, não gera nada.

  python3 tools/audio/montar_manifesto.py --relatorio ~/audiobooks-tratados/relatorio.json \
      --vinculos ~/audiobooks-tratados/vinculos.json --saida ~/audiobooks-tratados/manifesto

vinculos.json = lista de objetos (um por áudio):
  {"master": "<nome do master no relatorio>", "audio_id": "s2-b04-parenquimatoso", "block_id": "s2-b04", "theme": "...", "title": "...",
   "order": 3, "version": "v1", "kbps": 48,                       # kbps opcional: sem ele usa o recomendado do relatório
   "vinculo_confirmado": true, "confirmado_por": "escuta"|"transcricao", "escuta_humana_ok": true}
"""
import argparse, json, os, re, shutil, subprocess, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = os.path.join(RAIZ, 'Repasso-Med-Site--main', 'Atual - Copia')
MATERIA = os.path.join(SITE, 'netlify', 'functions', 'materias-privadas', 'semiologia-ii.html')
LIMITE_BYTES = 30 * 1024 * 1024          # o mesmo limite do bucket (migration)
LIMITE_ENV = 3800                         # variáveis de função do Netlify somam ~4 KB
CAMPOS = ['audio_id', 'block_id', 'theme', 'title', 'duration', 'order', 'version', 'path', 'ready']


def dentro_do_repo(p):
    d = os.path.abspath(p)
    while True:
        if os.path.exists(os.path.join(d, '.git')):
            return True
        pai = os.path.dirname(d)
        if pai == d:
            return False
        d = pai


def blocos_da_materia():
    with open(MATERIA, encoding='utf-8') as f:
        return set(re.findall(r'<section[^>]*\bid="(s2-b\d+)"', f.read()))


def validar_com_o_servidor(itens):
    """Passa o JSON pelo MESMO leitor do servidor + validador do motor; devolve quantos itens ele aceita."""
    js = ("const L=require(process.argv[1]+'/netlify/functions/_audio/lib.js'),R=require(process.argv[1]+'/assets/rm-audio.js');"
          "const raw=require('fs').readFileSync(0,'utf8');process.stdout.write(String(L.lerManifesto(raw,R.validateItem).length));")
    r = subprocess.run(['node', '-e', js, SITE], input=json.dumps({'semiologia-ii': itens}), capture_output=True, text=True)
    return int(r.stdout) if r.returncode == 0 and r.stdout.strip().isdigit() else -1


def montar(relatorio, vinculos, blocos):
    erros, itens, plano = [], [], []
    por_master = {i['master']: i for i in relatorio.get('itens', [])}
    por_id = {i['id']: i for i in relatorio.get('itens', []) if i.get('id')}
    vistos_id, vistos_ord = set(), set()
    if not vinculos:
        erros.append('nenhum vínculo informado')
    for v in vinculos:
        n = v.get('master', '?')
        rel = por_id.get(v.get('id')) or por_master.get(n)
        if rel is None:
            erros.append(f'{n}: master não consta no relatorio.json'); continue
        if v.get('sha256_master') and rel.get('sha256_master') != v['sha256_master']:
            erros.append(f'{n}: SHA-256 do master no vinculos.json ≠ o do relatório (outro arquivo?)'); continue
        if v.get('vinculo_confirmado') is not True or v.get('confirmado_por') not in ('escuta', 'transcricao'):
            erros.append(f'{n}: vínculo NÃO confirmado pelo conteúdo (vinculo_confirmado=true e confirmado_por=escuta|transcricao)')
        if v.get('escuta_humana_ok') is not True:
            erros.append(f'{n}: escuta humana da cópia não aprovada (escuta_humana_ok=true)')
        if v.get('block_id') not in blocos:
            erros.append(f"{n}: block_id {v.get('block_id')!r} não existe na matéria")
        if not v.get('kbps') and rel.get('recomendado_aprovado') is False:
            erros.append(f'{n}: nenhuma cópia passou os critérios objetivos; informe "kbps" explicitamente só depois de ouvir as amostras'); continue
        kb = v.get('kbps') or rel.get('recomendado_kbps')
        c = next((x for x in rel['copias'] if x['kbps_alvo'] == kb), None)
        if c is None:
            erros.append(f'{n}: não há cópia de {kb} kbps no relatório'); continue
        if not c.get('decodifica_sem_erros') or not c.get('faststart'):
            erros.append(f'{n}: a cópia de {kb} kbps não decodifica limpa ou não tem faststart')
        dur = (c.get('info') or {}).get('duracao_s')
        if not dur or dur <= 0:
            erros.append(f'{n}: duração da cópia ausente no relatório'); continue
        if c['tamanho_mb'] * 1048576 > LIMITE_BYTES:
            erros.append(f'{n}: cópia de {c["tamanho_mb"]} MB passa de 30 MB (limite do bucket)')
        if v.get('audio_id') in vistos_id: erros.append(f"{n}: audio_id repetido {v.get('audio_id')}")
        if v.get('order') in vistos_ord: erros.append(f"{n}: order repetido {v.get('order')}")
        vistos_id.add(v.get('audio_id')); vistos_ord.add(v.get('order'))
        item = {'audio_id': v.get('audio_id'), 'block_id': v.get('block_id'), 'theme': v.get('theme'), 'title': v.get('title'),
                'duration': int(round(dur)), 'order': v.get('order'), 'version': v.get('version', 'v1'),
                'path': f"semiologia-ii/{v.get('audio_id')}.m4a", 'ready': True}
        itens.append(item)
        plano.append({'derivado': c['arquivo'], 'kbps': kb, 'path': item['path'], 'tamanho_mb': c['tamanho_mb'], 'duration': item['duration']})
    if not erros:
        env = json.dumps({'semiologia-ii': itens}, ensure_ascii=False, separators=(',', ':'))
        if len(env.encode('utf-8')) > LIMITE_ENV:
            erros.append(f'manifesto com {len(env.encode("utf-8"))} bytes passa do limite seguro de {LIMITE_ENV} (variável do Netlify)')
        elif shutil.which('node') is None:
            erros.append('Node.js não encontrado: ele roda o MESMO leitor do servidor para validar o manifesto. Instale o Node.js LTS (nodejs.org), reabra o PowerShell e rode de novo; nada foi enviado.')
        elif validar_com_o_servidor(itens) != len(itens):
            erros.append('o leitor do servidor/validador do motor recusou algum item (campo inválido, texto parecido com URL/arquivo etc.)')
    return erros, itens, plano


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--relatorio', required=True); ap.add_argument('--vinculos', required=True); ap.add_argument('--saida', required=True)
    a = ap.parse_args(argv)
    if dentro_do_repo(a.saida):
        sys.exit('RECUSADO: a saída está dentro de um repositório git. Use uma pasta fora do repositório.')
    with open(a.relatorio, encoding='utf-8') as f: relatorio = json.load(f)
    with open(a.vinculos, encoding='utf-8') as f: vinculos = json.load(f)
    erros, itens, plano = montar(relatorio, vinculos, blocos_da_materia())
    if erros:
        print('MANIFESTO NÃO GERADO (falha fechada):'); [print(' - ' + e) for e in erros]
        return 2
    os.makedirs(a.saida, exist_ok=True)
    env = json.dumps({'semiologia-ii': itens}, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(a.saida, 'manifesto.json'), 'w', encoding='utf-8') as f: f.write(env + '\n')
    linhas = ['# Plano de upload (candidato — NADA foi enviado)', '', '| Arquivo derivado | kbps | Enviar como (path no bucket `audiobooks`) | MB | duração (s) |', '|---|---|---|---|---|']
    linhas += [f"| `{p['derivado']}` | {p['kbps']} | `{p['path']}` | {p['tamanho_mb']} | {p['duration']} |" for p in plano]
    with open(os.path.join(a.saida, 'plano-upload.md'), 'w', encoding='utf-8') as f: f.write('\n'.join(linhas) + '\n')
    print(f'OK: {len(itens)} itens; {len(env.encode("utf-8"))} bytes. Escrito em {a.saida} (manifesto.json = valor candidato de RM_AUDIO_MANIFEST; variável NÃO definida).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
