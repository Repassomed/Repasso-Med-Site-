"""PRÉ-VOO · testes das PRÓPRIAS ferramentas Python (para o resultado delas valer alguma coisa).
Uso (da raiz):  python3 -I -m unittest discover -s tools/qa/pre-voo -p 'test_ferramentas.py' -v"""
import importlib.util, os, unittest

AQUI = os.path.dirname(os.path.abspath(__file__))
def carregar(nome, arq):
    s = importlib.util.spec_from_file_location(nome, os.path.join(AQUI, arq)); m = importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
inv = carregar('inv', 'inventario-risco.py')
desl = carregar('desl', 'deslocamento-de-indice.py')

BASE = '''<section id="b01"><h2>Titulo</h2><p>Primeiro parágrafo da secção com texto suficiente para a assinatura.</p>
<div class="quiz-item"><p>Pergunta um?</p><ul><li>A</li><li>B</li></ul></div><p>Último parágrafo da secção b01 com texto.</p></section>
<section id="b02"><p>Outra secção, com um parágrafo.</p><details><summary>x</summary><p>Dentro do details.</p></details></section>'''

class Medidor(unittest.TestCase):
    def medir(self, html):
        p = inv.Medidor(); p.feed(html); return p
    def test_conta_sub_ancoras_por_secao(self):
        p = self.medir(BASE)
        self.assertEqual([s['sub'] for s in p.secs], [6, 2])      # b01: h2 + p + (p, li, li da questão) + p ; b02: p + p do details (summary não conta)
    def test_conta_questoes_e_details(self):
        p = self.medir(BASE)
        self.assertEqual(p.secs[0]['q'], 3)                         # p + 2 li dentro de .quiz-item
        self.assertEqual(p.secs[1]['det'], 1)                       # p dentro de <details>
    def test_secao_aninhada_e_id_duplicado(self):
        p = self.medir('<section id="a"><section id="a"><p>x</p></section></section>')
        self.assertEqual(p.aninhadas, 1); self.assertEqual(p.ids, ['a', 'a'])

class Deslocamento(unittest.TestCase):
    def sig(self, html): return desl.sig(html)[0]
    def classe(self, a, b):
        la, lb = a['s'], b['s']
        ta, tb = [x.split(':', 1)[0] for x in la], [x.split(':', 1)[0] for x in lb]
        return 'estavel' if ta == tb else 'estrutura'
    def test_reescrever_texto_no_lugar_nao_desloca(self):
        a = self.sig('<section id="s"><p>um texto antigo</p><p>dois</p></section>'); b = self.sig('<section id="s"><p>um texto NOVO</p><p>dois</p></section>')
        self.assertNotEqual(a['s'], b['s']); self.assertEqual(self.classe(a, b), 'estavel')
    def test_inserir_paragrafo_desloca(self):
        a = self.sig('<section id="s"><p>um</p><p>dois</p></section>'); b = self.sig('<section id="s"><p>novo</p><p>um</p><p>dois</p></section>')
        self.assertEqual(self.classe(a, b), 'estrutura'); self.assertEqual((len(a['s']), len(b['s'])), (2, 3))
    def test_trocar_tag_desloca(self):
        a = self.sig('<section id="s"><p>um</p><p>dois</p></section>'); b = self.sig('<section id="s"><p>um</p><li>dois</li></section>')
        self.assertEqual(self.classe(a, b), 'estrutura')

if __name__ == '__main__':
    unittest.main()
