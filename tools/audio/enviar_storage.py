#!/usr/bin/env python3
"""Envia os DERIVADOS aprovados ao bucket PRIVADO `audiobooks` do Supabase Storage (ou só confere, em dry-run). Os masters nunca sobem e nada é entregue ao Claude.

  python3 tools/audio/enviar_storage.py --manifesto M/manifesto.json --plano M/plano-upload.md --pasta ~/trabalho/execucao-X/tratados --url https://<ref>.supabase.co            # DRY-RUN (padrão)
  RM_SUPABASE_SERVICE_KEY=... python3 tools/audio/enviar_storage.py ...mesmos argumentos... --enviar                                                                 # envia de verdade

Reaproveita `verificar_upload.verificar` (AAC-LC mono, faststart, decodifica, ≤ 30 MiB, duração = manifesto, path = <matéria>/<audio_id>.m4a): sem APROVADO, nada sobe.
A chave `service_role` vem SÓ da variável de ambiente RM_SUPABASE_SERVICE_KEY (nunca por argumento, arquivo ou log); fica na memória do processo. Antes de enviar confere o bucket
(privado, 30 MiB, só M4A) — se a migration não foi aplicada ou o bucket está diferente, aborta sem enviar. Não sobrescreve: objeto existente com o mesmo tamanho = «já enviado»; com tamanho
diferente = erro (use --substituir de propósito). Depois de cada envio confere o tamanho no Storage e que a URL PÚBLICA do objeto NÃO abre. Escreve `enviado.json` (sem chave) ao lado da pasta dos derivados.
Enviar ao Storage NÃO publica: o áudio só aparece para alguém depois que `RM_AUDIO_MANIFEST` + `RM_PILOT_AUDIO_UIDS` forem definidos no Netlify (decisão separada).
Sai com 0 só se TUDO passar; 2 = recusa de segurança/uso; 1 = falha.
"""
import argparse, datetime, json, os, re, sys, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import preparar_audiobooks as P
import verificar_upload as V

BUCKET = 'audiobooks'
LIMITE = 31457280
MIMES = ['audio/mp4', 'audio/x-m4a']
RE_URL = re.compile(r'^https://[a-z0-9]{20}\.supabase\.co$')
RE_PATH = re.compile(r'^[a-z0-9][a-z0-9._/-]{0,200}$', re.I)
PERMITE_LOCAL = False                                   # os testes ligam para usar 127.0.0.1; a CLI nunca


class ErroHTTP(Exception):
    def __init__(self, status, corpo=''):
        super().__init__(f'HTTP {status} {corpo}'.strip()); self.status = status


def chamar(url, chave=None, metodo='GET', corpo=None, headers=None, timeout=300):
    h = dict(headers or {})
    if chave:
        h['apikey'] = chave; h['Authorization'] = 'Bearer ' + chave
    req = urllib.request.Request(url, data=corpo, method=metodo, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            dados = r.read()
            return r.status, dados
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def json_de(dados):
    try:
        return json.loads(dados.decode('utf-8'))
    except Exception:
        return None


def confere_bucket(base, chave):
    st, d = chamar(f'{base}/storage/v1/bucket/{BUCKET}', chave)
    if st == 404 or (st == 400 and b'not found' in d.lower()):
        return ['o bucket "audiobooks" NÃO existe: aplique antes a migration 20260930_01_audiobooks_bucket_privado.sql (SQL Editor do Supabase)']
    if st != 200:
        return [f'não consegui ler o bucket (HTTP {st}); confira a URL e a chave service_role']
    b = json_de(d) or {}
    e = []
    if b.get('public') is not False:
        e.append('o bucket está PÚBLICO (public != false): não envio áudio algum')
    if b.get('file_size_limit') != LIMITE:
        e.append(f"limite do bucket = {b.get('file_size_limit')} (esperado {LIMITE} = 30 MiB)")
    if sorted(b.get('allowed_mime_types') or []) != sorted(MIMES):
        e.append(f"tipos permitidos = {b.get('allowed_mime_types')} (esperado {MIMES})")
    return e


def tamanho_no_storage(base, chave, path):
    pasta, nome = path.rsplit('/', 1) if '/' in path else ('', path)
    st, d = chamar(f'{base}/storage/v1/object/list/{BUCKET}', chave, 'POST', json.dumps({'prefix': pasta, 'search': nome, 'limit': 100}).encode(), {'Content-Type': 'application/json'})
    if st != 200:
        raise ErroHTTP(st, 'listagem')
    for o in json_de(d) or []:
        if o.get('name') == nome:
            return int((o.get('metadata') or {}).get('size', -1))
    return None


def enviar_um(base, chave, path, arquivo, substituir):
    tam = os.path.getsize(arquivo)
    with open(arquivo, 'rb') as f:
        corpo = f.read()                                                  # ≤ 30 MiB: cabe na memória
    h = {'Content-Type': 'audio/mp4', 'Content-Length': str(tam), 'x-upsert': 'true' if substituir else 'false', 'Cache-Control': 'max-age=3600'}
    st, d = chamar(f'{base}/storage/v1/object/{BUCKET}/' + '/'.join(urllib.parse.quote(p) for p in path.split('/')), chave, 'POST', corpo, h)
    if st not in (200, 201):
        raise ErroHTTP(st, (json_de(d) or {}).get('message', '')[:120] if isinstance(json_de(d), dict) else '')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--manifesto', required=True); ap.add_argument('--plano', required=True); ap.add_argument('--pasta', required=True)
    ap.add_argument('--url', required=True, help='URL do projeto Supabase (https://<ref>.supabase.co)')
    ap.add_argument('--enviar', action='store_true', help='envia de verdade (sem isto é só conferência)')
    ap.add_argument('--substituir', action='store_true', help='permite sobrescrever objeto existente com tamanho diferente (deliberado)')
    a = ap.parse_args(argv)
    base = a.url.rstrip('/')
    if not (RE_URL.match(base) or (PERMITE_LOCAL and re.match(r'^http://127\.0\.0\.1:\d+$', base))):
        print('RECUSADO: --url precisa ser https://<ref>.supabase.co (20 letras/números).'); return 2
    if P.dentro_do_repo(a.pasta):
        print('RECUSADO: a pasta dos derivados está dentro de um repositório git.'); return 2
    chave = os.environ.get('RM_SUPABASE_SERVICE_KEY', '').strip()
    if a.enviar and not chave:
        print('RECUSADO: defina RM_SUPABASE_SERVICE_KEY (a service_role; digitada só no seu terminal, nunca no chat). Nada foi enviado.'); return 2
    with open(a.manifesto, encoding='utf-8') as f:
        man = json.load(f)
    erros, ok, linhas = V.verificar(man, a.pasta, V.ler_plano(a.plano))
    for ln in linhas:
        print('  ' + ln)
    if erros:
        print('NÃO APROVADO para upload (nada enviado):'); [print(' - ' + e) for e in erros]; return 1
    for it in man.get('semiologia-ii', []):
        if not RE_PATH.match(it['path']) or '..' in it['path'] or '//' in it['path']:
            print('RECUSADO: path inválido ' + it['path']); return 2
    plano = V.ler_plano(a.plano)
    if chave:
        e = confere_bucket(base, chave)
        if e:
            print('BUCKET NÃO ESTÁ COMO O ESPERADO (nada enviado):'); [print(' - ' + x) for x in e]; return 1
        print('bucket "audiobooks": privado, 30 MiB, só M4A — ok.')
    else:
        print('(sem chave: o bucket não foi consultado)')
    if not a.enviar:
        print(f'DRY-RUN: {len(ok)} arquivo(s) prontos; nada foi enviado. Para enviar: defina RM_SUPABASE_SERVICE_KEY e acrescente --enviar.'); return 0
    log, falhas = [], 0
    for it in man['semiologia-ii']:
        path = it['path']; arq = os.path.join(a.pasta, plano[path]); tam = os.path.getsize(arq); reg = {'path': path, 'arquivo': plano[path], 'bytes': tam, 'sha256': P.sha256(arq), 'resultado': 'falha', 'detalhe': ''}
        try:
            antes = tamanho_no_storage(base, chave, path)
            if antes is not None and antes == tam and not a.substituir:
                reg.update(resultado='ja-enviado', detalhe='objeto idêntico em tamanho já estava no bucket')
            elif antes is not None and antes != tam and not a.substituir:
                raise ErroHTTP(409, f'já existe com {antes} B (≠ {tam} B); use --substituir se for de propósito')
            else:
                enviar_um(base, chave, path, arq, a.substituir)
                reg['resultado'] = 'enviado'
            depois = tamanho_no_storage(base, chave, path)
            if depois != tam:
                raise ErroHTTP(0, f'tamanho no Storage {depois} ≠ local {tam}')
            st, _ = chamar(f'{base}/storage/v1/object/public/{BUCKET}/' + '/'.join(urllib.parse.quote(p) for p in path.split('/')))
            if st == 200:
                raise ErroHTTP(200, 'ALERTA: a URL PÚBLICA do objeto abriu — o bucket não está privado')
            reg['publica_negada'] = st
        except (ErroHTTP, OSError, urllib.error.URLError) as e:
            reg['resultado'] = 'falha'; reg['detalhe'] = str(e)[:200]; falhas += 1
        log.append(reg); print(f"  {reg['resultado']:>10}  {path}  {tam} B  sha256={reg['sha256'][:16]}…" + (f"  ({reg['detalhe']})" if reg['detalhe'] else ''))
    agora = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    destino = os.path.join(os.path.dirname(os.path.abspath(a.pasta)), 'enviado.json')
    with open(destino, 'w', encoding='utf-8') as f:
        json.dump({'quando': agora, 'projeto': urllib.parse.urlparse(base).hostname.split('.')[0], 'bucket': BUCKET, 'itens': log}, f, ensure_ascii=False, indent=1)
    print(f'registro: {destino}')
    if falhas:
        print(f'{falhas} arquivo(s) FALHARAM; os que passaram ficam no bucket. Corrija e rode de novo (os já enviados são pulados).'); return 1
    print(f'OK: {len(log)} arquivo(s) no bucket privado. NÃO publicado: falta definir RM_AUDIO_MANIFEST/RM_PILOT_AUDIO_UIDS no Netlify (decisão separada).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
