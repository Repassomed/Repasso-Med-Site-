#!/usr/bin/env python3
"""Pipeline REAL dos masters de Semiología II: da PASTA (ou de um ZIP, opcional) ao relatório de vínculo pelo CONTEÚDO. Tudo FORA do repositório; os masters só são lidos.

  python3 tools/audio/processar_masters.py --pasta ~/masters --trabalho ~/audiobooks-trabalho --modelo ~/asr/sherpa-onnx-whisper-small
  python3 tools/audio/processar_masters.py --zip masters.zip --trabalho ~/audiobooks-trabalho --modelo ...        # ZIP é opcional (pode-se usar os dois)

Cada execução cria `<trabalho>/execucao-<UTC>/` NOVA (nenhum resíduo de execução anterior entra no lote). Entrada: uma lista ÚNICA, em qualquer subpasta; nomes com « (1)» são aceitos
(o nome lógico é só rastreio; **nunca** decide o vínculo); mesmo nome com conteúdo diferente = erro; entrada vazia = erro. Etapas: inventário (SHA-256, tamanho, nomes) → inspeção →
`preparar` (reaproveita o áudio já comprimido quando conforme; reencoda só com benefício demonstrável; amostras 1×/2×/2,5×) → `transcrever` (ASR local; AMOSTRADA por padrão,
`--completo` transcreve tudo) → vínculo pelo conteúdo com timestamps e termos distintivos → `RELATORIO-REAL.md`, `vinculos-evidencia.json`, `vinculos.json` RASCUNHO
(`escuta_humana_ok` sempre false; `vinculo_confirmado` só true com evidência forte e consistente; dúvida ⇒ REVISÃO HUMANA NECESSÁRIA).
"""
import argparse, datetime, json, math, os, re, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_audiobooks as P
import transcrever as T

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MATERIA = os.path.join(RAIZ, 'Repasso-Med-Site--main', 'Atual - Copia', 'netlify', 'functions', 'materias-privadas', 'semiologia-ii.html')
ESPERADOS = ['Semio_-_Motivo_de_Consulta.m4a', 'Semio_EPOC.m4a', 'Semio - 3 Sindrome Parenquimatoso.m4a', 'Semio_-_4_sindrome_pleual.m4a']
CAND = {'Semio_-_Motivo_de_Consulta.m4a': 's2-b01', 'Semio_EPOC.m4a': 's2-b03', 'Semio - 3 Sindrome Parenquimatoso.m4a': 's2-b04', 'Semio_-_4_sindrome_pleual.m4a': 's2-b05'}


def extrair(zip_path, destino):
    """Extrai o zip (recusa caminho fora da pasta). Devolve {nome: caminho} só dos .m4a — usado nos testes; o lote real usa P.descobrir(destino)."""
    os.makedirs(destino, exist_ok=True)
    base = os.path.abspath(destino)
    with zipfile.ZipFile(zip_path) as z:
        for n in z.namelist():
            alvo = os.path.abspath(os.path.join(base, n))
            if alvo != base and not alvo.startswith(base + os.sep):
                sys.exit(f'RECUSADO: caminho fora da pasta no zip: {n}')
        z.extractall(base)
    achados = {}
    for raiz, _, arqs in os.walk(base):
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


def termos_distintivos(blocos, bid, n=40):
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


def evidencia(janelas, blocos):
    """Vínculo no texto inteiro + votos por blocos de 5 min + janelas com timestamps que sustentam o bloco proposto (termos distintivos encontrados)."""
    todo = ' '.join(j['texto'] for j in janelas if j['texto'])
    inteiro = P.vincular(todo, blocos)
    grupos = {}
    for j in janelas:
        grupos.setdefault(int(j['inicio_s'] // 300), []).append(j['texto'])
    votos = {}
    for g in grupos.values():
        t = ' '.join(x for x in g if x)
        if len(t.split()) < 25:
            continue
        r = P.vincular(t, blocos)
        b = r['melhor'] if r.get('decisao') == 'candidato' else None
        votos[b] = votos.get(b, 0) + 1
    melhor = inteiro['melhor'] if inteiro.get('decisao') == 'candidato' else None
    trechos, achados = [], []
    if melhor:
        termos = set(termos_distintivos(blocos, melhor))
        for j in janelas:
            ach = sorted(termos & set(P.tokens(j['texto'])))
            if ach:
                trechos.append({'inicio_s': j['inicio_s'], 'fim_s': j['fim_s'], 'termos': ach, 'texto': j['texto'][:220]})
        trechos.sort(key=lambda x: -len(x['termos']))
        achados = sorted({t for x in trechos for t in x['termos']})
        trechos = trechos[:6]
    return inteiro, votos, melhor, trechos, achados, todo


def montar_lote(pastas, zip_path, exec_dir):
    """Entrada ÚNICA do lote: todas as pastas (e o zip extraído) numa só lista; erros claros."""
    dirs = [os.path.abspath(os.path.expanduser(p)) for p in (pastas or [])]
    if zip_path:
        dirs.append(os.path.join(exec_dir, 'zip-extraido'))
        extrair(os.path.expanduser(zip_path), dirs[-1])
    if not dirs:
        sys.exit('ERRO: informe --pasta (uma ou mais) e/ou --zip.')
    return P.descobrir(dirs)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pasta', action='append'); ap.add_argument('--zip'); ap.add_argument('--trabalho', required=True); ap.add_argument('--modelo', required=True)
    ap.add_argument('--janela', type=T.positivo, default=28.0); ap.add_argument('--passo', type=T.positivo, default=120.0)
    ap.add_argument('--completo', action='store_true', help='transcreve o áudio INTEIRO (passo = janela); bem mais lento')
    ap.add_argument('--max-janelas', type=int, default=0)
    a = ap.parse_args(argv)
    if P.dentro_do_repo(a.trabalho):
        sys.exit('RECUSADO: a pasta de trabalho está dentro de um repositório git.')
    passo = a.janela if a.completo else a.passo
    W = os.path.abspath(os.path.expanduser(a.trabalho))
    exec_dir = os.path.join(W, 'execucao-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    os.makedirs(exec_dir)                                              # execução NOVA: sem resíduo
    entradas = montar_lote(a.pasta, a.zip, exec_dir)
    saida, trans = os.path.join(exec_dir, 'tratados'), os.path.join(exec_dir, 'transcricoes')
    inv = [{k: e[k] for k in ('id', 'nome_original', 'nome_logico', 'relpath', 'caminho', 'tamanho', 'sha256', 'duplicatas_identicas')} for e in entradas]
    for i in inv:
        i['esperado_pelo_nome'] = i['nome_logico'] in ESPERADOS
    with open(os.path.join(exec_dir, 'inventario.json'), 'w', encoding='utf-8') as f:
        json.dump(inv, f, ensure_ascii=False, indent=1)
    print('entradas:', [(e['nome_original'], e['tamanho'], e['sha256'][:12]) for e in entradas])
    print('faltam (pelo nome lógico):', [n for n in ESPERADOS if n not in {e['nome_logico'] for e in entradas}], '| extras:', [e['nome_original'] for e in entradas if e['nome_logico'] not in ESPERADOS])
    print('== inspeção ==')
    for e in entradas:
        i = P.probe(e['caminho']); print(' ', e['nome_original'], f"{e['tamanho']} B · {P.fmt_dur(i['duracao_s'])} · {i['codec']} {i['perfil']} · {i['taxa_hz']} Hz · {i['layout']} · {i['bitrate_kbps']} kb/s · faststart={P.faststart(e['caminho'])}")
    print('== preparar ==')
    rel = P.cmd_preparar(argparse.Namespace(
        origem=None, entradas=entradas, saida=saida, ar=32000, stoi_min=P.STOI_MIN, janelas=10, velocidades=','.join(f'{v:g}' for v in P.VELOCIDADES), janelas_vel=5, amostras=3, janela_amostra=25.0,
        stoi_min_vel=P.STOI_MIN_VEL, limpar=False, politica='auto'))
    print('== transcrever ==')
    rec = T.carregar(os.path.expanduser(a.modelo), 4)
    blocos = P.blocos_da_materia(MATERIA); tit = titulos_blocos()
    por_id = {i['id']: i for i in rel['itens']}
    os.makedirs(trans)
    evid, rascunho, linhas = {}, [], []
    linhas += ['# Relatório REAL — Audiobooks Semiología II', '', f'Execução: `{os.path.basename(exec_dir)}` · entradas: {len(entradas)} · faltam (pelo nome): '
               f"{[n for n in ESPERADOS if n not in {e['nome_logico'] for e in entradas}] or 'nenhum'}", '',
               '| Arquivo (original) | SHA-256 | Tamanho | Duração | Codec/canais/bitrate | Ação sobre o derivado | Derivado | Tamanho final | Cobertura da transcrição | Vínculo proposto (conteúdo) | Votos 5 min | Candidato pelo nome |',
               '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for ordem, e in enumerate(entradas, 1):
        it = por_id[e['id']]                                                         # master ↔ relatório ↔ derivados ↔ transcrição: pelo id (slug+sha8)
        assert it['sha256_master'] == e['sha256']
        info, jan = T.transcrever_master(rec, e['caminho'], a.janela, passo, a.max_janelas)
        cob = T.escreve_transcricao(trans, e, info, jan, a.janela, passo)
        inteiro, votos, melhor, trechos, achados, todo = evidencia(jan, blocos)
        total = sum(votos.values()); forte = bool(melhor) and total >= 3 and votos.get(melhor, 0) / total >= 0.6
        evid[e['id']] = {'arquivo': e['nome_original'], 'sha256': e['sha256'], 'duracao_s': info['duracao_s'], 'cobertura_transcricao_pct': cob, 'transcricao_amostrada': cob < 99.0,
                         'vinculo_texto_inteiro': inteiro, 'votos_por_5min': votos, 'bloco_proposto': melhor, 'consistente': forte, 'termos_distintivos_encontrados': achados, 'trechos_com_timestamp': trechos,
                         'candidato_pelo_nome': CAND.get(e['nome_logico']), 'acao_derivado': it.get('acao_derivado')}
        c = it['copias'][0] if it['copias'] else {}
        linhas.append(f"| {e['nome_original']} | `{e['sha256'][:12]}…` | {e['tamanho']} B | {P.fmt_dur(info['duracao_s'])} | {it['master_info'].get('codec')} {it['master_info'].get('perfil')} {it['master_info'].get('layout')} "
                      f"{it['master_info'].get('bitrate_kbps')} kb/s | {it['acao_derivado']['acao']} | `{c.get('arquivo')}` | {c.get('tamanho_mb')} MB | {cob} %{' (AMOSTRADA)' if cob < 99.0 else ''} | "
                      f"{(melhor + ' — ' + tit.get(melhor, '')) if melhor else '**REVISÃO HUMANA NECESSÁRIA**'}{' (consistente)' if forte else ''} | {votos} | {CAND.get(e['nome_logico'])} |")
        rascunho.append({'id': e['id'], 'master': e['nome_original'], 'sha256_master': e['sha256'], 'audio_id': 'PROPUESTA-' + e['id'], 'block_id': melhor or 'CONFIRMAR', 'theme': tit.get(melhor, 'PROPUESTA'),
                         'title': 'PROPUESTA', 'order': ordem, 'version': 'v1', 'kbps': it.get('recomendado_kbps') or 64, 'vinculo_confirmado': bool(forte), 'confirmado_por': 'transcricao', 'escuta_humana_ok': False})
        print(e['nome_original'], '→', melhor, '| consistente' if forte else '| REVISÃO HUMANA', '| cobertura', cob, '%')
    with open(os.path.join(exec_dir, 'vinculos-evidencia.json'), 'w', encoding='utf-8') as f:
        json.dump(evid, f, ensure_ascii=False, indent=1)
    with open(os.path.join(exec_dir, 'vinculos.json'), 'w', encoding='utf-8') as f:
        json.dump(rascunho, f, ensure_ascii=False, indent=2)
    with open(os.path.join(exec_dir, 'RELATORIO-REAL.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas) + '\n\n> «Consistente» = bloco candidato no texto inteiro **e** ≥ 60 % dos blocos de 5 min concordam. Transcrição **amostrada** ≠ integral (veja a cobertura). `escuta_humana_ok` é sempre false: a escuta é humana.\n')
    print('Pronto:', exec_dir)
    return 0


if __name__ == '__main__':
    sys.exit(main())
