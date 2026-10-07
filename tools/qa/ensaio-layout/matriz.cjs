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
const ROT = { boot: 'Ativa', indice: 'Índice', blocos: 'Blocos', modos: 'Modos', ausentes: 'Ausentes', contagens: 'Contagens', teclado: 'Teclado/Back', scroll: 'Scroll', responsivo: 'Responsivo', caneta: 'Caneta (traço simulado)', integridade: 'Integridade', audio: 'Áudio' };

/* Causa e correção por tipo de verificação que falha. escopo: conteudo (editorial, fora desta PR) · modulo (arquivo reservado: patch documentado) · ensaio. */
const dupl = (c, rec, art = 'os') => (c.dados && c.dados.agregadoras && c.dados.agregadoras.length)
  ? { escopo: 'modulo', causa: `A seção agregadora (${c.dados.agregadoras.join(', ')}) repete ${art} ${rec} dos blocos e o módulo a soma, porque o id não casa a heurística \`/banco|flashcards/i\` (rm-materia-nav.js:90, rm-layout.js:472).`, fix: 'C1/C2: o módulo passa a aceitar `data-rm-agrega` (o descritor/HTML o declara). Verificado na variante «com correção».' }
  : { escopo: 'conteudo', causa: `${art[0].toUpperCase() + art.slice(1)} ${rec} se repetem entre seções que não são cópia integral (p.ex. a seção de prova repete parte dos blocos) e não há \`id\` estável: o DOM soma duplicatas e a contagem exata é INDETERMINADA.`, fix: 'Contrato §1–§3: id canônico por item + `data-rm-copia-de`; decisão editorial sobre as repetições (8-A.1 do MANUTENCAO-DIDATICA).' };
const CAUSAS = {
  'contagens/capa-flashcards': c => dupl(c, 'flashcards'),
  'contagens/capa-preguntas': c => dupl(c, 'perguntas', 'as'),
  'contagens/capa-flashcards-omitidos': () => ({ escopo: 'conteudo', causa: 'Há cartões que existem só na seção de revisão geral (agregadora) e não nos blocos: o aluno os encontra em «todos», mas a capa/modo por bloco não os conta.', fix: 'Editorial: levar o cartão ao bloco que o ensina ou descartá-lo (contrato §3, caso de borda).' }),
  'contagens/capa-preguntas-omitidas': () => ({ escopo: 'conteudo', causa: 'Há questões só no banco geral (sem par no corpo) que a capa por bloco não conta.', fix: 'Editorial: levar a questão ao bloco que ensina o assunto (8-A.3) ou descartá-la; contrato §1.' }),
  'contagens/capa-infografias': () => ({ escopo: 'conteudo', causa: 'A contagem da capa difere das figuras com legenda fora das agregadoras (figura sem `<figcaption>`/`<img>` ou dentro de material-slide/med-image).', fix: 'Revisão editorial das figuras; contrato exige `<figure>` + legenda + imagem.' }),
  'modos/indice-flashcards': () => ({ escopo: 'modulo', causa: 'A agregadora de flashcards não reconhecida aparece como «bloco» no índice do modo Flashcards.', fix: 'C1/C2.' }),
  'modos/indice-preguntas': () => ({ escopo: 'modulo', causa: 'A agregadora de perguntas não reconhecida aparece como «bloco» no índice do modo Preguntas.', fix: 'C1/C2.' }),
  'indice/toda-secao-tem-card': () => ({ escopo: 'modulo', causa: 'Seção de tipo desconhecido para o módulo não ganha card no índice e fica inalcançável na navegação por bloco.', fix: 'Descritor da matéria com `data-rm-role` em toda seção (contrato §2).' }),
  'indice/sem-residuo': () => ({ escopo: 'modulo', causa: 'O conteúdo original que não é `section[id]` (hero, banner de revisão) continua visível abaixo do índice: o módulo só isola `section[id]`.', fix: 'C3 (CSS/módulo: ocultar filhos da aba que não são section[id]/UI fora da leitura contínua). Verificado na variante «com correção».' }),
  'blocos/sem-residuo-bloco': () => ({ escopo: 'modulo', causa: 'Idem: o hero/banner original aparece acima/abaixo do bloco aberto.', fix: 'C3.' }),
  'indice/indice-e-o-fim': () => ({ escopo: 'modulo', causa: 'Sobra conteúdo original depois do índice (hero, banner, rodapé).', fix: 'C3.' }),
  'blocos/pager': () => ({ escopo: 'modulo+conteudo', causa: 'Vizinho sem `<h2>`: `preencherLink` (rm-materia-nav.js:437) esconde o link quando o título é vazio.', fix: 'C4: título de reserva (marcador/«Bloque NN»); ou dar `<h2>` à seção.' }),
  'blocos/pager-cadeia': () => ({ escopo: 'modulo+conteudo', causa: 'Seção interior sem `<h2>` (ex.: guía no meio do conteúdo) quebra a cadeia Anterior/Próximo: o aluno não consegue seguir lendo e só volta pelo índice.', fix: 'C4 (título de reserva) ou `<h2>` na seção.' }),
  'teclado/proximo-anterior-indice': () => ({ escopo: 'modulo+conteudo', causa: 'No meio do conteúdo falta Anterior/Próximo visível porque o vizinho não tem `<h2>`.', fix: 'C4.' }),
  'teclado/enter-proximo': () => ({ escopo: 'modulo+conteudo', causa: 'Idem: sem botão «Bloque siguiente» visível.', fix: 'C4.' }),
  'modos/paginas-preguntas': () => ({ escopo: 'modulo', causa: 'Uma figura (p.ex. «Cómo leer…») dentro do contêiner `.quiz-section` continua visível no modo Preguntas: o isolamento esconde por caminho de contêiner, não por nó.', fix: 'C6 (não aplicado): isolar por nó e tratar `figure` interna do contêiner de questões como recurso do bloco.' }),
  'modos/paginas-infografias': () => ({ escopo: 'modulo', causa: 'No modo Infografías a página mostra recursos que não são infografia ou contagem diferente da real.', fix: 'Ver dados.' }),
  'responsivo/blocos-sem-overflow': () => ({ escopo: 'conteudo', causa: 'Elemento do conteúdo passa da largura da viewport (tabela/figura sem contêiner rolável).', fix: 'Contêiner com rolagem própria no conteúdo; confrontar com o controle (ver dados).' }),
  'indice/sem-overflow': () => ({ escopo: 'conteudo', causa: 'Overflow horizontal já no índice.', fix: 'Ver dados.' }),
  'boot/etapas': () => ({ escopo: 'modulo', causa: 'Uma etapa do layout/tema/navegação não ativou nesta matéria.', fix: 'Ver dados.' }),
  'boot/erros-js': () => ({ escopo: 'modulo', causa: 'Erro de JavaScript ao ativar o layout.', fix: 'Ver dados.' }),
  'ensaio/interrompido': () => ({ escopo: 'ensaio', causa: 'O ensaio desta largura foi interrompido por exceção.', fix: 'Ver dados; reexecutar.' })
};
const causaDe = (c) => (CAUSAS[c.area + '/' + c.id] || (() => ({ escopo: 'ver dados', causa: c.msg, fix: 'Analisar `dados` no JSON.' })))(c);

/* Lê SEMPRE o resultado compacto versionado (gerado por compactar.cjs a partir dos JSON completos por matéria, que não são versionados). */
const COMP = JSON.parse(fs.readFileSync(path.join(DIR, 'resultado-compacto.json'), 'utf8')).variantes;
const A = COMP['como-esta'] || {}, C = COMP['com-correcao'] || {};
const ATIVAS = L.reconciliar().ativas; const slugs = ATIVAS.map(m => m.slug); const TITULO = Object.fromEntries(ATIVAS.map(m => [m.slug, m.title]));

function celula(R, area) {
  if (!R) return { e: '—', n: 0, largs: [] };
  const a = R.porArea[area];
  if (!a) return { e: '—', n: 0, largs: [] };
  if (a.FALHA) return { e: 'FALHA', n: a.FALHA, largs: a.largFalha };
  if (a.BLOQUEADO && area !== 'audio') return { e: 'BLOQUEADO', n: a.BLOQUEADO, largs: [] };
  return { e: 'PASSA', n: 0, largs: [] };
}
function veredito(R) {
  if (!R) return 'SEM DADOS';
  if (R.falhas.length) return 'FALHA';
  return R.bloqueios.filter(c => c.area !== 'audio').length ? 'BLOQUEADO' : 'PASSA';
}
const sim = { PASSA: '✅ PASSA', FALHA: '❌ FALHA', BLOQUEADO: '🟨 BLOQUEADO', 'SEM DADOS': '— sem dados', '—': '—' };

const linhas = slugs.map(s => {
  const a = A[s], c = C[s];
  return { slug: s, title: TITULO[s] || s, sem: SEM[s], hoje: veredito(a), corr: veredito(c),
    areas: Object.fromEntries(AREAS.map(ar => [ar, celula(a, ar)])), areasCorr: Object.fromEntries(AREAS.map(ar => [ar, celula(c, ar)])),
    falhas: a ? a.falhas : [], falhasCorr: c ? c.falhas : [],
    bloq: a ? a.bloqueios : [], nChecks: a ? a.total : 0, segundos: a ? a.segundos : 0, descritor: a ? a.descritor : null };
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
w('## Avisos de leitura (obrigatórios)');
w('');
w('1. **«Caneta PASSA» = um traço SIMULADO.** O teste dispara eventos `PointerEvent` sintéticos do tipo `pen` num Chromium, contra um Supabase simulado. Prova ancoragem, ocultação fora do bloco e que navegar não grava. **Não verifica o atraso nem a perda de traço reais, a persistência real, nem qualquer regressão da #456 (Claude 2).**');
w('2. **Temas e descritores das 26 matérias sem tema próprio são HIPÓTESE TÉCNICA.** O ensaio os infere do conteúdo (blocos, unidades, agregadoras) e aplica a paleta do piloto só para exercitar os componentes. **Não são a identidade visual aprovada de nenhuma matéria** (decisão editorial G0/José). Só Semiología II usa o tema real.');
w('3. **PASSA/FALHA descrevem o ensaio, não uma liberação.** Nada foi ativado; nenhuma matéria está aprovada para o layout novo por constar aqui.');
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
w('### Por área (de 27 matérias)');
w('');
w('| Área | PASSA hoje | FALHA hoje | PASSA com correção | FALHA com correção |');
w('|---|--:|--:|--:|--:|');
AREAS.forEach(a => { const h = k => linhas.filter(l => l.areas[a].e === k).length, c = k => linhas.filter(l => l.areasCorr[a].e === k).length; w(`| ${ROT[a]} | ${h('PASSA')} | ${h('FALHA')} | ${c('PASSA')} | ${c('FALHA')} |`); });
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
    const resto = l.falhasCorr.find(x => x.area + '/' + x.id === k);
    if (resto) w(`  - Resíduo mesmo com a correção: ${resto.msg}${resto.dados !== undefined ? ' → \`' + JSON.stringify(resto.dados).slice(0, 200).replace(/`/g, "'") + '\`' : ''} (o que sobra é conteúdo repetido entre blocos ou itens só na agregadora: decisão editorial)`);
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
  w(`| \`${k}\` | ${[...new Set(ss)].length} | ${causaDe(linhas.flatMap(l => l.falhas).find(f => f.area + '/' + f.id === k)).escopo} | ${ainda === 0 ? 'sim, em todas' : 'não em ' + ainda + ' matéria(s)'} |`);
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
w('- **Descritor/tema por matéria**: hoje existe só o de Semiología II. Os 26 descritores do ensaio são **hipótese técnica inferida do conteúdo** (paleta e vinhetas do piloto), **não identidade visual aprovada**. Aprovar identidade, unidades e numeração de cada matéria é decisão editorial (G0/José), fora desta PR.');
w('- **Audiolibro**: sem manifesto autorizado nenhuma matéria pode ter card real; nada a testar além da ausência.');
w('- **Conteúdo**: `<h2>` ausente em seções de portada/guia, ids de questão ausentes, agregadoras sem marcador e números de portada divergentes estão em `CONFORMIDADE.md` — são edições editoriais por matéria, não feitas aqui.');
w('');
const restantes = linhas.filter(l => l.corr !== 'PASSA');
w('## 8 · As ' + restantes.length + ' falhas que restam mesmo com a correção proposta (C1/C2/C3)');
w('');
w('Todas são **conteúdo repetido/ausente ou comportamento do módulo que a correção proposta não cobre**. Nenhuma foi editada nesta PR. Dono = quem decide: **José/editorial** (conteúdo) ou **integração** (módulo, depois da #456).');
w('');
w('| Matéria | Verificação (larguras) | Medido com a correção | Causa | Dono | Próxima ação |');
w('|---|---|---|---|---|---|');
const DONO = { conteudo: 'José / editorial', modulo: 'Integração (após #456)', 'modulo+conteudo': 'José + integração', ensaio: 'Claude 4' };
const ACAO = { 'contagens/capa-flashcards': 'Decidir o que fazer com flashcards repetidos entre blocos (ids canônicos); depois reconferir a capa', 'contagens/capa-preguntas': 'Decidir sobre as questões repetidas entre blocos e a seção de prova (8-A.1); id canônico por questão', 'contagens/capa-flashcards-omitidos': 'Levar o cartão ao bloco que o ensina ou descartá-lo; reconferir', 'contagens/capa-preguntas-omitidas': 'Levar a questão ao bloco (8-A.3) ou descartá-la', 'modos/paginas-preguntas': 'Patch C6 (isolar por nó) ou mover a figura «Cómo leer…» para fora de `.quiz-section`', 'blocos/pager-cadeia': 'Dar `<h2>` à seção ou aplicar C4 (título de reserva)' };
restantes.forEach(l => {
  const por = {}; l.falhasCorr.forEach(f => { const k = f.area + '/' + f.id; (por[k] = por[k] || []).push(f); });
  Object.entries(por).forEach(([k, fs_]) => {
    const f0 = fs_[0]; let cz = causaDe(f0);
    let medido = f0.msg;
    if (Array.isArray(f0.dados)) medido = `${f0.dados.length} página(s) com recurso extra; ex.: ${JSON.stringify(f0.dados[0]).slice(0, 110)}`;
    else if (f0.dados && f0.dados.capa !== undefined && f0.dados.distintos !== undefined) medido = `capa ${f0.dados.capa} × distintos ${f0.dados.distintos}`;
    else if (f0.dados && f0.dados.capa !== undefined && f0.dados.distintas) medido = `capa ${f0.dados.capa} × distintas ${[].concat(f0.dados.distintas).join('–')}`;
    /* com a agregadora JÁ excluída (variante corrigida), o excesso que sobra é repetição entre blocos, não o módulo */
    if ((k === 'contagens/capa-flashcards' || k === 'contagens/capa-preguntas') && f0.dados) cz = { escopo: 'conteudo', causa: `Mesmo com a agregadora excluída, os blocos repetem entre si ${f0.dados.capa - (f0.dados.distintos || [].concat(f0.dados.distintas).pop())}+ itens (mesma frente/enunciado em mais de um bloco) e não há \`id\` canônico para distinguir cópia de homônimo.`, fix: ACAO[k] };
    w(`| ${l.title} (\`${l.slug}\`) | \`${k}\` (${[...new Set(fs_.map(f => f.w))].join('/')}) | ${medido} | ${cz.causa.slice(0, 190)} | ${DONO[cz.escopo] || cz.escopo} | ${ACAO[k] || cz.fix.slice(0, 120)} |`);
  });
});
w('');
w(`Gerado a partir de ${Object.keys(A).length} resultados «como está» e ${Object.keys(C).length} «com correção» em \`docs/layout-ensaio/resultado-compacto.json\` (os JSON completos por matéria não são versionados: ensaio.cjs os regenera).`);
fs.writeFileSync(path.join(DIR, 'MATRIZ.md'), M.join('\n') + '\n');
fs.writeFileSync(path.join(DIR, 'matriz.json'), L.jsonLinhas({ gerado_em: new Date().toISOString(), materias: linhas.map(l => ({ slug: l.slug, semestre: l.sem, hoje: l.hoje, corrigido: l.corr, areas: Object.fromEntries(AREAS.map(a => [a, l.areas[a].e])), falhas: l.falhas.map(f => f.area + '/' + f.id + '@' + f.w), falhasComCorrecao: l.falhasCorr.map(f => f.area + '/' + f.id + '@' + f.w) })) }, 'materias'));
console.log('MATRIZ.md', linhas.length, 'matérias · hoje', JSON.stringify({ PASSA: cnt('hoje', 'PASSA'), FALHA: cnt('hoje', 'FALHA'), BLOQ: cnt('hoje', 'BLOQUEADO'), SD: cnt('hoje', 'SEM DADOS') }));
