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
    a = dict(origem=None, entradas=entradas, saida=saida, ar=32000, stoi_min=P.STOI_MIN, janelas=3, velocidades='2,2.5', janelas_vel=2, amostras=0, janela_amostra=5.0, stoi_min_vel=P.STOI_MIN_VEL, politica='auto')
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

    # 3 ─ resíduos de execuções anteriores não entram no lote; NADA é apagado (proteção dos originais)
    def test_3_saida_nao_vazia_recusada_sem_apagar_nada(self):
        d = tempfile.mkdtemp(prefix='rm-res-')
        try:
            velho, nota = os.path.join(d, 'velho.m4a'), os.path.join(d, 'nota.txt')
            open(velho, 'wb').write(b'x'); open(nota, 'w').write('minha nota')
            with self.assertRaises(SystemExit): P.valida_saida(d)
            e = P.descobrir(os.path.join(self.tmp, 'a'))
            with self.assertRaises(SystemExit): prep(e, d)
            self.assertEqual(sorted(os.listdir(d)), ['nota.txt', 'velho.m4a'])                       # .m4a e arquivo desconhecido intactos
            self.assertEqual(open(velho, 'rb').read(), b'x')
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_3c_nao_existe_mais_limpar(self):
        with self.assertRaises(SystemExit):
            P.main(['preparar', '--origem', os.path.join(self.tmp, 'a'), '--saida', self.tmp + '-lx', '--limpar'])    # opção removida: argparse recusa
        self.assertFalse(hasattr(P, 'saida_limpa'))
        self.assertFalse(os.path.exists(self.tmp + '-lx'))

    def test_3d_saida_igual_ou_sobreposta_a_entrada_nao_apaga_originais(self):
        d = tempfile.mkdtemp(prefix='rm-sob-')
        try:
            ent = os.path.join(d, 'ent'); os.makedirs(os.path.join(ent, 'sub'))
            gera(os.path.join(ent, 'M.m4a')); gera(os.path.join(ent, 'sub', 'N.m4a'), freq=500)
            desconhecido = os.path.join(ent, 'sub', 'tese.docx'); open(desconhecido, 'w').write('meu texto')
            antes = {os.path.join(r, f): P.sha256(os.path.join(r, f)) for r, _, fs in os.walk(ent) for f in fs}
            e = P.descobrir(ent)
            def intacto():
                self.assertEqual(antes, {os.path.join(r, f): P.sha256(os.path.join(r, f)) for r, _, fs in os.walk(ent) for f in fs})
            for saida in (ent, os.path.join(ent, 'sub'), os.path.join(ent, 'novos'), d):          # igual, dentro, subpasta nova, CONTENDO a entrada
                with self.assertRaises(SystemExit) as c: prep(e, saida)
                self.assertIn('RECUSADO', str(c.exception)); intacto()
                with self.assertRaises(SystemExit) as c: P.main(['preparar', '--origem', ent, '--saida', saida])
                intacto()
                with self.assertRaises(SystemExit): T.main(['--origem', ent, '--saida', saida, '--modelo', '/x'])
                intacto()
            self.assertFalse(os.path.exists(os.path.join(ent, 'novos')))                          # nem a pasta foi criada
            link = os.path.join(d, 'atalho'); os.symlink(ent, link)                               # symlink para a entrada = a própria entrada
            with self.assertRaises(SystemExit): prep(e, link)
            intacto()
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_3e_validacao_antes_de_qualquer_escrita(self):
        d = tempfile.mkdtemp(prefix='rm-val-')
        try:
            vazia = os.path.join(d, 'vazia'); os.makedirs(vazia); saida = os.path.join(d, 'saida')
            with self.assertRaises(SystemExit): P.main(['preparar', '--origem', vazia, '--saida', saida])    # entrada sem áudio
            self.assertFalse(os.path.exists(saida))                                                   # a saída nem foi criada
            with self.assertRaises(SystemExit): P.main(['preparar', '--origem', os.path.join(d, 'nao-existe'), '--saida', saida])
            self.assertFalse(os.path.exists(saida))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_3f_processar_masters_trabalho_sobreposto_a_pasta_recusado(self):
        d = tempfile.mkdtemp(prefix='rm-trab-')
        try:
            ent = os.path.join(d, 'ent'); os.makedirs(ent); gera(os.path.join(ent, 'M.m4a'))
            antes = P.sha256(os.path.join(ent, 'M.m4a'))
            orig = Z.verifica_ambiente; Z.verifica_ambiente = lambda *a, **k: []
            try:
                for trab in (ent, os.path.join(ent, 'trab'), d):
                    with self.assertRaises(SystemExit) as c: Z.main(['--pasta', ent, '--trabalho', trab, '--modelo', '/x'])
                    self.assertIn('RECUSADO', str(c.exception))
            finally:
                Z.verifica_ambiente = orig
            self.assertEqual(os.listdir(ent), ['M.m4a']); self.assertEqual(P.sha256(os.path.join(ent, 'M.m4a')), antes)
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
        orig = Z.verifica_ambiente; Z.verifica_ambiente = lambda *a, **k: []
        try:
            with self.assertRaises(SystemExit) as c: Z.main(['--pasta', '/tmp', '--trabalho', os.path.join(Z.RAIZ, 'x'), '--modelo', '/tmp'])
            self.assertIn('repositório git', str(c.exception))
        finally:
            Z.verifica_ambiente = orig


class Recomendacao(unittest.TestCase):
    def cp(self, arq, kb, mb=1.0, stoi=0.97, ok=True, fs=True, pico=-3.0, vel=0.95):
        return {'arquivo': arq, 'kbps_alvo': kb, 'tamanho_mb': mb, 'info': {'bitrate_kbps': kb}, 'faststart': fs, 'decodifica_sem_erros': ok,
                'stoi': {'media': stoi, 'minimo': stoi - 0.01}, 'loudness': {'pico_dbfs': pico}, 'stoi_velocidades': {'2x': {'media': vel, 'minimo': vel}}}

    def args(self):
        import argparse
        return argparse.Namespace(stoi_min=P.STOI_MIN, stoi_min_vel=P.STOI_MIN_VEL)

    def test_criterios_apontam_o_que_reprovou(self):
        a = self.args()
        self.assertEqual(P.criterios_copia(self.cp('a', 48), a), [])
        self.assertTrue(any('STOI 1×' in x for x in P.criterios_copia(self.cp('a', 48, stoi=0.5), a)))
        self.assertTrue(any('faststart' in x for x in P.criterios_copia(self.cp('a', 48, fs=False), a)))
        self.assertTrue(any('30 MiB' in x for x in P.criterios_copia(self.cp('a', 64, mb=31.0), a)))
        self.assertTrue(any('velocidade' in x for x in P.criterios_copia(self.cp('a', 48, vel=0.5), a)))
        self.assertTrue(any('clipping' in x for x in P.criterios_copia(self.cp('a', 48, pico=0.0), a)))

    def test_relatorio_mostra_a_recomendada_nao_a_primeira(self):
        it = {'recomendado_arquivo': 'b.64k.m4a', 'copias': [self.cp('a.48k.m4a', 48), self.cp('b.64k.m4a', 64)]}
        self.assertEqual(Z.copia_recomendada(it)['arquivo'], 'b.64k.m4a')

    def test_nenhuma_copia_aprovada_fica_explicito_e_manifesto_recusa(self):
        d = tempfile.mkdtemp(prefix='rm-rep-')
        try:
            ent = os.path.join(d, 'ent'); os.makedirs(ent); gera(os.path.join(ent, 'M.m4a'), ch=2, kb=128)
            rel = prep(P.descobrir(ent), os.path.join(d, 'out'), stoi_min=2.0)                         # limiar impossível: ninguém passa
            it = rel['itens'][0]
            self.assertFalse(it['recomendado_aprovado']); self.assertIn('NENHUMA', it['recomendacao_motivo'])
            self.assertTrue(all(it['criterios_reprovados'][c['arquivo']] for c in it['copias']))
            self.assertIn('NÃO APROVADA', P.md(rel))
            v = {'id': it['id'], 'master': it['master'], 'sha256_master': it['sha256_master'], 'audio_id': 's2-t', 'block_id': 's2-b03', 'theme': 't', 'title': 'x', 'order': 1, 'version': 'v1',
                 'vinculo_confirmado': True, 'confirmado_por': 'transcricao', 'escuta_humana_ok': True}
            err, _, _ = M.montar(rel, [v], M.blocos_da_materia()); self.assertTrue(any('nenhuma cópia passou' in x for x in err))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_recomendada_aprovada_no_fluxo_normal(self):
        d = tempfile.mkdtemp(prefix='rm-rep2-')
        try:
            ent = os.path.join(d, 'ent'); os.makedirs(ent); gera(os.path.join(ent, 'M.m4a'), ch=2, kb=128)
            rel = prep(P.descobrir(ent), os.path.join(d, 'out'), stoi_min=0.0, stoi_min_vel=0.0)   # seno não é fala: limiares zerados só para exercitar o caminho aprovado
            it = rel['itens'][0]
            self.assertTrue(it['recomendado_aprovado']); self.assertEqual(Z.copia_recomendada(it)['kbps_alvo'], it['recomendado_kbps'])
            self.assertEqual(len(it['alternativas']), 1)
        finally:
            shutil.rmtree(d, ignore_errors=True)


class Cobertura(unittest.TestCase):
    def jan(self, dur, janela, passo, texto='x'):
        return [{'inicio_s': round(i, 1), 'fim_s': round(i + d, 1), 'texto': texto} for i, d in T.janelas(dur, janela, passo)]

    def test_janelas_sobrepostas_nao_somam_alem_de_100(self):
        r = T.cobertura({'duracao_s': 100.0}, self.jan(100.0, 28.0, 10.0))
        self.assertEqual(r['temporal_pct'], 100.0)                                                   # antes: 254 %
        r = T.cobertura({'duracao_s': 100.0}, [{'inicio_s': 0, 'fim_s': 28, 'texto': 'x'}, {'inicio_s': 14, 'fim_s': 42, 'texto': 'x'}])
        self.assertEqual(r['temporal_pct'], 42.0)                                                    # união 0–42, não 56 %

    def test_janelas_separadas(self):
        r = T.cobertura({'duracao_s': 300.0}, self.jan(300.0, 28.0, 120.0))
        self.assertEqual(r['temporal_pct'], round(100 * 84 / 300, 1))                                # 3 × 28 s, sem sobreposição

    def test_transcricao_completa_e_limitada_a_duracao_real(self):
        for dur in (100.0, 85.4, 300.0):
            self.assertEqual(T.cobertura({'duracao_s': dur}, self.jan(dur, 28.0, 28.0))['temporal_pct'], 100.0, dur)
        self.assertEqual(T.cobertura({'duracao_s': 50.0}, [{'inicio_s': 0, 'fim_s': 80, 'texto': 'x'}])['temporal_pct'], 100.0)   # janela além do fim é recortada

    def test_cobertura_temporal_difere_de_texto_reconhecido(self):
        j = self.jan(100.0, 25.0, 25.0); j[1]['texto'] = ''; j[3]['texto'] = ''                      # 2 janelas de silêncio
        r = T.cobertura({'duracao_s': 100.0}, j)
        self.assertEqual((r['temporal_pct'], r['com_texto_pct'], r['sem_texto_s'], r['janelas_sem_texto']), (100.0, 50.0, 50.0, 2))
        self.assertEqual(T.cobertura({'duracao_s': 0}, [])['temporal_pct'], 0.0)

    def test_arquivo_janelas_registra_os_dois_numeros_e_o_aviso(self):
        d = tempfile.mkdtemp(prefix='rm-cob-')
        try:
            e = {'id': 'x-1', 'nome_original': 'x.m4a', 'sha256': '0' * 64}
            T.escreve_transcricao(d, e, {'duracao_s': 300.0}, self.jan(300.0, 28.0, 120.0), 28.0, 120.0)
            j = json.load(open(os.path.join(d, 'x-1.janelas.json'), encoding='utf-8'))
            self.assertTrue(j['amostrada']); self.assertIn('AMOSTRADA', j['aviso']); self.assertEqual(j['cobertura_com_texto_pct'], j['cobertura_temporal_pct'])
            T.escreve_transcricao(d, e, {'duracao_s': 300.0}, self.jan(300.0, 28.0, 28.0), 28.0, 28.0)
            j = json.load(open(os.path.join(d, 'x-1.janelas.json'), encoding='utf-8'))
            self.assertFalse(j['amostrada']); self.assertIsNone(j['aviso'])
        finally:
            shutil.rmtree(d, ignore_errors=True)


class Modelo(unittest.TestCase):
    def test_modelo_ausente_incompleto_e_truncado(self):
        d = tempfile.mkdtemp(prefix='rm-mod-'); m = os.path.join(d, 'sherpa-onnx-whisper-small')
        try:
            self.assertTrue(T.verifica_modelo(m))                                                    # não existe
            os.makedirs(m)
            self.assertGreaterEqual(len(T.verifica_modelo(m)), 3)                                    # vazio: encoder, decoder, tokens
            for n in ('small-encoder.int8.onnx', 'small-decoder.int8.onnx'):
                with open(os.path.join(m, n), 'wb') as f: f.truncate(11 * 1048576)
            open(os.path.join(m, 'small-tokens.txt'), 'w').write('a 1\n' * 100)
            self.assertTrue(any('truncado' in x for x in T.verifica_modelo(m)))                      # vocabulário incompleto
            open(os.path.join(m, 'small-tokens.txt'), 'w').write('a 1\n' * 50000)
            self.assertEqual(T.verifica_modelo(m), [])
            with open(os.path.join(m, 'small-encoder.int8.onnx'), 'wb') as f: f.truncate(1000)       # arquivo cortado
            self.assertTrue(any('encoder' in x for x in T.verifica_modelo(m)))
        finally:
            shutil.rmtree(d, ignore_errors=True)

    def test_verificar_ambiente_sem_materia_ou_modelo_falha_e_sai_com_1(self):
        self.assertEqual(Z.main(['--verificar-ambiente', '--modelo', '/nao/existe', '--materia', '/nao/existe.html']), 1)
        e = Z.verifica_ambiente('/nao/existe', '/nao/existe.html')
        self.assertTrue(any('matéria' in x for x in e) and any('modelo' in x for x in e))


if __name__ == '__main__':
    unittest.main()
