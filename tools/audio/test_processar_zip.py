import os, sys, tempfile, unittest, zipfile
sys.path.insert(0, os.path.dirname(__file__))
import processar_zip as Z
import transcrever as T


class T1(unittest.TestCase):
    def test_extrair_recusa_caminho_fora_da_pasta(self):
        d = tempfile.mkdtemp(prefix='rm-zs-'); z = os.path.join(d, 'x.zip')
        with zipfile.ZipFile(z, 'w') as zz:
            zz.writestr('../fora.m4a', b'x')
        with self.assertRaises(SystemExit):
            Z.extrair(z, os.path.join(d, 'dest'))
        self.assertFalse(os.path.exists(os.path.join(d, 'fora.m4a')))

    def test_extrair_acha_m4a_em_subpastas_e_a_lista_esperada_tem_os_4_nomes(self):
        d = tempfile.mkdtemp(prefix='rm-zs-'); z = os.path.join(d, 'x.zip')
        with zipfile.ZipFile(z, 'w') as zz:
            zz.writestr('pasta/Semio_EPOC.m4a', b'x')
        self.assertEqual(sorted(Z.extrair(z, os.path.join(d, 'dest'))), ['Semio_EPOC.m4a'])
        self.assertEqual(len(Z.ESPERADOS), 4); self.assertEqual(set(Z.CAND), set(Z.ESPERADOS))

    def test_janelas_cobrem_o_audio_e_nunca_passam_do_fim(self):
        j = T.janelas(300.0, 28.0, 120.0)
        self.assertEqual([round(a) for a, _ in j], [0, 120, 240])
        self.assertTrue(all(a + d <= 300.0 + 1e-6 for a, d in j))
        self.assertEqual(T.janelas(2.0, 28.0, 120.0), [])

    def test_saida_dentro_do_git_recusada(self):
        with self.assertRaises(SystemExit):
            T.main(['--origem', '/tmp', '--saida', os.path.join(Z.RAIZ, 'x'), '--modelo', '/tmp'])
        with self.assertRaises(SystemExit):
            Z.main(['--zip', '/tmp/nao.zip', '--trabalho', os.path.join(Z.RAIZ, 'x'), '--modelo', '/tmp'])


if __name__ == '__main__':
    unittest.main()
