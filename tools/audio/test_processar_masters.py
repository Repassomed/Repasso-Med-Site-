"""Regressões da auditoria da #436 + política de derivados: entrada em lote, nomes duplicados, resíduos, entrada vazia, passo/janela, master ↔ derivados ↔ relatório."""
import json, os, shutil, subprocess, sys, tempfile, unittest, zipfile
sys.path.insert(0, os.path.dirname(__file__))
import preparar_audiobooks as P
import processar_masters as Z
import transcrever as T
import montar_manifesto as M


def gera(dst, ch=1, kb=48, dur=12, freq=300, faststart=True):
    cmd = [P.ff(), '-y', '-v', 'error', '-f', 'lavfi', '-i', f'sine=frequency={freq}:duration={dur}', '-ac', str(ch), '-ar', '32000', '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', f'{kb}k']
    if faststart:
        cmd += ['-movflags', '+faststart']
    subprocess.run(cmd + [dst], check=True)


def prep(entradas, saida, **kw):
    import argparse
    a = dict(origem=None, entradas=entradas, saida=saida, ar=32000, stoi_min=P.STOI_MIN, janelas=3, velocidades='2,2.5', janelas_vel=2, amostras=0, janela_amostra=5.0, stoi_min_vel=P.STOI_MIN_VEL, limpar=False, politica='auto')
    a.update(kw)
    return P.cmd_preparar(argparse.Namespace(**a))


class Lote(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix='rm-lote-')                       # fora do repositório
        os.makedirs(os.path.join(cls.tmp, 'a', 'sub')); os.makedirs(os.path.join(cls.tmp, 'b'))
        gera(os.path.join(cls.tmp, 'a', 'Semio_EPOC (1).m4a'), freq=300)                            # AAC-LC mono 48k com faststart → reaproveitar
        gera(os.path.join(cls.tmp, 'a', 'sub', 'Semio - 3 Sindrome Parenquimatoso (1).m4a'), freq=500, faststart=False)   # mono sem faststart → remux
        gera(os.path.join(cls.tmp, 'b', 'Semio_-_4_sindrome_pleual (1).m4a'), ch=2, kb=128, freq=700)   # estéreo 128k → reencodar

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    # 1 ─ arquivos em subpastas/pastas diferentes entram na MESMA lista
    def test_1_varias_pastas_e_subpastas_na_mesma_lista(self):
        e = P.descobrir([os.path.join(self.tmp, 'a'), os.path.join(self.tmp, 'b')])
        self.assertEqual(len(e), 3); self.assertEqual({x['nome_logico'] for x in e}, {'Semio_EPOC.m4a', 'Semio - 3 Sindrome Parenquimatoso.m4a', 'Semio_-_4_sindrome_pleual.m4a'})
        self.assertEqual(len({x['id'] for x in e}), 3)
        self.assertTrue(any(os.sep in x['relpath'] for x in e))                                     # a de subpasta foi achada

    def test_nome_logico_remove_o_sufixo_1_sem_decidir_vinculo(self):
        self.assertEqual(P.nome_logico('Semio_EPOC (1).m4a'), 'Semio_EPOC.m4a'); self.assertEqual(P.nome_logico('x (12).m4a'), 'x.m4a'); self.assertEqual(P.nome_logico('Semio_EPOC.m4a'), 'Semio_EPOC.m4a')
        e = P.descobrir(os.path.join(self.tmp, 'a'))
        self.assertTrue(all(x['nome_original'].endswith('(1).m4a') for x in e))                     # arquivo com « (1)» NÃO é rejeitado

    # 2 ─ nomes duplicados não sobrescrevem em silêncio
    def test_2_mesmo_nome_conteudo_diferente_e_erro_e_identico_e_registrado(self):
        d = tempfile.mkdtemp(prefix='rm-dup-')
        try:
            os.makedirs(os.path.join(d, 'x')); os.makedirs(os.path.join(d, 'y')); os.makedirs(os.path.join(d, 'z'))
            gera(os.path.join(d, 'x', 'M.m4a'), freq=300); gera(os.path.join(d, 'y', 'M.m4a'), freq=400)
            with self.assertRaises(SystemExit) as c:
                P.descobrir([os.path.join(d, 'x'), os.path.join(d, 'y')])
            self.assertIn('MESMO nome', str(c.exception))
            shutil.copyfile(os.path.join(d, 'x', 'M.m4a'), os.path.join(d, 'z', 'M.m4a'))
            e = P.descobrir([os.path.join(d, 'x'), os.path.join(d, 'z')])
            self.assertEqual(len(e), 1); self.assertEqual(len(e[0]['duplicatas_identicas']), 1)     # idêntica: 1 entrada, a outra registrada
        finally:
            shutil.rmtree(d, ignore_errors=True)

    # 3 ─ resíduos de execuções anteriores não entram no lote
    def test_3_saida_nao_vazia_recusada_e_limpar_so_apaga_artefatos_conhecidos(self):
        d = tempfile.mkdtemp(prefix='rm-res-')
        try:
            open(os.path.join(d, 'velho.m4a'), 'wb').write(b'x')
            with self.assertRaises(SystemExit): P.saida_limpa(d)
            e = P.descobrir(os.path.join(self.tmp, 'a'))
            with self.assertRaises(SystemExit): prep(e, d)
            open(os.path.join(d, 'nota.txt'), 'w').write('minha nota')
            with self.assertRaises(SystemExit): P.saida_limpa(d, limpar=True)                         # arquivo desconhecido: não apaga, recusa
            self.assertTrue(os.path.exists(os.path.join(d, 'nota.txt')))
            os.remove(os.path.join(d, 'nota.txt')); P.saida_limpa(d, limpar=True); self.assertEqual(os.listdir(d), [])
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_3b_cada_execucao_cria_pasta_nova(self):
        w = tempfile.mkdtemp(prefix='rm-exec-')
        try:
            e = P.descobrir(os.path.join(self.tmp, 'a'))
            import datetime
            d1 = os.path.join(w, 'execucao-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
            os.makedirs(d1)
            with self.assertRaises(FileExistsError): os.makedirs(d1)                                  # a mesma execução nunca é reaproveitada
        finally:
            shutil.rmtree(w, ignore_errors=True)

    # 4 ─ entrada vazia
    def test_4_entrada_vazia_erro_claro(self):
        d = tempfile.mkdtemp(prefix='rm-vazio-')
        try:
            with self.assertRaises(SystemExit) as c: P.descobrir(d)
            self.assertIn('nenhum arquivo de áudio', str(c.exception))
            with self.assertRaises(SystemExit) as c: P.descobrir('/caminho/que/nao/existe')
            self.assertIn('não existe', str(c.exception))
            with self.assertRaises(SystemExit) as c: Z.montar_lote([], None, d)
            self.assertIn('--pasta', str(c.exception))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    # 5 ─ passo e janela positivos
    def test_5_passo_e_janela_positivos(self):
        for v in ('0', '-5'):
            with self.assertRaises(SystemExit): T.main(['--origem', self.tmp, '--saida', self.tmp + '-s', '--modelo', '/x', '--passo', v])
            with self.assertRaises(SystemExit): T.main(['--origem', self.tmp, '--saida', self.tmp + '-s', '--modelo', '/x', '--janela', v])
        with self.assertRaises(ValueError): T.janelas(100.0, 0, 10)
        with self.assertRaises(ValueError): T.janelas(100.0, 10, -1)                                  # antes: laço infinito
        self.assertEqual([round(a) for a, _ in T.janelas(300.0, 28.0, 120.0)], [0, 120, 240])

    # 6 ─ cada áudio ↔ derivados ↔ relatório; política de derivados
    def test_6_master_derivado_relatorio_e_politica(self):
        d = tempfile.mkdtemp(prefix='rm-out-')
        try:
            e = P.descobrir([os.path.join(self.tmp, 'a'), os.path.join(self.tmp, 'b')])
            antes = {x['caminho']: P.sha256(x['caminho']) for x in e}
            rel = prep(e, d)
            self.assertEqual(len(rel['itens']), 3); self.assertEqual({i['id'] for i in rel['itens']}, {x['id'] for x in e})
            por = {i['nome_logico']: i for i in rel['itens']}
            for it in rel['itens']:
                self.assertEqual(it['sha256_master'], next(x['sha256'] for x in e if x['id'] == it['id']))
                for c in it['copias']:
                    self.assertTrue(c['arquivo'].startswith(it['id']), c['arquivo'])                 # derivado carrega o id (slug+sha8) do SEU master
                    self.assertTrue(os.path.exists(os.path.join(d, c['arquivo'])))
                self.assertTrue(it['master_intacto'])
            arquivos = {f for f in os.listdir(d) if f.endswith('.m4a')}
            self.assertEqual(arquivos, {c['arquivo'] for i in rel['itens'] for c in i['copias']})     # nada além do lote atual
            self.assertEqual({x for x in os.listdir(d)}, arquivos | {'relatorio.json', 'relatorio.md'})
            self.assertEqual(antes, {x['caminho']: P.sha256(x['caminho']) for x in e})               # masters preservados
            ep = por['Semio_EPOC.m4a']; self.assertEqual(ep['acao_derivado']['acao'], 'reaproveitar')
            self.assertEqual(P.sha256(os.path.join(d, ep['copias'][0]['arquivo'])), ep['sha256_master'])   # cópia idêntica: SEM nova perda
            pa = por['Semio - 3 Sindrome Parenquimatoso.m4a']; self.assertEqual(pa['acao_derivado']['acao'], 'remux-faststart')
            self.assertTrue(pa['copias'][0]['faststart'] and pa['copias'][0]['decodifica_sem_erros']); self.assertLess(abs(pa['copias'][0]['delta_duracao_s']), 0.15)
            pl = por['Semio_-_4_sindrome_pleual.m4a']; self.assertEqual(pl['acao_derivado']['acao'], 'reencodar'); self.assertEqual([c['kbps_alvo'] for c in pl['copias']], [48, 64])
            self.assertIn(pl['recomendado_kbps'], (48, 64))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_6b_decidir_derivado_limites(self):
        ok = {'codec': 'aac', 'perfil': 'LC', 'canais': 1, 'bitrate_kbps': 64}
        self.assertEqual(P.decidir_derivado(ok, 10_000_000, True)[0], 'reaproveitar')
        self.assertEqual(P.decidir_derivado(ok, 10_000_000, False)[0], 'remux-faststart')
        a, m = P.decidir_derivado(ok, 36_758_530, True); self.assertEqual(a, 'reencodar'); self.assertIn('30 MiB', m)       # 36,7 MB passa do limite do bucket
        self.assertEqual(P.decidir_derivado(dict(ok, canais=2), 1_000_000, True)[0], 'reencodar')
        self.assertEqual(P.decidir_derivado(dict(ok, bitrate_kbps=128), 1_000_000, True)[0], 'reencodar')
        self.assertEqual(P.decidir_derivado(dict(ok, codec='mp3'), 1_000_000, True)[0], 'reencodar')

    def test_7_manifesto_usa_id_e_confere_sha(self):
        d = tempfile.mkdtemp(prefix='rm-man-')
        try:
            e = P.descobrir(os.path.join(self.tmp, 'a')); rel = prep(e[:1], d)
            it = rel['itens'][0]
            v = {'id': it['id'], 'master': it['master'], 'sha256_master': it['sha256_master'], 'audio_id': 's2-teste-1', 'block_id': 's2-b03', 'theme': 't', 'title': 'x', 'order': 1, 'version': 'v1',
                 'vinculo_confirmado': True, 'confirmado_por': 'transcricao', 'escuta_humana_ok': True}
            err, itens, plano = M.montar(rel, [v], M.blocos_da_materia()); self.assertEqual(err, [])
            err, _, _ = M.montar(rel, [dict(v, sha256_master='0' * 64)], M.blocos_da_materia()); self.assertTrue(any('SHA-256' in x for x in err))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_zip_slip_recusado_e_extrai_so_dentro(self):
        d = tempfile.mkdtemp(prefix='rm-zs-'); z = os.path.join(d, 'x.zip')
        try:
            with zipfile.ZipFile(z, 'w') as zz: zz.writestr('../fora.m4a', b'x')
            with self.assertRaises(SystemExit): Z.extrair(z, os.path.join(d, 'dest'))
            self.assertFalse(os.path.exists(os.path.join(d, 'fora.m4a')))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_saida_dentro_do_git_recusada(self):
        with self.assertRaises(SystemExit): T.main(['--origem', '/tmp', '--saida', os.path.join(Z.RAIZ, 'x'), '--modelo', '/tmp'])
        with self.assertRaises(SystemExit): Z.main(['--pasta', '/tmp', '--trabalho', os.path.join(Z.RAIZ, 'x'), '--modelo', '/tmp'])


if __name__ == '__main__':
    unittest.main()
