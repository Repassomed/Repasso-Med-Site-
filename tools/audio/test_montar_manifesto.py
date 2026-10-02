import copy, json, os, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(__file__))
import montar_manifesto as M

BLOCOS = M.blocos_da_materia()


def copia(kb, mb=0.5, ok=True, fs=True, dur=300.4):
    return {'arquivo': f'x.{kb}k.m4a', 'kbps_alvo': kb, 'tamanho_mb': mb, 'decodifica_sem_erros': ok, 'faststart': fs, 'info': {'duracao_s': dur}}


def rel():
    return {'itens': [{'master': f'm{i}.m4a', 'recomendado_kbps': 48, 'copias': [copia(48), copia(64, 0.7)]} for i in range(4)]}


def vin(i, **kw):
    v = {'master': f'm{i}.m4a', 'audio_id': f's2-teste-{i}', 'block_id': ['s2-b01', 's2-b03', 's2-b04', 's2-b05'][i], 'theme': f'Tema {i}', 'title': f'Título {i}',
         'order': i + 1, 'version': 'v1', 'vinculo_confirmado': True, 'confirmado_por': 'escuta', 'escuta_humana_ok': True}
    v.update(kw); return v


def tudo(**kw): return [vin(i, **kw) for i in range(4)]


class T(unittest.TestCase):
    def test_gera_manifesto_valido_e_aceito_pelo_servidor(self):
        e, itens, plano = M.montar(rel(), tudo(), BLOCOS)
        self.assertEqual(e, [])
        self.assertEqual([k for k in itens[0]], M.CAMPOS)
        self.assertTrue(all(i['ready'] is True and i['path'] == f"semiologia-ii/{i['audio_id']}.m4a" and i['duration'] == 300 for i in itens))
        self.assertNotIn('http', json.dumps(itens)); self.assertNotIn('token', json.dumps(itens).lower())

    def test_sem_confirmacao_nao_gera(self):
        for kw in ({'vinculo_confirmado': False}, {'confirmado_por': 'nome-do-arquivo'}, {'escuta_humana_ok': False}):
            e, itens, _ = M.montar(rel(), tudo(**kw), BLOCOS)
            self.assertTrue(e, kw)

    def test_bloco_inexistente_duplicado_e_master_ausente(self):
        self.assertTrue(M.montar(rel(), tudo(block_id='s2-b99'), BLOCOS)[0])
        v = tudo(); v[1]['audio_id'] = v[0]['audio_id']; self.assertTrue(M.montar(rel(), v, BLOCOS)[0])
        v = tudo(); v[1]['order'] = v[0]['order']; self.assertTrue(M.montar(rel(), v, BLOCOS)[0])
        v = tudo(); v[0]['master'] = 'nao-existe.m4a'; self.assertTrue(M.montar(rel(), v, BLOCOS)[0])
        self.assertTrue(M.montar(rel(), [], BLOCOS)[0])

    def test_cobre_30mb_decodificacao_faststart_e_duracao(self):
        r = rel(); r['itens'][0]['copias'][0]['tamanho_mb'] = 31
        self.assertTrue(any('30 MB' in x for x in M.montar(r, tudo(), BLOCOS)[0]))
        r = rel(); r['itens'][0]['copias'][0]['faststart'] = False
        self.assertTrue(M.montar(r, tudo(), BLOCOS)[0])
        r = rel(); r['itens'][0]['copias'][0]['info']['duracao_s'] = None
        self.assertTrue(M.montar(r, tudo(), BLOCOS)[0])

    def test_kbps_escolhido_e_recomendado(self):
        r = rel(); r['itens'][0]['recomendado_kbps'] = 64
        e, itens, plano = M.montar(r, tudo(), BLOCOS); self.assertEqual(e, []); self.assertEqual(plano[0]['kbps'], 64)
        e, itens, plano = M.montar(rel(), tudo(kbps=64), BLOCOS); self.assertTrue(all(p['kbps'] == 64 for p in plano))

    def test_texto_que_parece_url_ou_arquivo_e_recusado_pelo_validador_do_motor(self):
        e, _, _ = M.montar(rel(), tudo(title='https://exemplo.com/a.m4a'), BLOCOS)
        self.assertTrue(e)

    def test_saida_dentro_do_git_recusada_e_nada_e_escrito(self):
        with tempfile.TemporaryDirectory() as d:
            rp, vp = os.path.join(d, 'r.json'), os.path.join(d, 'v.json')
            with open(rp, 'w') as f: json.dump(rel(), f)
            with open(vp, 'w') as f: json.dump(tudo(), f)
            with self.assertRaises(SystemExit):
                M.main(['--relatorio', rp, '--vinculos', vp, '--saida', os.path.join(M.RAIZ, 'saida-teste')])
            self.assertFalse(os.path.exists(os.path.join(M.RAIZ, 'saida-teste')))
            self.assertEqual(M.main(['--relatorio', rp, '--vinculos', vp, '--saida', os.path.join(d, 'out')]), 0)
            self.assertTrue(os.path.exists(os.path.join(d, 'out', 'manifesto.json')))

    def test_manifesto_gerado_cabe_no_limite_do_netlify(self):
        e, itens, _ = M.montar(rel(), tudo(), BLOCOS)
        self.assertLess(len(json.dumps({'semiologia-ii': itens}, separators=(',', ':')).encode()), M.LIMITE_ENV)


    def test_modelo_vinculos_exemplo_NAO_gera_manifesto(self):
        """O modelo entregue ao José está todo «não confirmado»: com os masters no relatório ele tem de falhar FECHADO em cada um dos 4."""
        with open(os.path.join(os.path.dirname(__file__), 'vinculos.exemplo.json'), encoding='utf-8') as f:
            modelo = json.load(f)
        self.assertEqual(len(modelo), 4)
        r = {'itens': [{'master': v['master'], 'recomendado_kbps': 48, 'copias': [copia(48), copia(64, 0.7)]} for v in modelo]}
        e, itens, plano = M.montar(r, modelo, BLOCOS)
        self.assertTrue(len([x for x in e if 'NÃO confirmado' in x]) == 4, e)
        self.assertTrue(len([x for x in e if 'escuta humana' in x]) == 4, e)
        self.assertTrue(len([x for x in e if 'block_id' in x]) == 4, e)               # «CONFIRMAR: …» não é um bloco da matéria
        self.assertTrue(all(v['vinculo_confirmado'] is False and v['escuta_humana_ok'] is False for v in modelo))

    def test_rodar_local_recusa_saida_dentro_do_repositorio(self):
        import subprocess
        sh = os.path.join(os.path.dirname(__file__), 'rodar_local.sh')
        r = subprocess.run(['bash', sh, '/tmp', os.path.join(M.RAIZ, 'saida-x')], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2); self.assertIn('RECUSADO', r.stdout)
        self.assertFalse(os.path.exists(os.path.join(M.RAIZ, 'saida-x')))


if __name__ == '__main__':
    unittest.main()
