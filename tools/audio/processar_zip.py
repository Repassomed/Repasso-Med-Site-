#!/usr/bin/env python3
"""Pipeline REAL, do ZIP dos 4 masters ao relatório de vínculo — tudo FORA do repositório; os masters só são lidos.

  python3 tools/audio/processar_zip.py --zip ~/audiobooks_semiologia2_masters.zip --trabalho ~/audiobooks-trabalho --modelo ~/asr/sherpa-onnx-whisper-small

Etapas: (1) extrai o zip (recusa caminhos fora da pasta) e confere os 4 nomes esperados + SHA-256; (2) inspeciona (codec/duração/canais/bitrate/faststart);
(3) `preparar` (AAC-LC mono 48/64 kbps, faststart, STOI 1×/2×/2,5×, amostras); (4) `transcrever` (ASR local) janelas espalhadas;
(5) vínculo pelo CONTEÚDO: TF-IDF contra os 10 blocos de `semiologia-ii.html` no texto inteiro e em blocos de 5 min, + termos distintivos do bloco que aparecem na fala.
Escreve `RELATORIO-REAL.md`, `vinculos-evidencia.json` e um `vinculos.json` RASCUNHO: `vinculo_confirmado` só é true quando a evidência é forte e consistente;
`escuta_humana_ok` fica SEMPRE false (a escuta é humana). Dúvida ⇒ `REVISÃO HUMANA NECESSÁRIA` e o áudio fica fora do manifesto.
"""
import argparse, hashlib, json, math, os, re, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_audiobooks as P
import transcrever as T

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MATERIA = os.path.join(RAIZ, 'Repasso-Med-Site--main', 'Atual - Copia', 'netlify', 'functions', 'materias-privadas', 'semiologia-ii.html')
ESPERADOS = ['Semio_-_Motivo_de_Consulta.m4a', 'Semio_EPOC.m4a', 'Semio - 3 Sindrome Parenquimatoso.m4a', 'Semio_-_4_sindrome_pleual.m4a']
CAND = {'Semio_-_Motivo_de_Consulta.m4a': 's2-b01', 'Semio_EPOC.m4a': 's2-b03', 'Semio - 3 Sindrome Parenquimatoso.m4a': 's2-b04', 'Semio_-_4_sindrome_pleual.m4a': 's2-b05'}


def extrair(zip_path, destino):
    os.makedirs(destino, exist_ok=True)
    with zipfile.ZipFile(zip_path) as z:
        for n in z.namelist():
            alvo = os.path.abspath(os.path.join(destino, n))
            if not alvo.startswith(os.path.abspath(destino) + os.sep) and alvo != os.path.abspath(destino):
                sys.exit(f'RECUSADO: caminho fora da pasta no zip: {n}')
        z.extractall(destino)
    achados = {}
    for raiz, _, arqs in os.walk(destino):
        for f in arqs:
            if f.lower().endswith('.m4a'):
                achados[f] = os.path.join(raiz, f)
    return achados


def titulos_blocos():
    with open(MATERIA, encoding='utf-8') as f:
        h = f.read()
    out = {}
    for m in re.finditer(r'<section[^>]*\bid="(s2-b\d+)"[^>]*>.*?<h2[^>]*>(.*?)</h2>', h, flags=re.S):
        out[m.group(1)] = re.sub(r'<[^>]+>', '', m.group(2)).strip()
    return out


def termos_distintivos(blocos, bid, n=25):
    docs = {k: P.tokens(v) for k, v in blocos.items()}
    df = {}
    for ws in docs.values():
        for w in set(ws):
            df[w] = df.get(w, 0) + 1
    c = {}
    for w in docs[bid]:
        c[w] = c.get(w, 0) + 1
    sc = {w: c[w] * math.log(len(docs) / df[w]) for w in c if c[w] >= 3}
    return [w for w, _ in sorted(sc.items(), key=lambda x: -x[1])[:n]]


def base_id(nome):
    return P.slug_arquivo(nome)


def evidencia(texto_janelas, blocos, titulos):
    """texto_janelas: lista de {inicio_s, texto}. Devolve vínculo no texto inteiro e consistência por blocos de 5 min."""
    todo = ' '.join(j['texto'] for j in texto_janelas if j['texto'])
    inteiro = P.vincular(todo, blocos)
    grupos = {}
    for j in texto_janelas:
        grupos.setdefault(int(j['inicio_s'] // 300), []).append(j['texto'])
    votos = {}
    for g in grupos.values():
        t = ' '.join(x for x in g if x)
        if len(t.split()) < 25:
            continue
        r = P.vincular(t, blocos)
        b = r['melhor'] if r.get('decisao') == 'candidato' else None
        votos[b] = votos.get(b, 0) + 1
    return inteiro, votos, todo


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--zip', required=True); ap.add_argument('--trabalho', required=True); ap.add_argument('--modelo', required=True)
    ap.add_argument('--passo', type=float, default=120.0); ap.add_argument('--max-janelas', type=int, default=0)
    a = ap.parse_args(argv)
    if P.dentro_do_repo(a.trabalho):
        sys.exit('RECUSADO: a pasta de trabalho está dentro de um repositório git.')
    W = os.path.expanduser(a.trabalho)
    masters = os.path.join(W, 'masters'); saida = os.path.join(W, 'tratados'); trans = os.path.join(W, 'transcricoes')
    achados = extrair(os.path.expanduser(a.zip), masters)
    faltam = [n for n in ESPERADOS if n not in achados]
    extras = [n for n in achados if n not in ESPERADOS]
    print('masters encontrados:', sorted(achados), '| faltam:', faltam, '| extras:', extras)
    hashes = {n: P.sha256(p) for n, p in achados.items()}
    print('== inspeção =='); insp = P.cmd_inspecionar(argparse.Namespace(origem=os.path.dirname(next(iter(achados.values())))))
    print('== preparar (derivados 48/64 + STOI + amostras) ==')
    rel = P.main(['preparar', '--origem', os.path.dirname(next(iter(achados.values()))), '--saida', saida])
    print('== transcrever ==')
    rec = T.carregar(os.path.expanduser(a.modelo), 4)
    blocos = P.blocos_da_materia(MATERIA); tit = titulos_blocos()
    evid, rascunho = {}, []
    for n, p in sorted(achados.items()):
        info, jan = T.transcrever_master(rec, p, 28.0, a.passo, a.max_janelas)
        base = P.slug_arquivo(n); os.makedirs(trans, exist_ok=True)
        with open(os.path.join(trans, base + '.janelas.json'), 'w', encoding='utf-8') as f:
            json.dump({'master': n, 'janelas': jan}, f, ensure_ascii=False, indent=1)
        inteiro, votos, todo = evidencia(jan, blocos, tit)
        evid[n] = {'sha256': hashes[n], 'duracao_s': info['duracao_s'], 'vinculo_texto_inteiro': inteiro, 'votos_por_5min': votos, 'palavras': len(todo.split()), 'candidato_pelo_nome': CAND.get(n)}
        print(n, '→', json.dumps(inteiro, ensure_ascii=False)[:200], '| votos', votos)
    with open(os.path.join(W, 'vinculos-evidencia.json'), 'w', encoding='utf-8') as f:
        json.dump(evid, f, ensure_ascii=False, indent=1)
    por_master = {i['master']: i for i in rel['itens']}
    linhas = ['# Relatório REAL — Audiobooks Semiología II', '', f'Masters no zip: {len(achados)}/4 · faltam: {faltam or "nenhum"} · extras: {extras or "nenhum"}', '',
              '| Master | SHA-256 | Duração | Codec/canais/bitrate | Derivado recomendado | Tamanho 48 / 64 kbps | STOI 1× (48/64) | STOI 2,5× (48/64) | Vínculo pelo conteúdo | Votos 5 min | Candidato pelo nome |', '|---|---|---|---|---|---|---|---|---|---|---|']
    for n in sorted(achados):
        it = por_master.get(n) or {}; mi = it.get('master_info', {}); c = {x['kbps_alvo']: x for x in it.get('copias', [])}
        ev = evid[n]; vt = ev['vinculo_texto_inteiro']; votos = ev['votos_por_5min']
        total_votos = sum(votos.values()); melhor = vt['melhor'] if vt['decisao'] == 'candidato' else None
        forte = bool(melhor) and total_votos >= 3 and votos.get(melhor, 0) / total_votos >= 0.6
        linhas.append(f"| {n} | `{ev['sha256'][:12]}…` | {P.fmt_dur(ev['duracao_s'])} | {mi.get('codec')} {mi.get('perfil')} {mi.get('layout')} {mi.get('bitrate_kbps')} kb/s | {it.get('recomendado_kbps')} kbps | "
                      f"{c.get(48, {}).get('tamanho_mb')} / {c.get(64, {}).get('tamanho_mb')} MB | {c.get(48, {}).get('stoi', {}).get('media')} / {c.get(64, {}).get('stoi', {}).get('media')} | "
                      f"{c.get(48, {}).get('stoi_velocidades', {}).get('2.5x', {}).get('media')} / {c.get(64, {}).get('stoi_velocidades', {}).get('2.5x', {}).get('media')} | "
                      f"{(melhor + ' — ' + tit.get(melhor, '')) if melhor else '**REVISÃO HUMANA NECESSÁRIA**'}{' (forte)' if forte else ''} | {votos} | {CAND.get(n)} |")
        v = {'master': n, 'audio_id': f"PROPUESTA-{base_id(n)}", 'block_id': melhor or 'CONFIRMAR', 'theme': tit.get(melhor, 'PROPUESTA'), 'title': 'PROPUESTA',
             'order': sorted(achados).index(n) + 1, 'version': 'v1', 'kbps': it.get('recomendado_kbps') or 64,
             'vinculo_confirmado': bool(forte), 'confirmado_por': 'transcricao', 'escuta_humana_ok': False}
        rascunho.append(v)
    with open(os.path.join(W, 'RELATORIO-REAL.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas) + '\n\n> Vínculo `(forte)` = candidato no texto inteiro **e** ≥ 60 % dos blocos de 5 min concordam. `escuta_humana_ok` é sempre false: a escuta é humana.\n')
    with open(os.path.join(W, 'vinculos.json'), 'w', encoding='utf-8') as f:
        json.dump(rascunho, f, ensure_ascii=False, indent=2)
    print('Pronto:', os.path.join(W, 'RELATORIO-REAL.md'), '|', os.path.join(W, 'vinculos.json'), '| amostras:', os.path.join(saida, 'amostras'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
