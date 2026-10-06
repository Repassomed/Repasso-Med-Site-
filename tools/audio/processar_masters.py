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
import argparse, datetime, importlib, json, math, os, re, shutil, sys, zipfile
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


def titulos_blocos(materia=MATERIA):
    with open(materia, encoding='utf-8') as f:
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


def copia_recomendada(it):
    """A cópia que o relatório recomenda (por nome de arquivo), nunca `copias[0]` por posição."""
    return next(c for c in it['copias'] if c['arquivo'] == it['recomendado_arquivo'])


def verifica_ambiente(modelo, materia, com_modelo=True):
    """Problemas que impedem o processamento (lista vazia = ok). Roda ANTES de qualquer trabalho pesado; não altera nada."""
    erros = []
    if sys.version_info < (3, 10):
        erros.append(f'Python {sys.version_info.major}.{sys.version_info.minor} é antigo: é preciso Python 3.10 ou mais novo')
    for m in (('numpy', 'scipy', 'soundfile', 'pystoi') + (('sherpa_onnx',) if com_modelo else ())):
        try:
            importlib.import_module(m)
        except Exception as e:
            erros.append(f'dependência ausente ou com defeito: {m} ({type(e).__name__}) — pip install sherpa-onnx imageio-ffmpeg pystoi soundfile numpy scipy')
    try:
        P.ff()
    except BaseException as e:
        erros.append(f'ffmpeg indisponível ({e}) — pip install imageio-ffmpeg ou ffmpeg no PATH')
    if com_modelo:
        erros += T.verifica_modelo(os.path.expanduser(modelo))
    if not os.path.isfile(materia):
        erros.append(f'arquivo da matéria não encontrado: {materia} — este fluxo precisa do checkout do repositório (ou indique outro caminho com --materia); a matéria é privada e não vai no pacote')
    return erros


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pasta', action='append'); ap.add_argument('--zip'); ap.add_argument('--trabalho'); ap.add_argument('--modelo', help='pasta do modelo de transcrição (só com transcrição)')
    ap.add_argument('--sem-transcricao', action='store_true', help='CAMINHO CURTO: não transcreve (sem modelo de 640 MB); o vínculo com o bloco é decidido pela escuta humana do José')
    ap.add_argument('--materia', default=MATERIA, help='semiologia-ii.html do checkout do repositório (só LIDO; a matéria é privada)')
    ap.add_argument('--verificar-ambiente', action='store_true', help='só confere Python/dependências/ffmpeg/modelo/matéria e sai (0 = ok)')
    ap.add_argument('--janela', type=T.positivo, default=28.0); ap.add_argument('--passo', type=T.positivo, default=120.0)
    ap.add_argument('--completo', action='store_true', help='transcreve o áudio INTEIRO (passo = janela); bem mais lento')
    ap.add_argument('--max-janelas', type=int, default=0)
    ap.add_argument('--original-aac', action='store_true', help='aceita AAC-LC COMO ESTÁ (qualquer canais/bitrate) se couber em 40 MiB; só reencoda o que não for AAC-LC ou passar do limite')
    a = ap.parse_args(argv)
    com_modelo = not a.sem_transcricao
    if com_modelo and not a.modelo:
        sys.exit('ERRO: informe --modelo (transcrição) ou use --sem-transcricao (o vínculo vira escuta humana).')
    erros = verifica_ambiente(a.modelo or '', a.materia, com_modelo)
    if a.verificar_ambiente:
        for e in erros:
            print('PROBLEMA:', e)
        print('AMBIENTE OK' if not erros else f'{len(erros)} problema(s) no ambiente')
        return 1 if erros else 0
    if erros:
        sys.exit('RECUSADO: ambiente incompleto, nada foi processado:\n  - ' + '\n  - '.join(erros))
    if not a.trabalho:
        sys.exit('ERRO: informe --trabalho (pasta FORA do repositório e fora das pastas de áudio).')
    if not a.pasta and not a.zip:
        sys.exit('ERRO: informe --pasta (uma ou mais) e/ou --zip.')
    if P.dentro_do_repo(a.trabalho):
        sys.exit('RECUSADO: a pasta de trabalho está dentro de um repositório git.')
    W = P._real(a.trabalho)
    for o in (a.pasta or []):                                             # trabalho e entradas não se sobrepõem: derivados/amostras nunca entram no lote seguinte
        r = P._real(o)
        if P._dentro(W, r) or P._dentro(r, W):
            sys.exit(f'RECUSADO: --trabalho ({W}) e a pasta de entrada ({r}) se sobrepõem. Use uma pasta de trabalho separada; nada foi alterado.')
    passo = a.janela if a.completo else a.passo
    exec_dir = os.path.join(W, 'execucao-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ'))
    os.makedirs(exec_dir)                                              # execução NOVA: sem resíduo, sem limpeza
    try:
        entradas = montar_lote(a.pasta, a.zip, exec_dir)
    except SystemExit:
        if not os.listdir(exec_dir):
            os.rmdir(exec_dir)                                         # só a pasta VAZIA que esta execução acabou de criar
        raise
    saida, trans = os.path.join(exec_dir, 'tratados'), os.path.join(exec_dir, 'transcricoes')
    inv = [{k: e[k] for k in ('id', 'nome_original', 'nome_logico', 'relpath', 'caminho', 'tamanho', 'sha256', 'duplicatas_identicas')} for e in entradas]
    for i in inv:
        i['esperado_pelo_nome'] = i['nome_logico'] in ESPERADOS
    with open(os.path.join(exec_dir, 'inventario.json'), 'w', encoding='utf-8') as f:
        json.dump(inv, f, ensure_ascii=False, indent=1)
    faltam = [n for n in ESPERADOS if n not in {e['nome_logico'] for e in entradas}]
    print('entradas:', [(e['nome_original'], e['tamanho'], e['sha256'][:12]) for e in entradas])
    print('faltam (pelo nome lógico):', faltam, '| extras:', [e['nome_original'] for e in entradas if e['nome_logico'] not in ESPERADOS])
    print('== inspeção ==')
    for e in entradas:
        i = P.probe(e['caminho']); print(' ', e['nome_original'], f"{e['tamanho']} B · {P.fmt_dur(i['duracao_s'])} · {i['codec']} {i['perfil']} · {i['taxa_hz']} Hz · {i['layout']} · {i['bitrate_kbps']} kb/s · faststart={P.faststart(e['caminho'])}")
    rec = T.carregar(os.path.expanduser(a.modelo), 4) if com_modelo else None      # falha cedo se o modelo não carrega
    print('== preparar ==')
    rel = P.cmd_preparar(argparse.Namespace(
        origem=None, entradas=entradas, saida=saida, ar=32000, stoi_min=P.STOI_MIN, janelas=10, velocidades=','.join(f'{v:g}' for v in P.VELOCIDADES), janelas_vel=5, amostras=3, janela_amostra=25.0,
        stoi_min_vel=P.STOI_MIN_VEL, politica=('original-aac' if a.original_aac else 'auto')))
    print('== transcrever ==' if com_modelo else '== vínculo: sem transcrição (decidido pela sua escuta) ==')
    blocos = P.blocos_da_materia(a.materia); tit = titulos_blocos(a.materia)
    por_id = {i['id']: i for i in rel['itens']}
    os.makedirs(trans)
    evid, rascunho, linhas, secoes = {}, [], [], []
    linhas += ['# Relatório REAL — Audiobooks Semiología II', '', f'Execução: `{os.path.basename(exec_dir)}` · entradas: {len(entradas)} · faltam (pelo nome): {faltam or "nenhum"}', '',
               '| Arquivo (original) | SHA-256 | Tamanho | Duração | Codec / canais / bitrate | Ação | Derivado recomendado | Cobertura temporal / com texto | Vínculo proposto (conteúdo) | Votos 5 min | Candidato pelo nome |',
               '|---|---|---|---|---|---|---|---|---|---|---|']
    for ordem, e in enumerate(entradas, 1):
        it = por_id[e['id']]                                                         # master ↔ relatório ↔ derivados ↔ transcrição: pelo id (slug+sha8)
        assert it['sha256_master'] == e['sha256']
        if com_modelo:
            info, jan = T.transcrever_master(rec, e['caminho'], a.janela, passo, a.max_janelas)
            cob = T.escreve_transcricao(trans, e, info, jan, a.janela, passo)
        else:                                                                           # sem transcrição: nada é inventado, o vínculo é da escuta humana
            info, jan = P.probe(e['caminho']), []
            cob = {'temporal_pct': 0.0, 'com_texto_pct': 0.0, 'sem_texto_s': 0.0, 'janelas_sem_texto': 0}
        amostrada = com_modelo and cob['temporal_pct'] < 99.0
        inteiro, votos, melhor, trechos, achados, todo = evidencia(jan, blocos)
        total = sum(votos.values()); forte = bool(melhor) and total >= 3 and votos.get(melhor, 0) / total >= 0.6
        evid[e['id']] = {'arquivo': e['nome_original'], 'sha256': e['sha256'], 'duracao_s': info['duracao_s'], 'cobertura_transcricao_pct': cob['temporal_pct'], 'cobertura_com_texto_pct': cob['com_texto_pct'],
                         'transcricao_amostrada': amostrada, 'vinculo_texto_inteiro': inteiro, 'votos_por_5min': votos, 'bloco_proposto': melhor, 'consistente': forte,
                         'termos_distintivos_encontrados': achados, 'trechos_com_timestamp': trechos, 'candidato_pelo_nome': CAND.get(e['nome_logico']), 'acao_derivado': it.get('acao_derivado'),
                         'derivado_recomendado': it['recomendado_arquivo'], 'derivado_aprovado_nos_criterios': it['recomendado_aprovado']}
        copia = copia_recomendada(it)                                                  # a RECOMENDADA, não a primeira da lista
        st = 'aprovada nos critérios objetivos' if it['recomendado_aprovado'] else '**NÃO APROVADA (nenhuma cópia passou)**'
        mi = it['master_info']
        linhas.append(f"| {e['nome_original']} | `{e['sha256'][:12]}…` | {e['tamanho']} B | {P.fmt_dur(info['duracao_s'])} | {mi.get('codec')} {mi.get('perfil')} {mi.get('layout')} {mi.get('bitrate_kbps')} kb/s | {it['acao_derivado']['acao']} | "
                      f"`{copia['arquivo']}` · {copia['tamanho_mb']} MB · {copia['info'].get('bitrate_kbps')} kb/s · {st} | {(str(cob['temporal_pct']) + ' % / ' + str(cob['com_texto_pct']) + ' %' + (' (AMOSTRADA)' if amostrada else '')) if com_modelo else 'sem transcrição'} | "
                      + (f"{(melhor + ' — ' + tit.get(melhor, '')) if melhor else '**REVISÃO HUMANA NECESSÁRIA**'}{' (consistente)' if forte else ''} | {votos} | {CAND.get(e['nome_logico'])} |" if com_modelo
                       else f"**ESCUTA DO JOSÉ** | — | {CAND.get(e['nome_logico'])} (só candidato pelo nome) |"))
        alt = it['alternativas']
        pend = ['escuta humana pendente (1×, 2× e 2,5×; limiar STOI de velocidade é provisório)']
        if not it['recomendado_aprovado']:
            pend.insert(0, 'NENHUMA cópia passou os critérios objetivos — não aprovar; ouvir as amostras antes de decidir')
        if not com_modelo:
            pend.append('sem transcrição: o bloco de cada áudio é decidido pela SUA escuta (o nome do arquivo é só candidato)')
        if amostrada:
            pend.append(f"transcrição AMOSTRADA ({cob['temporal_pct']} % do tempo) — o vínculo é evidência de tema, não leitura integral")
        if com_modelo and cob['janelas_sem_texto']:
            pend.append(f"{cob['janelas_sem_texto']} janela(s) sem texto reconhecido ({cob['sem_texto_s']} s): silêncio ou fala não reconhecida")
        if not forte and com_modelo:
            pend.append('vínculo NÃO consistente: REVISÃO HUMANA NECESSÁRIA')
        secoes += [f"### {e['nome_original']}", '', f"- Derivado recomendado: `{copia['arquivo']}` — {copia['tamanho_mb']} MB, {copia['info'].get('bitrate_kbps')} kb/s reais (alvo {copia['kbps_alvo']}) — {st}.",
                   f"- Motivo: {it['recomendacao_motivo']}.",
                   '- Alternativas: ' + ('; '.join(f"`{x['arquivo']}` ({x['kbps']} kbps, {x['tamanho_mb']} MB) — " + ('aprovada' if x['aprovada'] else 'reprovada: ' + ', '.join(x['reprovada_por'])) for x in alt) if alt else 'nenhuma (cópia única)') + '.',
                   '- Pendências: ' + '; '.join(pend) + '.',
                   f"- Depois de OUVIR as amostras (só você roda isto): `powershell -ExecutionPolicy Bypass -File tools\\audio\\aprovar_local.ps1 -Audio {e['id']} -Bloco {CAND.get(e['nome_logico'], 's2-bNN')} -Escutei`" + (' (este áudio tem dois blocos candidatos: s2-b01 respiratório × s2-b06 cardíaco — o que você ouvir decide)' if e['nome_logico'] == 'Semio_-_Motivo_de_Consulta.m4a' else ''), '']
        rascunho.append({'id': e['id'], 'master': e['nome_original'], 'sha256_master': e['sha256'], 'audio_id': 'PROPUESTA-' + e['id'], 'block_id': melhor or 'CONFIRMAR', 'theme': tit.get(melhor, 'PROPUESTA'),
                         'title': 'PROPUESTA', 'order': ordem, 'version': 'v1', 'kbps': it['recomendado_kbps'] if it['recomendado_aprovado'] else None, 'vinculo_confirmado': bool(forte), 'confirmado_por': 'transcricao', 'escuta_humana_ok': False})
        print(e['nome_original'], '→', melhor if com_modelo else '(escuta humana)', ('| consistente' if forte else '| REVISÃO HUMANA') if com_modelo else '', ('| cobertura %s %% (com texto %s %%)' % (cob['temporal_pct'], cob['com_texto_pct'])) if com_modelo else '')
    with open(os.path.join(exec_dir, 'vinculos-evidencia.json'), 'w', encoding='utf-8') as f:
        json.dump(evid, f, ensure_ascii=False, indent=1)
    with open(os.path.join(exec_dir, 'vinculos.json'), 'w', encoding='utf-8') as f:
        json.dump(rascunho, f, ensure_ascii=False, indent=2)
    with open(os.path.join(exec_dir, 'RELATORIO-REAL.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas) + '\n\n## Por áudio\n\n' + '\n'.join(secoes) + '\n> «Consistente» = bloco candidato no texto inteiro **e** ≥ 60 % dos blocos de 5 min concordam. Transcrição **amostrada** ≠ integral. '
                '`escuta_humana_ok` é sempre false: a escuta é humana.\n')
    esperados = ['RELATORIO-REAL.md', 'vinculos-evidencia.json', 'vinculos.json', 'inventario.json', os.path.join('tratados', 'relatorio.json'), os.path.join('tratados', 'relatorio.md')]
    faltou = [x for x in esperados if not os.path.isfile(os.path.join(exec_dir, x))]
    if faltou:
        sys.exit(f'ERRO: saídas esperadas ausentes: {faltou}')
    print('Pronto:', exec_dir)
    return 0


if __name__ == '__main__':
    sys.exit(main())
