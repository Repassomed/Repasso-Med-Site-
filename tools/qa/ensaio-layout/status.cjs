/* O QUE PASSOU E O QUE FALTA, POR MATÉRIA (#457) — junta, sem medir nada de novo:
     · resultados-corr/  (ensaio de layout «com correção» contra o código servido: a MAIN, sem RM_ENSAIO_REF)
     · interacao/        (uso: caneta CDP, palma, rolagem, goma, grifo, troca de bloco/modo, questões, flashcards, áudio)
     · <pasta da integração proposta> (2.º argumento opcional: ensaio com RM_ENSAIO_REF = commit local da integração completa)
     · conformidade.json (o que falta no CONTEÚDO de cada matéria) e conteudo-solto.json
   e escreve STATUS-POR-MATERIA.md + DESCRITORES-PROPOSTA.md (proposta para José aprovar; NADA disto vai para produção).
   Uso: node tools/qa/ensaio-layout/status.cjs [<pasta-integracao-proposta> [<pasta-interacao-proposta>]] */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const DIR = path.join(L.REPO, 'docs/layout-ensaio');
const ler = d => { const o = {}; try { fs.readdirSync(d).filter(f => f.endsWith('.json')).forEach(f => { const j = JSON.parse(fs.readFileSync(path.join(d, f))); o[j.slug] = j; }); } catch (e) { /* pasta ausente */ } return o; };
const LAY = ler(path.join(DIR, 'resultados-corr')), USO = ler(path.join(DIR, 'interacao'));
const PROP = process.argv[2] ? ler(path.resolve(process.argv[2])) : {}, PROPU = process.argv[3] ? ler(path.resolve(process.argv[3])) : {};
const CONF = JSON.parse(fs.readFileSync(path.join(DIR, 'conformidade.json')));
const SOLTO = (() => { try { return JSON.parse(fs.readFileSync(path.join(DIR, 'conteudo-solto.json'))).linhas; } catch (e) { return []; } })();
const INV = JSON.parse(fs.readFileSync(path.join(DIR, 'inventario.json')));
const REC = L.reconciliar();

const falhas = R => R ? R.checks.filter(c => c.estado === 'FALHA') : null;
const veredito = R => !R ? '—' : (falhas(R).length ? `❌ ${falhas(R).length}` : '✅');
/* A3 (registrarTema) e C3 (conteúdo solto) não passam por `adaptacoes` (o ativador os usa/simula direto): lidos do código servido pela rodada */
const cache = {};
function servido(ref, rel) {
  const k = (ref || '') + '|' + rel; if (k in cache) return cache[k];
  try { cache[k] = ref ? require('child_process').execFileSync('git', ['show', ref + ':' + path.join('Repasso-Med-Site--main/Atual - Copia', rel)], { cwd: L.REPO, encoding: 'utf8', maxBuffer: 64 << 20 }) : fs.readFileSync(path.join(L.ROOT, rel), 'utf8'); }
  catch (e) { cache[k] = ''; }
  return cache[k];
}
function extras(R) {
  if (!R || !/com-correcao|interacao/.test(R.variante || '')) return { cod: [], sim: [] };
  const a3 = /registrarTema/.test(servido(R.ref, 'assets/rm-materia-sistema.js')), c3 = /\[data-rm-solto\]/.test(servido(R.ref, 'assets/rm-materia-sistema.css'));
  return { cod: [a3 && 'A3', c3 && 'C3'].filter(Boolean), sim: [!a3 && 'A3', !c3 && 'C3'].filter(Boolean) };
}
const simuladas = R => !R ? [] : [...new Set((R.adaptacoes || []).filter(a => !/NO-CODIGO|NAO-ENCONTRADA/.test(a)).map(a => a.split(':')[0]).concat(extras(R).sim))].sort();
const doCodigo = R => !R ? [] : [...new Set((R.adaptacoes || []).filter(a => /NO-CODIGO/.test(a)).map(a => a.split(':')[0]).concat(extras(R).cod))].sort();
const lista = a => a.length ? a.join(', ') : '—';
const refDe = O => [...new Set(Object.values(O).map(R => R.ref).filter(Boolean))].map(r => '`' + String(r).slice(0, 8) + '`').join(', ') || 'disco (`main`)';

/* o que falta no CONTEÚDO (editorial; nunca automático) */
function faltaConteudo(slug) {
  const c = CONF.materias.find(m => m.slug === slug); const out = [];
  if (!c) return out;
  if (!c.regras.R1) out.push('título `<h2>` em: ' + (c.detalhe.R1.resumo || '').replace(/^sem <h2>:\s*/, ''));
  if (!c.regras.R3) out.push((c.detalhe.R3.resumo || 'agregadora não reconhecida') + ' → `data-rm-agrega`');
  if (!c.regras.R5 && /diverge/.test(JSON.stringify(c.detalhe.R5))) out.push('portada declara número ≠ contagem real (' + c.detalhe.R5.resumo.replace(/^portada:\s*/, '') + ')');
  SOLTO.filter(l => l.slug === slug && l.classe === 'conteudo').forEach(l => out.push(`\`${l.k}\` sem id com ${l.quiz} questões: só no índice geral (dar id e título)`));
  return out;
}

const md = [];
const w = (...s) => md.push(...s);
const tLay = Object.keys(LAY).length, tUso = Object.keys(USO).length, tProp = Object.keys(PROP).length;
w('# O que passou e o que falta, por matéria (#457) — layout, uso, código real × simulação', '');
w(`> Gerado por \`tools/qa/ensaio-layout/status.cjs\`. **Código real** = o que o ensaio encontrou no código servido (\`<ID>:NO-CODIGO\`); **simulado** = o que o ensaio ainda aplica em memória ou responde no lugar do servidor. Nada foi ativado: flags, contas, \`RM_AUDIO_SLUGS\` e matérias intocados.`, '');
w(`- **Layout** e **uso**: código servido = ${refDe(LAY)} (layout, ${tLay} matérias) · ${refDe(USO)} (uso, ${tUso}).`);
if (tProp) w(`- **Integração proposta**: ${refDe(PROP)} = commit LOCAL com \`main\` + #487 + #489 + PR pós-#484 (A7/C8/versão) — não publicado (${tProp} matérias${Object.keys(PROPU).length ? '; uso: ' + Object.keys(PROPU).length : ''}).`);
w('- **Físico**: nada nesta tabela é aparelho. Caneta, grifos, navegação e áudio no iPad: `ROTEIRO-PILOTO-FISICO.md` (pendente, José).', '');
w('Contagem: 27 matérias ativas = 1 piloto (Semiología II) + 1 excluída (Imagenología, medida só como referência) + **25 para expansão**. Bioestadística está excluída e não tem rota ativa (não é medida).', '');

const linhas = REC.ativas.map(a => ({ a, g: L.grupoDe(a.slug), lay: LAY[a.slug], uso: USO[a.slug], prop: PROP[a.slug], propu: PROPU[a.slug] }));
const cnt = (g, k) => linhas.filter(l => l.g === g && l[k] && !falhas(l[k]).length).length;
w('## Resumo', '', '| Grupo | n | Layout (código da main + simulação do resto) | Uso | Integração proposta (layout' + (Object.keys(PROPU).length ? ' / uso' : '') + ') |', '|---|--:|---|---|---|');
['piloto', 'elegivel', 'fora'].forEach(g => {
  const n = linhas.filter(l => l.g === g).length;
  w(`| ${{ piloto: 'Piloto', elegivel: '**Expansão**', fora: 'Excluída (referência)' }[g]} | ${n} | ${cnt(g, 'lay')}/${n} | ${cnt(g, 'uso')}/${n} | ${tProp ? cnt(g, 'prop') + '/' + n : '—'}${Object.keys(PROPU).length ? ' / ' + cnt(g, 'propu') + '/' + n : ''} |`);
});
const sim0 = [...new Set(linhas.flatMap(l => simuladas(l.lay)))].sort(), cod0 = [...new Set(linhas.flatMap(l => doCodigo(l.lay)))].sort();
const sim1 = [...new Set(linhas.flatMap(l => simuladas(l.prop)))].sort(), cod1 = [...new Set(linhas.flatMap(l => doCodigo(l.prop)))].sort();
w('', '| Origem das correções | Na `main` de hoje | Na integração proposta |', '|---|---|---|');
w(`| **código real** | ${lista(cod0)} | ${tProp ? lista(cod1) : '—'} |`);
w(`| **simulado** | ${lista(sim0)} + descritor de cada matéria | ${tProp ? lista(sim1) + ' + descritor de cada matéria' : '—'} |`, '');
w('Leitura: `A5` = resposta do servidor «caneta liberada nesta matéria» (ativação por matéria, decisão de José); o descritor (unidades, seções, agregadoras, identidade visual) é proposta para aprovação, ver `DESCRITORES-PROPOSTA.md`.', '');

w('## Por matéria', '', '| # | Matéria | Grupo | Layout | Uso | Proposta | Simulado na `main` | Áudio | Falta no conteúdo (editorial) | Físico |', '|--:|---|---|:-:|:-:|:-:|---|---|---|---|');
linhas.forEach((l, i) => {
  const au = l.a.slug === 'semiologia-ii' ? 'piloto: cards só nos blocos do manifesto' : 'sem gravação autorizada ⇒ sem card ✅';
  const fis = l.g === 'piloto' ? '**pendente** (roteiro)' : l.g === 'fora' ? 'fora da expansão' : 'depois do piloto';
  const fc = faltaConteudo(l.a.slug);
  w(`| ${i + 1} | ${l.a.title} (\`${l.a.slug}\`) | ${{ piloto: 'piloto', elegivel: 'expansão', fora: 'excluída' }[l.g]} | ${veredito(l.lay)} | ${veredito(l.uso)} | ${tProp ? veredito(l.prop) : '—'} | ${lista(simuladas(l.lay))} | ${au} | ${fc.length ? fc.join('<br>') : '—'} | ${fis} |`);
});
const comFalha = linhas.filter(l => (l.lay && falhas(l.lay).length) || (l.uso && falhas(l.uso).length) || (l.prop && falhas(l.prop).length));
w('', '## Falhas', '');
if (!comFalha.length) w('Nenhuma falha em nenhuma das rodadas acima.', '');
comFalha.forEach(l => { [['layout', l.lay], ['uso', l.uso], ['proposta', l.prop]].forEach(([n, R]) => { if (R && falhas(R).length) w(`- **${l.a.title}** · ${n}: ` + [...new Set(falhas(R).map(c => c.area + '/' + c.id))].join(', ')); }); });
w('', '## O que falta para UMA matéria de expansão funcionar no site (nenhum passo executado)', '',
  '1. Merge de #487 (tema/conteúdo solto) e #489 (áudio por matéria) — decisão de José.',
  '2. PR pós-#484 (A7/C8/versão), coordenada com Claude 1 (`pos-484/README.md`).',
  '3. **Roteiro físico no piloto** (`ROTEIRO-PILOTO-FISICO.md`) — caneta, grifos, navegação e áudio. Sem ele, nenhuma expansão é proposta.',
  '4. Descritor da matéria **aprovado** (`DESCRITORES-PROPOSTA.md`) + os ajustes de conteúdo da coluna «Falta no conteúdo».',
  '5. A5: o servidor libera layout/caneta só para a conta de José naquela matéria; roteiro físico de novo, nela.',
  '6. Áudio daquela matéria: só quando houver gravação, pelos 3 passos do Netlify (`tools/qa/audio-server/README.md`).', '');
fs.writeFileSync(path.join(DIR, 'STATUS-POR-MATERIA.md'), md.join('\n') + '\n');

/* ---------- proposta de descritores (para aprovação; nunca produção) ---------- */
const D = [];
const d = (...s) => D.push(...s);
d('# Descritores das matérias — PROPOSTA para aprovação (não é produção)', '');
d('> **Natureza:** proposta técnica inferida do conteúdo real pelo ensaio (seções, numeração, unidades, agregadoras). A #485 a classifica como **simulação**: nada daqui vai para `assets/` sem aprovação de José, e nunca em lote — **uma matéria por PR**, depois do roteiro físico do piloto.', '');
d('**Divergências a decidir** (⚠️ na coluna «Ação»): seções cujo título ou id dizem banco/revisão/simulacro, mas cujo conteúdo **não** é cópia dos blocos — a inferência as trata como bloco. Só José decide se são bloco (numerado, com card) ou revisão (fora da numeração). É o motivo de nenhum descritor inferido ir para produção.', '');
d('Um descritor de produção tem duas partes:', '',
  '| Parte | Conteúdo | Quem decide |', '|---|---|---|',
  '| **Estrutura** | qual seção é bloco (e o número), guia, banco/revisão (agregadora → `data-rm-agrega` no HTML), tabelas; unidades | técnica (abaixo, conferível no HTML) + revisão de José |',
  '| **Identidade** | nome e cor de cada unidade, medalhões/ilustrações da capa, microcopy dos cartões de recursos, paleta | **José** (G0) — hoje só a Semiología II tem |', '');
linhas.filter(l => l.g !== 'piloto').forEach(l => {
  const R = l.prop || l.lay; const ds = R && R.descritor; const inv = INV.materias.find(m => m.slug === l.a.slug);
  d(`## ${l.a.title} (\`${l.a.slug}\`)${l.g === 'fora' ? ' — excluída (só referência)' : ''}`, '');
  if (!ds || !ds.secciones) { d('_sem seções registradas nesta rodada_', ''); return; }
  const un = ds.unidades || [];
  d(`Numeração dos blocos: **${ds.numeracao === 'id' ? 'pelo id (`…bNN`)' : 'pela ordem'}** · Unidades encontradas nos marcadores: ${un.length ? un.map(u => '**' + u + '**').join(', ') + ' (nome e cor: **a definir por José**)' : 'nenhuma'}.`, '');
  d('| Seção (`id`) | Título | Marcador | Papel proposto | Ação no HTML |', '|---|---|---|---|---|');
  ds.secciones.forEach(s => {
    const si = inv && inv.secoes.find(x => x.id === s.id) || {};
    const papel = s.tipo === 'repaso' ? (s.n === 'B' ? 'revisão de questões (agregadora)' : s.n === 'F' ? 'revisão de flashcards (agregadora)' : s.n === 'T' ? 'tablas' : 'revisão') : s.tipo === 'guia' ? 'guia (00)' : /bloque|bloco/.test(s.tipo) ? 'bloco ' + s.n : s.tipo;
    const acao = [];
    if (s.tipo === 'repaso' && (s.n === 'B' || s.n === 'F') && !/banco|flashcards/i.test(s.id)) acao.push('`data-rm-agrega`');
    if (!si.h2) acao.push('`<h2>` (hoje sem título direto)');
    if (/bloque|bloco/.test(s.tipo) && (/^(prova|banco|flashcards)-|-(banco|prova)$/i.test(s.id) || /\bbanco\b|repaso general|revisi[oó]n general|simulacro|flashcards general|formato (de )?examen|temas cobrados/i.test((si.h2 || '') + ' ' + (si.marcador || '')))) acao.push('⚠️ **decidir**: o título/id diz banco/revisão, mas o conteúdo não é cópia dos blocos (a inferência o trata como bloco)');
    d(`| \`${s.id}\` | ${(si.h2 || '—').replace(/\|/g, '/')} | ${(si.marcador || '—').replace(/^[—\s]+/, '')} | ${papel} | ${acao.join(' · ') || '—'} |`);
  });
  d('');
});
fs.writeFileSync(path.join(DIR, 'DESCRITORES-PROPOSTA.md'), D.join('\n') + '\n');
console.log('STATUS-POR-MATERIA.md · DESCRITORES-PROPOSTA.md · layout ' + tLay + ' · uso ' + tUso + ' · proposta ' + tProp);
