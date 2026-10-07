/* VALIDADOR DO CONTRATO DE NOVOS RECURSOS (issue #457 · checkpoint C). Somente leitura.
   Para cada matéria: extrai o MODELO POR ITEM do HTML real (modelo.cjs, DOMParser no Chromium; scripts não executam) e aplica as regras R1–R9 (regras.cjs),
   que conferem seção a seção, cópia a cópia e número a número (ver docs/layout-ensaio/CONTRATO-NOVOS-RECURSOS.md).
   Saída: docs/layout-ensaio/conformidade.json e CONFORMIDADE.md (todas as matérias) · com slugs: só imprime e grava conformidade.parcial.json.
   Casos negativos que provam que R4, R5 e R9 falham quando devem: tools/qa/ensaio-layout/contrato.teste.cjs.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/ensaio-layout/contrato.cjs [slug ...]      (código de saída 1 se audio_id divergir ou, com slugs, se alguma regra FALHAR) */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const M_ = require('./modelo.cjs');
const R = require('./regras.cjs');
const DIR = path.join(L.REPO, 'docs/layout-ensaio');
const filtro = process.argv.slice(2).filter(a => !a.startsWith('--'));

/* ---- formato de audio_id: o código real (servidor e motor) e o contrato documentado não podem divergir ---- */
const ASSETS = path.join(L.ROOT, 'assets'), FN = path.join(L.ROOT, 'netlify/functions');
const idRe = (f, nome) => { const m = new RegExp('(?:const|var)\\s+' + nome + '\\s*=\\s*(/\\^[^\\n]*?/[a-z]*);').exec(fs.readFileSync(f, 'utf8')); return m && m[1]; };
const ID_SERVIDOR = idRe(path.join(FN, '_audio/lib.js'), 'ID_RE'), ID_MOTOR = idRe(path.join(ASSETS, 'rm-audio.js'), 'ID_RE');
const docContrato = fs.readFileSync(path.join(DIR, 'CONTRATO-NOVOS-RECURSOS.md'), 'utf8');
const AUDIO_ID = { servidor: ID_SERVIDOR, motor: ID_MOTOR, igualEntreSi: !!ID_SERVIDOR && ID_SERVIDOR === ID_MOTOR, documentado: !!ID_SERVIDOR && (docContrato.includes('`' + ID_SERVIDOR + '`') || docContrato.includes('**`' + ID_SERVIDOR + '`**')) };
const audioOk = AUDIO_ID.igualEntreSi && AUDIO_ID.documentado;
console.log('audio_id:', ID_SERVIDOR, audioOk ? '✔ servidor = motor = contrato' : '✖ DIVERGE (servidor ' + ID_SERVIDOR + ' · motor ' + ID_MOTOR + ' · documentado ' + AUDIO_ID.documentado + ')');

function existe(rel) {
  if (!rel || /^(https?:|data:|\/\/|#)/.test(rel)) return null;
  return fs.existsSync(path.join(L.ROOT, rel.split('?')[0].replace(/^\.\//, '').replace(/^\//, '')));
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const lista = L.reconciliar().ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  const pg = await M_.abrirPagina(chromium);
  const out = [];
  for (const m of lista) {
    const html = fs.readFileSync(path.join(L.MAT, m.arquivo), 'utf8');
    const M = await pg.modelar(html);
    const A = R.avaliar(M, { html, existe });
    const regras = {}, detalhe = {};
    Object.keys(R.REGRAS).forEach(k => { regras[k] = A[k].ok; detalhe[k] = { resumo: A[k].resumo, ...(['R4', 'R5', 'R9'].includes(k) ? { det: A[k].det } : {}) }; });
    out.push({ slug: m.slug, title: m.title, regras, detalhe });
  }
  await pg.fechar();

  const nFalha = out.reduce((a, o) => a + Object.values(o.regras).filter(v => !v).length, 0);
  fs.writeFileSync(path.join(DIR, filtro.length ? 'conformidade.parcial.json' : 'conformidade.json'), L.jsonLinhas({ gerado_em: new Date().toISOString(), regras: R.REGRAS, audio_id: AUDIO_ID, materias: out }, 'materias'));

  if (!filtro.length) {
    const L1 = [];
    L1.push('# Conformidade com o contrato de novos recursos · issue #457', '');
    L1.push('> Gerado por `tools/qa/ensaio-layout/contrato.cjs` (modelo por item em `modelo.cjs`, regras em `regras.cjs`). ✔ = a regra é cumprida item a item pelo conteúdo de hoje; ✖ = exige edição editorial ou o marcador do contrato. **Nenhuma matéria foi alterada.** Os casos negativos que provam que R4, R5 e R9 falham quando devem estão em `contrato.teste.cjs`.', '');
    L1.push('## Regras', '', '| Regra | Descrição |', '|---|---|');
    Object.entries(R.REGRAS).forEach(([k, v]) => L1.push(`| ${k} | ${v} |`));
    L1.push('', '## Resultado por matéria', '', '| Matéria | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 |', '|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|');
    out.forEach(o => { const c = k => o.regras[k] ? '✔' : '✖'; L1.push(`| ${o.title} | ${['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'].map(c).join(' | ')} |`); });
    const tot = k => out.filter(o => o.regras[k]).length;
    L1.push('', '## Totais', '', '| Regra | Matérias que cumprem (de ' + out.length + ') |', '|---|--:|');
    Object.keys(R.REGRAS).forEach(k => L1.push(`| ${k} | ${tot(k)} |`));

    L1.push('', '## R4 · cópias do Banco × questão canônica (cópia a cópia)', '', '| Matéria | Cópias | Por marcador | Por convenção `bq-`↔`q-` | Sem vínculo | Alvo inexistente/é cópia | Repetidas | Texto diferente | Canônicas sem id | Canônicas sem cópia | Resultado |', '|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|:-:|');
    out.forEach(o => { const d = o.detalhe.R4.det; if (!d.copias) { L1.push(`| ${o.title} | — | — | — | — | — | — | — | — | — | ✔ sem Banco geral |`); return; }
      L1.push(`| ${o.title} | ${d.copias} | ${d.viaMarcador} | ${d.viaConvencao} | ${d.semVinculo} | ${d.alvoInexistente + d.alvoEhCopia} | ${d.duplicada} | ${d.divergente} | ${d.canonSemId} | ${d.canonSemCopia} | ${o.regras.R4 ? '✔' : '✖'} |`); });
    L1.push('', 'O vínculo por convenção de id (`bq-X` ↔ `q-X`) só vale se o alvo existe como questão canônica, tem **texto igual** (enunciado e alternativas) e não é repetido; casar «por enunciado» sem id nem marcador **não é vínculo** (a contagem exata fica indeterminada).');

    L1.push('', '## R5 · números declarados na portada × contagem canônica', '', '| Matéria | Declarado | Canônico (agregadoras fora) | Total do DOM (com cópias) | Estado |', '|---|---|--:|--:|:-:|');
    out.forEach(o => { const its = o.detalhe.R5.det.itens.filter(i => i.estado !== 'fora-do-contrato'); if (!its.length) { L1.push(`| ${o.title} | — | — | — | ✔ sem número declarado na portada |`); return; }
      its.forEach(i => L1.push(`| ${o.title} | ${i.n} ${i.rec} | ${i.canonico === null ? '?' : i.canonico} | ${i.domTotal === undefined ? '—' : i.domTotal} | ${i.estado === 'ok' ? '✔' : i.estado === 'indeterminado' ? '✖ indeterminado' : '✖ diverge' + (i.soCoincideComDOM ? ' (= total do DOM duplicado)' : '')} |`)); });

    L1.push('', '## R9 · marcadores por seção e por item (faltas / aplicáveis)', '', '| Matéria | Seções sem `data-rm-role` | Agregadoras sem `data-rm-agrega` | Perguntas canônicas sem `data-rm-q` | Cópias de pergunta sem `data-rm-copia-de` | Flashcards sem `data-rm-fc` | Cópias de flashcard sem link | Vídeos sem id | Resultado |', '|---|--:|--:|--:|--:|--:|--:|--:|:-:|');
    out.forEach(o => { const d = o.detalhe.R9.det, f = d.faltas, a = d.aplicaveis;
      L1.push(`| ${o.title} | ${f.secSemRole}/${a.secoes} | ${f.agregSemMarcador} | ${f.quizCanonSemQ}/${a.quizCanon} | ${f.quizCopiaSemLink}/${a.quizCopia} | ${f.fcCanonSemId}/${a.fcCanon} | ${f.fcCopiaSemLink}/${a.fcCopia} | ${f.videoSemId}/${a.video} | ${o.regras.R9 ? '✔' : '✖'} |`); });

    L1.push('', '## Observações por matéria (R1–R3, R6–R8)', '');
    out.forEach(o => { const obs = ['R1', 'R2', 'R3', 'R6', 'R7', 'R8'].filter(k => !o.regras[k]).map(k => `${k}: ${o.detalhe[k].resumo}`); if (obs.length) L1.push(`- **${o.title}**: ${obs.join(' · ').slice(0, 400)}`); });
    L1.push('', '## Formato de `audio_id` (código real × contrato)', '', `- Servidor \`_audio/lib.js:35\`: \`${ID_SERVIDOR}\``, `- Motor \`assets/rm-audio.js:118\`: \`${ID_MOTOR}\``, `- Documentado no contrato: ${AUDIO_ID.documentado ? '✔ idêntico' : '✖ diverge'} · servidor = motor: ${AUDIO_ID.igualEntreSi ? '✔' : '✖'}`);
    L1.push('', 'R9 é ✖ em todas por construção: o contrato é uma proposta e nenhuma matéria foi editada. R3 mede se a **heurística atual do piloto** já reconheceria as agregadoras; onde ✖, o módulo contaria o dobro ou o triplo.');
    fs.writeFileSync(path.join(DIR, 'CONFORMIDADE.md'), L1.join('\n') + '\n');
    console.log('CONFORMIDADE.md', out.length, 'matérias ·', nFalha, 'regras ✖', Object.fromEntries(Object.keys(R.REGRAS).map(k => [k, tot(k)])));
  } else {
    out.forEach(o => console.log(o.slug, Object.entries(o.regras).map(([k, v]) => k + (v ? '✔' : '✖')).join(' '), '\n   ', ['R4', 'R5', 'R9'].map(k => k + ': ' + (o.detalhe[k].resumo || 'ok')).join('\n    ')));
  }
  process.exit(!audioOk || (filtro.length && nFalha) ? 1 : 0);
})();
