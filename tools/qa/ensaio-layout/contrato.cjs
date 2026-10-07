/* VALIDADOR DO CONTRATO DE NOVOS RECURSOS (issue #457 · checkpoint C). Somente leitura.
   Lê docs/layout-ensaio/inventario.json (ou inventario.parcial.json com --parcial) + o HTML de cada matéria e aplica as regras R1..R9 de
   docs/layout-ensaio/CONTRATO-NOVOS-RECURSOS.md. Saída: docs/layout-ensaio/conformidade.json e CONFORMIDADE.md.
   Uso: node tools/qa/ensaio-layout/contrato.cjs [slug ...] [--parcial]      (código de saída 1 se alguma regra FALHA nas matérias pedidas) */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const D = require('./derivar.cjs');
const DIR = path.join(L.REPO, 'docs/layout-ensaio');
const args = process.argv.slice(2), parcial = args.includes('--parcial'), filtro = args.filter(a => !a.startsWith('--'));
const inv = JSON.parse(fs.readFileSync(path.join(DIR, parcial ? 'inventario.parcial.json' : 'inventario.json'), 'utf8'));
const REUNE = /banco|flashcards/i;   // a heurística de id do piloto (rm-materia-nav.js:90 · rm-layout.js:472)

const REGRAS = {
  R1: 'toda seção tem título (<h2>): o card do índice e os botões Anterior/Próximo dependem dele',
  R2: 'toda questão tem id estável (q-<prefixo><NNN>)',
  R3: 'toda seção agregadora (cópia de itens dos blocos) é reconhecida: id casa a heurística do piloto OU leva data-rm-agrega',
  R4: 'cada cópia no banco geral está ligada à canônica (por id / data-rm-copia-de), sem órfãs',
  R5: 'números declarados na portada = números derivados do conteúdo',
  R6: 'nenhum id duplicado no documento',
  R7: 'nenhuma mídia local quebrada',
  R8: 'nenhuma URL assinada/caminho de storage no HTML estático (áudio só pelo manifesto)',
  R9: 'marcadores data-rm-* do contrato presentes (role, agrega, copia-de)'
};

const out = [];
for (const m of inv.materias.filter(x => !filtro.length || filtro.includes(x.slug))) {
  const html = fs.readFileSync(path.join(L.MAT, m.arquivo.nome), 'utf8');
  const r = {}; const det = {};
  const semTitulo = m.secoes.filter(s => !s.h2).map(s => s.id);
  r.R1 = semTitulo.length === 0; det.R1 = semTitulo;
  r.R2 = m.questoes.semId === 0; det.R2 = m.questoes.semId ? `${m.questoes.semId}/${m.questoes.total} sem id` : '';
  const agr = [...m.unicos.copiasQuiz, ...m.unicos.copiasFc].filter(c => c.itens >= 0.5 * Math.min(m.unicos.quiz || 1e9, m.unicos.fc || 1e9)).map(c => c.id);
  const agrDistintas = [...new Set(agr)];
  const naoReconhecidas = agrDistintas.filter(id => !REUNE.test(id) && !new RegExp('<[^>]+id="' + id + '"[^>]*data-rm-agrega').test(html));
  r.R3 = naoReconhecidas.length === 0; det.R3 = naoReconhecidas;
  const q = m.questoes;
  r.R4 = q.banco === 0 || (q.bancoOrfaos === 0 && (q.bancoCasaId === q.banco || /data-rm-copia-de=/.test(html)));
  det.R4 = q.banco === 0 ? 'sem banco geral' : (q.bancoOrfaos ? `${q.bancoOrfaos} órfãs` : (q.bancoCasaId ? 'casa por id' : 'casa só por enunciado'));
  const ds = D.declaradas(m).filter(d => d.esc === 'global');
  const diverge = ds.filter(d => !d.casa.length);
  r.R5 = diverge.length === 0; det.R5 = diverge.map(d => `${d.n} ${d.rec} (${Object.entries(d.ops).map(([k, v]) => k + '=' + v).join(', ')})`);
  r.R6 = m.idsDuplicados.length === 0; det.R6 = m.idsDuplicados;
  const mq = [...m.midiaQuebrada.img, ...m.midiaQuebrada.audio, ...m.midiaQuebrada.video];
  r.R7 = mq.length === 0; det.R7 = mq.slice(0, 5);
  const vaza = (html.match(/storage\/v1\/object|\/sign\/|token=[A-Za-z0-9_-]{20,}|audiobooks\//g) || []);
  r.R8 = vaza.length === 0; det.R8 = [...new Set(vaza)].slice(0, 3);
  const marc = { role: /data-rm-role=/.test(html), agrega: /data-rm-agrega/.test(html), copiaDe: /data-rm-copia-de=/.test(html) };
  r.R9 = marc.role && (agrDistintas.length === 0 || marc.agrega) && (q.banco === 0 || marc.copiaDe); det.R9 = marc;
  out.push({ slug: m.slug, title: m.title, regras: r, detalhe: det });
}

const nFalha = out.reduce((a, o) => a + Object.values(o.regras).filter(v => !v).length, 0);
fs.writeFileSync(path.join(DIR, parcial ? 'conformidade.parcial.json' : 'conformidade.json'), JSON.stringify({ gerado_em: new Date().toISOString(), regras: REGRAS, materias: out }, null, 1));

if (!parcial && !filtro.length) {
  const L1 = [];
  L1.push('# Conformidade com o contrato de novos recursos · issue #457', '');
  L1.push('> Gerado por `tools/qa/ensaio-layout/contrato.cjs` a partir do inventário real. ✔ = a regra já é cumprida pelo conteúdo de hoje; ✖ = exige edição editorial ou o marcador do contrato. **Nenhuma matéria foi alterada.**', '');
  L1.push('## Regras', '', '| Regra | Descrição |', '|---|---|');
  Object.entries(REGRAS).forEach(([k, v]) => L1.push(`| ${k} | ${v} |`));
  L1.push('', '## Resultado por matéria', '', '| Matéria | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | Observação |', '|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|');
  out.forEach(o => {
    const c = k => o.regras[k] ? '✔' : '✖';
    const obs = [];
    if (!o.regras.R1) obs.push(`sem <h2>: ${o.detalhe.R1.join(', ')}`);
    if (!o.regras.R2) obs.push(o.detalhe.R2);
    if (!o.regras.R3) obs.push(`agregadora não reconhecida: ${o.detalhe.R3.join(', ')}`);
    if (!o.regras.R4) obs.push(o.detalhe.R4);
    if (!o.regras.R5) obs.push('portada: ' + o.detalhe.R5.join('; '));
    if (!o.regras.R6) obs.push('ids duplicados: ' + o.detalhe.R6.join(', '));
    if (!o.regras.R7) obs.push('mídia: ' + o.detalhe.R7.join(', '));
    if (!o.regras.R8) obs.push('URL de storage no HTML: ' + o.detalhe.R8.join(', '));
    L1.push(`| ${o.title} | ${c('R1')} | ${c('R2')} | ${c('R3')} | ${c('R4')} | ${c('R5')} | ${c('R6')} | ${c('R7')} | ${c('R8')} | ${c('R9')} | ${obs.join(' · ').slice(0, 300)} |`);
  });
  const tot = k => out.filter(o => o.regras[k]).length;
  L1.push('', '## Totais', '', '| Regra | Matérias que cumprem (de ' + out.length + ') |', '|---|--:|');
  Object.keys(REGRAS).forEach(k => L1.push(`| ${k} | ${tot(k)} |`));
  L1.push('', 'R9 (marcadores `data-rm-*`) é 0 por construção: o contrato é uma proposta e nenhuma matéria foi editada. R3 mede se a **heurística atual do piloto** já reconheceria as agregadoras; onde ✖, o módulo contaria o dobro ou o triplo.');
  fs.writeFileSync(path.join(DIR, 'CONFORMIDADE.md'), L1.join('\n') + '\n');
  console.log('CONFORMIDADE.md', out.length, 'matérias ·', nFalha, 'regras ✖');
} else {
  out.forEach(o => console.log(o.slug, Object.entries(o.regras).map(([k, v]) => k + (v ? '✔' : '✖')).join(' ')));
}
process.exit(filtro.length && nFalha ? 1 : 0);
