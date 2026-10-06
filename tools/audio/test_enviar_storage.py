"""enviar_storage.py contra um Supabase Storage FALSO (127.0.0.1). Prova a lógica: nada sobe sem APROVADO, sem bucket privado/30 MiB/M4A, sem chave; não sobrescreve;
confere tamanho e a negação da URL pública; a chave nunca aparece. NÃO prova o upload ao Supabase real."""
import contextlib, http.server, io, json, os, shutil, socketserver, subprocess, sys, tempfile, threading, unittest, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import enviar_storage as E
import preparar_audiobooks as P

CHAVE = 'eyJ-chave-service-role-FALSA-nao-vazar-0123456789'


def gera(dst, dur=12, freq=300):
    subprocess.run([P.ff(), '-y', '-v', 'error', '-f', 'lavfi', '-i', f'sine=frequency={freq}:duration={dur}', '-ac', '1', '-ar', '32000', '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', '48k', '-movflags', '+faststart', dst], check=True)


class Falso:
    def __init__(self):
        self.bucket = {'id': 'audiobooks', 'public': False, 'file_size_limit': 31457280, 'allowed_mime_types': ['audio/mp4', 'audio/x-m4a']}
        self.existe = True; self.objs = {}; self.log = []; self.publica_abre = False; self.falha_upload = set(); self.corta = False
        o = self

        class H(http.server.BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *a): pass

            def _j(self, cod, obj):
                b = json.dumps(obj).encode(); self.send_response(cod); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

            def _auth(self): return self.headers.get('Authorization') == 'Bearer ' + CHAVE and self.headers.get('apikey') == CHAVE

            def do_GET(self):
                o.log.append(('GET', self.path))
                if self.path == '/storage/v1/bucket/audiobooks':
                    if not self._auth(): return self._j(401, {'message': 'x'})
                    return self._j(200, o.bucket) if o.existe else self._j(404, {'message': 'Bucket not found'})
                if self.path.startswith('/storage/v1/object/public/audiobooks/'):
                    return self._j(200, {}) if o.publica_abre else self._j(400, {'statusCode': '404', 'error': 'Bucket not found'})
                self._j(404, {})

            def do_POST(self):
                n = int(self.headers.get('Content-Length', 0)); corpo = self.rfile.read(n); o.log.append(('POST', self.path, self.headers.get('x-upsert'), self.headers.get('Content-Type')))
                if not self._auth(): return self._j(401, {'message': 'x'})
                if self.path == '/storage/v1/object/list/audiobooks':
                    q = json.loads(corpo); pref = q['prefix'].strip('/'); res = []
                    for p, d in o.objs.items():
                        if p.rsplit('/', 1)[0] == pref and q['search'] in p.rsplit('/', 1)[1]: res.append({'name': p.rsplit('/', 1)[1], 'metadata': {'size': len(d)}})
                    return self._j(200, res)
                if self.path.startswith('/storage/v1/object/audiobooks/'):
                    p = urllib.parse.unquote(self.path[len('/storage/v1/object/audiobooks/'):])
                    if p in o.falha_upload: return self._j(500, {'message': 'erro interno'})
                    if p in o.objs and self.headers.get('x-upsert') != 'true': return self._j(400, {'statusCode': '409', 'message': 'The resource already exists'})
                    o.objs[p] = corpo[:-5] if o.corta else corpo
                    return self._j(200, {'Key': 'audiobooks/' + p})
                self._j(404, {})

        self.srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H); self.srv.daemon_threads = True
        self.url = f'http://127.0.0.1:{self.srv.server_address[1]}'; threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def fim(self): self.srv.shutdown(); self.srv.server_close()


class T(unittest.TestCase):
    def setUp(self):
        self.g = Falso(); self.tmp = tempfile.mkdtemp(prefix='rm-env-'); E.PERMITE_LOCAL = True
        self.exec = os.path.join(self.tmp, 'execucao-X'); self.pasta = os.path.join(self.exec, 'tratados'); self.man = os.path.join(self.exec, 'manifesto'); os.makedirs(self.pasta); os.makedirs(self.man)
        itens, plano = [], ['| Arquivo derivado | kbps | Enviar como | MB | duração |', '|---|---|---|---|---|']
        for i, f in enumerate((300, 500), 1):
            nome = f'm{i}.48k.m4a'; gera(os.path.join(self.pasta, nome), freq=f)
            itens.append({'audio_id': f'a{i}', 'block_id': 's2-b0%d' % i, 'theme': 't', 'title': 'x', 'duration': 12, 'order': i, 'version': 'v1', 'path': f'semiologia-ii/a{i}.m4a', 'ready': True})
            plano.append(f"| `{nome}` | 48 | `semiologia-ii/a{i}.m4a` | 0.1 | 12 |")
        with open(os.path.join(self.man, 'manifesto.json'), 'w') as f: json.dump({'semiologia-ii': itens}, f)
        with open(os.path.join(self.man, 'plano-upload.md'), 'w', encoding='utf-8') as f: f.write('\n'.join(plano) + '\n')
        self.env = os.environ.get('RM_SUPABASE_SERVICE_KEY'); os.environ['RM_SUPABASE_SERVICE_KEY'] = CHAVE

    def tearDown(self):
        E.PERMITE_LOCAL = False; self.g.fim(); shutil.rmtree(self.tmp, ignore_errors=True)
        if self.env is None: os.environ.pop('RM_SUPABASE_SERVICE_KEY', None)
        else: os.environ['RM_SUPABASE_SERVICE_KEY'] = self.env

    def roda(self, *extra, url=None):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf): cod = E.main(['--manifesto', os.path.join(self.man, 'manifesto.json'), '--plano', os.path.join(self.man, 'plano-upload.md'), '--pasta', self.pasta, '--url', url or self.g.url, *extra])
        return cod, buf.getvalue()

    def posts_de_upload(self): return [l for l in self.g.log if l[0] == 'POST' and '/object/audiobooks/' in l[1]]

    def test_dry_run_confere_o_bucket_mas_nao_envia(self):
        cod, out = self.roda(); self.assertEqual(cod, 0); self.assertIn('DRY-RUN', out); self.assertEqual(self.posts_de_upload(), []); self.assertEqual(self.g.objs, {})
        os.environ.pop('RM_SUPABASE_SERVICE_KEY'); cod, out = self.roda(); self.assertEqual(cod, 0); self.assertIn('bucket não foi consultado', out)

    def test_envia_confere_tamanho_e_negacao_publica_e_nao_vaza_a_chave(self):
        cod, out = self.roda('--enviar'); self.assertEqual(cod, 0, out)
        self.assertEqual(sorted(self.g.objs), ['semiologia-ii/a1.m4a', 'semiologia-ii/a2.m4a'])
        for l in self.posts_de_upload(): self.assertEqual((l[2], l[3]), ('false', 'audio/mp4'))     # sem upsert; Content-Type de M4A
        with open(os.path.join(self.exec, 'enviado.json'), encoding='utf-8') as fh: log = json.load(fh)
        self.assertTrue(all(r['resultado'] == 'enviado' and r['publica_negada'] == 400 and len(r['sha256']) == 64 for r in log['itens']))
        self.assertNotIn(CHAVE, out); self.assertNotIn(CHAVE, json.dumps(log)); self.assertIn('NÃO publicado', out)

    def test_segunda_rodada_pula_o_que_ja_foi_e_nao_sobrescreve(self):
        self.roda('--enviar'); self.g.log.clear(); cod, out = self.roda('--enviar'); self.assertEqual(cod, 0); self.assertEqual(self.posts_de_upload(), []); self.assertIn('ja-enviado', out)
        self.g.objs['semiologia-ii/a1.m4a'] = b'x' * 10                                         # outro conteúdo no bucket
        cod, out = self.roda('--enviar'); self.assertEqual(cod, 1); self.assertIn('--substituir', out); self.assertEqual(self.g.objs['semiologia-ii/a1.m4a'], b'x' * 10)
        cod, out = self.roda('--enviar', '--substituir'); self.assertEqual(cod, 0); self.assertGreater(len(self.g.objs['semiologia-ii/a1.m4a']), 1000)

    def test_bucket_publico_ou_limite_errado_ou_inexistente_nada_sobe(self):
        for mexe, frase in ((lambda g: g.bucket.update(public=True), 'PÚBLICO'), (lambda g: g.bucket.update(file_size_limit=52428800), 'limite do bucket'),
                            (lambda g: g.bucket.update(allowed_mime_types=None), 'tipos permitidos'), (lambda g: setattr(g, 'existe', False), 'NÃO existe')):
            self.g.bucket.update(public=False, file_size_limit=31457280, allowed_mime_types=['audio/mp4', 'audio/x-m4a']); self.g.existe = True; mexe(self.g)
            cod, out = self.roda('--enviar'); self.assertEqual(cod, 1, frase); self.assertIn(frase, out); self.assertEqual(self.posts_de_upload(), []); self.assertEqual(self.g.objs, {})

    def test_sem_chave_recusa_e_chave_nunca_por_argumento(self):
        os.environ.pop('RM_SUPABASE_SERVICE_KEY'); cod, out = self.roda('--enviar'); self.assertEqual(cod, 2); self.assertEqual(self.g.log, [])
        with self.assertRaises(SystemExit): E.main(['--manifesto', 'a', '--plano', 'b', '--pasta', 'c', '--url', self.g.url, '--chave', 'x'])

    def test_url_invalida_e_pasta_no_repo_recusadas(self):
        E.PERMITE_LOCAL = False
        for u in ('http://127.0.0.1:1', 'https://evil.example.com', 'https://abc.supabase.co.evil.com', 'https://curta.supabase.co'):
            cod, _ = self.roda('--enviar', url=u); self.assertEqual(cod, 2, u)
        self.assertEqual(self.g.log, [])
        cod = E.main(['--manifesto', os.path.join(self.man, 'manifesto.json'), '--plano', os.path.join(self.man, 'plano-upload.md'), '--pasta', os.path.dirname(os.path.abspath(E.__file__)), '--url', 'https://abcdefghijklmnopqrst.supabase.co'])
        self.assertEqual(cod, 2)

    def test_sem_aprovado_do_verificador_nada_sobe(self):
        os.remove(os.path.join(self.pasta, 'm2.48k.m4a'))                                         # derivado faltando
        cod, out = self.roda('--enviar'); self.assertEqual(cod, 1); self.assertIn('NÃO APROVADO', out); self.assertEqual(self.g.log, [])
        gera(os.path.join(self.pasta, 'm2.48k.m4a'), dur=20)                                      # duração ≠ manifesto
        cod, out = self.roda('--enviar'); self.assertEqual(cod, 1); self.assertEqual(self.g.log, [])

    def test_falha_de_um_arquivo_nao_impede_o_outro_e_exit_1(self):
        self.g.falha_upload.add('semiologia-ii/a1.m4a'); cod, out = self.roda('--enviar'); self.assertEqual(cod, 1)
        self.assertIn('semiologia-ii/a2.m4a', self.g.objs); self.assertNotIn('semiologia-ii/a1.m4a', self.g.objs); self.assertIn('FALHARAM', out)
        self.g.falha_upload.clear(); cod, out = self.roda('--enviar'); self.assertEqual(cod, 0)                           # repetir completa só o que faltou
        self.assertEqual(len(self.g.objs), 2)

    def test_tamanho_diferente_no_storage_e_url_publica_aberta_sao_falha(self):
        self.g.corta = True; cod, out = self.roda('--enviar'); self.assertEqual(cod, 1); self.assertIn('≠ local', out)
        self.g.corta = False; self.g.objs.clear(); self.g.publica_abre = True; cod, out = self.roda('--enviar'); self.assertEqual(cod, 1); self.assertIn('PÚBLICA', out)


if __name__ == '__main__':
    unittest.main()
