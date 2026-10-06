"""Download em lote do Drive: testes contra um Google FALSO em 127.0.0.1 (OIDC → STS → IAM → Drive). Provam a lógica (listagem, paginação, subpastas, arquivo > 30 MiB, retomada,
checksum, falha por arquivo, renovação de token, configuração ausente). NÃO provam o acesso ao Drive real: isso só acontece na execução do workflow com credenciais configuradas."""
import hashlib, http.server, json, os, shutil, socketserver, sys, tempfile, threading, unittest, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import drive_baixar as D

PROVIDER = 'projects/123456789012/locations/global/workloadIdentityPools/github-repasso/providers/github'
CONTA = 'audiobooks-leitor@repasso-audiobooks.iam.gserviceaccount.com'
PASTA = '1APjpeMTDGrBzytbZSKcsxi704PniIEmT'
FOLDER = 'application/vnd.google-apps.folder'


class Falso:
    """Google de mentira. `arq`: id → dict(name, mime, data, parent, sem_checksum, corrompe, corta_em, erro500, expira_uma_vez)."""
    def __init__(self):
        self.arq, self.log, self.nega_pasta, self.sts_ok, self.tokens = {}, [], False, True, 0
        self.pastas = {PASTA: {'name': 'Audiobooks', 'mime': FOLDER, 'parent': None}}
        outer = self

        class H(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *a): pass

            def _json(self, cod, obj):
                b = json.dumps(obj).encode()
                self.send_response(cod); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

            def do_GET(self):
                u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query); outer.log.append(('GET', u.path))
                if u.path == '/oidc':
                    if self.headers.get('Authorization') != 'Bearer req-token': return self._json(401, {'error': 'x'})
                    outer.aud = q.get('audience', [''])[0]; return self._json(200, {'value': 'jwt.github.fake'})
                if not u.path.startswith('/drive/files'): return self._json(404, {'error': 'x'})
                if self.headers.get('Authorization') != f'Bearer drive-token-{outer.tokens}': return self._json(401, {'error': {'message': 'token inválido'}})
                resto = u.path[len('/drive/files'):].strip('/')
                if resto == '':
                    pai = q['q'][0].split("'")[1]
                    todos = [dict(id=i, name=f['name'], mimeType=f.get('mime', 'audio/mp4'), **outer._meta(f)) for i, f in {**outer.pastas, **outer.arq}.items() if f['parent'] == pai]
                    todos.sort(key=lambda x: x['name']); ini = int(q.get('pageToken', ['0'])[0]); pag = todos[ini:ini + 2]     # página de 2 para exercitar a paginação
                    out = {'files': pag}
                    if ini + 2 < len(todos): out['nextPageToken'] = str(ini + 2)
                    return self._json(200, out)
                if resto in outer.pastas:
                    if outer.nega_pasta: return self._json(404, {'error': {'message': 'File not found'}})
                    return self._json(200, {'id': resto, 'name': outer.pastas[resto]['name'], 'mimeType': FOLDER})
                f = outer.arq.get(resto)
                if not f: return self._json(404, {'error': {'message': 'File not found'}})
                if q.get('alt') != ['media']: return self._json(200, dict(id=resto, name=f['name'], **outer._meta(f)))
                outer.log.append(('MEDIA', resto, self.headers.get('Range')))
                if f.get('erro500') and f['erro500'] > 0:
                    f['erro500'] -= 1; return self._json(500, {'error': {'message': 'backend'}})
                if f.get('expira_uma_vez'):
                    f['expira_uma_vez'] = False; outer.tokens += 1; return self._json(401, {'error': {'message': 'token expirado'}})
                dados = f['data'] if not f.get('corrompe') else b'X' + f['data'][1:]
                ini = 0; rng = self.headers.get('Range')
                if rng: ini = int(rng.split('=')[1].split('-')[0])
                corpo = dados[ini:]
                self.send_response(206 if rng else 200); self.send_header('Content-Length', str(len(corpo)))
                if rng: self.send_header('Content-Range', f'bytes {ini}-{len(dados) - 1}/{len(dados)}')
                self.end_headers()
                if f.get('corta_em') and not rng:                        # 1ª tentativa: manda só parte e derruba a conexão
                    self.wfile.write(corpo[:f['corta_em']]); self.wfile.flush(); f['corta_em'] = 0; self.close_connection = True; return
                self.wfile.write(corpo)

            def do_POST(self):
                n = int(self.headers.get('Content-Length', 0)); corpo = self.rfile.read(n).decode(); outer.log.append(('POST', self.path))
                if self.path == '/sts':
                    f = urllib.parse.parse_qs(corpo)
                    if not outer.sts_ok or f.get('subject_token') != ['jwt.github.fake'] or f.get('audience') != ['//iam.googleapis.com/' + PROVIDER]: return self._json(403, {'error': 'denied', 'error_description': 'condição de atributos'})
                    return self._json(200, {'access_token': 'fed-token'})
                if self.path.startswith('/iam/projects/-/serviceAccounts/') and self.path.endswith(':generateAccessToken'):
                    if self.headers.get('Authorization') != 'Bearer fed-token': return self._json(403, {'error': {'message': 'denied'}})
                    outer.escopo = json.loads(corpo)['scope']; outer.tokens += 1; return self._json(200, {'accessToken': f'drive-token-{outer.tokens}'})
                self._json(404, {'error': 'x'})

        self.srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); self.srv.daemon_threads = True
        self.porta = self.srv.server_address[1]; threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def _meta(self, f):
        if f.get('mime') == FOLDER or f['name'] in ('Pasta',): return {}
        d = f.get('data', b''); m = {'size': str(len(d)), 'modifiedTime': '2026-09-24T10:00:00.000Z', 'version': '7', 'headRevisionId': 'rev1'}
        if not f.get('sem_checksum'): m.update(md5Checksum=hashlib.md5(d).hexdigest(), sha1Checksum=hashlib.sha1(d).hexdigest(), sha256Checksum=hashlib.sha256(d).hexdigest())
        return m

    def add(self, id_, name, data=b'', parent=PASTA, **kw):
        self.arq[id_] = dict(name=name, data=data, parent=parent, **kw)

    def fim(self): self.srv.shutdown(); self.srv.server_close()


class Base(unittest.TestCase):
    def setUp(self):
        self.g = Falso(); self.tmp = tempfile.mkdtemp(prefix='rm-drive-')
        self.saida, self.rel = os.path.join(self.tmp, 'audio'), os.path.join(self.tmp, 'rel')
        b = f'http://127.0.0.1:{self.g.porta}'
        self.ant = dict(D.ENDPOINTS); D.ENDPOINTS.update(drive=b + '/drive', sts=b + '/sts', iam=b + '/iam')
        self.env = {'ACTIONS_ID_TOKEN_REQUEST_URL': b + '/oidc?api-version=2.0', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN': 'req-token', 'RM_GDRIVE_WIF_PROVIDER': PROVIDER, 'RM_GDRIVE_SERVICE_ACCOUNT': CONTA}
        self.salvo = {k: os.environ.get(k) for k in list(self.env) + ['GITHUB_ACTIONS', 'GITHUB_WORKSPACE', 'GITHUB_STEP_SUMMARY']}
        os.environ.update(self.env)
        for k in ('GITHUB_ACTIONS', 'GITHUB_WORKSPACE', 'GITHUB_STEP_SUMMARY'): os.environ.pop(k, None)
        self.sleep = D.time.sleep; D.time.sleep = lambda s: None
        self.esperado = os.path.join(self.tmp, 'nenhum.json')

    def tearDown(self):
        D.time.sleep = self.sleep; D.ENDPOINTS.clear(); D.ENDPOINTS.update(self.ant)
        for k, v in self.salvo.items():
            if v is None: os.environ.pop(k, None)
            else: os.environ[k] = v
        self.g.fim(); shutil.rmtree(self.tmp, ignore_errors=True)

    def roda(self, **kw):
        args = ['--saida', self.saida, '--relatorio', self.rel, '--esperado-json', self.esperado] + sum([[f'--{k.replace("_", "-")}', str(v)] for k, v in kw.items()], [])
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf): cod = D.main(args)
        with open(os.path.join(self.rel, 'relatorio-transporte.json'), encoding='utf-8') as f: return cod, json.load(f), buf.getvalue()

    def quatro(self):
        self.dados = {'a': os.urandom(300_000), 'b': os.urandom(12_345), 'c': os.urandom(5), 'grande': os.urandom(31 * 1024 * 1024 + 123)}     # o maior passa de 30 MiB
        self.g.add('idA' + 'a' * 10, 'Semio_EPOC (1).m4a', self.dados['a'])
        self.g.add('idB' + 'b' * 10, 'Semio - 3 Sindrome (1).m4a', self.dados['b'])
        self.g.pastas['sub' + 's' * 10] = {'name': 'Pasta', 'mime': FOLDER, 'parent': PASTA}
        self.g.add('idC' + 'c' * 10, 'Semio_pleural (1).m4a', self.dados['c'], parent='sub' + 's' * 10)                      # em subpasta
        self.g.add('idG' + 'g' * 10, 'Semio_-_Motivo (1).m4a', self.dados['grande'])
        self.g.add('idD' + 'd' * 10, 'Notas.txt', b'texto', mime='text/plain')                                                                    # não é áudio
        self.g.arq['idX' + 'x' * 10] = dict(name='Doc nativo', data=b'', parent=PASTA, mime='application/vnd.google-apps.document')


class Transporte(Base):
    def test_lote_completo_incluindo_maior_que_30MiB(self):
        self.quatro()
        cod, rel, out = self.roda()
        self.assertEqual(cod, 0, rel['mensagem']); self.assertEqual(rel['resultado'], 'PROVADO')
        self.assertEqual(rel['resumo']['listados'], 4); self.assertEqual(rel['resumo']['baixados_ok'], 4); self.assertEqual(rel['resumo']['acima_de_30MiB_ok'], 1)
        self.assertEqual({i['motivo'].split(' (')[0] for i in rel['ignorados']}, {'não é áudio', 'arquivo nativo do Google'})
        for r in rel['arquivos']:
            self.assertEqual(r['status'], 'ok'); self.assertEqual(r['verificacao'], 'tamanho + sha256/sha1/md5')
            arq = os.path.join(self.saida, r['id'], r['nome_original']); self.assertTrue(os.path.isfile(arq)); self.assertFalse(os.path.exists(arq + '.part'))
            esperado = next(v for v in self.dados.values() if hashlib.sha256(v).hexdigest() == r['hashes_locais']['sha256'])
            with open(arq, 'rb') as f: self.assertEqual(f.read(), esperado)
        self.assertTrue(any(r['acima_de_30MiB'] and r['tamanho_local'] > 30 * 1024 * 1024 for r in rel['arquivos']))
        self.assertIn('SIMULADO', rel['mensagem'])                                       # contra o falso nunca se afirma «Drive real»
        self.assertEqual(self.g.escopo, [D.ESCOPO]); self.assertEqual(self.g.aud, 'https://iam.googleapis.com/' + PROVIDER)
        self.assertFalse(any('drive-token' in open(os.path.join(self.rel, n), encoding='utf-8').read() for n in os.listdir(self.rel)))   # nenhum token no relatório
        self.assertEqual(sorted(os.listdir(self.rel)), ['relatorio-transporte.json', 'relatorio-transporte.md'])             # relatório separado, sem áudio

    def test_retoma_download_cortado_no_meio(self):
        self.g.add('idA' + 'a' * 10, 'x (1).m4a', os.urandom(200_000), corta_em=70_000)
        cod, rel, _ = self.roda(esperados=1)
        self.assertEqual(cod, 0); r = rel['arquivos'][0]; self.assertEqual(r['tentativas'], 2)
        self.assertTrue(any(l[0] == 'MEDIA' and l[2] == 'bytes=70000-' for l in self.g.log))      # retomou do byte 70000 por Range

    def test_erro_500_transitorio_e_repetido(self):
        self.g.add('idA' + 'a' * 10, 'x (1).m4a', b'abc' * 1000, erro500=2)
        cod, rel, _ = self.roda(esperados=1); self.assertEqual(cod, 0); self.assertEqual(rel['arquivos'][0]['tentativas'], 3)

    def test_falha_de_um_arquivo_nao_impede_os_outros_e_nao_deixa_arquivo_corrompido(self):
        self.g.add('idA' + 'a' * 10, 'bom (1).m4a', os.urandom(5000)); self.g.add('idB' + 'b' * 10, 'ruim (1).m4a', os.urandom(5000), corrompe=True)
        cod, rel, _ = self.roda(esperados=2)
        self.assertEqual(cod, 1); self.assertEqual(rel['resultado'], 'FALHOU')
        st = {r['nome_original']: r for r in rel['arquivos']}
        self.assertEqual(st['bom (1).m4a']['status'], 'ok'); self.assertEqual(st['ruim (1).m4a']['status'], 'falha'); self.assertIn('checksum', st['ruim (1).m4a']['erro'])
        self.assertEqual(st['ruim (1).m4a']['tentativas'], 5)
        self.assertFalse(os.path.exists(os.path.join(self.saida, 'idB' + 'b' * 10, 'ruim (1).m4a')))     # nunca fica arquivo ruim com o nome final
        self.assertFalse(os.path.exists(os.path.join(self.saida, 'idB' + 'b' * 10, 'ruim (1).m4a.part')))

    def test_sem_checksum_do_drive_so_tamanho_e_fica_explicito(self):
        self.g.add('idA' + 'a' * 10, 'x (1).m4a', os.urandom(3000), sem_checksum=True)
        cod, rel, _ = self.roda(esperados=1); self.assertEqual(cod, 0)
        self.assertTrue(rel['arquivos'][0]['verificacao'].startswith('APENAS TAMANHO')); self.assertEqual(rel['resumo']['verificacao_so_tamanho'], ['x (1).m4a'])

    def test_token_expirado_no_meio_e_renovado(self):
        self.g.add('idA' + 'a' * 10, 'x (1).m4a', os.urandom(3000), expira_uma_vez=True)
        cod, rel, _ = self.roda(esperados=1); self.assertEqual(cod, 0); self.assertGreaterEqual(sum(1 for l in self.g.log if l == ('POST', '/sts')), 2)

    def test_menos_arquivos_que_o_esperado_nao_prova(self):
        self.g.add('idA' + 'a' * 10, 'x (1).m4a', b'abc' * 100)
        cod, rel, _ = self.roda(esperados=4); self.assertEqual(cod, 1); self.assertIn('esperados 4', rel['mensagem'])

    def test_divergencia_com_inventario_esperado_e_sinalizada(self):
        self.g.add('idA' + 'a' * 10, 'x (1).m4a', b'abc' * 100)
        with open(self.esperado, 'w', encoding='utf-8') as f: json.dump({'arquivos': [{'id': 'idA' + 'a' * 10, 'nome': 'x (1).m4a', 'tamanho': 999}, {'id': 'sumiu', 'nome': 'y', 'tamanho': 1}]}, f)
        cod, rel, _ = self.roda(esperados=1); self.assertEqual(cod, 0)
        self.assertTrue(rel['arquivos'][0]['esperado'].startswith('DIVERGE')); self.assertEqual(rel['esperados_ausentes'], ['sumiu'])


class Configuracao(Base):
    def test_sem_segredos_aguardando_configuracao_e_zero_rede(self):
        os.environ.pop('RM_GDRIVE_WIF_PROVIDER'); os.environ['RM_GDRIVE_SERVICE_ACCOUNT'] = ''
        cod, rel, out = self.roda(); self.assertEqual(cod, 3)
        self.assertEqual(rel['resultado'], 'AGUARDANDO CONFIGURAÇÃO'); self.assertIn('aguardando configuração', rel['mensagem']); self.assertEqual(rel['arquivos'], [])
        self.assertIn('GDRIVE_WIF_PROVIDER', rel['mensagem']); self.assertIn('GDRIVE_SERVICE_ACCOUNT', rel['mensagem']); self.assertEqual(self.g.log, [])
        self.assertFalse(os.path.exists(self.saida))

    def test_formato_invalido_recusado_sem_rede(self):
        os.environ['RM_GDRIVE_SERVICE_ACCOUNT'] = 'nao-e-conta'
        cod, rel, _ = self.roda(); self.assertEqual(cod, 2); self.assertEqual(self.g.log, [])

    def test_pasta_nao_compartilhada_da_mensagem_clara(self):
        self.g.nega_pasta = True
        cod, rel, _ = self.roda(); self.assertEqual(cod, 1); self.assertIn('Compartilhe a pasta', rel['mensagem']); self.assertEqual(rel['arquivos'], [])

    def test_google_recusa_a_federacao(self):
        self.g.sts_ok = False
        cod, rel, _ = self.roda(); self.assertEqual(cod, 1); self.assertIn('STS', rel['mensagem']); self.assertIn('condição de atributos', rel['mensagem'])

    def test_saida_dentro_do_repo_ou_workspace_recusada(self):
        for d in (os.path.join(os.path.dirname(os.path.abspath(__file__)), 'x'), ):
            self.assertEqual(D.main(['--saida', d, '--relatorio', os.path.join(self.tmp, 'r')]), 2)
        os.environ['GITHUB_WORKSPACE'] = self.tmp
        self.assertEqual(D.main(['--saida', os.path.join(self.tmp, 'a'), '--relatorio', os.path.join(self.tmp, 'r')]), 2)
        self.assertEqual(self.g.log, [])

    def test_mascara_tokens_nos_logs_do_actions(self):
        os.environ['GITHUB_ACTIONS'] = 'true'; self.g.add('idA' + 'a' * 10, 'x (1).m4a', b'abc' * 100)
        cod, rel, out = self.roda(esperados=1)
        for t in ('jwt.github.fake', 'fed-token', 'drive-token-1'): self.assertIn('::add-mask::' + t, out)
        self.assertNotIn('Bearer', out)

    def test_redirecionamento_nao_leva_o_token_a_hosts_fora_do_google(self):
        import urllib.request
        h = D._Redireciona(); req = urllib.request.Request('https://www.googleapis.com/x', headers={'Authorization': 'Bearer t'})
        novo = h.redirect_request(req, None, 302, 'Found', {}, 'https://evil.example.com/y'); self.assertFalse(novo.has_header('Authorization'))
        novo = h.redirect_request(req, None, 302, 'Found', {}, 'https://lh3.googleusercontent.com/y'); self.assertTrue(novo.has_header('Authorization'))

    def test_nome_de_arquivo_nao_escapa_do_diretorio(self):
        self.assertNotIn('/', D.nome_seguro('../../etc/passwd')); self.assertNotIn('..', D.nome_seguro('..'))


class Workflow(unittest.TestCase):
    CAMINHO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.github', 'workflows', 'audiobooks-drive.yml')

    def setUp(self):
        with open(self.CAMINHO, encoding='utf-8') as f: self.t = f.read()

    def test_so_manual_e_so_main_com_ambiente_e_limites(self):
        t = self.t
        self.assertIn('workflow_dispatch', t)
        for proibido in ('pull_request', 'pull_request_target', 'schedule:', 'workflow_run', 'push:', 'issue_comment'): self.assertNotIn(proibido, t.split('jobs:')[0].replace('name:', ''), proibido)
        self.assertIn('name: Processar audiobooks', t); self.assertIn('environment: audiobooks-drive', t); self.assertIn('refs/heads/main', t); self.assertIn('exit 1', t)
        self.assertIn('timeout-minutes:', t); self.assertIn('concurrency:', t); self.assertIn('retention-days:', t); self.assertIn('id-token: write', t)
        self.assertEqual(t.count('id-token: write'), 1); self.assertIn('persist-credentials: false', t)

    def test_nao_sobe_audio_nem_usa_segredos_alem_dos_dois(self):
        import re
        self.assertEqual(sorted(set(re.findall(r'secrets\.([A-Z_]+)', self.t))), ['GDRIVE_SERVICE_ACCOUNT', 'GDRIVE_WIF_PROVIDER'])
        up = self.t[self.t.index('uses: actions/upload-artifact'):].split('- name:')[0]
        self.assertIn('rm-relatorio', up); self.assertNotIn('rm-audio', up)                 # o artefato é só o relatório; os áudios ficam no runner
        for terceiros in ('google-github-actions', 'curl ', 'wget ', 'pip install', 'ANTHROPIC', 'OPENAI', 'SUPABASE'): self.assertNotIn(terceiros, self.t)
        self.assertEqual(sorted(set(re.findall(r'uses: ([\w./-]+)@', self.t))), ['actions/checkout', 'actions/upload-artifact'])


if __name__ == '__main__':
    unittest.main()
