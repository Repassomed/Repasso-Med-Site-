/* Gera docs/layout-ensaio/INVENTARIO.md a partir de inventario.json (checkpoint A, issue #457). Só lê o JSON. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const DIR = path.join(L.REPO, 'docs/layout-ensaio');
const inv = JSON.parse(fs.readFileSync(path.join(DIR, 'inventario.json'), 'utf8'));

/* flashcards DISTINTOS (pela frente) e a seção agregadora («revisão geral»/«mazo»/«cierre»: cópia dos itens dos blocos) */
function agregadora(lista, distintos) {
  const m = lista.slice().sort((x, y) => y.itens - x.itens)[0];
  return m && m.itens >= 0.5 * distintos ? m.id : null;
}
function fcUnicos(m) { return { unicos: m.unicos.fc, copiaEm: agregadora(m.unicos.copiasFc, m.unicos.fc) }; }
function qUnicos(m) { return { unicos: m.unicos.quiz, copiaEm: agregadora(m.unicos.copiasQuiz, m.unicos.quiz) }; }
const SN = (b) => b ? 'SIM' : 'NÃO';

const GLOBAL_SEC = m => { const g = new Set(); m.secoes.forEach((x, i) => { if (!x.quiz && !x.fc && (i === 0 || /portada|intro|guia|inicio|00$|^h2p|^hp0/i.test(x.id))) g.add(x.id); }); return g; };
function declaradas(m) {
  const fu = fcUnicos(m), qu = qUnicos(m), glob = GLOBAL_SEC(m); const out = []; const vistos = new Set();
  const secPor = Object.fromEntries(m.secoes.map(x => [x.id, x]));
  m.declaradas.forEach(d => {
    const rec = d.rec.replace('í', 'i'); const sec = secPor[d.sec];
    if (/^stat:/.test(d.ctx) || !d.sec) return;      // estatísticas do próprio banco: tratadas à parte
    const k = d.sec + '|' + d.n + rec; if (vistos.has(k)) return; vistos.add(k);
    if (glob.has(d.sec)) {   // declaração global (portada) × totais distintos
      const ops = ({
        preguntas: { 'distintas(enun.)': qu.unicos, 'distintas(enun.+opc.)': m.unicos.quizComOpc, 'corpo': m.questoes.corpo, 'DOM total': m.questoes.total },
        flashcards: { 'distintos': fu.unicos, 'DOM total': m.flashcards.total },
        infografias: { 'figuras c/ legenda': m.figuras }, bloques: { 'blocos numerados (id …bNN)': m.secoes.filter(x => /b\d+$/i.test(x.id)).length, 'blocos do índice': m.particularidades.menuComAlvo, 'seções': m.nSecoes }
      })[rec]; if (!ops) return;
      out.push({ n: d.n, rec, esc: 'global', sec: d.sec, ops, casa: Object.entries(ops).filter(([, v]) => v === d.n).map(([n]) => n) });
    } else if (sec) {        // declaração do próprio bloco × o que o bloco tem
      const ops = ({ preguntas: { 'q. do bloco': sec.quiz }, flashcards: { 'fc do bloco': sec.fc }, infografias: { 'figuras do bloco': sec.fig }, videos: { 'vídeos do bloco': sec.vid } })[rec];
      if (!ops) return;
      out.push({ n: d.n, rec, esc: 'bloco', sec: d.sec, ops, casa: Object.entries(ops).filter(([, v]) => v === d.n).map(([n]) => n) });
    }
  });
  return out;
}

const L1 = [];
const w = s => L1.push(s);
const mats = inv.materias;
const tot = k => mats.reduce((a, m) => a + k(m), 0);

w('# Inventário real das matérias ativas · Checkpoint A · issue #457');
w('');
w(`> Gerado por \`tools/qa/ensaio-layout/inventario.cjs\` em ${inv.gerado_em.slice(0, 10)}. **Somente leitura**: nenhuma matéria, flag, UID ou arquivo de produção foi alterado; zero escritas no Supabase (simulado); zero rede externa.`);
w('> Medido no navegador, com o `app-core.js` real, **sem nada do layout novo** (a matéria como o site a serve hoje). Fonte do catálogo: `const CATALOGO` (index.html) × `FILES` (get-materia.js) × `netlify/functions/materias-privadas/`.');
w('');
w('## 1 · Reconciliação do catálogo (#366)');
const r = inv.reconciliacao;
w('');
w(`| Verificação | Resultado |`);
w(`|---|---|`);
w(`| Matérias ativas (catálogo ∩ \`FILES\`) | **${r.ativas}** |`);
w(`| Só no catálogo, sem arquivo servido | ${r.soNoCatalogo.length ? r.soNoCatalogo.join(', ') : 'nenhuma'} |`);
w(`| Só em \`FILES\`, fora do catálogo | ${r.soNoGetMateria.length ? r.soNoGetMateria.join(', ') : 'nenhuma'} |`);
w(`| Arquivo servido que não existe no disco | ${r.arquivosFaltando.length ? r.arquivosFaltando.join(', ') : 'nenhum'} |`);
w(`| Arquivos **órfãos** no disco (não servidos, fora do catálogo) | ${r.arquivosOrfaos.map(f => '`' + f + '`').join(', ')} |`);
w('');
w('Os 3 arquivos órfãos **não são matérias ativas** e ficam fora do ensaio (não há rota, nem `FILES`, nem entrada no catálogo): um aluno não os alcança. Não foram tocados.');
w('');
w('## 2 · Totais (27 matérias)');
w('');
w(`| Recurso | Total medido |`);
w(`|---|---:|`);
w(`| Blocos no índice (\`.rm-menu\`) | ${tot(m => m.particularidades.menuComAlvo)} |`);
w(`| Seções \`<section id>\` | ${tot(m => m.nSecoes)} |`);
w(`| Questões \`.quiz-item\` no DOM (somando cópias) | ${tot(m => m.questoes.total)} |`);
w(`| Questões **distintas** (por enunciado · por enunciado+opções) | ${tot(m => m.unicos.quiz)} · ${tot(m => m.unicos.quizComOpc)} |`);
w(`| Flashcards \`.flashcard\` no DOM (somando cópias) | ${tot(m => m.flashcards.total)} |`);
w(`| Flashcards **distintos** (pela frente) | ${tot(m => m.unicos.fc)} |`);
w(`| Figuras com legenda | ${tot(m => m.figuras)} |`);
w(`| Videoclases (\`details.video-collapsible\`) | ${tot(m => m.videos.cards)} |`);
w(`| Elementos \`<audio>\` (ausculta) | ${tot(m => m.ausculta.audios)} |`);
w(`| IDs duplicados | ${tot(m => m.idsDuplicados.length)} |`);
w(`| Mídia local quebrada | ${tot(m => m.midiaQuebrada.img.length + m.midiaQuebrada.audio.length + m.midiaQuebrada.video.length)} |`);
w(`| Erros de JavaScript no carregamento | ${tot(m => m.erros.length)} |`);
w(`| Requisições externas tentadas | ${tot(m => m.externas.length)} |`);
w(`| Escritas ao Supabase | ${tot(m => (m.escritas || []).length)} |`);
w('');
w('## 3 · Tabela por matéria');
w('');
w('Legenda: **Banco** = a matéria tem seção de Banco geral; **cópia** = como as questões do Banco casam com as do corpo (por `id` ou por enunciado). **ID q.** = quantas questões têm `id` próprio. **Áudio** = elementos `<audio>` no DOM de hoje (ausculta de Semiología), **não** audiobook.');
w('');
w('| Matéria (slug) | Arquivo | Seções | Blocos (índice) | q. DOM | q. distintas (enun. / +opc.) | q. Banco | Banco? | cópia | ID q. | Flashcards DOM / distintos | Figuras | Vídeos | Áudio |');
w('|---|---|--:|--:|--:|--:|--:|:-:|:-:|--:|--:|--:|--:|--:|');
mats.forEach(m => {
  const fu = fcUnicos(m); const q = m.questoes;
  const cop = q.banco ? (q.bancoOrfaos ? `⚠ ${q.bancoOrfaos} sem par` : (q.bancoCasaId ? 'por id' : 'por enunciado')) : '—';
  w(`| ${m.title} (\`${m.slug}\`) | \`${m.arquivo.nome}\` | ${m.nSecoes} | ${m.particularidades.menuComAlvo} | ${q.total} | **${m.unicos.quiz}**${m.unicos.quizComOpc !== m.unicos.quiz ? ' / ' + m.unicos.quizComOpc : ''} | ${q.banco} | ${SN(q.banco > 0)} | ${cop} | ${q.total - q.semId}/${q.total} | ${m.flashcards.total} / **${m.unicos.fc}** | ${m.figuras} | ${m.videos.cards} (${m.videos.iframes} iframe) | ${m.ausculta.audios} |`);
});
w('');
w('## 4 · Estados por matéria (SIM / NÃO / INDETERMINADO, com evidência)');
w('');
w('Critério: **SIM** = presente e medido no DOM; **NÃO** = ausente (contagem 0 no DOM real); **INDETERMINADO** = o DOM não permite concluir (explicado).');
w('');
w('| Matéria | Blocos numerados | Banco geral | Questões c/ ID | Flashcards | Figuras c/ legenda | Vídeos | Ausculta (`<audio>`) | Audiobook | Cover/portada | Evidência |');
w('|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|');
mats.forEach(m => {
  const q = m.questoes, p = m.particularidades; const fu = fcUnicos(m);
  const comId = q.total - q.semId; const idEst = comId === 0 ? 'NÃO' : (comId === q.total ? 'SIM' : 'PARCIAL');
  const portada = m.secoes.some(s => /portada|00$|intro|guia|inicio/i.test(s.id)) ;
  const ev = `seções=${m.nSecoes}; menu=${p.menuComAlvo}${p.semMenu.length ? ' (sem item: ' + p.semMenu.join(',') + ')' : ''}; q=${q.total} DOM/${m.unicos.quiz} distintas${qUnicos(m).copiaEm ? ' (agregadora ' + qUnicos(m).copiaEm + ')' : ''}; fc=${m.flashcards.total} DOM/${m.unicos.fc} distintos${fu.copiaEm ? ' (agregadora ' + fu.copiaEm + ')' : ''}; fig=${m.figuras}; vid=${m.videos.cards}; audio=${m.ausculta.audios}`;
  w(`| ${m.title} | ${SN(p.menuComAlvo > 0)} | ${SN(q.banco > 0)} | ${idEst} | ${SN(m.flashcards.total > 0)} | ${SN(m.figuras > 0)} | ${SN(m.videos.cards + m.videos.iframes + m.videos.nativos > 0)} | ${SN(m.ausculta.audios > 0)} | **NÃO** (sem manifesto) | ${portada ? 'SIM' : 'NÃO'} | ${ev} |`);
});
w('');
w('**Audiobook = NÃO em todas as 27**: o único manifesto autorizado hoje é o do piloto (Semiología II, via `get-audio-manifest`, atrás do flag `audio`). O inventário **não** consulta manifesto, não simula áudio e não lê Supabase. Os `<audio>` de Semiología e Semiología II são a **ausculta** (cards de sons clínicos), um recurso diferente do audiobook.');
w('');
w('## 5 · Contagens declaradas à mão × contagens medidas (deriva)');
w('');
w('O texto da portada de cada matéria declara números («179 preguntas», «335 flashcards», «34 infografías»…). O quadro compara cada número declarado com o que o DOM realmente tem. **Esses números são editados à mão hoje** — é o ponto central do contrato (checkpoint C).');
w('');
w('| Matéria | Escopo (seção) | Declarado | Casa com | Medido (alternativas) | Situação |');
w('|---|---|---|---|---|---|');
let nOk = 0, nDeriva = 0, nbOk = 0, nbDiv = 0;
mats.forEach(m => {
  const ds = declaradas(m);
  const gl = ds.filter(d => d.esc === 'global'), bl = ds.filter(d => d.esc === 'bloco');
  if (!ds.length) { w(`| ${m.title} | — | — | — | — | INDETERMINADO (nenhuma contagem reconhecível) |`); return; }
  gl.forEach(d => {
    const alt = Object.entries(d.ops).map(([k, v]) => `${k}=${v}`).join(' · ');
    if (d.casa.length) { nOk++; w(`| ${m.title} | portada \`${d.sec}\` | ${d.n} ${d.rec} | ${d.casa.join(', ')} | ${alt} | ✔ coincide |`); }
    else { nDeriva++; w(`| ${m.title} | portada \`${d.sec}\` | ${d.n} ${d.rec} | — | ${alt} | ✖ **NÃO coincide** |`); }
  });
  if (bl.length) {
    const ok = bl.filter(d => d.casa.length), div = bl.filter(d => !d.casa.length); nbOk += ok.length; nbDiv += div.length;
    w(`| ${m.title} | blocos | ${bl.length} declarações | ${ok.length} coincidem | ${div.slice(0, 6).map(d => `\`${d.sec}\`: ${d.n} ${d.rec} × ${Object.values(d.ops)[0]}`).join('; ')}${div.length > 6 ? '; …' : ''} | ${div.length ? '✖ **' + div.length + ' divergem** (semântica da frase a confirmar)' : '✔ todas coincidem'} |`);
  }
});
w('');
w(`Resumo: portadas — ${nOk} declarações coincidem, **${nDeriva} não coincidem**; blocos — ${nbOk} coincidem, **${nbDiv} divergem** (a frase do bloco nem sempre usa o mesmo critério do DOM: «7 videos» pode contar iframes, «preguntas» pode somar o bloco e a prova). Para as divergências (deriva real ou critério editorial diferente — revisão humana; o contrato do checkpoint C elimina o número manual).`);
w('');
w('## 6 · Particularidades que afetam o novo layout');
w('');
const part = [];
mats.forEach(m => {
  const p = m.particularidades, q = m.questoes; const fu = fcUnicos(m);
  const l = [];
  if (p.semMenu.length) l.push(`seção(ões) sem item de índice: \`${p.semMenu.join('`, `')}\``);
  if (fu.copiaEm) l.push(`flashcards: seção agregadora \`${fu.copiaEm}\` repete os dos blocos (DOM ${m.flashcards.total}; distintos ${fu.unicos})`);
  else if (m.flashcards.total !== m.unicos.fc) l.push(`flashcards repetidos entre seções sem agregadora única (DOM ${m.flashcards.total}; distintos ${m.unicos.fc})`);
  if (qUnicos(m).copiaEm) l.push(`questões: seção \`${qUnicos(m).copiaEm}\` repete as dos blocos (DOM ${q.total}; distintas ${m.unicos.quiz})`);
  else if (q.total !== m.unicos.quiz) l.push(`questões repetidas entre seções (DOM ${q.total}; distintas ${m.unicos.quiz})`);
  if (q.semId === q.total && q.total) l.push('nenhuma questão tem `id`');
  else if (q.semId) l.push(`${q.semId}/${q.total} questões sem \`id\``);
  if (q.banco && q.bancoOrfaos) l.push(`${q.bancoOrfaos} questões do Banco sem par no corpo`);
  if (m.idsDuplicados.length) l.push(`IDs duplicados: ${m.idsDuplicados.slice(0, 5).join(', ')}`);
  const mq = m.midiaQuebrada; if (mq.img.length + mq.audio.length + mq.video.length) l.push(`mídia local quebrada: ${[...mq.img, ...mq.audio, ...mq.video].slice(0, 4).join(', ')}`);
  if (m.erros.length) l.push(`erros JS: ${m.erros.slice(0, 2).join(' | ')}`);
  if (p.hero || p.quizCards) l.push('usa marcação do piloto (`.s2-hero`/`.s2-quiz-card`)');
  if (m.ausculta.audios) l.push(`${m.ausculta.audios} <audio> (ausculta)`);
  if (l.length) part.push(`- **${m.title}** (\`${m.slug}\`): ${l.join(' · ')}.`);
});
part.forEach(w);
w('');
w('## 7 · O que este inventário NÃO conclui');
w('');
w('- Não avalia qualidade científica/didática de nenhuma matéria (fora do escopo da #457).');
w('- «Questões distintas» tem dois critérios porque **o DOM não traz um identificador estável** na maioria das matérias: por enunciado (piso; junta perguntas diferentes com o mesmo enunciado genérico) e por enunciado+opções (teto; separa cópias do Banco reescritas). Quando os dois divergem, a contagem exata é **INDETERMINADA** sem `id`; é exatamente o que o contrato do checkpoint C resolve.');
w('- «Questões c/ ID» mede o atributo `id` do `.quiz-item`; matérias sem `id` não são defeito do layout, mas **impedem rastrear** o par corpo×Banco por id (o casamento é por enunciado).');
w('- «Figuras c/ legenda» conta `<figure>` com `<figcaption>` e imagem; infográficos sem legenda ou fora de `<figure>` não entram (INDETERMINADO quanto a «34 infografías» declaradas).');
w('- Existência de arquivos de mídia foi verificada só para caminhos **relativos**; URLs absolutas (YouTube) não foram acessadas.');
fs.writeFileSync(path.join(DIR, 'INVENTARIO.md'), L1.join('\n') + '\n');
console.log('INVENTARIO.md', L1.length, 'linhas');
