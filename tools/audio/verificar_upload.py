#!/usr/bin/env python3
"""Confere os ARQUIVOS que serão enviados ao bucket contra o manifesto candidato — ANTES do upload (nada é enviado, nada é alterado).

  python3 tools/audio/verificar_upload.py --manifesto ~/audiobooks-tratados/manifesto/manifesto.json --pasta ~/audiobooks-tratados \
      --plano ~/audiobooks-tratados/manifesto/plano-upload.md

Para cada item do manifesto confere, no arquivo derivado correspondente (nome em `plano-upload.md`): existe e NÃO é um master; AAC-LC mono; faststart; decodifica sem erro;
tamanho ≤ 30 MB (limite do bucket); duração = a do manifesto (± 1,5 s); o `path` é `semiologia-ii/<audio_id>.m4a`. Falha FECHADA: qualquer divergência ⇒ código 1 e nada é aprovado.
Imprime SHA-256 de cada derivado (para o upload e para o registro). Sai com 0 só se TODOS os itens passarem."""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_audiobooks as P

LIMITE = 30 * 1024 * 1024


def ler_plano(caminho):
    """{path no bucket: nome do arquivo derivado} a partir da tabela `plano-upload.md` gerada por montar_manifesto.py."""
    m = {}
    with open(caminho, encoding='utf-8') as f:
        for ln in f:
            c = re.match(r'^\|\s*`([^`]+)`\s*\|\s*\d+\s*\|\s*`([^`]+)`\s*\|', ln)
            if c:
                m[c.group(2)] = c.group(1)
    return m


def verificar(manifesto, pasta, plano):
    itens = manifesto.get('semiologia-ii') or []
    erros, ok, linhas = [], [], []
    if not itens:
        erros.append('manifesto vazio: nada a verificar (e nada deve ser enviado)')
    for it in itens:
        aid, path = it.get('audio_id'), it.get('path')
        pre = f'{aid}: '
        if path != f'semiologia-ii/{aid}.m4a':
            erros.append(pre + f'path inesperado {path!r}'); continue
        nome = plano.get(path)
        if not nome:
            erros.append(pre + 'path ausente do plano-upload.md'); continue
        f = os.path.join(pasta, nome)
        if not os.path.isfile(f):
            erros.append(pre + f'arquivo derivado não encontrado: {nome}'); continue
        info = P.probe(f)
        if info.get('codec') != 'aac' or info.get('perfil') != 'LC':
            erros.append(pre + f"codec/perfil {info.get('codec')}/{info.get('perfil')} (esperado aac/LC)")
        if info.get('canais') != 1:
            erros.append(pre + f"canais={info.get('canais')} (esperado mono)")
        if not P.faststart(f):
            erros.append(pre + 'sem faststart (moov depois de mdat): o Safari/iOS não busca posição')
        dec, err = P.decodifica_ok(f)
        if not dec:
            erros.append(pre + 'não decodifica sem erro: ' + err)
        tam = os.path.getsize(f)
        if tam > LIMITE:
            erros.append(pre + f'{tam} B passa de 30 MB (limite do bucket)')
        dur = info.get('duracao_s')
        if dur is None or abs(dur - it.get('duration', -999)) > 1.5:
            erros.append(pre + f"duração do arquivo {dur} s ≠ manifesto {it.get('duration')} s")
        if os.path.basename(f).lower().startswith(('master', 'original')):
            erros.append(pre + 'o arquivo parece um MASTER: só derivados sobem')
        linhas.append(f'{path}  <-  {nome}  {tam} B  {dur and round(dur)} s  sha256={P.sha256(f)}')
        ok.append(aid)
    return erros, ok, linhas


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--manifesto', required=True); ap.add_argument('--pasta', required=True); ap.add_argument('--plano', required=True)
    a = ap.parse_args(argv)
    if P.dentro_do_repo(a.pasta):
        print('RECUSADO: a pasta dos derivados está dentro de um repositório git (áudio não entra no Git).'); return 1
    with open(a.manifesto, encoding='utf-8') as f:
        man = json.load(f)
    erros, ok, linhas = verificar(man, a.pasta, ler_plano(a.plano))
    for ln in linhas:
        print('  ' + ln)
    if erros:
        print('NÃO APROVADO para upload:'); [print(' - ' + e) for e in erros]
        return 1
    print(f'APROVADO para upload (conferência local; NADA foi enviado): {len(ok)} arquivo(s).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
