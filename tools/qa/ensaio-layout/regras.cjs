/* REGRAS R1–R9 do contrato de novos recursos (issue #457). Funções PURAS sobre o modelo de `modelo.cjs`: sem arquivo, sem navegador, sem rede.
   Mesmas regras para as 27 matérias e para os fixtures negativos de `contrato.teste.cjs`.
   Princípio: cada regra confere ITEM A ITEM (seção a seção, cópia a cópia, número a número). Nenhuma passa porque «existe um marcador em algum lugar do arquivo»
   nem porque um número coincide com uma contagem qualquer: o número da portada só vale contra a contagem CANÔNICA do recurso correspondente. */
'use strict';

const REUNE = /banco|flashcards/i;               // heurística de id do piloto (rm-materia-nav.js:90 · rm-layout.js:472)
const BANCO_ID = /banco|bank|banc|compendio/i;   // nome de seção de banco de perguntas
const PORTADA = /portada|intro|guia|inicio|00$|^h2p|^hp0/i;

const cap = (a, n = 6) => a.slice(0, n);
const unicos = (a) => [...new Set(a)];

/* ---------- agregadoras (seções que repetem itens dos blocos) ---------- */
function agregadoras(M) {
  const por = {};   // id → { marcador, conteudo:{quiz,fc}, porId }
  M.secs.forEach(s => { por[s.id] = { marcador: !!(s.agrega && s.agrega.trim()), conteudo: { quiz: false, fc: false }, porId: REUNE.test(s.id) || (BANCO_ID.test(s.id) && s.quiz.length > 0) }; });
  [['quiz', s => s.quiz.map(q => q.stem)], ['fc', s => s.fc.map(f => f.front)]].forEach(([k, chaves]) => {
    const dist = new Set(M.secs.flatMap(s => chaves(s))).size;
    const conj = new Map(M.secs.map(s => [s.id, new Set(chaves(s))]));
    M.secs.forEach(s => {
      const it = chaves(s); if (!it.length || it.length < 0.5 * dist) return;
      const outros = new Set(M.secs.filter(o => o !== s).flatMap(o => chaves(o)));
      if (it.filter(x => outros.has(x)).length / it.length < 0.9) return;
      /* uma seção contida (≥90%) numa OUTRA MAIOR (ou igual e posterior) é parte dela (o bloco copiado no banco), não agregadora; sem isso, bloco e banco se anulariam */
      const idx = id => M.secs.findIndex(x => x.id === id);
      const ehParte = M.secs.some(o => o !== s && (conj.get(o.id).size > conj.get(s.id).size || (conj.get(o.id).size === conj.get(s.id).size && idx(o.id) > idx(s.id))) && it.filter(x => conj.get(o.id).has(x)).length / it.length >= 0.9);   // gêmeas: a que vem DEPOIS é a cópia
      if (!ehParte) por[s.id].conteudo[k] = true;
    });
  });
  const eh = id => !!por[id] && (por[id].marcador || por[id].conteudo.quiz || por[id].conteudo.fc || por[id].porId);
  return { por, eh };
}

/* ---------- contagens canônicas (só seções que NÃO são agregadoras) ---------- */
function canonicos(M, ag) {
  const sc = M.secs.filter(s => !ag.eh(s.id));
  const quiz = sc.flatMap(s => s.quiz.map(q => ({ sec: s.id, ...q }))), fc = sc.flatMap(s => s.fc.map(f => ({ sec: s.id, ...f })));
  const dist = (arr, f) => new Set(arr.map(f)).size;
  const marcados = sc.filter(s => s.role).length;
  return {
    quiz, fc,
    nQuiz: dist(quiz, q => q.id || q.stem + '|' + q.opts),
    nFc: dist(fc, f => f.fc || f.front + '|' + f.back),
    nFig: dist(sc.flatMap(s => s.fig), f => f.chave),
    nVideo: dist(sc.flatMap(s => s.video), v => v.id || v.chave),
    nAus: dist(sc.flatMap(s => s.aus), a => a.id || a.chave),
    nBloques: marcados ? sc.filter(s => s.role === 'bloque').length : (sc.filter(s => /b\d+$/i.test(s.id)).length || null),
    bloquesPor: marcados ? 'marcador data-rm-role' : 'convenção de id …bNN'
  };
}

const RECURSO = { preguntas: 'quiz', cuestiones: 'quiz', cuestionario: 'quiz', flashcards: 'fc', tarjetas: 'fc', infografias: 'fig', bloques: 'bloques', videos: 'video', sonidos: 'aus' };
const TOTAL_DOM = (M) => ({ quiz: M.secs.reduce((a, s) => a + s.quiz.length, 0), fc: M.secs.reduce((a, s) => a + s.fc.length, 0), fig: M.secs.reduce((a, s) => a + s.fig.length, 0), video: M.secs.reduce((a, s) => a + s.video.length, 0), aus: M.secs.reduce((a, s) => a + s.aus.length, 0), bloques: M.secs.length });

/* ---------- R1 · título ---------- */
function R1(M) {
  const sem = M.secs.filter(s => !s.h2).map(s => s.id);
  return { ok: sem.length === 0, resumo: sem.length ? `sem <h2>: ${cap(sem).join(', ')}` : '', det: sem };
}

/* ---------- R2 · id estável de TODA questão ---------- */
function R2(M) {
  const todas = M.secs.flatMap(s => s.quiz), sem = todas.filter(q => !q.id).length;
  return { ok: sem === 0, resumo: sem ? `${sem}/${todas.length} questões sem id` : '', det: { sem, total: todas.length } };
}

/* ---------- R3 · toda agregadora é reconhecida (marcador OU heurística de id do piloto) ---------- */
function R3(M, ag) {
  const naoRec = M.secs.filter(s => ag.eh(s.id) && !ag.por[s.id].marcador && !REUNE.test(s.id)).map(s => s.id);
  return { ok: naoRec.length === 0, resumo: naoRec.length ? `agregadora não reconhecida: ${naoRec.join(', ')}` : '', det: naoRec };
}

/* ---------- R4 · CADA cópia do Banco tem vínculo verificável com UMA questão canônica ---------- */
function vinculo(c) {
  if (c.copiaDe && c.copiaDe.trim()) return { alvo: c.copiaDe.trim(), via: 'marcador' };
  const m = /^bq-(.+)$/.exec(c.id || ''); if (m) return { alvo: 'q-' + m[1], via: 'convenção de id' };
  return null;
}
function R4(M, ag) {
  const bancos = M.secs.filter(s => ag.eh(s.id) && s.quiz.length);
  if (!bancos.length) return { ok: true, resumo: 'sem Banco geral', det: { banco: false } };
  const canon = M.secs.filter(s => !ag.eh(s.id)).flatMap(s => s.quiz.map(q => ({ sec: s.id, ...q })));
  const porId = new Map(); canon.filter(q => q.id).forEach(q => { if (!porId.has(q.id)) porId.set(q.id, q); });
  const emAgreg = new Set(bancos.flatMap(s => s.quiz.map(q => q.id)).filter(Boolean));
  const p = { copias: 0, semVinculo: [], alvoInexistente: [], alvoEhCopia: [], autoLink: [], duplicada: [], divergente: [], viaMarcador: 0, viaConvencao: 0 };
  const alvos = new Set();
  bancos.forEach(b => {
    const vistos = new Map();
    b.quiz.forEach((c, i) => {
      p.copias++; const rotulo = c.id || `${b.id}#${i + 1}`;
      const v = vinculo(c);
      if (!v) { p.semVinculo.push(rotulo); return; }
      if (v.via === 'marcador') p.viaMarcador++; else p.viaConvencao++;
      if (c.id && v.alvo === c.id) { p.autoLink.push(rotulo); return; }
      const t = porId.get(v.alvo);
      if (!t) { (emAgreg.has(v.alvo) ? p.alvoEhCopia : p.alvoInexistente).push(`${rotulo}→${v.alvo}`); return; }
      if (vistos.has(v.alvo)) p.duplicada.push(`${rotulo}≡${vistos.get(v.alvo)}→${v.alvo}`); else vistos.set(v.alvo, rotulo);
      alvos.add(v.alvo);
      if (t.stem !== c.stem || t.opts !== c.opts) p.divergente.push(`${rotulo}≠${v.alvo}`);
    });
  });
  const canonSemId = canon.filter(q => !q.id).length;
  const canonSemCopia = canon.filter(q => q.id && !alvos.has(q.id)).map(q => q.id);
  const problemas = p.semVinculo.length + p.alvoInexistente.length + p.alvoEhCopia.length + p.autoLink.length + p.duplicada.length + p.divergente.length + canonSemId + canonSemCopia.length;
  const partes = [];
  if (p.semVinculo.length) partes.push(`${p.semVinculo.length}/${p.copias} cópias sem vínculo (nem data-rm-copia-de nem bq-↔q-)`);
  if (p.alvoInexistente.length) partes.push(`${p.alvoInexistente.length} apontam para questão inexistente`);
  if (p.alvoEhCopia.length) partes.push(`${p.alvoEhCopia.length} apontam para outra cópia`);
  if (p.autoLink.length) partes.push(`${p.autoLink.length} apontam para si mesmas`);
  if (p.duplicada.length) partes.push(`${p.duplicada.length} cópias repetidas da mesma canônica`);
  if (p.divergente.length) partes.push(`${p.divergente.length} diferem do texto da canônica`);
  if (canonSemId) partes.push(`${canonSemId} canônicas sem id (vínculo impossível)`);
  if (canonSemCopia.length) partes.push(`${canonSemCopia.length} canônicas sem cópia no Banco`);
  const ok = problemas === 0;
  return { ok, resumo: ok ? `${p.copias} cópias ligadas (${p.viaMarcador} por marcador, ${p.viaConvencao} por convenção de id), 0 órfãs` : partes.join(' · '),
    det: { copias: p.copias, viaMarcador: p.viaMarcador, viaConvencao: p.viaConvencao, semVinculo: p.semVinculo.length, alvoInexistente: p.alvoInexistente.length, alvoEhCopia: p.alvoEhCopia.length, autoLink: p.autoLink.length, duplicada: p.duplicada.length, divergente: p.divergente.length, canonSemId, canonSemCopia: canonSemCopia.length,
      exemplos: { semVinculo: cap(p.semVinculo, 3), alvoInexistente: cap(p.alvoInexistente, 3), divergente: cap(p.divergente, 3), canonSemCopia: cap(canonSemCopia, 3) } } };
}

/* ---------- R5 · número da portada × contagem CANÔNICA do recurso correspondente ---------- */
function R5(M, ag) {
  const C = canonicos(M, ag), DOM = TOTAL_DOM(M), canon = { quiz: C.nQuiz, fc: C.nFc, fig: C.nFig, video: C.nVideo, aus: C.nAus, bloques: C.nBloques };
  const portadas = new Set(M.secs.filter((s, i) => !s.quiz.length && !s.fc.length && (i === 0 || PORTADA.test(s.id))).map(s => s.id).concat('(capa)'));   // '(capa)' = hero/banner sem id, filho direto da aba
  const vistos = new Set(), itens = [];
  M.decl.filter(d => d.sec && portadas.has(d.sec)).forEach(d => {
    const k = d.sec + '|' + d.n + '|' + d.rec; if (vistos.has(k)) return; vistos.add(k);
    const r = RECURSO[d.rec];
    if (!r) { itens.push({ n: d.n, rec: d.rec, estado: 'fora-do-contrato', canonico: null }); return; }
    const c = canon[r];
    if (c === null || c === undefined) { itens.push({ n: d.n, rec: d.rec, recurso: r, estado: 'indeterminado', canonico: null, motivo: r === 'bloques' ? 'sem data-rm-role nem convenção …bNN' : 'sem contagem canônica' }); return; }
    itens.push({ n: d.n, rec: d.rec, recurso: r, canonico: c, domTotal: DOM[r], estado: d.n === c ? 'ok' : 'diverge', soCoincideComDOM: d.n !== c && d.n === DOM[r] });
  });
  const avaliados = itens.filter(i => i.estado !== 'fora-do-contrato');
  const ruins = avaliados.filter(i => i.estado !== 'ok');
  const fmt = i => `${i.n} ${i.rec} × canônico ${i.canonico === null ? '?' : i.canonico}${i.soCoincideComDOM ? ' (= total do DOM com cópias)' : ''}${i.estado === 'indeterminado' ? ' (indeterminado)' : ''}`;
  return { ok: ruins.length === 0, resumo: ruins.length ? 'portada: ' + ruins.map(fmt).join('; ') : (avaliados.length ? '' : 'sem número declarado na portada'), det: { itens, canonico: canon, domTotal: DOM, bloquesPor: C.bloquesPor } };
}

/* ---------- R6 / R7 / R8 ---------- */
function R6(M) { const c = {}; M.ids.forEach(i => { c[i] = (c[i] || 0) + 1; }); const d = Object.keys(c).filter(i => c[i] > 1); return { ok: d.length === 0, resumo: d.length ? 'ids duplicados: ' + cap(d, 5).join(', ') : '', det: d }; }
function R7(M, existe) { const q = []; ['audio', 'img', 'video'].forEach(k => M.media[k].forEach(s => { if (s && existe && existe(s) === false) q.push(s); })); return { ok: q.length === 0, resumo: q.length ? 'mídia: ' + cap(q, 5).join(', ') : '', det: cap(q, 5) }; }
function R8(html) { const v = unicos(html.match(/storage\/v1\/object|\/sign\/|token=[A-Za-z0-9_-]{20,}|audiobooks\//g) || []); return { ok: v.length === 0, resumo: v.length ? 'URL de storage no HTML: ' + v.slice(0, 3).join(', ') : '', det: v.slice(0, 3) }; }

/* ---------- R9 · marcadores exigidos em CADA seção e item aplicável ---------- */
function R9(M, ag) {
  const f = { secSemRole: [], roleInvalido: [], bloqueSemN: [], bloqueSemUnidad: [], agregSemMarcador: [], agregRoleErrado: [], quizCanonSemQ: [], quizCopiaSemLink: [], fcCanonSemId: [], fcIdRepetido: [], fcCopiaSemLink: [], fcCopiaAlvoInexistente: [], videoSemId: [], ausSemId: [] };
  const fcIds = new Set(M.secs.filter(s => !ag.eh(s.id)).flatMap(s => s.fc.map(x => x.fc).filter(Boolean)));
  const vistosFc = new Set(), n = { secoes: M.secs.length, quizCanon: 0, quizCopia: 0, fcCanon: 0, fcCopia: 0, video: 0, aus: 0 };
  M.secs.forEach(s => {
    const agregada = ag.eh(s.id);
    if (!s.role) f.secSemRole.push(s.id); else if (!['guia', 'bloque', 'repaso'].includes(s.role)) f.roleInvalido.push(`${s.id}=${s.role}`);
    if (s.role === 'bloque') {
      if (!/^\d{1,3}$/.test(s.n || '')) f.bloqueSemN.push(s.id);
      if (s.unidadMarcador && s.unidad !== s.unidadMarcador) f.bloqueSemUnidad.push(s.id);
    }
    if (agregada) {
      const tem = (s.quiz.length ? ['quiz'] : []).concat(s.fc.length ? ['fc'] : []);
      const toks = String(s.agrega || '').split(/\s+/).filter(Boolean);
      if (!toks.length || !tem.every(t => toks.includes(t))) f.agregSemMarcador.push(s.id);
      if (s.role && s.role !== 'repaso') f.agregRoleErrado.push(s.id);
    }
    s.quiz.forEach((q, i) => {
      if (agregada) { n.quizCopia++; if (!(q.copiaDe && q.copiaDe.trim())) f.quizCopiaSemLink.push(q.id || `${s.id}#${i + 1}`); }
      else { n.quizCanon++; if (!q.id || q.q !== q.id) f.quizCanonSemQ.push(q.id || `${s.id}#${i + 1}`); }
    });
    s.fc.forEach((x, i) => {
      const rot = `${s.id}#${i + 1}`;
      if (agregada) { n.fcCopia++; if (!(x.copiaDe && x.copiaDe.trim())) f.fcCopiaSemLink.push(rot); else if (!fcIds.has(x.copiaDe.trim())) f.fcCopiaAlvoInexistente.push(`${rot}→${x.copiaDe}`); }
      else { n.fcCanon++; if (!(x.fc && x.fc.trim())) f.fcCanonSemId.push(rot); else if (vistosFc.has(x.fc)) f.fcIdRepetido.push(x.fc); else vistosFc.add(x.fc); }
    });
    s.video.forEach((v, i) => { n.video++; if (!(v.id && v.id.trim())) f.videoSemId.push(`${s.id}#${i + 1}`); });
    s.aus.forEach((a, i) => { n.aus++; if (!(a.id && a.id.trim())) f.ausSemId.push(`${s.id}#${i + 1}`); });
  });
  const rot = { secSemRole: 'seções sem data-rm-role', roleInvalido: 'data-rm-role inválido', bloqueSemN: 'blocos sem data-rm-n', bloqueSemUnidad: 'blocos sem data-rm-unidad igual ao marcador «UNIDAD X»', agregSemMarcador: 'agregadoras sem data-rm-agrega do tipo dos itens', agregRoleErrado: 'agregadoras com role ≠ repaso',
    quizCanonSemQ: 'perguntas canônicas sem data-rm-q = id', quizCopiaSemLink: 'cópias de pergunta sem data-rm-copia-de', fcCanonSemId: 'flashcards canônicos sem data-rm-fc', fcIdRepetido: 'data-rm-fc repetido', fcCopiaSemLink: 'cópias de flashcard sem data-rm-copia-de', fcCopiaAlvoInexistente: 'cópias de flashcard apontando para data-rm-fc inexistente', videoSemId: 'vídeos sem data-rm-video', ausSemId: 'ausculta sem data-rm-aus' };
  const total = { secSemRole: n.secoes, bloqueSemN: null, quizCanonSemQ: n.quizCanon, quizCopiaSemLink: n.quizCopia, fcCanonSemId: n.fcCanon, fcCopiaSemLink: n.fcCopia, videoSemId: n.video, ausSemId: n.aus };
  const partes = Object.keys(f).filter(k => f[k].length).map(k => `${f[k].length}${total[k] ? '/' + total[k] : ''} ${rot[k]}`);
  const contagem = Object.fromEntries(Object.keys(f).map(k => [k, f[k].length]));
  return { ok: partes.length === 0, resumo: partes.join(' · '), det: { aplicaveis: n, faltas: contagem, exemplos: Object.fromEntries(Object.keys(f).filter(k => f[k].length).map(k => [k, cap(f[k], 3)])) } };
}

function avaliar(M, { html = '', existe = null } = {}) {
  const ag = agregadoras(M);
  return { ag, R1: R1(M), R2: R2(M), R3: R3(M, ag), R4: R4(M, ag), R5: R5(M, ag), R6: R6(M), R7: R7(M, existe), R8: R8(html), R9: R9(M, ag) };
}

const REGRAS = {
  R1: 'toda seção tem título (<h2>): o card do índice e os botões Anterior/Próximo dependem dele',
  R2: 'toda questão tem id estável (q-<prefixo><NNN>)',
  R3: 'toda seção agregadora (cópia de itens dos blocos) é reconhecida: id casa a heurística do piloto OU leva data-rm-agrega',
  R4: 'CADA cópia do Banco tem vínculo verificável (data-rm-copia-de ou bq-↔q-) com UMA questão canônica existente, de texto igual, sem repetição; e toda canônica tem a sua cópia',
  R5: 'CADA número declarado na portada é igual à contagem CANÔNICA do recurso correspondente (agregadoras fora; coincidir com o total do DOM com cópias não basta)',
  R6: 'nenhum id duplicado no documento',
  R7: 'nenhuma mídia local quebrada',
  R8: 'nenhuma URL assinada/caminho de storage no HTML estático (áudio só pelo manifesto)',
  R9: 'marcadores data-rm-* presentes em CADA seção e item aplicável (role/n/unidad por seção; agrega nas agregadoras; q, copia-de, fc, video, aus por item)'
};

module.exports = { REGRAS, avaliar, agregadoras, canonicos, R4, R5, R9, REUNE, BANCO_ID };
