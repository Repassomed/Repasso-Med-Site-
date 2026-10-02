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
STOI_MIN = 0.95                     # limiar objetivo para escolher o menor bitrate
EXT = ('.m4a', '.mp4', '.aac', '.wav', '.mp3', '.flac', '.ogg')


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


def pcm16k(path, inicio, dur):
    import numpy as np
    r = subprocess.run([ff(), '-v', 'error', '-nostdin', '-ss', str(inicio), '-t', str(dur), '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True)
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


def stoi_janelas(master, copia, dur_total, n=10, janela=20.0):
    """STOI médio e mínimo em n janelas espalhadas (evita decodificar horas inteiras)."""
    from pystoi import stoi
    vals = []
    if not dur_total or dur_total < 5:
        return {'media': None, 'minimo': None, 'janelas': 0}
    janela = min(janela, max(4.0, dur_total / 2))
    passo = (dur_total - janela) / max(1, n - 1) if n > 1 else 0
    for k in range(n):
        ini = max(0.0, k * passo)
        a, b = pcm16k(master, ini, janela), pcm16k(copia, ini, janela)
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


def cmd_preparar(a):
    if dentro_do_repo(a.saida):
        sys.exit('RECUSADO: a saída está dentro de um repositório git. Masters e cópias NÃO entram no Git; use uma pasta fora do repositório.')
    os.makedirs(a.saida, exist_ok=True)
    relatorio = {'perfis_kbps': list(PERFIS), 'stoi_min': a.stoi_min, 'ar_hz': a.ar, 'itens': [], 'nota': 'STOI/loudness são objetivos; a escuta humana é obrigatória antes de publicar.'}
    for p in lista_masters(a.origem):
        h0 = sha256(p); mt0 = os.stat(p).st_mtime_ns
        info = probe(p)
        item = {'master': os.path.basename(p), 'sha256_master': h0, 'master_info': info, 'tamanho_master_mb': round(os.path.getsize(p) / 1048576, 2), 'copias': [], 'escuta_humana_pendente': True}
        base = slug_arquivo(os.path.basename(p))
        for kb in PERFIS:
            dst = os.path.join(a.saida, f'{base}.{kb}k.m4a')
            codifica(p, dst, kb, a.ar)
            ok, err = decodifica_ok(dst)
            ci = probe(dst)
            c = {'arquivo': os.path.basename(dst), 'kbps_alvo': kb, 'tamanho_mb': round(os.path.getsize(dst) / 1048576, 2), 'info': ci, 'faststart': faststart(dst),
                 'decodifica_sem_erros': ok, 'erro': err,
                 'delta_duracao_s': round((ci['duracao_s'] or 0) - (info['duracao_s'] or 0), 3) if info['duracao_s'] else None,
                 'loudness': loudness(dst), 'stoi': stoi_janelas(p, dst, info['duracao_s'], n=a.janelas)}
            item['copias'].append(c)
        item['master_loudness'] = loudness(p)
        # recomendação objetiva: o menor bitrate que passa o limiar (média e pior janela) e não clipa
        rec = None
        for c in item['copias']:
            s = c['stoi']
            if c['decodifica_sem_erros'] and c['faststart'] and s['media'] is not None and s['media'] >= a.stoi_min and s['minimo'] >= a.stoi_min - 0.03 and (c['loudness']['pico_dbfs'] is None or c['loudness']['pico_dbfs'] < -0.1):
                rec = c['kbps_alvo']; break
        item['recomendado_kbps'] = rec if rec else max(PERFIS)
        item['recomendacao_motivo'] = 'menor bitrate que passa STOI/faststart/pico' if rec else 'nenhum passou o limiar: manter o maior e ouvir antes'
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
    L = ['# Relatório de preparação dos audiobooks', '', f"Perfis: AAC-LC mono {', '.join(str(x) for x in rel['perfis_kbps'])} kbps, {rel['ar_hz']} Hz, faststart. Limiar STOI ≥ {rel['stoi_min']}.", '',
         '> STOI e loudness são medidas objetivas. **A escuta humana é obrigatória** antes de publicar.', '',
         '| Master | Duração | Original | Cópia | Tamanho | Redução | STOI médio / pior | LUFS | Pico dBFS | Faststart | Δ dur. |', '|---|---|---|---|---|---|---|---|---|---|---|']
    for it in rel['itens']:
        mi = it['master_info']
        for c in it['copias']:
            red = round(100 * (1 - c['tamanho_mb'] / it['tamanho_master_mb']), 1) if it['tamanho_master_mb'] else '?'
            L.append(f"| {it['master']} | {fmt_dur(mi['duracao_s'])} | {mi['codec']} {mi['perfil']} {mi['taxa_hz']} Hz {mi['layout']} {mi['bitrate_kbps']} kb/s, {it['tamanho_master_mb']} MB | {c['arquivo']} | {c['tamanho_mb']} MB | {red} % | {c['stoi']['media']} / {c['stoi']['minimo']} | {c['loudness']['lufs']} | {c['loudness']['pico_dbfs']} | {'sim' if c['faststart'] else 'NÃO'} | {c['delta_duracao_s']} s |")
        L.append(f"| ↳ recomendado | | | **{it['recomendado_kbps']} kbps** | | | | | | | {it['recomendacao_motivo']}; master intacto: {'sim' if it['master_intacto'] else 'NÃO'} |")
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
    s.add_argument('--ar', type=int, default=32000); s.add_argument('--stoi-min', type=float, default=STOI_MIN, dest='stoi_min'); s.add_argument('--janelas', type=int, default=10); s.set_defaults(f=cmd_preparar)
    s = sp.add_parser('vincular'); s.add_argument('--transcricao', required=True); s.add_argument('--materia', required=True); s.set_defaults(f=cmd_vincular)
    a = ap.parse_args(argv)
    return a.f(a)


if __name__ == '__main__':
    main()
