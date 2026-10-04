#!/usr/bin/env python3
"""Gera o PACOTE DE RETORNO (pequeno) de uma execução de `processar_masters.py`: relatórios, vínculos, inventário e transcrições — NUNCA masters nem derivados completos.

  python3 tools/audio/empacotar_retorno.py --execucao ~/audiobooks-trabalho/execucao-20261004T120000.000000Z            # sem áudio algum
  python3 tools/audio/empacotar_retorno.py --execucao <pasta> --com-amostras                                               # + trechos curtos de escuta (~25 s cada)

O ZIP vai ao lado da pasta da execução (nunca dentro dela, nunca num repositório git). Só entram arquivos de uma LISTA FIXA de nomes; qualquer outro .m4a é ignorado.
Ao final imprime o tamanho REAL medido do ZIP. Nada é enviado a lugar nenhum.
"""
import argparse, os, sys, zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_audiobooks as P

FIXOS = ['RELATORIO-REAL.md', 'vinculos-evidencia.json', 'vinculos.json', 'inventario.json', os.path.join('tratados', 'relatorio.md'), os.path.join('tratados', 'relatorio.json')]
TEXTO = ('.json', '.txt')


def selecionar(exec_dir, com_amostras):
    """Lista (caminho_absoluto, nome_no_zip). Lista fixa + transcricoes/*.json|*.txt (+ tratados/amostras/*.m4a só com a opção); symlinks são ignorados."""
    sel = []
    for rel in FIXOS:
        p = os.path.join(exec_dir, rel)
        if os.path.isfile(p) and not os.path.islink(p):
            sel.append((p, rel.replace(os.sep, '/')))
    tr = os.path.join(exec_dir, 'transcricoes')
    if os.path.isdir(tr):
        for f in sorted(os.listdir(tr)):
            p = os.path.join(tr, f)
            if f.endswith(TEXTO) and os.path.isfile(p) and not os.path.islink(p):
                sel.append((p, 'transcricoes/' + f))
    if com_amostras:
        am = os.path.join(exec_dir, 'tratados', 'amostras')
        if os.path.isdir(am):
            for f in sorted(os.listdir(am)):
                p = os.path.join(am, f)
                if f.lower().endswith('.m4a') and os.path.isfile(p) and not os.path.islink(p):
                    sel.append((p, 'amostras/' + f))
    return sel


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--execucao', required=True, help='pasta execucao-<UTC> criada por processar_masters.py')
    ap.add_argument('--com-amostras', action='store_true', help='inclui os trechos curtos de escuta (tratados/amostras/*.m4a)')
    ap.add_argument('--saida', help='caminho do ZIP (padrão: <pasta da execução>-retorno.zip, ao lado dela)')
    a = ap.parse_args(argv)
    ex = P._real(a.execucao)
    if not os.path.isfile(os.path.join(ex, 'RELATORIO-REAL.md')):
        sys.exit(f'ERRO: {ex} não parece uma execução concluída (falta RELATORIO-REAL.md). Rode o processamento até o fim.')
    zip_path = P._real(a.saida) if a.saida else ex.rstrip(os.sep) + '-retorno.zip'
    if P._dentro(zip_path, ex):
        sys.exit('RECUSADO: o ZIP não pode ficar dentro da pasta da execução.')
    if P.dentro_do_repo(zip_path):
        sys.exit('RECUSADO: o ZIP não pode ficar dentro de um repositório git.')
    if os.path.exists(zip_path):
        sys.exit(f'ERRO: já existe {zip_path}; não sobrescrevo. Apague-o ou use --saida.')
    sel = selecionar(ex, a.com_amostras)
    if not any(n == 'RELATORIO-REAL.md' for _, n in sel):
        sys.exit('ERRO: nada para empacotar.')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for p, n in sel:
            z.write(p, n)
    tam = os.path.getsize(zip_path)
    print(f'Pacote de retorno: {zip_path}\n  {len(sel)} arquivo(s) · {tam} B ({tam / 1048576:.2f} MB) — tamanho REAL medido. Sem masters e sem derivados completos' + ('; com amostras de escuta.' if a.com_amostras else '; sem amostras de áudio.'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
