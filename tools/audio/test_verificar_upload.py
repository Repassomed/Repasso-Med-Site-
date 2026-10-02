import json, os, shutil, subprocess, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(__file__))
import preparar_audiobooks as P
import verificar_upload as V


def gera(dst, ch=1, faststart=True, dur=12, kb=48):
    cmd = [P.ff(), '-y', '-v', 'error', '-f', 'lavfi', '-i', f'sine=frequency=300:duration={dur}', '-ac', str(ch), '-ar', '32000', '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', f'{kb}k']
    if faststart:
        cmd += ['-movflags', '+faststart']
    subprocess.run(cmd + [dst], check=True)


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='rm-up-')                      # fora do repositório
        gera(os.path.join(cls.tmp, 'ok.48k.m4a'))
        gera(os.path.join(cls.tmp, 'nofast.48k.m4a'), faststart=False)
        gera(os.path.join(cls.tmp, 'estereo.48k.m4a'), ch=2)
        cls.dur = round(P.probe(os.path.join(cls.tmp, 'ok.48k.m4a'))['duracao_s'])

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def man(self, aid='s2-teste-1', dur=None, path=None):
        return {'semiologia-ii': [{'audio_id': aid, 'block_id': 's2-b03', 'theme': 't', 'title': 'x', 'duration': dur or self.dur, 'order': 1, 'version': 'v1', 'path': path or f'semiologia-ii/{aid}.m4a', 'ready': True}]}

    def plano(self, arquivo, aid='s2-teste-1'):
        return {f'semiologia-ii/{aid}.m4a': arquivo}

    def test_aprova_derivado_correto(self):
        e, ok, l = V.verificar(self.man(), self.tmp, self.plano('ok.48k.m4a'))
        self.assertEqual(e, []); self.assertEqual(ok, ['s2-teste-1']); self.assertIn('sha256=', l[0])

    def test_reprova_sem_faststart_estereo_e_duracao(self):
        e, _, _ = V.verificar(self.man(), self.tmp, self.plano('nofast.48k.m4a')); self.assertTrue(any('faststart' in x for x in e))
        e, _, _ = V.verificar(self.man(), self.tmp, self.plano('estereo.48k.m4a')); self.assertTrue(any('canais' in x for x in e))
        e, _, _ = V.verificar(self.man(dur=self.dur + 30), self.tmp, self.plano('ok.48k.m4a')); self.assertTrue(any('duração' in x for x in e))

    def test_reprova_manifesto_vazio_arquivo_ausente_e_path_errado(self):
        e, _, _ = V.verificar({'semiologia-ii': []}, self.tmp, {}); self.assertTrue(e)
        e, _, _ = V.verificar(self.man(), self.tmp, self.plano('nao-existe.m4a')); self.assertTrue(any('não encontrado' in x for x in e))
        e, _, _ = V.verificar(self.man(path='semiologia-ii/outro.m4a'), self.tmp, self.plano('ok.48k.m4a')); self.assertTrue(any('path inesperado' in x for x in e))
        e, _, _ = V.verificar(self.man(), self.tmp, {}); self.assertTrue(any('ausente do plano' in x for x in e))

    def test_main_recusa_pasta_no_git_e_le_o_plano_gerado(self):
        pl = os.path.join(self.tmp, 'plano-upload.md')
        with open(pl, 'w', encoding='utf-8') as f:
            f.write('| Arquivo derivado | kbps | Enviar como | MB | duração (s) |\n|---|---|---|---|---|\n| `ok.48k.m4a` | 48 | `semiologia-ii/s2-teste-1.m4a` | 0.1 | 12 |\n')
        self.assertEqual(V.ler_plano(pl), {'semiologia-ii/s2-teste-1.m4a': 'ok.48k.m4a'})
        mp = os.path.join(self.tmp, 'manifesto.json')
        with open(mp, 'w') as f: json.dump(self.man(), f)
        self.assertEqual(V.main(['--manifesto', mp, '--pasta', self.tmp, '--plano', pl]), 0)
        self.assertEqual(V.main(['--manifesto', mp, '--pasta', os.path.dirname(__file__), '--plano', pl]), 1)    # dentro do repo


if __name__ == '__main__':
    unittest.main()
