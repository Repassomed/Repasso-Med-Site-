/* PRÉ-VOO · TESTE 3 — O CONTRATO DE ÂNCORAS DO MOTOR NÃO MUDOU SEM AVISO
   Os testes 1 e 2 repetem fora do motor a seleção que ele usa para resolver «secção>índice». Se alguém mudar essa seleção no motor (rm-tools-v2.js) sem mudar os testes,
   eles passariam a medir a coisa errada. Este teste LÊ o código do motor e compara com o contrato que o pré-voo assume; qualquer divergência é FALHA com a linha a rever.
   Também fixa três fatos de segurança do rollout: (a) o motor resolve o índice SEM excluir a interface do layout novo ([data-rm-ui]) — por isso o teste 1 existe;
   (b) índice inexistente cai para a secção (nunca para outro bloco); (c) o limite de coordenadas do traço (-1.5..2.5) e o de pontos (≤1200) continuam os documentados.
   Somente leitura. Uso: node tools/qa/pre-voo/contrato-motor.cjs   (saída 1 se algo divergir) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../Repasso-Med-Site--main/Atual - Copia');
const motor = fs.readFileSync(path.join(ROOT, 'assets/rm-tools-v2.js'), 'utf8');
const mig = fs.readdirSync(path.join(ROOT, 'supabase/migrations')).filter(f => /study_tools_v2\.sql$/.test(f));
let n = 0, ko = 0;
const ok = (c, m, x) => { n++; if (c) console.log('  ✓', m); else { ko++; console.log('  ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x) : ''); } };
const pega = re => { const m = re.exec(motor); return m ? m[1] : null; };

ok(pega(/var ANCHOR_SEL = '([^']+)'/) === 'section[id]', 'ANCHOR_SEL = section[id]', pega(/var ANCHOR_SEL = '([^']+)'/));
ok(pega(/var SUB_SEL = '([^']+)'/) === 'p,li,h2,h3,h4,h5,table,figure,blockquote', 'SUB_SEL = p,li,h2,h3,h4,h5,table,figure,blockquote (a mesma dos testes 1 e 2 e do inventário)', pega(/var SUB_SEL = '([^']+)'/));
ok(pega(/var SUB_MIN_H = (\d+)/) === '36', 'SUB_MIN_H = 36 (caixas menores ancoram na secção)', pega(/var SUB_MIN_H = (\d+)/));
const el = /function elDeAnchor\(anchorId\) \{[\s\S]*?\n  \}/.exec(motor);
ok(!!el, 'elDeAnchor existe');
if (el) {
  ok(/querySelectorAll\(SUB_SEL\)/.test(el[0]) && !/data-rm-ui/.test(el[0]), 'FATO: elDeAnchor resolve o índice sobre TODOS os SUB_SEL da secção, sem excluir [data-rm-ui] ⇒ qualquer p/li/h*/table/figure inserido pelo layout dentro de uma section[id] desloca os traços (o teste 1 prova que hoje nada é inserido)');
  ok(/return \(lista\[i\] \|\| sec\)/.test(el[0]), 'índice inexistente cai para a secção (o traço nunca muda de bloco)');
}
ok(/\[-1\.5, ?2\.5\]|-1\.5|2\.5/.test(motor), 'limite de coordenadas -1.5..2.5 presente no cliente');
ok(mig.length >= 1, 'migração study_tools_v2 presente', mig);
if (mig.length) { const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations', mig[0]), 'utf8'); ok(/1200/.test(sql), 'migração limita 1200 pontos por traço'); }
ok(/data-rm-content-rev/.test(motor), 'mecanismo data-rm-content-rev (traços anteriores à revisão estrutural ficam órfãos, nunca realocados) presente');
ok(/PILOT_SLUGS = \['semiologia-ii'\]/.test(motor), 'FATO: PILOT_SLUGS ainda é só semiologia-ii (A7 não entrou) — o piloto físico da caneta não liga fora dela');
ok(/hasStudyToolsV2Access/.test(motor) && /ROLLOUT = 'beta'/.test(motor), "FATO: ROLLOUT = 'beta' (a V2/caneta só para os 2 UID + study_tools_beta) — o pré-voo não muda isto");
console.log(`\n${n} verificações · ${ko} falha(s)`);
process.exit(ko ? 1 : 0);
