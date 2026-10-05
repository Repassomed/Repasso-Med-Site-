#!/usr/bin/env python3
"""Registra a SUA decisão (depois de ouvir as amostras) no `vinculos.json` de uma execução: qual bloco da matéria cada áudio cobre e que a escuta foi aprovada.

  python tools/audio/aprovar_vinculos.py --execucao <pasta execucao-…> --audio <id ou parte do nome> --bloco s2-b03 --escutei [--titulo "…"] [--audio-id s2-b03-epoc] [--kbps 48] [--ordem 2]

Só ESTE comando (executado por você) marca `vinculo_confirmado` e `escuta_humana_ok` como true, e só com `--escutei`. Sem `--escutei` grava apenas a proposta (bloco/título) com as duas marcas em false.
Valida: áudio único e existente, bloco existente na matéria, `audio_id` válido e não repetido, `order` não repetido, `kbps` entre as cópias do relatório. Não envia nada, não toca no Supabase."""
import argparse, datetime, json, os, re, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_audiobooks as P

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MATERIA = os.path.join(RAIZ, 'Repasso-Med-Site--main', 'Atual - Copia', 'netlify', 'functions', 'materias-privadas', 'semiologia-ii.html')
ID_RE = re.compile(r'^[a-z0-9][a-z0-9._-]{0,79}$', re.I)


def titulos(materia):
    with open(materia, encoding='utf-8') as f:
        h = f.read()
    return {m.group(1): re.sub(r'<[^>]+>', '', m.group(2)).strip() for m in re.finditer(r'<section[^>]*\bid="(s2-b\d+)"[^>]*>.*?<h2[^>]*>(.*?)</h2>', h, flags=re.S)}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--execucao', required=True); ap.add_argument('--audio', required=True); ap.add_argument('--bloco', required=True)
    ap.add_argument('--titulo'); ap.add_argument('--audio-id', dest='audio_id'); ap.add_argument('--kbps', type=int); ap.add_argument('--ordem', type=int)
    ap.add_argument('--escutei', action='store_true', help='confirma que VOCÊ ouviu as amostras e aprova o áudio'); ap.add_argument('--materia', default=MATERIA)
    a = ap.parse_args(argv)
    caminho = os.path.join(a.execucao, 'vinculos.json')
    if not os.path.isfile(caminho) or not os.path.isfile(os.path.join(a.execucao, 'tratados', 'relatorio.json')):
        print('ERRO: pasta de execução incompleta (falta vinculos.json ou tratados/relatorio.json).'); return 2
    with open(caminho, encoding='utf-8') as f: v = json.load(f)
    with open(os.path.join(a.execucao, 'tratados', 'relatorio.json'), encoding='utf-8') as f: rel = json.load(f)
    achados = [x for x in v if a.audio == x['id'] or a.audio.lower() in (x['id'] + ' ' + x['master']).lower()]
    exato = [x for x in achados if x['id'] == a.audio]
    achados = exato or achados
    if len(achados) != 1:
        print(f'ERRO: "{a.audio}" corresponde a {len(achados)} áudios; use o id completo. Ids: ' + ', '.join(x['id'] for x in v)); return 2
    it = achados[0]; tit = titulos(a.materia)
    if a.bloco not in tit:
        print(f'ERRO: bloco {a.bloco!r} não existe na matéria. Blocos: ' + ', '.join(sorted(tit))); return 2
    copias = next(r for r in rel['itens'] if r['id'] == it['id'])['copias']
    if a.kbps is not None and a.kbps not in [c['kbps_alvo'] for c in copias]:
        print(f'ERRO: não há cópia de {a.kbps} kbps; opções: ' + ', '.join(str(c['kbps_alvo']) for c in copias)); return 2
    base = re.sub(r'\W*\d+\W*$', '', it['master'].rsplit('.', 1)[0])                 # tira o « (1)» do nome
    base = re.sub(r'[^a-z0-9]+', '-', base.lower()).strip('-')[:40]
    audio_id = a.audio_id or f'{a.bloco}-{base}'
    if not ID_RE.match(audio_id):
        print('ERRO: audio_id inválido (letras, números, ponto, hífen, sublinhado; até 80).'); return 2
    ordem = a.ordem or it.get('order')
    for o in v:
        if o is not it and (o.get('audio_id') == audio_id or (o.get('vinculo_confirmado') and o.get('order') == ordem)):
            print(f"ERRO: audio_id ou ordem já usados por {o['id']}. Use --audio-id/--ordem."); return 2
    it.update(block_id=a.bloco, theme=tit[a.bloco], title=a.titulo or f'Audiobook · {tit[a.bloco]}', audio_id=audio_id, order=ordem)
    if a.kbps is not None:
        it['kbps'] = a.kbps
    it.update(vinculo_confirmado=bool(a.escutei), confirmado_por='escuta' if a.escutei else it.get('confirmado_por', 'escuta'), escuta_humana_ok=bool(a.escutei))
    if a.escutei:
        it['aprovado_em'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    fd, tmp = tempfile.mkstemp(dir=a.execucao, suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8') as f: json.dump(v, f, ensure_ascii=False, indent=2)
    os.replace(tmp, caminho)
    print(f"{it['master']} → {a.bloco} ({tit[a.bloco]}) · audio_id={audio_id} · {'APROVADO por escuta' if a.escutei else 'só proposta (sem --escutei)'}")
    pend = [x['master'] for x in v if not x.get('escuta_humana_ok')]
    print('ainda sem aprovação: ' + (', '.join(pend) if pend else 'nenhum — pode rodar a publicação (publicar_lote).'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
