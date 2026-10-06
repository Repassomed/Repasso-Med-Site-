"""manifesto_piloto.py: nunca adivinha, falha fechada, e o resultado passa no leitor REAL do servidor."""
import contextlib, io, json, os, subprocess, sys, unittest
sys.path.insert(0, os.path.dirname(__file__))
import manifesto_piloto as M

OK = ['--motivo-bloco', 's2-b01', '--blocos-confirmados', '--dur', 'motivo=35:12', '--dur', 'epoc=31:40', '--dur', 'parenquimatoso=1:02:03', '--dur', 'pleural=2112']


def roda(args):
    b = io.StringIO()
    with contextlib.redirect_stdout(b): rc = M.main(args)
    return rc, b.getvalue()


class T(unittest.TestCase):
    def test_gera_manifesto_valido_com_os_quatro_nomes_finais(self):
        rc, out = roda(OK); self.assertEqual(rc, 0, out)
        j = json.loads(out.split('\n')[1])['semiologia-ii']
        self.assertEqual([i['audio_id'] for i in sorted(j, key=lambda x: x['order'])], ['s2-b01-motivo-consulta', 's2-b03-epoc', 's2-b04-parenquimatoso', 's2-b05-pleural'])
        self.assertEqual({i['audio_id']: i['duration'] for i in j}, {'s2-b01-motivo-consulta': 2112, 's2-b03-epoc': 1900, 's2-b04-parenquimatoso': 3723, 's2-b05-pleural': 2112})
        self.assertTrue(all(i['ready'] is True and i['path'] == f"semiologia-ii/{i['audio_id']}.m4a" and i['version'] == 'v1' for i in j))
        self.assertTrue(all(i['title'].startswith('Audiobook · ') and i['theme'] in i['title'] for i in j)); self.assertEqual([i['order'] for i in sorted(j, key=lambda x: x['order'])], [1, 3, 4, 5])
        self.assertNotIn('http', out.split('\n')[1]); self.assertLess(len(out.split('\n')[1].encode()), 3800)
        for nome in ('s2-b01-motivo-consulta.m4a', 's2-b03-epoc.m4a', 's2-b04-parenquimatoso.m4a', 's2-b05-pleural.m4a'): self.assertIn(nome, out)

    def test_motivo_de_consulta_cardiaco_e_possivel_e_nao_se_adivinha(self):
        rc, out = roda([x if x != 's2-b01' else 's2-b06' for x in OK]); self.assertEqual(rc, 0)
        j = json.loads(out.split('\n')[1])['semiologia-ii']; self.assertIn('s2-b06-motivo-consulta', [i['audio_id'] for i in j]); self.assertEqual(sorted(i['order'] for i in j), [3, 4, 5, 6])
        rc, out = roda([x for i, x in enumerate(OK) if i not in (0, 1)]); self.assertEqual(rc, 1); self.assertIn('não se adivinha', out)        # sem --motivo-bloco
        with self.assertRaises(SystemExit): roda(['--motivo-bloco', 's2-b02'] + OK[2:])                                                          # só b01/b06

    def test_sem_confirmacao_ou_sem_duracao_nao_gera(self):
        rc, out = roda([x for x in OK if x != '--blocos-confirmados']); self.assertEqual(rc, 1); self.assertIn('--blocos-confirmados', out)
        rc, out = roda(OK[:-2]); self.assertEqual(rc, 1); self.assertIn('falta a duração de pleural', out)
        self.assertEqual(roda(OK + ['--dur', 'xyz=1:00'])[0], 2)

    def test_duracoes_invalidas(self):
        for v in ('', '0', '99:99', '1:2', 'abc', '25:00:00', '-5'):
            with self.assertRaises(ValueError, msg=v): M.segundos(v)
        self.assertEqual((M.segundos('0:59'), M.segundos('59'), M.segundos('6:00:00')), (59, 59, 21600))

    def test_bloco_inexistente_e_ordem_repetida_falham_fechado(self):
        self.assertEqual(roda(OK + ['--bloco', 'epoc=s2-b99'])[0], 1)
        rc, out = roda(OK + ['--bloco', 'epoc=s2-b01']); self.assertEqual(rc, 1); self.assertIn('mesmo bloco', out)

    def test_o_arquivo_nao_grava_manifesto_no_repositorio(self):
        src = open(os.path.join(os.path.dirname(__file__), 'manifesto_piloto.py'), encoding='utf-8').read()
        self.assertNotIn("open(", src.split('def main')[1].replace("open(MATERIA", ''))                       # só imprime; nunca escreve arquivo


if __name__ == '__main__':
    unittest.main()
