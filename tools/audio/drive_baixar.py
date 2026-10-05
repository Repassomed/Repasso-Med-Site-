#!/usr/bin/env python3
"""Download EM LOTE dos áudios de uma pasta PRIVADA do Google Drive pela API oficial (Drive v3, `alt=media`), com verificação de tamanho e checksum.

Autenticação (sem chave de longa duração, sem token do ambiente Claude): **Workload Identity Federation** do Google. No GitHub Actions o job pede um token OIDC ao GitHub,
troca-o no STS do Google e obtém, por impersonação de uma CONTA DE SERVIÇO dedicada, um access token de 30 min com o escopo `drive.readonly`. A conta de serviço só enxerga o que
o José compartilhar com ela (a pasta de áudios, como Leitor). Nada é tornado público e nenhuma permissão é criada por este script.

  RM_GDRIVE_WIF_PROVIDER=projects/<n>/locations/global/workloadIdentityPools/<pool>/providers/<prov>   RM_GDRIVE_SERVICE_ACCOUNT=<conta>@<projeto>.iam.gserviceaccount.com \\
  python3 tools/audio/drive_baixar.py --saida $RUNNER_TEMP/rm-audio --relatorio $RUNNER_TEMP/rm-relatorio

Só biblioteca padrão (sem pip). Os áudios ficam em `--saida` (FORA do checkout; recusado se estiver dentro de um repositório ou do GITHUB_WORKSPACE); o RELATÓRIO (nomes, tamanhos,
checksums, resultado por arquivo — sem áudio e sem credenciais) vai para `--relatorio`. Sai com 0 = transporte PROVADO; 1 = falhou; 2 = uso/segurança; 3 = aguardando configuração.
Esta etapa NÃO converte, NÃO transcreve e NÃO publica nada.
"""
import argparse, datetime, hashlib, http.client as httpclient, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

PASTA_PADRAO = '1APjpeMTDGrBzytbZSKcsxi704PniIEmT'
ESCOPO = 'https://www.googleapis.com/auth/drive.readonly'
LIMITE_BUCKET = 30 * 1024 * 1024                        # 30 MiB: limite do bucket `audiobooks` (só para sinalizar os maiores)
ENDPOINTS = {'drive': 'https://www.googleapis.com/drive/v3', 'sts': 'https://sts.googleapis.com/v1/token', 'iam': 'https://iamcredentials.googleapis.com/v1'}   # os testes trocam por 127.0.0.1
RE_PROVIDER = re.compile(r'^projects/\d+/locations/global/workloadIdentityPools/[a-z0-9-]{4,32}/providers/[a-z0-9-]{4,32}$')
RE_SA = re.compile(r'^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]{4,28}[a-z0-9]\.iam\.gserviceaccount\.com$')
RE_ID = re.compile(r'^[A-Za-z0-9_-]{10,80}$')
CAMPOS = 'id,name,mimeType,size,md5Checksum,sha1Checksum,sha256Checksum,modifiedTime,version,headRevisionId,trashed'
CHUNK = 4 * 1024 * 1024


class Falha(Exception):
    pass


class ErroHTTP(Falha):
    def __init__(self, status, resumo):
        super().__init__(f'HTTP {status}: {resumo}')
        self.status = status


def mascara(valor):
    """Pede ao GitHub Actions que oculte `valor` nos logs (os logs deste repositório são PÚBLICOS)."""
    if valor and os.environ.get('GITHUB_ACTIONS'):
        print(f'::add-mask::{valor}', flush=True)
    return valor


HOSTS_CONFIAVEIS = ('.googleapis.com', '.googleusercontent.com', '.google.com')


class _Redireciona(urllib.request.HTTPRedirectHandler):
    """Segue redirecionamentos, mas só leva o token (Authorization) para hosts do Google e para o 127.0.0.1 dos testes."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        novo = super().redirect_request(req, fp, code, msg, headers, newurl)
        if novo is not None:
            host = urllib.parse.urlparse(newurl).hostname or ''
            if not (host.endswith(HOSTS_CONFIAVEIS) or host in ('127.0.0.1', 'localhost')):
                novo.remove_header('Authorization')
        return novo


_OPENER = urllib.request.build_opener(_Redireciona)


def http(url, metodo='GET', headers=None, dados=None, timeout=60):
    req = urllib.request.Request(url, data=dados, method=metodo, headers=headers or {})
    try:
        return _OPENER.open(req, timeout=timeout)
    except urllib.error.HTTPError as e:
        corpo = ''
        try:
            j = json.loads(e.read().decode('utf-8', 'replace'))
            err = j.get('error')
            corpo = (err.get('message') if isinstance(err, dict) else err) or j.get('error_description') or ''
        except Exception:
            pass
        raise ErroHTTP(e.code, str(corpo)[:200])


def http_json(url, **kw):
    with http(url, **kw) as r:
        return json.loads(r.read().decode('utf-8'))


# ------------------------------------------------------------------------------------------------ autenticação
def token_wif(provider, conta):
    """GitHub OIDC → STS do Google → access token da conta de serviço (escopo drive.readonly). Nenhuma chave guardada em lugar nenhum."""
    url, req_tok = os.environ.get('ACTIONS_ID_TOKEN_REQUEST_URL'), os.environ.get('ACTIONS_ID_TOKEN_REQUEST_TOKEN')
    if not url or not req_tok:
        raise Falha('sem token OIDC do GitHub: o job precisa de `permissions: id-token: write` (e rodar no GitHub Actions)')
    aud = 'https://iam.googleapis.com/' + provider
    sep = '&' if '?' in url else '?'
    jwt = mascara(http_json(url + sep + 'audience=' + urllib.parse.quote(aud, safe=''), headers={'Authorization': 'Bearer ' + req_tok, 'Accept': 'application/json'})['value'])
    corpo = urllib.parse.urlencode({'grant_type': 'urn:ietf:params:oauth:grant-type:token-exchange', 'audience': '//iam.googleapis.com/' + provider, 'scope': 'https://www.googleapis.com/auth/cloud-platform',
                                    'requested_token_type': 'urn:ietf:params:oauth:token-type:access_token', 'subject_token_type': 'urn:ietf:params:oauth:token-type:jwt', 'subject_token': jwt}).encode()
    try:
        fed = mascara(http_json(ENDPOINTS['sts'], metodo='POST', dados=corpo, headers={'Content-Type': 'application/x-www-form-urlencoded'})['access_token'])
    except ErroHTTP as e:
        raise Falha(f'o Google recusou a troca do token do GitHub (STS, {e}). Confira o provedor do Workload Identity Federation e a condição de atributos (repositório, ambiente, branch).')
    try:
        j = http_json(f"{ENDPOINTS['iam']}/projects/-/serviceAccounts/{urllib.parse.quote(conta, safe='@')}:generateAccessToken", metodo='POST',
                      dados=json.dumps({'scope': [ESCOPO], 'lifetime': '1800s'}).encode(), headers={'Authorization': 'Bearer ' + fed, 'Content-Type': 'application/json'})
    except ErroHTTP as e:
        raise Falha(f'o Google recusou emitir o token da conta de serviço ({e}). Confira se a API "IAM Service Account Credentials" está ativada e se a conta tem o papel '
                    '"Workload Identity User" para o repositório.')
    return mascara(j['accessToken'])


class Sessao:
    def __init__(self, provider, conta, token_fn=token_wif):
        self.provider, self.conta, self.token_fn, self.token = provider, conta, token_fn, None

    def autenticar(self):
        self.token = self.token_fn(self.provider, self.conta)

    def pedir(self, url, headers=None, tentar_renovar=True, **kw):
        h = dict(headers or {}); h['Authorization'] = 'Bearer ' + self.token
        try:
            return http(url, headers=h, **kw)
        except ErroHTTP as e:
            if e.status == 401 and tentar_renovar:                 # token de 30 min venceu no meio de um lote longo
                self.autenticar()
                return self.pedir(url, headers=headers, tentar_renovar=False, **kw)
            raise


# ------------------------------------------------------------------------------------------------ listagem
def drive_url(caminho, **params):
    return ENDPOINTS['drive'] + caminho + ('?' + urllib.parse.urlencode(params) if params else '')


def pasta_info(s, pasta_id):
    try:
        with s.pedir(drive_url('/files/' + pasta_id, fields='id,name,mimeType,trashed,capabilities(canListChildren)', supportsAllDrives='true')) as r:
            j = json.loads(r.read().decode('utf-8'))
    except ErroHTTP as e:
        if e.status in (403, 404):
            raise Falha(f'a pasta {pasta_id} não é visível para a conta de serviço (a API responde {e.status} tanto para "não existe" quanto para "não compartilhada"). '
                        'Compartilhe a pasta com o e-mail da conta de serviço como Leitor.')
        raise
    if j.get('mimeType') != 'application/vnd.google-apps.folder':
        raise Falha(f'o ID {pasta_id} não é uma pasta do Drive ({j.get("mimeType")})')
    return j


def listar(s, pasta_id, max_profundidade=4):
    """Todos os arquivos binários da pasta (e subpastas). Devolve (audios, ignorados). Áudio = extensão .m4a/.mp3/.wav/.aac/.flac ou mimeType audio/*."""
    audios, ignorados, fila = [], [], [(pasta_id, 0, '')]
    while fila:
        atual, prof, rel = fila.pop(0)
        token = None
        while True:
            params = dict(q=f"'{atual}' in parents and trashed=false", fields=f'nextPageToken,files({CAMPOS})', pageSize=1000, supportsAllDrives='true', includeItemsFromAllDrives='true', orderBy='name')
            if token:
                params['pageToken'] = token
            with s.pedir(drive_url('/files', **params)) as r:
                j = json.loads(r.read().decode('utf-8'))
            for f in j.get('files', []):
                caminho = (rel + '/' if rel else '') + f['name']
                if f['mimeType'] == 'application/vnd.google-apps.folder':
                    if prof < max_profundidade:
                        fila.append((f['id'], prof + 1, caminho))
                    continue
                if f['mimeType'].startswith('application/vnd.google-apps.'):          # Docs/Sheets: sem conteúdo binário (a API não os baixa com alt=media)
                    ignorados.append({'id': f['id'], 'caminho': caminho, 'motivo': 'arquivo nativo do Google (não é áudio)'}); continue
                if f['name'].lower().endswith(('.m4a', '.mp3', '.wav', '.aac', '.flac')) or f['mimeType'].startswith('audio/'):
                    f['caminho'] = caminho
                    audios.append(f)
                else:
                    ignorados.append({'id': f['id'], 'caminho': caminho, 'motivo': 'não é áudio (' + f['mimeType'] + ')'})
            token = j.get('nextPageToken')
            if not token:
                break
    return audios, ignorados


# ------------------------------------------------------------------------------------------------ download
def nome_seguro(nome):
    n = re.sub(r'[\x00-\x1f/\\:*?"<>|]', '_', nome).strip().strip('.') or 'audio'
    return n[:180]


def hashes(caminho):
    m, s1, s2 = hashlib.md5(), hashlib.sha1(), hashlib.sha256()
    with open(caminho, 'rb') as f:
        while True:
            b = f.read(1 << 20)
            if not b:
                break
            m.update(b); s1.update(b); s2.update(b)
    return {'md5': m.hexdigest(), 'sha1': s1.hexdigest(), 'sha256': s2.hexdigest()}


def verifica(item, caminho):
    """Confere o arquivo local com o que o Drive informa. Devolve (ok, checagens, hashes_locais). Sem checksum do Drive só o tamanho é conferido — e isso fica explícito."""
    h = hashes(caminho); tam = os.path.getsize(caminho)
    chk = {'tamanho': {'drive': int(item['size']) if item.get('size') else None, 'local': tam}}
    chk['tamanho']['ok'] = chk['tamanho']['drive'] is not None and chk['tamanho']['drive'] == tam
    forte = False
    for alg, campo in (('sha256', 'sha256Checksum'), ('sha1', 'sha1Checksum'), ('md5', 'md5Checksum')):
        if item.get(campo):
            chk[alg] = {'drive': item[campo].lower(), 'local': h[alg], 'ok': item[campo].lower() == h[alg]}; forte = True
    ok = all(c['ok'] for c in chk.values())
    chk['verificacao'] = 'tamanho + ' + '/'.join(a for a in ('sha256', 'sha1', 'md5') if a in chk) if forte else 'APENAS TAMANHO (o Drive não informou checksum)'
    return ok, chk, h


def baixar_um(s, item, pasta_destino, tentativas=5, espera=2.0):
    """Baixa um arquivo (com retomada por Range e novas tentativas). Nunca deixa um arquivo meio baixado com o nome final."""
    os.makedirs(pasta_destino, exist_ok=True)
    final = os.path.join(pasta_destino, nome_seguro(item['name'])); parcial = final + '.part'
    reg = {'id': item['id'], 'nome_original': item['name'], 'caminho_no_drive': item.get('caminho', item['name']), 'mimeType': item['mimeType'], 'modifiedTime': item.get('modifiedTime'),
           'version': item.get('version'), 'headRevisionId': item.get('headRevisionId'), 'tamanho_drive': int(item['size']) if item.get('size') else None,
           'acima_de_30MiB': bool(item.get('size') and int(item['size']) > LIMITE_BUCKET), 'status': 'falha', 'tentativas': 0, 'erro': None}
    t0 = time.time(); ultimo = None
    for n in range(1, tentativas + 1):
        reg['tentativas'] = n
        try:
            if os.path.exists(parcial) and n > 1 and reg['tamanho_drive'] and os.path.getsize(parcial) > reg['tamanho_drive']:
                os.remove(parcial)
            inicio = os.path.getsize(parcial) if os.path.exists(parcial) else 0
            hdr = {'Range': f'bytes={inicio}-'} if inicio else {}
            if not (inicio and inicio == reg['tamanho_drive']):         # parcial já com o tamanho todo: só verificar
                with s.pedir(drive_url('/files/' + item['id'], alt='media', supportsAllDrives='true'), headers=hdr, timeout=120) as r:
                    modo = 'ab' if (inicio and r.status == 206) else 'wb'
                    with open(parcial, modo) as f:
                        while True:
                            try:
                                b = r.read(CHUNK)
                            except httpclient.IncompleteRead as ie:        # conexão caiu no meio: guarda o que chegou e retoma dali por Range
                                f.write(ie.partial); f.flush()
                                raise
                            if not b:
                                break
                            f.write(b)
            tam_local = os.path.getsize(parcial)
            if reg['tamanho_drive'] and tam_local < reg['tamanho_drive']:      # a conexão fechou cedo sem erro: mantém o parcial e retoma dali
                raise Falha(f'download incompleto ({tam_local} de {reg["tamanho_drive"]} B); retomando')
            ok, chk, h = verifica(item, parcial)
            reg['checagens'] = chk
            if not ok:
                os.remove(parcial)                                  # arquivo NOSSO (diretório temporário desta execução); recomeça do zero
                raise Falha('tamanho/checksum diferente do informado pelo Drive: ' + ', '.join(k for k, v in chk.items() if isinstance(v, dict) and not v.get('ok')))
            os.replace(parcial, final)
            reg.update(status='ok', erro=None, tamanho_local=os.path.getsize(final), hashes_locais=h, verificacao=chk['verificacao'], caminho_local=os.path.relpath(final, pasta_destino))
            break
        except ErroHTTP as e:
            ultimo = str(e)
            if e.status in (400, 403, 404):                          # permissão/arquivo: repetir não ajuda
                break
        except (Falha, OSError, urllib.error.URLError, ConnectionError, TimeoutError, httpclient.HTTPException) as e:
            ultimo = f'{type(e).__name__}: {e}'
        if n < tentativas:
            time.sleep(min(espera * (2 ** (n - 1)), 30))
    if reg['status'] != 'ok':
        reg['erro'] = (ultimo or 'falha desconhecida')[:300]
    seg = round(time.time() - t0, 1); reg['segundos'] = seg
    if reg['status'] == 'ok' and seg > 0:
        reg['MB_por_s'] = round(reg['tamanho_local'] / 1048576 / seg, 2)
    return reg


# ------------------------------------------------------------------------------------------------ relatório
def resumo_md(rel):
    sel = {'PROVADO': 'PROVADO', 'FALHOU': 'FALHOU', 'AGUARDANDO CONFIGURAÇÃO': 'AGUARDANDO CONFIGURAÇÃO'}[rel['resultado']]
    L = [f'## Transporte de áudios do Drive — {sel}', '', rel['mensagem'], '']
    if rel.get('arquivos'):
        L += ['| Arquivo (Drive) | Tamanho | > 30 MiB | Verificação | SHA-256 local | Tentativas | Tempo | Resultado |', '|---|---|---|---|---|---|---|---|']
        for a in rel['arquivos']:
            L.append(f"| {a['nome_original']} | {a['tamanho_drive']} B | {'sim' if a['acima_de_30MiB'] else 'não'} | {a.get('verificacao', '—')} | `{(a.get('hashes_locais') or {}).get('sha256', '—')[:16]}…` | "
                     f"{a['tentativas']} | {a['segundos']} s | {'**ok**' if a['status'] == 'ok' else '**FALHA** — ' + str(a['erro'])} |")
        L.append('')
    L.append('Esta etapa só prova o TRANSPORTE: nada foi convertido, transcrito, publicado ou enviado ao Storage/Supabase; os áudios não saem da máquina do runner (não entram no artefato).')
    return '\n'.join(L) + '\n'


def grava_relatorio(dir_rel, rel):
    os.makedirs(dir_rel, exist_ok=True)
    with open(os.path.join(dir_rel, 'relatorio-transporte.json'), 'w', encoding='utf-8') as f:
        json.dump(rel, f, ensure_ascii=False, indent=2)
    md = resumo_md(rel)
    with open(os.path.join(dir_rel, 'relatorio-transporte.md'), 'w', encoding='utf-8') as f:
        f.write(md)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write(md)
    print(md)


def dentro_de_repo_ou_workspace(caminho):
    p = os.path.realpath(os.path.abspath(os.path.expanduser(caminho)))
    ws = os.environ.get('GITHUB_WORKSPACE')
    if ws and (p == os.path.realpath(ws) or p.startswith(os.path.realpath(ws) + os.sep)):
        return True
    while True:
        if os.path.exists(os.path.join(p, '.git')):
            return True
        pai = os.path.dirname(p)
        if pai == p:
            return False
        p = pai


def esperados_do_json(caminho):
    if not caminho or not os.path.isfile(caminho):
        return {}
    with open(caminho, encoding='utf-8') as f:
        return {x['id']: x for x in json.load(f)['arquivos']}


def main(argv=None, token_fn=token_wif):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pasta-id', default=PASTA_PADRAO); ap.add_argument('--saida', required=True, help='onde guardar os áudios (FORA do checkout/repositório)')
    ap.add_argument('--relatorio', required=True, help='pasta do relatório (sem áudio)'); ap.add_argument('--esperados', type=int, default=4, help='quantidade mínima de áudios a listar/baixar (padrão 4)')
    ap.add_argument('--esperado-json', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'drive_esperado.json'), help='inventário esperado (só para sinalizar divergência)')
    ap.add_argument('--tentativas', type=int, default=5)
    a = ap.parse_args(argv)
    agora = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    rel = {'gerado_em': agora, 'pasta_id': a.pasta_id, 'resultado': 'FALHOU', 'mensagem': '', 'arquivos': [], 'ignorados': [], 'execucao': {k: os.environ.get(k) for k in ('GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'GITHUB_SHA', 'GITHUB_REF')}}
    if not RE_ID.match(a.pasta_id):
        print('ERRO: --pasta-id inválido.'); return 2
    for d in (a.saida, a.relatorio):
        if dentro_de_repo_ou_workspace(d):
            print(f'RECUSADO: {d} está dentro de um repositório git ou do GITHUB_WORKSPACE (áudios e relatórios ficam em diretório temporário separado).'); return 2
    provider, conta = os.environ.get('RM_GDRIVE_WIF_PROVIDER', '').strip(), os.environ.get('RM_GDRIVE_SERVICE_ACCOUNT', '').strip()
    faltam = [n for n, v in (('GDRIVE_WIF_PROVIDER', provider), ('GDRIVE_SERVICE_ACCOUNT', conta)) if not v]
    if faltam:
        rel.update(resultado='AGUARDANDO CONFIGURAÇÃO', mensagem='**Implementado, aguardando configuração.** Nenhum arquivo foi baixado. Faltam os segredos do ambiente `audiobooks-drive`: ' + ', '.join(f'`{n}`' for n in faltam)
                   + '. Siga `tools/audio/CONFIGURAR-DRIVE-ACTIONS.md`.')
        grava_relatorio(a.relatorio, rel); return 3
    if not RE_PROVIDER.match(provider) or not RE_SA.match(conta):
        rel['mensagem'] = 'Formato inválido em `GDRIVE_WIF_PROVIDER` (esperado `projects/<número>/locations/global/workloadIdentityPools/<pool>/providers/<provedor>`) ou `GDRIVE_SERVICE_ACCOUNT` (esperado `<nome>@<projeto>.iam.gserviceaccount.com`).'
        grava_relatorio(a.relatorio, rel); return 2
    mascara(conta); mascara(provider)
    s = Sessao(provider, conta, token_fn)
    try:
        s.autenticar()
        info = pasta_info(s, a.pasta_id)
        audios, ignorados = listar(s, a.pasta_id)
    except Falha as e:
        rel['mensagem'] = f'Falha antes do download: {e}'; grava_relatorio(a.relatorio, rel); return 1
    rel['pasta_nome'] = info.get('name'); rel['ignorados'] = ignorados
    esperado = esperados_do_json(a.esperado_json)
    print(f'{len(audios)} áudio(s) listado(s) em "{info.get("name")}" ({len(ignorados)} item(ns) ignorado(s)).', flush=True)
    for f in audios:                                              # um arquivo por vez, sempre TODOS (a falha de um não impede os demais)
        print(f"baixando {f['name']} ({f.get('size')} B)…", flush=True)
        r = baixar_um(s, f, os.path.join(a.saida, f['id']), tentativas=a.tentativas)
        e = esperado.get(f['id'])
        r['esperado'] = 'nao-listado-no-inventario' if not e else ('igual' if (e['nome'] == f['name'] and e['tamanho'] == r['tamanho_drive']) else 'DIVERGE (nome ou tamanho mudou desde o inventário)')
        rel['arquivos'].append(r)
        print(f"  → {r['status']}" + ('' if r['status'] == 'ok' else f" ({r['erro']})"), flush=True)
    rel['esperados_ausentes'] = sorted(set(esperado) - {f['id'] for f in audios})
    oks = [r for r in rel['arquivos'] if r['status'] == 'ok']
    grandes = [r for r in oks if r['acima_de_30MiB']]
    problemas = []
    if len(audios) < a.esperados:
        problemas.append(f'só {len(audios)} áudio(s) listado(s); esperados {a.esperados}')
    if len(oks) != len(rel['arquivos']):
        problemas.append(f'{len(rel["arquivos"]) - len(oks)} arquivo(s) falharam')
    rel['resumo'] = {'listados': len(audios), 'baixados_ok': len(oks), 'falhas': len(rel['arquivos']) - len(oks), 'bytes_ok': sum(r['tamanho_local'] for r in oks), 'acima_de_30MiB_ok': len(grandes),
                     'verificacao_so_tamanho': [r['nome_original'] for r in oks if r['verificacao'].startswith('APENAS')]}
    if problemas:
        rel['mensagem'] = 'Transporte NÃO provado: ' + '; '.join(problemas) + '.'
    else:
        real = ENDPOINTS['drive'].startswith('https://www.googleapis.com/')
        rel.update(resultado='PROVADO', mensagem=('' if real else '**SIMULADO (endpoints de teste, não é o Drive real).** ') + f'{len(oks)} áudio(s) baixado(s) por completo e verificados (tamanho + checksum do Drive); {len(grandes)} deles maior(es) que 30 MiB. '
                   'O bloqueio de 10 MB do conector não se aplica a esta via (API oficial `alt=media`).' + (' Divergências com o inventário esperado: ver relatório.' if any(r['esperado'].startswith('DIVERGE') for r in rel['arquivos']) or rel['esperados_ausentes'] else ''))
    grava_relatorio(a.relatorio, rel)
    return 0 if rel['resultado'] == 'PROVADO' else 1


if __name__ == '__main__':
    sys.exit(main())
