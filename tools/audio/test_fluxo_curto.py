"""Caminho curto de ponta a ponta com masters SINTÉTICOS (sem modelo de transcrição): processar → ouvir/aprovar (comando do José) → manifesto → conferência → Storage FALSO.
Prova o encadeamento e as travas; não prova a qualidade de áudio real nem o Supabase real."""
import contextlib, io, json, os, shutil, subprocess, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(__file__))
import preparar_audiobooks as P
import processar_masters as Z
import aprovar_vinculos as A
import publicar_lote as L
import enviar_storage as E
import test_enviar_storage as TE


def gera(dst, ch=1, kb=48, dur=12, freq=300):
    subprocess.run([P.ff(), '-y', '-v', 'error', '-f', 'lavfi', '-i', f'sine=frequency={freq}:duration={dur}', '-ac', str(ch), '-ar', '32000', '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', f'{kb}k', '-movflags', '+faststart', dst], check=True)


def quieto(fn, *a, **k):
    b = io.StringIO()
    with contextlib.redirect_stdout(b): r = fn(*a, **k)
    return r, b.getvalue()


class Fluxo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='rm-fluxo-'); cls.aud = os.path.join(cls.tmp, 'Audiobooks'); os.makedirs(cls.aud)
        gera(os.path.join(cls.aud, 'Semio_EPOC (1).m4a'), freq=300)                         # AAC mono 48k → reaproveitar
        gera(os.path.join(cls.aud, 'Semio_-_4_sindrome_pleual (1).m4a'), ch=2, kb=128, freq=500, dur=14)   # estéreo 128k → reencodar
        cls.antes = {f: P.sha256(os.path.join(cls.aud, f)) for f in os.listdir(cls.aud)}
        rc, out = quieto(Z.main, ['--pasta', cls.aud, '--trabalho', os.path.join(cls.tmp, 'trab'), '--sem-transcricao'])
        assert rc == 0, out
        cls.ex = os.path.join(cls.tmp, 'trab', sorted(os.listdir(os.path.join(cls.tmp, 'trab')))[0])

    @classmethod
    def tearDownClass(cls): shutil.rmtree(cls.tmp, ignore_errors=True)

    def setUp(self):
        self.g = TE.Falso(); E.PERMITE_LOCAL = True; self.k = os.environ.get('RM_SUPABASE_SERVICE_KEY'); os.environ['RM_SUPABASE_SERVICE_KEY'] = TE.CHAVE
        for f in ('manifesto', 'enviado.json'):
            p = os.path.join(self.ex, f); shutil.rmtree(p, ignore_errors=True) if os.path.isdir(p) else (os.remove(p) if os.path.exists(p) else None)
        with open(os.path.join(self.ex, 'vinculos.json'), encoding='utf-8') as fh: self.v0 = fh.read()                  # estado de partida (rascunho do processamento)

    def tearDown(self):
        E.PERMITE_LOCAL = False; self.g.fim()
        with open(os.path.join(self.ex, 'vinculos.json'), 'w', encoding='utf-8') as fh: fh.write(self.v0)
        if self.k is None: os.environ.pop('RM_SUPABASE_SERVICE_KEY', None)
        else: os.environ['RM_SUPABASE_SERVICE_KEY'] = self.k

    def ids(self): return {x['master']: x['id'] for x in json.load(open(os.path.join(self.ex, 'vinculos.json'), encoding='utf-8'))}

    def test_processamento_sem_transcricao_nao_pede_modelo_nem_inventa_vinculo(self):
        v = json.load(open(os.path.join(self.ex, 'vinculos.json'), encoding='utf-8'))
        self.assertEqual(len(v), 2); self.assertTrue(all(x['vinculo_confirmado'] is False and x['escuta_humana_ok'] is False and x['block_id'] == 'CONFIRMAR' for x in v))
        rel = open(os.path.join(self.ex, 'RELATORIO-REAL.md'), encoding='utf-8').read()
        self.assertIn('ESCUTA DO JOSÉ', rel); self.assertIn('aprovar_vinculos.py', rel); self.assertIn('sem transcrição', rel)
        self.assertEqual(os.listdir(os.path.join(self.ex, 'transcricoes')), [])                                              # nada transcrito
        self.assertEqual(self.antes, {f: P.sha256(os.path.join(self.aud, f)) for f in os.listdir(self.aud)})                 # masters intactos
        with self.assertRaises(SystemExit) as c: quieto(Z.main, ['--pasta', self.aud, '--trabalho', os.path.join(self.tmp, 't2')])           # sem --modelo e sem --sem-transcricao: pede um dos dois
        self.assertIn('--sem-transcricao', str(c.exception))

    def test_sem_aprovacao_nada_e_montado_nem_enviado(self):
        rc, out = quieto(L.main, ['--execucao', self.ex, '--url', self.g.url, '--enviar']); self.assertEqual(rc, 1); self.assertEqual(self.g.log, []); self.assertFalse(os.path.exists(os.path.join(self.ex, 'manifesto', 'manifesto.json')))
        i = self.ids()
        rc, out = quieto(A.main, ['--execucao', self.ex, '--audio', i['Semio_EPOC (1).m4a'], '--bloco', 's2-b03'])               # proposta SEM --escutei: marcas continuam false
        self.assertEqual(rc, 0); v = {x['master']: x for x in json.load(open(os.path.join(self.ex, 'vinculos.json'), encoding='utf-8'))}
        self.assertFalse(v['Semio_EPOC (1).m4a']['escuta_humana_ok']); self.assertFalse(v['Semio_EPOC (1).m4a']['vinculo_confirmado'])
        rc, _ = quieto(L.main, ['--execucao', self.ex, '--url', self.g.url, '--enviar']); self.assertEqual(rc, 1); self.assertEqual(self.g.log, [])

    def test_aprovacao_valida_e_fluxo_completo_dry_run_e_envio(self):
        i = self.ids()
        rc, out = quieto(A.main, ['--execucao', self.ex, '--audio', 'epoc', '--bloco', 's2-b03', '--escutei', '--ordem', '1']); self.assertEqual(rc, 0, out); self.assertIn('APROVADO por escuta', out)
        rc, out = quieto(L.main, ['--execucao', self.ex, '--url', self.g.url]); self.assertEqual(rc, 1)                       # falta o 2º áudio aprovado: nada sai
        rc, out = quieto(A.main, ['--execucao', self.ex, '--audio', 'pleual', '--bloco', 's2-b05', '--escutei', '--ordem', '2', '--kbps', '64']); self.assertEqual(rc, 0, out)
        rc, out = quieto(L.main, ['--execucao', self.ex, '--url', self.g.url]); self.assertEqual(rc, 0, out); self.assertIn('Dry-run ok', out); self.assertEqual([l for l in self.g.log if l[0] == 'POST' and '/object/audiobooks/' in l[1]], [])
        rc, out = quieto(L.main, ['--execucao', self.ex, '--url', self.g.url, '--enviar']); self.assertEqual(rc, 0, out)
        self.assertEqual(len(self.g.objs), 2); self.assertTrue(all(p.startswith('semiologia-ii/s2-b0') and p.endswith('.m4a') for p in self.g.objs)); self.assertIn('RM_AUDIO_MANIFEST', out)
        man = json.load(open(os.path.join(self.ex, 'manifesto', 'manifesto.json'), encoding='utf-8'))['semiologia-ii']
        self.assertEqual(sorted(m['order'] for m in man), [1, 2]); self.assertTrue(all(m['ready'] and 'url' not in m and 'bucket' not in m for m in man))
        self.assertNotIn(TE.CHAVE, out + open(os.path.join(self.ex, 'enviado.json'), encoding='utf-8').read())
        self.assertEqual(self.antes, {f: P.sha256(os.path.join(self.aud, f)) for f in os.listdir(self.aud)})                 # masters nunca sobem nem mudam

    def test_aprovar_recusa_bloco_inexistente_audio_ambiguo_e_ordem_repetida(self):
        i = self.ids()
        self.assertEqual(quieto(A.main, ['--execucao', self.ex, '--audio', i['Semio_EPOC (1).m4a'], '--bloco', 's2-b99', '--escutei'])[0], 2)
        self.assertEqual(quieto(A.main, ['--execucao', self.ex, '--audio', 'Semio', '--bloco', 's2-b03', '--escutei'])[0], 2)         # casa com os dois
        self.assertEqual(quieto(A.main, ['--execucao', self.ex, '--audio', 'epoc', '--bloco', 's2-b03', '--escutei', '--ordem', '1'])[0], 0)
        self.assertEqual(quieto(A.main, ['--execucao', self.ex, '--audio', 'pleual', '--bloco', 's2-b05', '--escutei', '--ordem', '1'])[0], 2)  # ordem repetida
        self.assertEqual(quieto(A.main, ['--execucao', self.ex, '--audio', 'pleual', '--bloco', 's2-b05', '--escutei', '--kbps', '7'])[0], 2)    # kbps inexistente


class ScriptsWindows(unittest.TestCase):
    def ler(self, nome):
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), nome), 'rb') as f: b = f.read()
        self.assertTrue(b.startswith(b'\xef\xbb\xbf'), nome + ': PowerShell 5.1 só lê acentos em UTF-8 com BOM')
        return b.decode('utf-8-sig')

    def test_enviar_local_pede_a_chave_oculta_apaga_e_confere_codigos(self):
        t = self.ler('enviar_local.ps1')
        self.assertIn('-AsSecureString', t); self.assertIn('Remove-Item Env:\\RM_SUPABASE_SERVICE_KEY', t); self.assertIn('IsInputRedirected', t); self.assertGreaterEqual(t.count('LASTEXITCODE'), 1)
        self.assertNotIn('--chave', t); self.assertNotIn('Write-Host $env:RM_SUPABASE', t); self.assertNotIn('Out-File', t)             # chave nunca em argumento, tela ou arquivo
        self.assertLess(t.index("'--enviar'"), t.index("Nativo $Py $ArgsPy")); self.assertIn('NÃO publicado', t)
        self.assertLess(t.index('Nativo $Py $ArgsPy'), t.index('Pronto: arquivos no bucket'))                                  # «Pronto» só depois de rodar e conferir

    def test_rodar_local_padrao_sem_transcricao_e_modelo_so_com_switch(self):
        t = self.ler('rodar_local.ps1')
        self.assertIn('[switch]$ComTranscricao', t); self.assertIn("'--sem-transcricao'", t); self.assertIn('requirements-transcricao.txt', t)
        self.assertLess(t.index('if ($ComTranscricao) {'), t.index('sherpa-onnx-whisper-small.tar.bz2'))                       # download do modelo só dentro do switch


if __name__ == '__main__':
    unittest.main()
