/* MATRIZ PASSA / FALHA / BLOQUEADO por matéria (issue #457 · checkpoint D). Só lê resultados/*.json (como está) e resultados-corr/*.json (com a correção proposta).
   Saída: docs/layout-ensaio/MATRIZ.md + matriz.json. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const DIR = path.join(L.REPO, 'docs/layout-ensaio');
const SEM = { 'biologia': 1, 'anatomia-i': 1, 'histologia-i': 1, 'histologia-i-practica': 1, 'embriologia': 2, 'histologia-ii': 2, 'histologia-ii-practica': 2, 'guarani': 2,
  'anatomia-patologica': 5, 'anatomia-patologica-practica': 5, 'fisiopatologia': 5, 'imagenologia': 5, 'semiologia': 5, 'farmacologia': 5, 'medicina-familiar': 5,
  'semiologia-ii': 6, 'farmacologia-ii': 6, 'anatomia-patologica-ii': 6, 'medicina-legal': 6, 'anatomia-patologica-ii-practica': 6, 'fisiopatologia-ii': 6,
  'toxicologia': 7, 'dermatologia': 7, 'ortopedia': 7, 'oftalmologia': 7, 'neurologia': 7, 'anestesiologia': 7 };
const AREAS = ['boot', 'indice', 'blocos', 'modos', 'ausentes', 'contagens', 'teclado', 'scroll', 'responsivo', 'caneta', 'integridade', 'audio'];
const ROT = { boot: 'Ativa', indice: 'Índice', blocos: 'Blocos', modos: 'Modos', ausentes: 'Ausentes', contagens: 'Contagens', teclado: 'Teclado/Back', scroll: 'Scroll', responsivo: 'Responsivo', caneta: 'Caneta', integridade: 'Integridade', audio: 'Áudio' };

/* Causa e correção por tipo de verificação que falha. escopo: conteudo (editorial, fora desta PR) · modulo (arquivo reservado: patch documentado) · ensaio. */
const CAUSAS = {
  'contagens/capa-flashcards': { escopo: 'modulo', causa: 'Há seção agregadora (cópia dos flashcards dos blocos) cujo id não casa a heurística `/banco|flashcards/i` de rm-materia-nav.js:90 e rm-layout.js:472; a capa soma o DOM, que repete os itens.', fix: 'C1/C2: o módulo passa a aceitar `data-rm-agrega` (e o descritor da matéria o põe). Verificado na variante «com correção».' },
  'contagens/capa-preguntas': { escopo: 'modulo', causa: 'Idem para perguntas: a seção do banco/revisão duplica as questões dos blocos e entra na soma da capa.', fix: 'C1/C2 (marcador `data-rm-agrega`).' },
  'contagens/capa-infografias': { escopo: 'conteudo', causa: 'O número de infografías da capa difere das figuras com legenda do inventário (figuras duplicadas ou fora de `<figure>`).', fix: 'Revisão editorial das figuras; contrato exige `<figure>` + legenda + imagem.' },
  'modos/indice-flashcards': { escopo: 'modulo', causa: 'A agregadora de flashcards não reconhecida aparece como se fosse um «bloco» no índice do modo Flashcards.', fix: 'C1/C2.' },
  'modos/indice-preguntas': { escopo: 'modulo', causa: 'A agregadora de perguntas não reconhecida aparece como «bloco» no índice do modo Preguntas.', fix: 'C1/C2.' },
  'indice/toda-secao-tem-card': { escopo: 'modulo', causa: 'Seção de tipo desconhecido para o módulo não ganha card no índice e fica inalcançável na navegação por bloco.', fix: 'Descritor da matéria com `data-rm-role` em toda seção (contrato §2).' },
  'teclado/proximo-anterior-indice': { escopo: 'conteudo', causa: 'Seção vizinha sem `<h2>`: o módulo esconde o link Anterior/Próximo quando o título do vizinho é vazio (rm-materia-nav.js `preencherLink`), deixando beco sem saída.', fix: 'Dar `<h2>` à seção (conteúdo) ou o módulo usar o rótulo do marcador/id como título de reserva (patch C3 documentado).' },
  'blocos/pager': { escopo: 'conteudo', causa: 'Idem: vizinho sem `<h2>` não vira link no pager.', fix: 'Idem.' },
  'teclado/enter-proximo': { escopo: 'conteudo', causa: 'Idem: não há botão «Bloque siguiente» visível no meio do conteúdo.', fix: 'Idem.' },
  'responsivo/blocos-sem-overflow': { escopo: 'conteudo', causa: 'Elemento do conteúdo da matéria passa da largura da viewport (tabela/figura sem contêiner rolável).', fix: 'Envolver em contêiner com rolagem própria (conteúdo da matéria); o layout novo não introduz o problema se o controle também sofre (ver dados).' },
  'indice/sem-overflow': { escopo: 'conteudo', causa: 'Overflow horizontal já no índice.', fix: 'Ver dados.' },
  'boot/etapas': { escopo: 'modulo', causa: 'Uma etapa do layout/tema/navegação não ativou nesta matéria.', fix: 'Ver dados.' },
  'boot/erros-js': { escopo: 'modulo', causa: 'Erro de JavaScript ao ativar o layout.', fix: 'Ver dados.' },
  'ensaio/interrompido': { escopo: 'ensaio', causa: 'O ensaio desta largura foi interrompido por exceção.', fix: 'Ver dados; reexecutar.' }
};
const causaDe = (c) => CAUSAS[c.area + '/' + c.id] || { escopo: 'ver dados', causa: c.msg, fix: 'Analisar `dados` no JSON.' };

function ler(dir) { const d = path.join(DIR, dir); if (!fs.existsSync(d)) return {}; return Object.fromEntries(fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => [f.replace('.json', ''), JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))])); }
const A = ler('resultados'), C = ler('resultados-corr');
const ATIVAS = L.reconciliar().ativas; const slugs = ATIVAS.map(m => m.slug); const TITULO = Object.fromEntries(ATIVAS.map(m => [m.slug, m.title]));

function celula(R, area) {
  if (!R) return { e: '—', n: 0, largs: [] };
  const cs = R.checks.filter(c => c.area === area);
  const f = cs.filter(c => c.estado === 'FALHA'), b = cs.filter(c => c.estado === 'BLOQUEADO');
  if (!cs.length) return { e: '—', n: 0, largs: [] };
  if (f.length) return { e: 'FALHA', n: f.length, largs: [...new Set(f.map(c => c.w))] };
  if (b.length && area !== 'audio') return { e: 'BLOQUEADO', n: b.length, largs: [] };
  return { e: 'PASSA', n: 0, largs: [] };
}
function veredito(R) {
  if (!R) return 'SEM DADOS';
  const f = R.checks.filter(c => c.estado === 'FALHA').length;
  if (f) return 'FALHA';
  const b = R.checks.filter(c => c.estado === 'BLOQUEADO' && c.area !== 'audio').length;
  return b ? 'BLOQUEADO' : 'PASSA';
}
const sim = { PASSA: '✅ PASSA', FALHA: '❌ FALHA', BLOQUEADO: '🟨 BLOQUEADO', 'SEM DADOS': '— sem dados', '—': '—' };

const linhas = slugs.map(s => {
  const a = A[s], c = C[s];
  return { slug: s, title: TITULO[s] || s, sem: SEM[s], hoje: veredito(a), corr: veredito(c),
    areas: Object.fromEntries(AREAS.map(ar => [ar, celula(a, ar)])), areasCorr: Object.fromEntries(AREAS.map(ar => [ar, celula(c, ar)])),
    falhas: a ? a.checks.filter(x => x.estado === 'FALHA') : [], falhasCorr: c ? c.checks.filter(x => x.estado === 'FALHA') : [],
    bloq: a ? a.checks.filter(x => x.estado === 'BLOQUEADO') : [], nChecks: a ? a.checks.length : 0, segundos: a ? a.segundos : 0 };
});

const M = []; const w = s => M.push(s);
const cnt = (k, v) => linhas.filter(l => l[k] === v).length;
w('# Matriz PASSA / FALHA / BLOQUEADO por matéria · Checkpoint D · issue #457', '');
w('> **Nada foi ativado em produção.** Flags, UID, slug do piloto, `index.html`, `rm-*.js/css`, `get-materia.js` e todas as matérias estão intactos. Zero escritas no Supabase (sessão simulada), zero áudio simulado. **AGUARDANDO AUDITORIA CHATGPT.**');
w('');
w('Legenda: **PASSA** = todas as verificações da área passaram nas 4 larguras (390 · 768 · 1024 · 1440) · **FALHA** = alguma falhou e é reproduzível (causa e correção abaixo) · **BLOQUEADO** = não dá para verificar sem algo que este ensaio não pode fazer (p.ex. audiolibro sem manifesto autorizado).');
w('');
w('Duas variantes do MESMO ensaio: **«como está»** (módulos reais do piloto, só com o patch mínimo de slug em memória) e **«com correção»** (acrescenta C1/C2, o patch proposto para as agregadoras, também só em memória). O disco nunca é alterado.');
w('');
w('## 1 · Resumo');
w('');
w('| Variante | PASSA | FALHA | BLOQUEADO | Sem dados |');
w('|---|--:|--:|--:|--:|');
w(`| Como está | ${cnt('hoje', 'PASSA')} | ${cnt('hoje', 'FALHA')} | ${cnt('hoje', 'BLOQUEADO')} | ${cnt('hoje', 'SEM DADOS')} |`);
w(`| Com correção proposta (C1/C2) | ${cnt('corr', 'PASSA')} | ${cnt('corr', 'FALHA')} | ${cnt('corr', 'BLOQUEADO')} | ${cnt('corr', 'SEM DADOS')} |`);
w('');
w('**Audiolibro: BLOQUEADO nas 27 matérias, por regra**: não há manifesto autorizado fora do piloto, e o ensaio não simula áudio. O que o ensaio prova é a **ausência** (card, player, chip, capa, pílula, lateral e requisição de manifesto/áudio: PASSA nas 27). Em Semiología II o audiolibro real é coberto pelo teste do próprio piloto (#453).');
w('');
w('## 2 · Matriz por matéria («como está»)');
w('');
w('| Semestre | Matéria | Veredito | ' + AREAS.map(a => ROT[a]).join(' | ') + ' | Audiolibro |');
w('|--:|---|:-:|' + AREAS.map(() => ':-:').join('|') + '|:-:|');
const ic = { PASSA: '✅', FALHA: '❌', BLOQUEADO: '🟨', '—': '—' };
linhas.forEach(l => {
  w(`| ${l.sem} | ${l.title} (\`${l.slug}\`) | ${sim[l.hoje]} | ` + AREAS.map(a => { const c = l.areas[a]; return c.e === 'FALHA' ? `❌ ${c.n}` : ic[c.e]; }).join(' | ') + ` | ${l.slug === 'semiologia-ii' ? '🟨 piloto' : '🟨'} |`);
});
w('');
w('Em «❌ N», N é o número de verificações que falharam (somando as 4 larguras).');
w('');
w('## 3 · Matriz «com correção proposta»');
w('');
w('| Semestre | Matéria | Veredito | ' + AREAS.map(a => ROT[a]).join(' | ') + ' |');
w('|--:|---|:-:|' + AREAS.map(() => ':-:').join('|') + '|');
linhas.forEach(l => {
  w(`| ${l.sem} | ${l.title} | ${sim[l.corr]} | ` + AREAS.map(a => { const c = l.areasCorr[a]; return c.e === 'FALHA' ? `❌ ${c.n}` : ic[c.e]; }).join(' | ') + ' |');
});
w('');
w('## 4 · Falhas reproduzíveis por matéria (causa e correção)');
w('');
const grupos = {};
linhas.forEach(l => {
  const por = {};
  l.falhas.forEach(f => { const k = f.area + '/' + f.id; (por[k] = por[k] || []).push(f); });
  if (!Object.keys(por).length) return;
  w(`### ${l.title} (\`${l.slug}\`)`); w('');
  Object.entries(por).forEach(([k, fs_]) => {
    const cz = causaDe(fs_[0]); const resolve = l.falhasCorr.some(x => x.area + '/' + x.id === k) ? 'não resolvida pela correção' : 'resolvida pela correção proposta';
    w(`- **${k}** · larguras ${[...new Set(fs_.map(f => f.w))].join('/')} · escopo: ${cz.escopo} · ${resolve}`);
    w(`  - Medido: ${fs_[0].msg}${fs_[0].dados !== undefined ? ' → `' + JSON.stringify(fs_[0].dados).slice(0, 260).replace(/`/g, "'") + '`' : ''}`);
    w(`  - Causa: ${cz.causa}`);
    w(`  - Correção: ${cz.fix}`);
    grupos[k] = (grupos[k] || []).concat(l.slug);
  });
  w('');
});
w('## 5 · Falhas por tipo (quantas matérias)');
w('');
w('| Verificação | Matérias | Escopo | Resolvida pela correção proposta? |');
w('|---|--:|---|---|');
Object.entries(grupos).sort((x, y) => y[1].length - x[1].length).forEach(([k, ss]) => {
  const ainda = ss.filter(s => (linhas.find(l => l.slug === s).falhasCorr || []).some(x => x.area + '/' + x.id === k)).length;
  w(`| \`${k}\` | ${[...new Set(ss)].length} | ${causaDe({ area: k.split('/')[0], id: k.split('/')[1], msg: '' }).escopo} | ${ainda === 0 ? 'sim, em todas' : 'não em ' + ainda + ' matéria(s)'} |`);
});
w('');
w('## 6 · Risco por grupo (semestre)');
w('');
w('| Semestre | Matérias | Veredito hoje (PASSA/FALHA/BLOQ.) | Com correção | Risco principal |');
w('|--:|---|:-:|:-:|---|');
[1, 2, 5, 6, 7].forEach(sm => {
  const g = linhas.filter(l => l.sem === sm); const c = (k, v) => g.filter(l => l[k] === v).length;
  const ar = {}; g.forEach(l => l.falhas.forEach(f => { const k = f.area + '/' + f.id; ar[k] = (ar[k] || 0) + 1; }));
  const topo = Object.entries(ar).sort((x, y) => y[1] - x[1]).slice(0, 2).map(([k, n]) => `${k} (${n})`).join('; ') || 'nenhum falho';
  w(`| ${sm}º | ${g.map(l => l.title).join(', ')} | ${c('hoje', 'PASSA')}/${c('hoje', 'FALHA')}/${c('hoje', 'BLOQUEADO')} | ${c('corr', 'PASSA')}/${c('corr', 'FALHA')}/${c('corr', 'BLOQUEADO')} | ${topo} |`);
});
w('');
w('## 7 · Bloqueios e pendências (não resolvidos nesta PR)');
w('');
w('- **Integração dos patches** (`PATCHES-PARA-INTEGRACAO.md`): tocam arquivos reservados (`rm-layout.js`, `rm-materia-nav.js`, `rm-materia-sistema.js/css`, `rm-audio-boot.js`, `rm-pilot.js`). Só depois da PR da caneta (#456) e com auditoria própria.');
w('- **Descritor/tema por matéria**: hoje existe só o de Semiología II. O ensaio gera um descritor genérico a partir do conteúdo (paleta e vinhetas do piloto, sem identidade própria por matéria). A identidade visual de cada matéria é decisão editorial (G0), fora desta PR.');
w('- **Audiolibro**: sem manifesto autorizado nenhuma matéria pode ter card real; nada a testar além da ausência.');
w('- **Conteúdo**: `<h2>` ausente em seções de portada/guia, ids de questão ausentes, agregadoras sem marcador e números de portada divergentes estão em `CONFORMIDADE.md` — são edições editoriais por matéria, não feitas aqui.');
w('');
w(`Gerado a partir de ${Object.keys(A).length} resultados «como está» e ${Object.keys(C).length} «com correção» em \`docs/layout-ensaio/resultados*/\`.`);
fs.writeFileSync(path.join(DIR, 'MATRIZ.md'), M.join('\n') + '\n');
fs.writeFileSync(path.join(DIR, 'matriz.json'), JSON.stringify(linhas.map(l => ({ slug: l.slug, semestre: l.sem, hoje: l.hoje, corrigido: l.corr, areas: Object.fromEntries(AREAS.map(a => [a, l.areas[a].e])), falhas: l.falhas.map(f => f.area + '/' + f.id + '@' + f.w) })), null, 1));
console.log('MATRIZ.md', linhas.length, 'matérias · hoje', JSON.stringify({ PASSA: cnt('hoje', 'PASSA'), FALHA: cnt('hoje', 'FALHA'), BLOQ: cnt('hoje', 'BLOQUEADO'), SD: cnt('hoje', 'SEM DADOS') }));
