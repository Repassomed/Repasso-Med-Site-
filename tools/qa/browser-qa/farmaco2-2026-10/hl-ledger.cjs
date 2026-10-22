/* LIVRO-RAZÃO DE GRIFOS (hl-ledger) — verificação reproduzível, SEM banco, ANTES de reescrever frases.
   Para cada frase (≥ 25 caracteres) da matéria ANTIGA (`origin/main`) que deixou de existir LITERALMENTE no mesmo elemento da matéria NOVA, registra:
     · classe  A = só o enquadramento de prova mudou (fato intacto) · B = explicação refeita junto com alternativas · C = conteúdo reescrito · D = trivial;
     · a frase mais próxima do texto novo;
     · estado: `remap-verificado` (uma marcação SINTÉTICA sobre a frase, remapeada pela ferramenta, volta pelo motor real NO MESMO elemento, com o trecho esperado)
               ou `sem-remap` (não volta / volta noutro lugar → precisa de decisão humana ou de reescrita menos agressiva).
   Frases preservadas literalmente não entram (o motor as encontra sozinho). Alternativas de quiz (`li` de opção) não são grifáveis e ficam de fora.
   Saída: ledger.json + ledger.md (tabela por classe/estado) e CÓDIGO DE SAÍDA 1 se houver `sem-remap` além do permitido (`--permitir-sem-remap N`, padrão 0).
   Uso (rodar com o head FINAL, no CI do harness ou à mão):
     node hl-ledger.cjs [--out pasta] [--aceitas hl-ledger-aceitas.json] [--permitir-sem-remap N]
   Limite declarado: as marcações são sintéticas — isto prova que a ferramenta consegue casar texto antigo → novo, NÃO que os grifos reais de alunos sobrevivem. */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { start } = require('./server.cjs');
const { buildPairs, remapRecord, secNorms, locateAll } = require('./remap-highlights.cjs');
const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', process.env.RM_OUT || require('os').tmpdir());
const PERMITIR = +arg('permitir-sem-remap', 0);
const ACEITAS = arg('aceitas', null) ? JSON.parse(fs.readFileSync(arg('aceitas'), 'utf8')) : {};   // { "sec#el": "motivo humano" } — exceções JÁ decididas por uma pessoa, commitadas e revisáveis
const VOZ = /pregunt|exam|prueba|c[aá]tedra (remarca|pide|cobra|insiste)|cae\b|cay[oó]|cayeron|enunciad|cuestionario|estudio|repite|favorit|tropezar|cobra|garantizado|Memoriz[aá]|textual del material/i;

(async () => {
  const { s, base } = await start();
  const br = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const open = async v => { const p = await br.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto(base + '/qa.html?v=' + v, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.__ready===true', { timeout: 120000 }); return p; };
  const po = await open('orig'), pn = await open('new');
  const pairs = await buildPairs(po, pn), norms = await secNorms(pn);
  const LIST = `(SUB)=>{const RT=window.RMTools,out={};document.querySelectorAll('section[id]').forEach(sec=>{out[sec.id]=[...sec.querySelectorAll(SUB)].map(e=>({t:RT.indexar(e).norm,opt:!!(e.matches('li')&&e.closest('ul.options'))}));});return out;}`;
  const Lo = await po.evaluate(eval(LIST), SUB), Ln = await pn.evaluate(eval(LIST), SUB);
  const split = t => t.split(/(?<=[.;:?!])\s+/).filter(x => x.length >= 25 && x.length <= 260);
  const jac = (a, b) => { const A = new Set(a.toLowerCase().split(/\s+/)), B = new Set(b.toLowerCase().split(/\s+/)); let i = 0; A.forEach(w => { if (B.has(w)) i++; }); return i / (A.size + B.size - i || 1); };
  const items = [];   // frases em risco
  for (const sid of Object.keys(Lo)) Lo[sid].forEach((e, i) => {
    if (e.opt) return; const nt = Ln[sid][i].t; if (e.t === nt) return;
    for (const f of split(e.t)) { if (nt.includes(f)) continue;
      const cand = split(nt).concat([nt]); let best = '', bs = -1; cand.forEach(c => { const j = jac(f, c); if (j > bs) { bs = j; best = c; } });
      items.push({ sec: sid, el: i, sentence: f, nearest: best.slice(0, 260), sim: +bs.toFixed(2) }); }
  });
  // marcações sintéticas sobre cada frase em risco (formato do motor), remapeadas e resolvidas na matéria nova
  const recs = await po.evaluate(({ items, SUB }) => {
    const RT = window.RMTools, secs = {}, out = [];
    const get = id => secs[id] || (secs[id] = (() => { const sec = document.getElementById(id), idx = RT.indexar(sec), pos = new Map(); idx.map.forEach((m, k) => { let mm = pos.get(m.node); if (!mm) { mm = new Map(); pos.set(m.node, mm); } mm.set(m.off, k); }); return { sec, idx, pos, list: [...sec.querySelectorAll(SUB)] }; })());
    items.forEach((it, n) => { const S = get(it.sec), el = S.list[it.el], ie = RT.indexar(el), at = ie.norm.indexOf(it.sentence); if (at < 0) return out.push(null);
      const m = ie.map[at], mm = S.pos.get(m.node), real = mm && mm.get(m.off); if (real == null || S.idx.norm.substr(real, it.sentence.length) !== it.sentence) return out.push(null);
      out.push({ block_id: it.sec, exact_text: it.sentence, prefix: S.idx.norm.slice(Math.max(0, real - 40), real), suffix: S.idx.norm.slice(real + it.sentence.length, real + it.sentence.length + 40), occurrence: RT.ocorrencias(S.idx.norm, it.sentence).indexOf(real), elIdx: it.el }); });
    return out;
  }, { items, SUB });
  const valid = recs.map((r, i) => r ? i : -1).filter(i => i >= 0);
  const loc = await locateAll(po, valid.map(i => recs[i]));
  const remapped = valid.map((i, k) => remapRecord(recs[i], pairs, norms, loc[k]).rec);
  const res = [];
  for (let k = 0; k < remapped.length; k += 300) res.push(...await pn.evaluate(({ part, SUB }) => { const RT = window.RMTools, lists = {}; return part.map(h => { const b = document.getElementById(h.block_id); lists[h.block_id] = lists[h.block_id] || [...b.querySelectorAll(SUB)];
    const a = RT.resolverAncora(b, h); if (!a) return null; const r = RT.rangeDe(a.idx, a.ini, a.fim); if (!r) return null; return { el: lists[h.block_id].indexOf(r.startContainer.parentElement.closest(SUB)), txt: a.idx.norm.slice(a.ini, a.fim), nivel: a.nivel }; }); }, { part: remapped.slice(k, k + 300), SUB }));
  const status = items.map(() => ({ estado: 'sem-remap', motivo: 'frase não localizada no motor' }));
  valid.forEach((i, k) => { const r = res[k]; if (!r) status[i] = { estado: 'sem-remap', motivo: 'o motor não encontra o trecho remapeado' }; else if (r.el !== items[i].el) status[i] = { estado: 'sem-remap', motivo: 'volta em outro elemento (' + r.el + ')' }; else status[i] = { estado: 'remap-verificado', motivo: '' }; });
  const classe = it => /^\(?[a-d]\)\s|Las otras|\([a-d]\)/.test(it.sentence) ? 'B' : (it.sim >= 0.9 ? 'D' : (VOZ.test(it.sentence) && it.nearest.length <= it.sentence.length + 80 ? 'A' : 'C'));
  const ledger = items.map((it, i) => ({ ...it, classe: classe(it), ...status[i] }));
  const cnt = {}; ledger.forEach(l => { const k = l.classe + '|' + l.estado; cnt[k] = (cnt[k] || 0) + 1; });
  ledger.forEach(l => { if (l.estado === 'sem-remap' && ACEITAS[l.sec + '#' + l.el]) { l.estado = 'sem-remap-aceito'; l.motivo = ACEITAS[l.sec + '#' + l.el]; } });
  const semRemap = ledger.filter(l => l.estado === 'sem-remap'), aceitos = ledger.filter(l => l.estado === 'sem-remap-aceito');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'hl-ledger.json'), JSON.stringify({ resumo: { frases_em_risco: ledger.length, por_classe_estado: cnt, sem_remap: semRemap.length, sem_remap_aceito: aceitos.length }, itens: ledger }, null, 1));
  const md = ['# Livro-razão de grifos (marcações SINTÉTICAS — não prova preservação de grifos reais)', '', `Frases da matéria antiga que deixaram de existir literalmente: **${ledger.length}** · sem remap e SEM decisão humana registrada: **${semRemap.length}** · sem remap com exceção aceita (--aceitas): **${aceitos.length}**`, '', '| classe | remap verificado | sem remap |', '|---|---:|---:|'];
  ['A', 'B', 'C', 'D'].forEach(c => md.push(`| ${c} | ${cnt[c + '|remap-verificado'] || 0} | ${cnt[c + '|sem-remap'] || 0} |`));
  md.push('', '## Sem remap (decisão humana pendente)', ''); semRemap.forEach(l => md.push(`- ${l.sec}#${l.el} [${l.classe}] «${l.sentence.slice(0, 120)}» → «${l.nearest.slice(0, 120)}» — ${l.motivo}`));
  md.push('', '## Exceções aceitas (grifo sobre texto obsoleto: não deve ser transferido)', ''); aceitos.forEach(l => md.push(`- ${l.sec}#${l.el} [${l.classe}] «${l.sentence.slice(0, 120)}» — ${l.motivo}`));
  fs.writeFileSync(path.join(OUT, 'hl-ledger.md'), md.join('\n') + '\n');
  console.log(JSON.stringify({ frases_em_risco: ledger.length, por_classe_estado: cnt, sem_remap: semRemap.length, sem_remap_aceito: aceitos.length }));
  await br.close(); s.close();
  if (semRemap.length > PERMITIR) { console.error(`REPROVADO: ${semRemap.length} frase(s) sem remap verificado (permitido: ${PERMITIR}). Veja hl-ledger.md.`); process.exit(1); }
})().catch(e => { console.error(e); process.exit(2); });
