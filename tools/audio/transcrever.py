#!/usr/bin/env python3
"""Transcreve (ASR local, espanhol) janelas espalhadas de cada master para CONFIRMAR O BLOCO PELO CONTEÚDO. Só lê os masters.

Usa Whisper (sherpa-onnx, CPU) — instalar: `pip install sherpa-onnx` e baixar um modelo, p.ex. o release
`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2` (≈ 640 MB; `base` ≈ 207 MB).

  python3 tools/audio/transcrever.py --origem ~/masters --saida ~/audiobooks-tratados/transcricoes --modelo ~/asr/sherpa-onnx-whisper-small

Para cada master: janelas de `--janela` s (padrão 28) a cada `--passo` s (padrão 120) cobrindo o áudio inteiro; escreve `<slug>.transcricao.txt`
(texto corrido, para `preparar_audiobooks.py vincular`) e `<slug>.janelas.json` (início/fim/texto de cada janela, para citar trechos como evidência).
A saída tem de ficar FORA do repositório. O ASR erra termos médicos: serve como evidência de TEMA, não como texto final.
"""
import argparse, glob, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_audiobooks as P


def carregar(modelo, threads):
    import sherpa_onnx
    pre = os.path.basename(modelo.rstrip('/')).replace('sherpa-onnx-whisper-', '')
    d = modelo

    def f(nome):
        for sufixo in ('.int8.onnx', '.onnx'):
            p = os.path.join(d, f'{pre}-{nome}{sufixo}')
            if os.path.exists(p):
                return p
        raise SystemExit(f'modelo incompleto: falta {pre}-{nome}.onnx em {d}')
    return sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f('encoder'), decoder=f('decoder'), tokens=os.path.join(d, f'{pre}-tokens.txt'),
                                                      language='es', task='transcribe', num_threads=threads)


def positivo(txt):
    v = float(txt)
    if not (v > 0):
        raise argparse.ArgumentTypeError(f'precisa ser > 0 (recebi {txt})')
    return v


def janelas(dur, janela, passo):
    if not (janela > 0 and passo > 0):
        raise ValueError(f'janela e passo precisam ser positivos (janela={janela}, passo={passo})')
    ini, out = 0.0, []
    while ini < dur - 3:
        out.append((ini, min(janela, dur - ini)))
        ini += passo
    return out


def transcrever_master(rec, caminho, janela, passo, max_janelas=0):
    info = P.probe(caminho)
    dur = info['duracao_s'] or 0
    jan = janelas(dur, janela, passo)
    if max_janelas:
        jan = jan[:max_janelas]
    res = []
    for ini, d in jan:
        a = P.pcm16k(caminho, ini, d)
        if len(a) < 16000 or float((a ** 2).mean()) < 1e-8:
            res.append({'inicio_s': round(ini, 1), 'fim_s': round(ini + d, 1), 'texto': ''}); continue
        s = rec.create_stream(); s.accept_waveform(16000, a); rec.decode_stream(s)
        res.append({'inicio_s': round(ini, 1), 'fim_s': round(ini + d, 1), 'texto': s.result.text.strip()})
    return info, res


def cobertura(info, res, janela):
    """Fração do áudio realmente transcrita (as janelas amostradas NÃO são o áudio integral)."""
    dur = info['duracao_s'] or 0
    coberto = sum(min(x['fim_s'] - x['inicio_s'], janela) for x in res)
    return round(100 * coberto / dur, 1) if dur else 0.0


def escreve_transcricao(saida, entrada, info, res, janela, passo):
    base = entrada['id']
    cob = cobertura(info, res, janela)
    with open(os.path.join(saida, base + '.janelas.json'), 'w', encoding='utf-8') as f:
        json.dump({'id': base, 'master': entrada['nome_original'], 'sha256_master': entrada['sha256'], 'duracao_s': info['duracao_s'], 'janela_s': janela, 'passo_s': passo,
                   'cobertura_pct': cob, 'amostrada': cob < 99.0, 'aviso': None if cob >= 99.0 else f'TRANSCRIÇÃO AMOSTRADA: {cob} % do áudio; não é a transcrição integral',
                   'janelas': res}, f, ensure_ascii=False, indent=1)
    with open(os.path.join(saida, base + '.transcricao.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(x['texto'] for x in res if x['texto']) + '\n')
    return cob


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--origem', required=True); ap.add_argument('--saida', required=True); ap.add_argument('--modelo', required=True)
    ap.add_argument('--janela', type=positivo, default=28.0); ap.add_argument('--passo', type=positivo, default=120.0, help='segundos entre inícios de janela; = --janela transcreve o áudio INTEIRO')
    ap.add_argument('--threads', type=int, default=4); ap.add_argument('--max-janelas', type=int, default=0)
    a = ap.parse_args(argv)
    if P.dentro_do_repo(a.saida):
        sys.exit('RECUSADO: a saída está dentro de um repositório git (transcrições de áudio não entram no Git).')
    entradas = P.descobrir(a.origem)
    P.saida_limpa(a.saida, False)
    os.makedirs(a.saida, exist_ok=True)
    rec = carregar(os.path.expanduser(a.modelo), a.threads)
    for e in entradas:
        t0 = time.time()
        info, res = transcrever_master(rec, e['caminho'], a.janela, a.passo, a.max_janelas)
        escreve_transcricao(a.saida, e, info, res, a.janela, a.passo)
        print(f"{e['nome_original']}: {P.fmt_dur(info['duracao_s'])} · {len(res)} janelas · {round(time.time() - t0)} s")
    return 0


if __name__ == '__main__':
    sys.exit(main())
