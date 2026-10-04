#!/usr/bin/env python3
"""
Preparação dos MASTERS dos audiobooks (voz) -> cópias AAC-LC/M4A para o piloto.

  inspecionar  mostra duração, codec, canais, taxa e bitrate de cada master (só LÊ)
  preparar     gera cópias AAC-LC mono em 48 e 64 kbps com faststart, compara-as com o master
               (STOI = inteligibilidade objetiva, loudness, pico) e recomenda uma
  vincular     sugere o bloco da matéria a partir da TRANSCRIÇÃO (nunca pelo nome/número do arquivo)

Regras de segurança (testadas em test_preparar_audiobooks.py):
  * os masters nunca são alterados: abertos só para leitura; o SHA-256 é conferido antes e depois;
  * a saída tem de ficar FORA do repositório git (masters e cópias NÃO entram no Git);
  * este perfil é de FALA. Não usar em sons clínicos de ausculta (mp3 próprios, sem compressão agressiva);
  * STOI/loudness NÃO substituem a escuta humana: o relatório sempre marca `escuta_humana_pendente`.

Uso:
  python3 tools/audio/preparar_audiobooks.py inspecionar  --origem DIR
  python3 tools/audio/preparar_audiobooks.py preparar     --origem DIR --saida ~/audiobooks-tratados
  python3 tools/audio/preparar_audiobooks.py vincular     --transcricao arq.txt --materia "<...>/materias-privadas/semiologia-ii.html"
"""
import argparse, hashlib, json, math, os, re, shutil, subprocess, sys, unicodedata

PERFIS = (48, 64)                   # kbps a comparar
STOI_MIN = 0.95                     # limiar objetivo para escolher o menor bitrate (1×)
STOI_MIN_VEL = 0.90                 # limiar PROVISÓRIO a 2×/2,5× (STOI cai ao acelerar; calibrar com a escuta humana dos masters reais)
VELOCIDADES = (2.0, 2.5)            # velocidades do player além de 1× em que a inteligibilidade é medida
EXT = ('.m4a', '.mp4', '.aac', '.wav', '.mp3', '.flac', '.ogg')
LIMITE_BYTES = 30 * 1024 * 1024     # limite do bucket (migration) — o derivado publicado não pode passar disto
BITRATE_FALA_MAX = 96               # kb/s: um AAC-LC mono de fala acima disto tem benefício demonstrável em ser reduzido


def _ffmpeg():
    if os.environ.get('RM_FFMPEG'):
        return os.environ['RM_FFMPEG']
    w = shutil.which('ffmpeg')
    if w:
        return w
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg não encontrado (instale ffmpeg ou `pip install imageio-ffmpeg`, ou defina RM_FFMPEG).')


FFMPEG = None


def ff():
    global FFMPEG
    if FFMPEG is None:
        FFMPEG = _ffmpeg()
    return FFMPEG


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def probe(path):
    """Equivalente a um ffprobe mínimo, a partir da saída de `ffmpeg -i` (só leitura)."""
    r = subprocess.run([ff(), '-hide_banner', '-nostdin', '-i', path], capture_output=True, text=True)
    t = r.stderr
    d = re.search(r'Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)', t)
    dur = int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)) if d else None
    br = re.search(r'Duration:.*?bitrate:\s*(\d+)\s*kb/s', t)
    a = re.search(r'Stream #\d+:\d+[^:]*:\s*Audio:\s*([a-z0-9_]+)(?:\s*\(([^)]*)\))?[^,]*,\s*(\d+)\s*Hz,\s*([^,]+)', t)
    ch = a.group(4).strip() if a else None
    canais = {'mono': 1, 'stereo': 2}.get(ch) if ch else None
    if canais is None and ch:
        m = re.match(r'(\d+)\.(\d+)', ch)
        canais = int(m.group(1)) + int(m.group(2)) if m else None
    fmt = re.search(r'Input #0,\s*([^,]+),', t)
    return {
        'duracao_s': dur, 'bitrate_kbps': int(br.group(1)) if br else None,
        'codec': a.group(1) if a else None, 'perfil': (a.group(2) or '') if a else None,
        'taxa_hz': int(a.group(3)) if a else None, 'canais': canais, 'layout': ch,
        'container': fmt.group(1) if fmt else None, 'tem_video': bool(re.search(r'Stream #\d+:\d+.*Video:', t)),
    }


def caixas_topo(path, limite=64):
    """Caixas MP4 de nível superior [(tipo, offset)] — para provar o faststart (moov antes de mdat)."""
    out = []
    size_total = os.path.getsize(path)
    with open(path, 'rb') as f:
        off = 0
        while off < size_total and len(out) < limite:
            f.seek(off)
            h = f.read(8)
            if len(h) < 8:
                break
            sz = int.from_bytes(h[:4], 'big')
            tp = h[4:8].decode('latin1')
            hdr = 8
            if sz == 1:
                sz = int.from_bytes(f.read(8), 'big'); hdr = 16
            elif sz == 0:
                sz = size_total - off
            out.append((tp, off))
            if sz < hdr:
                break
            off += sz
    return out


def faststart(path):
    c = {t: o for t, o in reversed(caixas_topo(path))}
    return 'moov' in c and 'mdat' in c and c['moov'] < c['mdat']


def decodifica_ok(path):
    r = subprocess.run([ff(), '-v', 'error', '-nostdin', '-i', path, '-f', 'null', '-'], capture_output=True, text=True)
    return r.returncode == 0 and not r.stderr.strip(), r.stderr.strip()[:200]


def loudness(path):
    r = subprocess.run([ff(), '-hide_banner', '-nostdin', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    t = r.stderr[r.stderr.rfind('Summary:'):] if 'Summary:' in r.stderr else r.stderr
    i = re.search(r'I:\s*(-?[\d.]+)\s*LUFS', t)
    lra = re.search(r'LRA:\s*([\d.]+)\s*LU', t)
    pk = re.search(r'Peak:\s*(-?[\d.]+)\s*dBFS', t)
    return {'lufs': float(i.group(1)) if i else None, 'lra': float(lra.group(1)) if lra else None, 'pico_dbfs': float(pk.group(1)) if pk else None}


def pcm16k(path, inicio, dur, tempo=1.0):
    """PCM 16 kHz mono de `dur` s a partir de `inicio`. `tempo` > 1 acelera SEM mudar o tom (atempo), como o player a 2×/2,5×:
    lê dur*tempo s da fonte e devolve ~dur s."""
    import numpy as np
    cmd = [ff(), '-v', 'error', '-nostdin', '-ss', str(inicio), '-t', str(dur * tempo), '-i', path, '-vn']
    if tempo != 1.0:
        cmd += ['-af', f'atempo={tempo}']
    r = subprocess.run(cmd + ['-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype='<f4')


def alinha(ref, deg, max_lag=1600):
    """O codec AAC introduz atraso: acha o deslocamento (±100 ms) por correlação e recorta as duas séries."""
    import numpy as np
    from scipy.signal import fftconvolve
    n = min(len(ref), len(deg))
    if n < 4000:
        return ref[:n], deg[:n]
    a, b = ref[:n], deg[:n]
    c = fftconvolve(a, b[::-1], mode='full')
    mid = n - 1
    janela = c[mid - max_lag: mid + max_lag + 1]
    lag = int(np.argmax(janela)) - max_lag      # >0: deg atrasado
    if lag > 0:
        a, b = a[lag:], b[:len(b) - lag]
    elif lag < 0:
        a, b = a[:len(a) + lag], b[-lag:]
    m = min(len(a), len(b))
    return a[:m], b[:m]


def stoi_janelas(master, copia, dur_total, n=10, janela=20.0, tempo=1.0):
    """STOI médio e mínimo em n janelas espalhadas (evita decodificar horas inteiras).
    `tempo` = velocidade de reprodução simulada (1; 2; 2,5): master e cópia são acelerados igual e comparados."""
    from pystoi import stoi
    vals = []
    if not dur_total or dur_total < 5:
        return {'media': None, 'minimo': None, 'janelas': 0}
    janela = min(janela, max(4.0, dur_total / (2 * tempo)))
    fonte = janela * tempo                                   # segundos lidos da fonte por janela
    passo = (dur_total - fonte) / max(1, n - 1) if n > 1 else 0
    for k in range(n):
        ini = max(0.0, k * passo)
        a, b = pcm16k(master, ini, janela, tempo), pcm16k(copia, ini, janela, tempo)
        if min(len(a), len(b)) < 16000:
            continue
        a, b = alinha(a, b)
        if len(a) < 16000 or float((a ** 2).mean()) < 1e-8:      # silêncio: STOI não se define
            continue
        vals.append(float(stoi(a, b, 16000, extended=False)))
    if not vals:
        return {'media': None, 'minimo': None, 'janelas': 0}
    return {'media': round(sum(vals) / len(vals), 4), 'minimo': round(min(vals), 4), 'janelas': len(vals)}


def dentro_do_repo(caminho):
    """True se `caminho` está dentro de uma árvore git (masters/cópias NUNCA no repositório)."""
    p = os.path.abspath(os.path.expanduser(caminho))
    while True:
        if os.path.exists(os.path.join(p, '.git')):
            return True
        pai = os.path.dirname(p)
        if pai == p:
            return False
        p = pai


def lista_masters(origem):
    return sorted(os.path.join(origem, f) for f in os.listdir(origem) if f.lower().endswith(EXT) and not f.startswith('.'))


def nome_logico(nome):
    """Nome sem o « (1)» que o Drive/SO acrescenta a cópias: `Semio_EPOC (1).m4a` → `Semio_EPOC.m4a`. Só para CONFERIR/rastrear; nunca decide o vínculo."""
    return re.sub(r'\s*\(\d+\)(?=\.[^.]+$)', '', nome)


def descobrir(origens, recursivo=True):
    """Lista ÚNICA de entradas (uma ou mais pastas, em qualquer profundidade). Cada entrada: caminho, relpath, nome_original, nome_logico, tamanho, sha256, id estável
    (`<slug>-<sha8>`: une master ↔ derivados ↔ transcrição ↔ relatório). Erros claros: entrada vazia, mesmo nome com conteúdo DIFERENTE (nunca sobrescreve em silêncio);
    duplicata byte-idêntica é registrada e ignorada."""
    if isinstance(origens, str):
        origens = [origens]
    achados = []
    for o in origens:
        o = os.path.abspath(os.path.expanduser(o))
        if not os.path.isdir(o):
            sys.exit(f'ERRO: a pasta de entrada não existe: {o}')
        for raiz, dirs, arqs in os.walk(o):
            dirs[:] = sorted(d for d in dirs if not d.startswith('.'))
            for f in sorted(arqs):
                if f.lower().endswith(EXT) and not f.startswith('.'):
                    achados.append((os.path.join(raiz, f), os.path.relpath(os.path.join(raiz, f), o)))
            if not recursivo:
                break
    if not achados:
        sys.exit('ERRO: nenhum arquivo de áudio (' + ', '.join(EXT) + ') encontrado na entrada: ' + ', '.join(map(str, origens)))
    por_nome, vistos_sha, entradas = {}, {}, []
    for caminho, rel in achados:
        sha = sha256(caminho); nome = os.path.basename(caminho)
        if sha in vistos_sha:
            vistos_sha[sha]['duplicatas_identicas'].append(rel); continue
        if nome in por_nome:
            sys.exit(f'ERRO: dois arquivos com o MESMO nome e conteúdo DIFERENTE (não vou sobrescrever em silêncio): {por_nome[nome]["relpath"]} e {rel}')
        e = {'caminho': caminho, 'relpath': rel, 'nome_original': nome, 'nome_logico': nome_logico(nome), 'tamanho': os.path.getsize(caminho), 'sha256': sha,
             'id': f'{slug_arquivo(nome_logico(nome))}-{sha[:8]}', 'duplicatas_identicas': []}
        por_nome[nome] = e; vistos_sha[sha] = e; entradas.append(e)
    return entradas


def saida_limpa(pasta, limpar=False):
    """Resíduo de execução anterior não entra no lote: a pasta de saída tem de estar vazia (ou ser limpa com --limpar, só dos artefatos conhecidos)."""
    if not os.path.isdir(pasta) or not os.listdir(pasta):
        return
    if not limpar:
        sys.exit(f'ERRO: a pasta de saída NÃO está vazia ({pasta}). Use uma pasta nova (recomendado) ou --limpar para apagar só os artefatos desta ferramenta (derivados .m4a, amostras/, relatorio.*).')
    for f in os.listdir(pasta):
        c = os.path.join(pasta, f)
        if os.path.isdir(c) and f == 'amostras':
            shutil.rmtree(c)
        elif os.path.isfile(c) and (f.endswith('.m4a') or f in ('relatorio.json', 'relatorio.md')):
            os.remove(c)
    if os.listdir(pasta):
        sys.exit(f'ERRO: sobraram arquivos desconhecidos em {pasta}; escolha outra pasta de saída.')


def slug_arquivo(nome):
    s = unicodedata.normalize('NFKD', os.path.splitext(nome)[0]).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60] or 'audio'


# ----------------------------------------------------------------------------------------------------------------
def cmd_inspecionar(a):
    res = []
    for p in lista_masters(a.origem):
        i = probe(p); i['arquivo'] = os.path.basename(p); i['tamanho_mb'] = round(os.path.getsize(p) / 1048576, 1); res.append(i)
        print(f"{i['arquivo']}: {i['tamanho_mb']} MB · {fmt_dur(i['duracao_s'])} · {i['codec']} {i['perfil']} · {i['taxa_hz']} Hz · {i['layout']} · {i['bitrate_kbps']} kb/s · faststart={faststart(p) if i['container'] and 'mp4' in i['container'] else 'n/a'}")
    return res


def fmt_dur(s):
    if s is None:
        return '?'
    return f'{int(s // 3600)}:{int(s % 3600 // 60):02d}:{int(s % 60):02d}'


def codifica(src, dst, kbps, ar):
    cmd = [ff(), '-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', src, '-vn', '-map', '0:a:0', '-map_metadata', '-1',
           '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', f'{kbps}k', '-ac', '1', '-ar', str(ar), '-movflags', '+faststart', dst]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:300])


def corta(src, dst, ini, dur, kbps=None, tempo=1.0, ar=32000, copia=False):
    """Recorta um trecho para ESCUTA. `copia` = só corta (sem recodificar); `tempo` > 1 acelera sem mudar o tom (atempo)."""
    cmd = [ff(), '-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-ss', f'{ini:.2f}', '-t', f'{dur * tempo:.2f}', '-i', src, '-vn', '-map', '0:a:0', '-map_metadata', '-1']
    if copia:
        cmd += ['-c:a', 'copy']
    else:
        if tempo != 1.0:
            cmd += ['-af', f'atempo={tempo}']
        cmd += ['-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', f'{kbps}k', '-ac', '1', '-ar', str(ar)]
    r = subprocess.run(cmd + ['-movflags', '+faststart', dst], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:300])


def gera_amostras(master, copias, dur, base, pasta, n, janela, vels, ar):
    """Trechos curtos (n posições espalhadas) para a ESCUTA HUMANA: referência do master, cada cópia a 1× e a 2×/2,5×.
    Só pequenos recortes, SEMPRE fora do repositório (a pasta é a mesma `--saida`)."""
    os.makedirs(pasta, exist_ok=True)
    if not dur or dur < janela + 2 or n <= 0:
        return []
    fr = [(k + 1) / (n + 1) for k in range(n)]
    out = []
    for i, f in enumerate(fr, 1):
        ini = max(0.0, min(dur - janela - 1, dur * f - janela / 2))
        ref = os.path.join(pasta, f'{base}.referencia.t{i}.1x.m4a')
        corta(master, ref, ini, janela, kbps=128, ar=ar)
        out.append({'trecho': i, 'inicio_s': round(ini, 1), 'tipo': 'referencia-master(128k)', 'velocidade': '1x', 'arquivo': os.path.relpath(ref, os.path.dirname(pasta))})
        for kb, cp in copias.items():
            for v in (1.0,) + tuple(vels):
                nome = f'{base}.{kb}k.t{i}.{v:g}x.m4a'
                dst = os.path.join(pasta, nome)
                corta(cp, dst, ini, janela, kbps=kb, tempo=v, ar=ar, copia=(v == 1.0))
                out.append({'trecho': i, 'inicio_s': round(ini, 1), 'tipo': f'copia-{kb}k', 'velocidade': f'{v:g}x', 'arquivo': os.path.relpath(dst, os.path.dirname(pasta))})
    return out


def decidir_derivado(info, tamanho, tem_faststart):
    """Só reencoda quando há BENEFÍCIO demonstrável (o áudio já foi comprimido pelo autor: evitar nova perda).
    reaproveitar: AAC-LC mono ≤ 96 kb/s, ≤ 30 MiB e com faststart → cópia idêntica; remux: o mesmo sem faststart → só move o moov (sem perda);
    reencodar: fora do limite do bucket, não AAC-LC, não mono, ou bitrate de fala > 96 kb/s."""
    ok_formato = info.get('codec') == 'aac' and info.get('perfil') == 'LC' and info.get('canais') == 1
    br = info.get('bitrate_kbps') or 0
    if ok_formato and tamanho <= LIMITE_BYTES and 0 < br <= BITRATE_FALA_MAX:
        return ('reaproveitar' if tem_faststart else 'remux-faststart'), 'já é AAC-LC mono ≤ %d kb/s e cabe em 30 MiB: sem nova perda' % BITRATE_FALA_MAX
    motivos = []
    if tamanho > LIMITE_BYTES: motivos.append(f'{tamanho} B > 30 MiB (limite do bucket)')
    if info.get('codec') != 'aac' or info.get('perfil') != 'LC': motivos.append(f"codec {info.get('codec')}/{info.get('perfil')} ≠ AAC-LC")
    if info.get('canais') != 1: motivos.append(f"canais={info.get('canais')} ≠ mono")
    if br > BITRATE_FALA_MAX: motivos.append(f'{br} kb/s > {BITRATE_FALA_MAX} (fala)')
    return 'reencodar', '; '.join(motivos) or 'bitrate desconhecido'


def remux_faststart(src, dst):
    r = subprocess.run([ff(), '-y', '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', src, '-vn', '-map', '0:a:0', '-map_metadata', '-1', '-c:a', 'copy', '-movflags', '+faststart', dst], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[:300])


def cmd_preparar(a):
    if dentro_do_repo(a.saida):
        sys.exit('RECUSADO: a saída está dentro de um repositório git. Masters e cópias NÃO entram no Git; use uma pasta fora do repositório.')
    saida_limpa(a.saida, getattr(a, 'limpar', False))
    os.makedirs(a.saida, exist_ok=True)
    entradas = getattr(a, 'entradas', None) or descobrir(a.origem)
    relatorio = {'perfis_kbps': list(PERFIS), 'stoi_min': a.stoi_min, 'ar_hz': a.ar, 'itens': [], 'nota': 'STOI/loudness são objetivos; a escuta humana é obrigatória antes de publicar.'}
    vels = [float(x) for x in a.velocidades.split(',') if x.strip()]
    relatorio['velocidades'] = [f'{v:g}x' for v in vels]; relatorio['stoi_min_vel'] = a.stoi_min_vel
    for ent in entradas:
        p = ent['caminho']; h0 = sha256(p); mt0 = os.stat(p).st_mtime_ns
        if h0 != ent['sha256']:
            sys.exit(f'ERRO: o arquivo mudou entre a descoberta e o processamento: {p}')
        info = probe(p)
        item = {'id': ent['id'], 'relpath': ent['relpath'], 'nome_logico': ent['nome_logico'], 'duplicatas_identicas': ent['duplicatas_identicas'], 'master': os.path.basename(p), 'sha256_master': h0, 'master_info': info, 'tamanho_master_mb': round(os.path.getsize(p) / 1048576, 2), 'copias': [], 'escuta_humana_pendente': True}
        base = ent['id']
        acao, motivo_acao = decidir_derivado(info, os.path.getsize(p), faststart(p)) if getattr(a, 'politica', 'auto') == 'auto' else ('reencodar', 'política forçada')
        item['acao_derivado'] = {'acao': acao, 'motivo': motivo_acao}
        if acao in ('reaproveitar', 'remux-faststart'):
            dst = os.path.join(a.saida, f'{base}.original-aac.m4a')
            if acao == 'reaproveitar': shutil.copyfile(p, dst)
            else: remux_faststart(p, dst)
            ok, err = decodifica_ok(dst); ci = probe(dst)
            c = {'arquivo': os.path.basename(dst), 'kbps_alvo': int(round(info.get('bitrate_kbps') or 0)), 'origem': acao, 'tamanho_mb': round(os.path.getsize(dst) / 1048576, 2), 'info': ci,
                 'faststart': faststart(dst), 'decodifica_sem_erros': ok, 'erro': err, 'delta_duracao_s': round((ci['duracao_s'] or 0) - (info['duracao_s'] or 0), 3) if info['duracao_s'] else None,
                 'loudness': loudness(dst), 'stoi': {'media': 1.0, 'minimo': 1.0, 'janelas': 0, 'nota': 'áudio idêntico ao master (sem recodificação)'}, 'stoi_velocidades': {}}
            item['copias'].append(c)
        for kb in (PERFIS if acao == 'reencodar' else ()):
            dst = os.path.join(a.saida, f'{base}.{kb}k.m4a')
            codifica(p, dst, kb, a.ar)
            ok, err = decodifica_ok(dst)
            ci = probe(dst)
            c = {'arquivo': os.path.basename(dst), 'kbps_alvo': kb, 'tamanho_mb': round(os.path.getsize(dst) / 1048576, 2), 'info': ci, 'faststart': faststart(dst),
                 'decodifica_sem_erros': ok, 'erro': err,
                 'delta_duracao_s': round((ci['duracao_s'] or 0) - (info['duracao_s'] or 0), 3) if info['duracao_s'] else None,
                 'loudness': loudness(dst), 'stoi': stoi_janelas(p, dst, info['duracao_s'], n=a.janelas),
                 'stoi_velocidades': {f'{v:g}x': stoi_janelas(p, dst, info['duracao_s'], n=a.janelas_vel, tempo=v) for v in vels}}
            item['copias'].append(c)
        if a.amostras:
            item['amostras'] = gera_amostras(p, {c['kbps_alvo']: os.path.join(a.saida, c['arquivo']) for c in item['copias']}, info['duracao_s'], base,
                                             os.path.join(a.saida, 'amostras'), a.amostras, a.janela_amostra, vels, a.ar)
        item['master_loudness'] = loudness(p)
        # recomendação objetiva: o menor bitrate que passa o limiar (média e pior janela) e não clipa
        rec = None
        if acao != 'reencodar':
            rec = item['copias'][0]['kbps_alvo']
        for c in (item['copias'] if acao == 'reencodar' else []):
            s = c['stoi']
            if c['decodifica_sem_erros'] and c['faststart'] and s['media'] is not None and s['media'] >= a.stoi_min and s['minimo'] >= a.stoi_min - 0.03 and (c['loudness']['pico_dbfs'] is None or c['loudness']['pico_dbfs'] < -0.1) \
                    and all(sv['media'] is None or sv['media'] >= a.stoi_min_vel for sv in c['stoi_velocidades'].values()):
                rec = c['kbps_alvo']; break
        item['recomendado_kbps'] = rec if rec else max(PERFIS)
        item['recomendacao_motivo'] = (motivo_acao if acao != 'reencodar' else ('menor bitrate que passa STOI (1× e velocidades)/faststart/pico' if rec else 'nenhum passou o limiar: manter o maior e ouvir antes'))
        h1 = sha256(p)
        item['master_intacto'] = (h0 == h1 and mt0 == os.stat(p).st_mtime_ns)
        if not item['master_intacto']:
            sys.exit(f'ERRO GRAVE: o master {p} mudou durante o processamento')
        relatorio['itens'].append(item)
        print(f"{item['master']}: {fmt_dur(info['duracao_s'])} · {item['tamanho_master_mb']} MB → " + ' | '.join(f"{c['kbps_alvo']}k {c['tamanho_mb']} MB STOI {c['stoi']['media']} (min {c['stoi']['minimo']})" for c in item['copias']) + f" · recomendado {item['recomendado_kbps']}k")
    with open(os.path.join(a.saida, 'relatorio.json'), 'w', encoding='utf-8') as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)
    with open(os.path.join(a.saida, 'relatorio.md'), 'w', encoding='utf-8') as f:
        f.write(md(relatorio))
    return relatorio


def md(rel):
    L = ['# Relatório de preparação dos audiobooks', '', f"Perfis: AAC-LC mono {', '.join(str(x) for x in rel['perfis_kbps'])} kbps, {rel['ar_hz']} Hz, faststart. Limiar STOI ≥ {rel['stoi_min']} (1×); velocidades medidas: {', '.join(rel.get('velocidades', [])) or 'nenhuma'} com limiar PROVISÓRIO {rel.get('stoi_min_vel')} (calibrar com a escuta humana).", '',
         '> STOI e loudness são medidas objetivas. **A escuta humana é obrigatória** antes de publicar.', '',
         '| Master | Duração | Original | Cópia | Tamanho | Redução | STOI 1× médio / pior | STOI em velocidade (média / pior) | LUFS | Pico dBFS | Faststart | Δ dur. |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for it in rel['itens']:
        mi = it['master_info']
        for c in it['copias']:
            red = round(100 * (1 - c['tamanho_mb'] / it['tamanho_master_mb']), 1) if it['tamanho_master_mb'] else '?'
            L.append(f"| {it['master']} | {fmt_dur(mi['duracao_s'])} | {mi['codec']} {mi['perfil']} {mi['taxa_hz']} Hz {mi['layout']} {mi['bitrate_kbps']} kb/s, {it['tamanho_master_mb']} MB | {c['arquivo']} | {c['tamanho_mb']} MB | {red} % | {c['stoi']['media']} / {c['stoi']['minimo']} | {' · '.join(k + ' ' + str(v['media']) + '/' + str(v['minimo']) for k, v in c.get('stoi_velocidades', {}).items()) or '—'} | {c['loudness']['lufs']} | {c['loudness']['pico_dbfs']} | {'sim' if c['faststart'] else 'NÃO'} | {c['delta_duracao_s']} s |")
        L.append(f"| ↳ recomendado | | | **{it['recomendado_kbps']} kbps** | | | | | | | | {it['recomendacao_motivo']}; master intacto: {'sim' if it['master_intacto'] else 'NÃO'} |")
    return '\n'.join(L) + '\n'


# ---------------------------------------------------------------- vínculo bloco <-> transcrição
STOP = set('para como esta este esto esos esas pero sobre entre desde hasta cuando donde porque tambien cada todo todos todas puede pueden segun otro otra otros otras mas menos muy sin con una uno unos unas del los las que por son ser fue han hay asi aqui alli ahora entonces luego tiene tienen tener siendo mismo misma'.split())


def tokens(t):
    t = unicodedata.normalize('NFKD', t.lower()).encode('ascii', 'ignore').decode()
    return [w for w in re.findall(r'[a-z]{4,}', t) if w not in STOP]


def blocos_da_materia(html_path):
    with open(html_path, encoding='utf-8') as fh:
        html = fh.read()
    out = {}
    for m in re.finditer(r'<section[^>]*\bid="(s2-b\d+[^"]*)"[^>]*>(.*?)</section>', html, flags=re.S):
        corpo = re.sub(r'<(script|style)[\s\S]*?</\1>', ' ', m.group(2))
        corpo = re.sub(r'<[^>]+>', ' ', corpo)
        out[m.group(1)] = corpo
    return out


def vincular(transcricao, blocos):
    """Cosseno TF-IDF entre a transcrição e o texto de cada bloco. Não olha nome/número de arquivo."""
    docs = {k: tokens(v) for k, v in blocos.items()}
    n = len(docs)
    df = {}
    for ws in docs.values():
        for w in set(ws):
            df[w] = df.get(w, 0) + 1
    idf = {w: math.log((1 + n) / (1 + c)) + 1 for w, c in df.items()}

    def vec(ws):
        tf = {}
        for w in ws:
            if w in idf:
                tf[w] = tf.get(w, 0) + 1
        return {w: (1 + math.log(c)) * idf[w] for w, c in tf.items()}

    def cos(a, b):
        num = sum(a[w] * b.get(w, 0) for w in a)
        da, db = math.sqrt(sum(x * x for x in a.values())), math.sqrt(sum(x * x for x in b.values()))
        return num / (da * db) if da and db else 0.0

    vt = vec(tokens(transcricao))
    r = sorted(((k, round(cos(vt, vec(ws)), 4)) for k, ws in docs.items()), key=lambda x: -x[1])
    top, seg = r[0], r[1] if len(r) > 1 else (None, 0)
    margem = round(top[1] - seg[1], 4)
    decisao = 'candidato' if top[1] >= 0.15 and margem >= 0.04 else 'indeterminado'
    return {'decisao': decisao, 'melhor': top[0], 'ranking': r[:4], 'margem': margem, 'nota': 'sugestão automática por conteúdo; confirmar com a escuta e a revisão do José (G0)'}


def cmd_vincular(a):
    with open(a.transcricao, encoding='utf-8') as fh:
        texto = fh.read()
    res = vincular(texto, blocos_da_materia(a.materia))
    print(json.dumps(res, ensure_ascii=False, indent=2))
    return res


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('inspecionar'); s.add_argument('--origem', required=True); s.set_defaults(f=cmd_inspecionar)
    s = sp.add_parser('preparar'); s.add_argument('--origem', required=True); s.add_argument('--saida', required=True)
    s.add_argument('--ar', type=int, default=32000); s.add_argument('--stoi-min', type=float, default=STOI_MIN, dest='stoi_min'); s.add_argument('--janelas', type=int, default=10)
    s.add_argument('--velocidades', default=','.join(f'{v:g}' for v in VELOCIDADES), help='velocidades extra para medir STOI (vazio = só 1×)')
    s.add_argument('--janelas-vel', type=int, default=5, dest='janelas_vel'); s.add_argument('--amostras', type=int, default=3, help='trechos para escuta por master (0 = nenhum)'); s.add_argument('--janela-amostra', type=float, default=25.0, dest='janela_amostra'); s.add_argument('--limpar', action='store_true'); s.add_argument('--politica', choices=('auto', 'reencodar'), default='auto'); s.add_argument('--stoi-min-vel', type=float, default=STOI_MIN_VEL, dest='stoi_min_vel'); s.set_defaults(f=cmd_preparar)
    s = sp.add_parser('vincular'); s.add_argument('--transcricao', required=True); s.add_argument('--materia', required=True); s.set_defaults(f=cmd_vincular)
    a = ap.parse_args(argv)
    return a.f(a)


if __name__ == '__main__':
    main()
