/* Matriz de INTERAÇÃO das 27 matérias (#457/#459, 2.ª rodada). Lê docs/layout-ensaio/interacao/*.json (gerados por interacao.cjs, NÃO versionados)
   e o controle negativo versionado (interacao-controle-456c/*.json). Saída: docs/layout-ensaio/INTERACAO.md + interacao-compacto.json (versionado).
   Uso: node tools/qa/ensaio-layout/interacao-md.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const DIR = path.join(L.REPO, 'docs/layout-ensaio');
const AREAS = ['boot', 'audio', 'caneta', 'palma', 'rolagem', 'pinca', 'borracha', 'grifo', 'troca', 'persistencia', 'questoes', 'flashcards'];
const ROT = { boot: 'Ativa', audio: 'Audiobook', caneta: 'Caneta', palma: 'Palma', rolagem: 'Rolagem', pinca: 'Pinça/zoom', borracha: 'Goma', grifo: 'Grifo', troca: 'Troca bloco/modo', persistencia: 'Recarregar', questoes: 'Questões', flashcards: 'Flashcards' };
const ATIVAS = L.reconciliar().ativas;
const ler = d => { const p = path.join(DIR, d); return fs.existsSync(p) ? fs.readdirSync(p).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(p, f), 'utf8'))) : []; };
const RES = Object.fromEntries(ler('interacao').map(R => [R.slug, R]));
const CTL = ler('interacao-controle-456c'), CTL8 = ler('interacao-controle-sem-c8');

const resumo = R => {
  const porArea = {};
  R.checks.forEach(c => { const a = (porArea[c.area] = porArea[c.area] || { PASSA: 0, FALHA: 0, BLOQUEADO: 0, largFalha: [] }); a[c.estado]++; if (c.estado === 'FALHA' && !a.largFalha.includes(c.w)) a.largFalha.push(c.w); });
  return { slug: R.slug, title: R.title, larguras: R.larguras, total: R.checks.length, segundos: R.segundos, adaptacoes: R.adaptacoes, porArea, falhas: R.checks.filter(c => c.estado === 'FALHA'), bloqueios: R.checks.filter(c => c.estado === 'BLOQUEADO') };
};
const linhas = ATIVAS.map(m => RES[m.slug] ? resumo(RES[m.slug]) : { slug: m.slug, title: m.title, semDados: true });
const cel = (l, a) => { if (l.semDados) return '—'; const x = l.porArea[a]; if (!x) return 'n/a'; if (x.FALHA) return '❌ ' + x.FALHA; if (x.BLOQUEADO) return '🟨 ' + x.BLOQUEADO; return '✅'; };
const ver = l => l.semDados ? 'SEM DADOS' : (l.falhas.length ? 'FALHA' : (l.bloqueios.length ? 'PASSA*' : 'PASSA'));

const M = []; const w = (...s) => M.push(...s);
w('# Matriz de interação · 25 elegíveis + piloto + Imagenología (referência) × 390 / 768 / 1024 / 1440 · #457/#459', '');
/* origem de cada correção: já na main · PR aberta (RM_ENSAIO_REF) · simulada em memória (mesma regra da MATRIZ.md) */
const ids = new Set(); Object.values(RES).forEach(R => (R.adaptacoes || []).forEach(x => ids.add(x)));
const REFS = [...new Set(Object.values(RES).map(R => R.ref).filter(Boolean))].map(r => '`' + String(r).slice(0, 8) + '`');
const noDisco = id => { if (id === 'C3') return /\[data-rm-solto\]/.test(fs.readFileSync(path.join(L.ROOT, 'assets/rm-materia-sistema.css'), 'utf8'));
  const a = L.ADAPTACOES.find(x => x.id === id); return !!(a && a.marca && fs.readFileSync(path.join(L.ROOT, a.arquivo), 'utf8').includes(a.marca)); };
const ORIG = { main: [], pr: [], sim: [] };
[...new Set([...ids].map(a => a.split(':')[0]))].sort().forEach(id => { if (ids.has(id + ':NO-CODIGO')) (noDisco(id) ? ORIG.main : ORIG.pr).push(id); else if (!ids.has(id + ':NAO-ENCONTRADA')) ORIG.sim.push(id); });
[['A3', /registrarTema/.test(fs.readFileSync(path.join(L.ROOT, 'assets/rm-materia-sistema.js'), 'utf8'))], ['C3', noDisco('C3')]].forEach(([id, naMain]) => { if (ORIG.main.includes(id) || ORIG.pr.includes(id) || ORIG.sim.includes(id)) return; (naMain ? ORIG.main : (REFS.length ? ORIG.pr : ORIG.sim)).push(id); });
['main', 'pr', 'sim'].forEach(k => ORIG[k].sort());
const origTxt = `já na \`main\`: ${ORIG.main.join(', ') || '—'} · PR aberta${REFS.length ? ' (' + REFS.join(', ') + ')' : ''}: ${ORIG.pr.join(', ') || '—'} · simulada em memória: ${ORIG.sim.join(', ') || '—'}`;
w('> **Nada foi ativado.** Flags, contas liberadas, `PILOT_SLUGS`, slug do piloto e publicação continuam como na `main`. O ensaio roda num servidor local com os arquivos REAIS e a integração proposta (ver `PATCHES-PARA-INTEGRACAO.md`) — ' + origTxt + '. Supabase e manifesto de áudio são **simulados**; zero rede externa.', '');
w('Esta bateria (`tools/qa/ensaio-layout/interacao.cjs`) complementa a `MATRIZ.md` (layout, índice, modos, contagens): aqui se mede o **uso** — escrever, apoiar a palma, rolar, dar zoom, apagar, desfazer, grifar, trocar de bloco/modo, recarregar, responder questão, abrir flashcards e a presença/ausência de audiobook.', '');
w('Legenda: ✅ todas as verificações da área passaram nas larguras medidas · ❌ N = N verificações falharam · 🟨 N = N verificações não puderam ser medidas neste ambiente (ver «Bloqueios») · n/a = a matéria não tem o recurso (p.ex. sem tabela larga).', '');
const cnt = v => linhas.filter(l => ver(l) === v).length;
const ELEG = linhas.filter(l => L.grupoDe(l.slug) === 'elegivel'), cntE = v => ELEG.filter(l => ver(l) === v).length;
w('## 0 · Já funciona no site × passou só no ensaio', '');
w('**Tudo nesta matriz roda com a integração proposta** — ' + origTxt + '. A lista exata das 25 elegíveis e a conta 27 = piloto + Imagenología + 25 estão em `MATRIZ.md` §0-A. «PASSA» aqui **não** quer dizer que funciona no site.', '');
w('| Grupo | Matérias | No site hoje | Nesta bateria |', '|---|---|---|---|');
w(`| Piloto | Semiología II | **já funciona no site** (contas liberadas); a caneta \`456e\` foi aprovada por José no iPad (#456) | ${ver(linhas.find(l => l.slug === L.ELEGIBILIDADE.piloto))} |`);
w(`| **Elegíveis** | ${ELEG.length} | **não funciona no site** (layout novo só roda no piloto; motor da caneta física só liga no piloto) | **passou com a integração proposta: ${cntE('PASSA')} / ${ELEG.length}** · falha: ${cntE('FALHA')} |`);
Object.entries(L.ELEGIBILIDADE.fora).forEach(([sl, mot]) => { const l = linhas.find(x => x.slug === sl); w(`| Fora | ${l ? l.title : 'Bioestadística'} | fora | ${mot}${l ? ' · referência: ' + ver(l) : ''} |`); });
w('');
w('## 1 · Resumo (27 do catálogo)', '');
w('| PASSA | PASSA com bloqueio declarado | FALHA | Sem dados |', '|--:|--:|--:|--:|', `| ${cnt('PASSA')} | ${cnt('PASSA*')} | ${cnt('FALHA')} | ${cnt('SEM DADOS')} |`, '');
w('| Área | Matérias ✅ | ❌ | 🟨 | n/a |', '|---|--:|--:|--:|--:|');
AREAS.forEach(a => { const k = x => linhas.filter(l => !l.semDados && cel(l, a).startsWith(x)).length; w(`| ${ROT[a]} | ${k('✅')} | ${k('❌')} | ${k('🟨')} | ${k('n/a')} |`); });
const tabs = Object.values(RES).map(R => R.checks.filter(c => c.id === 'tabela-rola-com-lapis')).filter(x => x.length);
w('', `Tabela larga com rolagem própria (dedo rola a tabela com o lápis armado): medida em ${tabs.length} matérias, ${tabs.reduce((a, x) => a + x.length, 0)} verificações (só nas larguras em que a tabela é mais larga que o contêiner); nas demais não há tabela assim. Total de verificações de interação: ${Object.values(RES).reduce((a, R) => a + R.checks.length, 0)}.`);
w('');
w('## 2 · Matriz por matéria', '');
w('| Matéria | Grupo | Veredito (ensaio) | ' + AREAS.map(a => ROT[a]).join(' | ') + ' | Verificações |', '|---|:-:|:-:|' + AREAS.map(() => ':-:').join('|') + '|--:|');
linhas.forEach(l => w(`| ${l.title} (\`${l.slug}\`) | ${{ piloto: '✅ piloto (já no site)', elegivel: '🧪 elegível (só no ensaio)', fora: '⛔ fora' }[L.grupoDe(l.slug)]} | ${ver(l)} | ` + AREAS.map(a => cel(l, a)).join(' | ') + ` | ${l.semDados ? '—' : l.total} |`));
w('');
const fal = linhas.filter(l => !l.semDados && l.falhas.length);
w('## 3 · Falhas reproduzíveis', '');
if (!fal.length) w('Nenhuma falha na rodada final. (As falhas encontradas durante o ensaio e o que foi feito com cada uma estão em `PENDENCIAS-ENSAIO-GLOBAL.md` §0-B.)', '');
fal.forEach(l => { w(`### ${l.title} (\`${l.slug}\`)`, ''); const por = {}; l.falhas.forEach(f => (por[f.area + '/' + f.id] = por[f.area + '/' + f.id] || []).push(f)); Object.entries(por).forEach(([k, fs_]) => w(`- **${k}** · ${[...new Set(fs_.map(f => f.w))].join('/')} px · ${fs_[0].msg}${fs_[0].dados !== undefined ? ' → `' + JSON.stringify(fs_[0].dados).slice(0, 260).replace(/`/g, "'") + '`' : ''}`)); w(''); });
const blq = linhas.filter(l => !l.semDados && l.bloqueios.length);
w('## 4 · Bloqueios (não mensurável neste ambiente)', '');
if (!blq.length) w('Nenhum.', '');
blq.forEach(l => { const por = {}; l.bloqueios.forEach(f => (por[f.area + '/' + f.id] = por[f.area + '/' + f.id] || []).push(f)); Object.entries(por).forEach(([k, fs_]) => w(`- ${l.title} · **${k}** · ${[...new Set(fs_.map(f => f.w))].join('/')} px · ${fs_[0].msg}`)); });
w('');
w('## 5 · Controle negativo: a bateria reprova a versão que José reprovou', '');
w('Mesma bateria, mesmos arquivos, mas com os `assets/` servidos da `main` `ebc53dcd` (build `456c`, reprovado no iPad): `RM_ENSAIO_REF=ebc53dcd node tools/qa/ensaio-layout/interacao.cjs anatomia-patologica semiologia-ii --rapido`. Resultado versionado em `interacao-controle-456c/`.', '');
w('| Matéria | Largura | Verificação | Medido |', '|---|--:|---|---|');
CTL.forEach(R => R.checks.filter(c => c.estado === 'FALHA' && c.area !== 'ensaio').forEach(c => w(`| ${R.slug} | ${c.w} | \`${c.area}/${c.id}\` | ${JSON.stringify(c.dados || '').slice(0, 120).replace(/\|/g, '/')} |`)));
w('', '`borracha/ponta-apaga` falha em cascata: o dedo já tinha apagado o traço-alvo, e a sequência para aí (a bateria interrompe a largura em vez de seguir com estado errado).');
w('', 'São exatamente os sintomas do vídeo de José (o dedo apagava traços com a goma armada e a goma travava a rolagem). Com a `main` atual (`456e`, aprovada) as mesmas verificações passam. Isso mostra que a bateria **distingue** a versão ruim da boa — não prova sozinha o aparelho físico (§6).', '');
w('**Sem a correção C8** (`RM_ENSAIO_SEM=C8`, versionado em `interacao-controle-sem-c8/`): a tinta escrita dentro de um cartão com `:hover { transform }` fica fora do lugar quando o cartão desce.', '');
w('| Matéria | Largura | Verificação | Medido |', '|---|--:|---|---|');
CTL8.forEach(R => R.checks.filter(c => c.estado === 'FALHA' && c.area !== 'ensaio').forEach(c => w(`| ${R.slug} | ${c.w} | \`${c.area}/${c.id}\` | ${JSON.stringify(c.dados || '').slice(0, 160).replace(/\|/g, '/')} |`)));
w('');
w('## 6 · O que o teste sintético comprova × o que só o aparelho físico prova', '');
w('| Tema | O ensaio comprova (Chromium, eventos CDP confiáveis) | Exige aparelho físico (iPad + Apple Pencil, Safari) |', '|---|---|---|');
[
  ['Caneta', 'o motor da caneta aprovado no piloto liga em cada matéria (guarda, adaptador), escreve com a tinta sob a ponta (desvio ≤ 6 px) e ancora o traço ao parágrafo certo, nas 4 larguras', 'latência real ponta→tinta, pressão, `touchType: stylus` do WebKit, Scribble do iPadOS, perda real de `pointerup`'],
  ['Palma', 'palma (toque de raio grande) apoiada e arrastada no meio do traço não corta o traço nem rola a página', 'rejeição de palma do próprio iPadOS, palma que encosta antes da ponta, mão inteira apoiada por muito tempo'],
  ['Rolagem', 'com lápis ou goma armados e a caneta fora da tela, o dedo rola a página; tabela larga rola na horizontal', 'inércia/«rubber band» do Safari, rolagem com a barra de endereço recolhendo, rolagem longa em matéria muito grande'],
  ['Pinça/zoom', 'pinça de dois dedos dá zoom com o lápis armado; escrever ampliado põe a tinta sob a ponta; o traço antigo fica preso ao parágrafo', 'zoom nativo do Safari (duplo toque, limites de escala), zoom + rolagem simultâneos'],
  ['Goma', 'dedo não apaga; ponta apaga e grava; Deshacer devolve', 'borracha da ponta traseira (Pencil sem botão), duplo toque no Pencil 2'],
  ['Grifo', 'arrastar com o marcador grifa e grava', 'seleção com o dedo/lupa do iPadOS, menu de contexto nativo'],
  ['Troca bloco/modo', 'traço some fora do bloco e volta no lugar, sem duplicar, em bloco → outro → índice → Preguntas → bloco', 'trocar com a caixa de ferramentas aberta durante a escrita, multitarefa (Split View/Slide Over), voltar da tela inicial'],
  ['Recarregar', 'traços e grifos voltam iguais e presos ao parágrafo (persistência SIMULADA em sessionStorage)', 'gravação real no Supabase (RLS, rede lenta/offline, duas abas, dois aparelhos)'],
  ['Questões / Flashcards', 'responder alternativa marca a correta; questão aberta mostra a resposta; «Jugar» abre o mazo, tocar gira, Esc fecha', 'toque rápido com a caneta armada sobre a alternativa, teclado virtual'],
  ['Audiobook', 'o `rm-audio-boot.js` REAL só cria cards onde o manifesto (SIMULADO) tem item (Semiología II: 2 blocos) e, fora do piloto, fecha no portão da aba sem pedir manifesto', 'manifesto e URL assinada reais do Netlify/Supabase, reprodução, tela bloqueada/fundo, fones'],
].forEach(r => w(`| ${r[0]} | ${r[1]} | ${r[2]} |`));
w('', '**Conclusão honesta:** o ensaio prova que a caneta aprovada no piloto **convive** com o layout e o conteúdo real de cada matéria no Chromium. Não substitui um teste físico por matéria; recomenda-se repetir o roteiro físico de ≤ 3 min (`docs/caneta-ipad-456/PASSO-FINAL-JOSE.md`) **em cada matéria liberada**, uma por vez.', '');
w(`Gerado de ${Object.keys(RES).length} resultados em \`docs/layout-ensaio/interacao/\` (não versionados; \`interacao.cjs\` os regenera) → evidência compacta em \`interacao-compacto.json\`.`);
fs.writeFileSync(path.join(DIR, 'INTERACAO.md'), M.join('\n') + '\n');
fs.writeFileSync(path.join(DIR, 'interacao-compacto.json'), L.jsonLinhas({ gerado_em: new Date().toISOString(), nota: 'Uma linha por matéria: contagem por área; falhas e bloqueios com a evidência. Reproduzir: interacao.cjs.', materias: linhas.map(l => Object.assign({ grupo: L.grupoDe(l.slug) }, l)) }, 'materias'));
console.log('INTERACAO.md', linhas.length, 'matérias', JSON.stringify({ PASSA: cnt('PASSA'), PASSAx: cnt('PASSA*'), FALHA: cnt('FALHA'), SD: cnt('SEM DADOS') }));
