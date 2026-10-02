"""Testes do pipeline de preparação dos audiobooks, com um MASTER SINTÉTICO (sem áudio real do projeto).
O sinal imita voz (harmônicos com formantes, envelope silábico ~4 Hz, pausas): serve para provar o PIPELINE
(codec, canais, faststart, duração, masters intactos, saída fora do git, vínculo por conteúdo). NÃO prova inteligibilidade
de voz real: isso exige os masters e a escuta humana.
Rodar:  python3 -m unittest tools.audio.test_preparar_audiobooks -v"""
import json, os, re, shutil, subprocess, sys, tempfile, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(__file__))
import preparar_audiobooks as P
MATERIA = os.path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia', 'netlify', 'functions', 'materias-privadas', 'semiologia-ii.html')


def sintetiza_voz(path_wav, dur=75.0, sr=44100, seed=7):
    import numpy as np, soundfile as sf
    rng = np.random.default_rng(seed)
    t = np.arange(int(dur * sr)) / sr
    f0 = 110 + 25 * np.sin(2 * np.pi * 0.3 * t) + 8 * np.sin(2 * np.pi * 2.1 * t)
    fase = 2 * np.pi * np.cumsum(f0) / sr
    sinal = sum(np.sin(k * fase) / k for k in range(1, 30))
    # formantes aproximados por modulação lenta de ganho em bandas
    from scipy.signal import butter, sosfilt
    saida = np.zeros_like(sinal)
    for fc, bw, g in ((700, 130, 1.0), (1200, 150, .6), (2600, 250, .35)):
        sos = butter(2, [fc - bw, fc + bw], btype='band', fs=sr, output='sos')
        saida += g * sosfilt(sos, sinal)
    env = np.clip(np.sin(2 * np.pi * 4.0 * t) + .3, 0, None) ** 1.2
    pausas = (np.sin(2 * np.pi * 0.17 * t) > -0.6).astype(float)
    ruido = 0.01 * rng.standard_normal(len(t))
    x = saida * env * pausas
    x = 0.5 * x / (np.abs(x).max() + 1e-9) + ruido
    est = np.stack([x, 0.9 * x], axis=1).astype('float32')            # «estéreo» como os masters reais
    sf.write(path_wav, est, sr)


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='rm-aud-')          # fora do repositório
        cls.orig = os.path.join(cls.tmp, 'masters'); os.makedirs(cls.orig)
        wav = os.path.join(cls.tmp, 'voz.wav'); sintetiza_voz(wav)
        # nomes enganosos de propósito: o número do arquivo NÃO é o do bloco
        cls.master = os.path.join(cls.orig, 'Semio - 3 Sindrome Teste.m4a')
        subprocess.run([P.ff(), '-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', cls.master], check=True)   # sem faststart
        os.chmod(cls.master, 0o444)
        cls.h0 = P.sha256(cls.master); cls.m0 = os.stat(cls.master).st_mtime_ns
        cls.saida = os.path.join(cls.tmp, 'tratados')
        cls.rel = P.main(['preparar', '--origem', cls.orig, '--saida', cls.saida, '--janelas', '5'])

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)


class TestInspecao(Base):
    def test_inspecao_le_codec_canais_duracao(self):
        i = P.probe(self.master)
        self.assertEqual(i['codec'], 'aac'); self.assertEqual(i['perfil'], 'LC')
        self.assertEqual(i['canais'], 2); self.assertEqual(i['taxa_hz'], 44100)
        self.assertAlmostEqual(i['duracao_s'], 75.0, delta=0.2)
        self.assertTrue(110 <= i['bitrate_kbps'] <= 135)
        self.assertFalse(i['tem_video'])

    def test_master_sem_faststart_e_detectado(self):
        self.assertFalse(P.faststart(self.master), 'o master sintético foi gerado SEM faststart')


class TestPreparacao(Base):
    def test_duas_copias_aac_lc_mono_faststart(self):
        it = self.rel['itens'][0]
        self.assertEqual([c['kbps_alvo'] for c in it['copias']], [48, 64])
        for c in it['copias']:
            p = os.path.join(self.saida, c['arquivo'])
            i = P.probe(p)
            self.assertEqual((i['codec'], i['perfil']), ('aac', 'LC'))
            self.assertEqual(i['canais'], 1); self.assertEqual(i['taxa_hz'], 32000)
            self.assertTrue(P.faststart(p), c['arquivo'] + ' deve ter moov antes de mdat')
            self.assertTrue(c['decodifica_sem_erros'], c['erro'])
            self.assertLess(abs(c['delta_duracao_s']), 0.15)
            self.assertTrue(0.0 <= c['stoi']['media'] <= 1.0 and c['stoi']['janelas'] >= 3)
            self.assertIsNotNone(c['loudness']['lufs'])
            br = i['bitrate_kbps']; self.assertLess(abs(br - c['kbps_alvo']), 10, f'{br} kb/s vs {c["kbps_alvo"]}')

    def test_tamanhos_e_ordem(self):
        it = self.rel['itens'][0]
        a, b = it['copias']
        self.assertLess(a['tamanho_mb'], b['tamanho_mb']); self.assertLess(b['tamanho_mb'], it['tamanho_master_mb'])
        self.assertIn(it['recomendado_kbps'], (48, 64))
        self.assertTrue(it['escuta_humana_pendente'])

    def test_stoi_alto_no_sintetico_e_nao_menor_com_mais_bitrate(self):
        a, b = self.rel['itens'][0]['copias']
        self.assertGreater(a['stoi']['media'], 0.8)
        self.assertGreaterEqual(b['stoi']['media'] + 0.01, a['stoi']['media'])

    def test_master_intacto(self):
        it = self.rel['itens'][0]
        self.assertTrue(it['master_intacto'])
        self.assertEqual(P.sha256(self.master), self.h0, 'o SHA-256 do master não pode mudar')
        self.assertEqual(os.stat(self.master).st_mtime_ns, self.m0)
        self.assertEqual(it['sha256_master'], self.h0)
        self.assertEqual(sorted(os.listdir(self.orig)), ['Semio - 3 Sindrome Teste.m4a'], 'nada foi criado na pasta dos masters')

    def test_relatorios(self):
        with open(os.path.join(self.saida, 'relatorio.json'), encoding='utf-8') as fh:
            j = json.load(fh)
        self.assertTrue(j['itens'][0]['escuta_humana_pendente'])
        with open(os.path.join(self.saida, 'relatorio.md'), encoding='utf-8') as fh:
            m = fh.read()
        self.assertIn('escuta humana', m.lower())
        self.assertIn('STOI', m)

    def test_nomes_de_saida_nao_usam_o_numero_do_arquivo_como_bloco(self):
        for c in self.rel['itens'][0]['copias']:
            self.assertNotRegex(c['arquivo'], r's2-b\d+')

    def test_saida_dentro_do_git_e_recusada(self):
        with self.assertRaises(SystemExit) as cm:
            P.main(['preparar', '--origem', self.orig, '--saida', os.path.join(ROOT, 'tmp-nao-pode')])
        self.assertIn('git', str(cm.exception).lower())
        self.assertFalse(os.path.exists(os.path.join(ROOT, 'tmp-nao-pode')))

    def test_nenhum_audio_pesado_versionado(self):
        r = subprocess.run(['git', '-C', ROOT, 'ls-files'], capture_output=True, text=True).stdout.splitlines()
        pesados = [f for f in r if re.search(r'\.(m4a|wav|flac|aac)$', f, re.I)]
        self.assertEqual(pesados, [], 'masters/cópias não entram no Git')


class TestVinculo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.blocos = P.blocos_da_materia(MATERIA)

    def trecho(self, bid, n=300, ini=0.35):
        ws = self.blocos[bid].split()
        i = int(len(ws) * ini)
        return ' '.join(ws[i:i + n])

    def test_blocos_existem(self):
        for b in ('s2-b01', 's2-b03', 's2-b04', 's2-b05'):
            self.assertIn(b, self.blocos)

    def test_cada_trecho_aponta_para_o_seu_bloco_independente_do_arquivo(self):
        for bid in ('s2-b01', 's2-b03', 's2-b04', 's2-b05'):
            for ini in (0.2, 0.55):
                r = P.vincular(self.trecho(bid, ini=ini), self.blocos)
                self.assertEqual(r['melhor'], bid, (bid, ini, r['ranking']))
                self.assertEqual(r['decisao'], 'candidato', (bid, ini, r))

    def test_texto_sem_relacao_fica_indeterminado(self):
        r = P.vincular('las galaxias espirales contienen estrellas planetas nebulosas telescopios observatorio cosmologia universo ' * 20, self.blocos)
        self.assertEqual(r['decisao'], 'indeterminado')

    def test_vinculo_nao_recebe_nome_de_arquivo(self):
        import inspect
        self.assertEqual(list(inspect.signature(P.vincular).parameters), ['transcricao', 'blocos'])


if __name__ == '__main__':
    unittest.main()
