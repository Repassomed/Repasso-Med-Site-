"""Pacote de retorno (pequeno, sem áudio) e pacote de scripts (completo, sem áudios/credenciais/modelo/matéria)."""
import json, os, shutil, subprocess, sys, tempfile, unittest, zipfile
sys.path.insert(0, os.path.dirname(__file__))
import empacotar_retorno as R
import empacotar_pacote as K
import preparar_audiobooks as P

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, '..', '..'))


def w(caminho, conteudo):
    with open(caminho, 'wb' if isinstance(conteudo, bytes) else 'w', **({} if isinstance(conteudo, bytes) else {'encoding': 'utf-8'})) as f:
        f.write(conteudo)


def execucao_falsa(base, com_amostras=True):
    ex = os.path.join(base, 'execucao-20260101T000000.000000Z')
    for d in ('tratados/amostras', 'transcricoes'):
        os.makedirs(os.path.join(ex, d))
    for n, c in (('RELATORIO-REAL.md', '# r'), ('vinculos-evidencia.json', '{}'), ('vinculos.json', '[]'), ('inventario.json', '[]'), ('tratados/relatorio.md', 'r'), ('tratados/relatorio.json', '{}'),
                 ('transcricoes/x.janelas.json', '{}'), ('transcricoes/x.transcricao.txt', 'texto')):
        w(os.path.join(ex, n), c)
    open(os.path.join(ex, 'tratados', 'x.64k.m4a'), 'wb').write(b'\0' * 5000)                  # derivado COMPLETO: nunca entra
    w(os.path.join(ex, 'tratados', 'x.original-aac.m4a'), b'\0' * 5000)
    w(os.path.join(ex, 'master.m4a'), b'\0' * 5000)
    if com_amostras:
        w(os.path.join(ex, 'tratados', 'amostras', 'x-trecho1.m4a'), b'\0' * 100)
    w(os.path.join(ex, 'segredo.txt'), 'não vai')
    return ex


class Retorno(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix='rm-ret-')

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def nomes(self, z):
        with zipfile.ZipFile(z) as f:
            return sorted(f.namelist())

    def test_sem_audio_completo_e_so_lista_fixa(self):
        ex = execucao_falsa(self.d)
        self.assertEqual(R.main(['--execucao', ex]), 0)
        z = ex + '-retorno.zip'
        n = self.nomes(z)
        self.assertFalse([x for x in n if x.endswith('.m4a')])                                    # nenhum áudio
        self.assertNotIn('segredo.txt', n); self.assertIn('RELATORIO-REAL.md', n); self.assertIn('transcricoes/x.transcricao.txt', n)
        self.assertEqual(len(n), 8)
        self.assertFalse(P._dentro(P._real(z), P._real(ex)))                                      # o ZIP fica ao lado, não dentro

    def test_com_amostras_so_as_amostras(self):
        ex = execucao_falsa(self.d)
        R.main(['--execucao', ex, '--com-amostras'])
        n = self.nomes(ex + '-retorno.zip')
        self.assertEqual([x for x in n if x.endswith('.m4a')], ['amostras/x-trecho1.m4a'])        # derivados e master continuam de fora

    def test_recusas(self):
        ex = execucao_falsa(self.d)
        with self.assertRaises(SystemExit): R.main(['--execucao', ex, '--saida', os.path.join(ex, 'dentro.zip')])
        R.main(['--execucao', ex])
        with self.assertRaises(SystemExit): R.main(['--execucao', ex])                            # não sobrescreve
        vazio = os.path.join(self.d, 'vazio'); os.makedirs(vazio)
        with self.assertRaises(SystemExit): R.main(['--execucao', vazio])                          # execução incompleta
        with self.assertRaises(SystemExit): R.main(['--execucao', ex, '--saida', os.path.join(REPO, 'x.zip')])   # dentro do repo


class Pacote(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp(prefix='rm-pac-')
        self.z = os.path.join(self.d, 'pacote.zip'); K.main(['--saida', self.z])

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def test_conteudo_pequeno_sem_audio_modelo_materia_credencial(self):
        with zipfile.ZipFile(self.z) as f:
            n = f.namelist()
            self.assertLess(os.path.getsize(self.z), 200 * 1024)                                  # pequeno (medido, não prometido)
            for x in n:
                self.assertFalse(x.lower().endswith(K.PROIBIDOS), x)
                self.assertFalse(K.SEGREDO.search(f.read(x).decode('utf-8', 'replace')), x)
            for obrig in ('processar_masters.py', 'preparar_audiobooks.py', 'transcrever.py', 'empacotar_retorno.py', 'rodar_local.ps1', 'rodar_local.sh', 'requirements.txt'):
                self.assertIn('repasso-audiobooks-local/tools/audio/' + obrig, n)
            self.assertIn('repasso-audiobooks-local/LEIAME.md', n)
            self.assertFalse([x for x in n if 'materias-privadas' in x or 'semiologia' in x.lower() or 'test_' in x])
            leiame = f.read('repasso-audiobooks-local/LEIAME.md').decode('utf-8')
            self.assertIn('NÃO contém áudios', leiame); self.assertIn('-Materia', leiame); self.assertNotIn('FLUXO-JOSE', leiame)

    def test_pacote_extraido_e_autossuficiente(self):
        with zipfile.ZipFile(self.z) as f:
            f.extractall(self.d)
        raiz = os.path.join(self.d, 'repasso-audiobooks-local')
        r = subprocess.run([sys.executable, os.path.join(raiz, 'tools', 'audio', 'processar_masters.py'), '--verificar-ambiente', '--modelo', os.path.join(self.d, 'sem-modelo'),
                            '--materia', os.path.join(self.d, 'sem-materia.html')], capture_output=True, text=True, cwd=self.d)
        self.assertEqual(r.returncode, 1); self.assertNotIn('Traceback', r.stderr); self.assertNotIn('ModuleNotFoundError', r.stderr)
        self.assertIn('modelo', r.stdout); self.assertIn('matéria', r.stdout)                      # só reclama do que realmente falta (modelo/matéria), importa tudo
        r = subprocess.run([sys.executable, os.path.join(raiz, 'tools', 'audio', 'empacotar_retorno.py'), '--help'], capture_output=True, text=True, cwd=self.d)
        self.assertEqual(r.returncode, 0)

    def test_recusa_pacote_incompleto_e_dentro_do_repo(self):
        with self.assertRaises(SystemExit): K.main(['--saida', os.path.join(AQUI, 'pacote.zip')])            # dentro do git
        with self.assertRaises(SystemExit): K.main(['--saida', self.z])                                      # não sobrescreve
        faltam = K.modulos_locais_faltando('x.py', 'import transcrever\nimport os\n', {'preparar_audiobooks.py'})
        self.assertEqual(faltam, ['transcrever'])                                                           # import local fora do pacote = incompleto
        with open(os.path.join(AQUI, 'processar_masters.py'), encoding='utf-8') as f: fonte = f.read()
        self.assertEqual(K.modulos_locais_faltando('processar_masters.py', fonte, set(K.ARQUIVOS)), [])

    def test_ps1_tem_bom_e_confere_codigo_de_saida(self):
        with open(os.path.join(AQUI, 'rodar_local.ps1'), 'rb') as f: b = f.read()
        self.assertTrue(b.startswith(b'\xef\xbb\xbf'))                                                 # PowerShell 5.1 lê UTF-8 só com BOM
        t = b.decode('utf-8')
        self.assertGreaterEqual(t.count('LASTEXITCODE'), 2); self.assertIn('Nativo', t); self.assertIn('Pronto', t)
        for etapa in ('criação do ambiente Python', 'instalação das dependências', 'extração do modelo', 'processamento dos áudios'):
            self.assertIn(etapa, t)                                                                    # cada executável externo é conferido e nomeado
        self.assertLess(t.index('Falha "saídas esperadas ausentes'), t.rindex('Write-Host "Pronto'))        # «Pronto» só depois de conferir as saídas
        self.assertIn('-Materia', t); self.assertNotIn('$Args =', t)                                    # não sobrescreve a variável automática


if __name__ == '__main__':
    unittest.main()
