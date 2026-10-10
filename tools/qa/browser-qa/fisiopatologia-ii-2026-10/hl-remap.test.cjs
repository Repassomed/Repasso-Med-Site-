/* Teste do remapeamento de grifos (remap-highlights.cjs) com o motor REAL (RMTools.resolverAncora).
   Gera marcações sintéticas sobre a matéria ANTIGA (frases inteiras + janelas de 5 palavras em todos os elementos alterados,
   mais controles intactos), mede quantas voltam a ser pintadas na matéria NOVA SEM e COM remapeamento, e confere que
   nenhuma volta para outro elemento. Não usa dados de alunos. */
const OUT = n => require('path').join(process.env.RM_OUT || require('os').tmpdir(), n);
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright'); const { start } = require('./server.cjs'); const fs = require('fs');
const { buildPairs, remapRecord } = require('./remap-highlights.cjs');
const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
(async () => {
  const { s, base } = await start(); const b = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const open = async v => { const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto(base + '/qa.html?v=' + v, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.__ready===true', { timeout: 60000 }); return p; };
  const po = await open('orig'), pn = await open('new');
  const pairs = await buildPairs(po, pn); console.log('pares:', Object.values(pairs).reduce((n, a) => n + a.length, 0), 'em', Object.keys(pairs).length, 'seções');
  const LIST = `(SUB)=>{const out={};document.querySelectorAll('section[id]').forEach(sec=>{out[sec.id]=[...sec.querySelectorAll(SUB)].map(e=>e.textContent.replace(/\\s+/g,' ').trim());});return out;}`;
  const Lo = await po.evaluate(eval(LIST), SUB), Ln = await pn.evaluate(eval(LIST), SUB);
  const touched = [], control = []; let seq = 0;
  for (const sec of Object.keys(Lo)) Lo[sec].forEach((t, i) => { if (t !== Ln[sec][i]) touched.push([sec, i]); else if (t.length > 60 && (seq++ % 23 === 0)) control.push([sec, i]); });
  const recs = await po.evaluate(({ touched, control, SUB }) => {
    const RT = window.RMTools, out = [], secs = {};
    const getS = id => { if (secs[id]) return secs[id]; const sec = document.getElementById(id); const idx = RT.indexar(sec); const pos = new Map(); idx.map.forEach((m, k) => { let mm = pos.get(m.node); if (!mm) { mm = new Map(); pos.set(m.node, mm); } mm.set(m.off, k); }); return secs[id] = { sec, idx, pos, list: [...sec.querySelectorAll(SUB)] }; };
    function recsFor(id, i, kind) {
      const S = getS(id), el = S.list[i]; const ie = RT.indexar(el); if (!ie.norm || ie.norm.length < 25) return;
      const cand = []; const parts = ie.norm.split(/(?<=[.;:?!])\s+/); let off = 0;
      parts.forEach(p => { const at = ie.norm.indexOf(p, off); off = at + p.length; if (p.length >= 25 && p.length <= 260) cand.push([at, p, 'frase']); });
      const w = ie.norm.split(' '); let pos0 = 0; const starts = w.map(x => { const a = ie.norm.indexOf(x, pos0); pos0 = a + x.length; return a; });
      for (let k = 0; k + 5 <= w.length; k += 2) { const at = starts[k], end = starts[k + 4] + w[k + 4].length; const seg = ie.norm.slice(at, end); if (seg.length >= 20) cand.push([at, seg, 'ventana']); }
      cand.forEach(([at, seg, tipo]) => {
        const m = ie.map[at]; const mm = S.pos.get(m.node); const real = mm && mm.get(m.off); if (real == null) return;
        if (S.idx.norm.substr(real, seg.length) !== seg) return;
        const node = S.idx.map[real].node; const inner = node.parentElement.closest(SUB); const elIdx = S.list.indexOf(inner);
        out.push({ kind, tipo, block_id: id, elIdx, exact_text: seg, prefix: S.idx.norm.slice(Math.max(0, real - 40), real), suffix: S.idx.norm.slice(real + seg.length, real + seg.length + 40), occurrence: RT.ocorrencias(S.idx.norm, seg).indexOf(real) });
      });
    }
    touched.forEach(([id, i]) => recsFor(id, i, 'tocado')); control.forEach(([id, i]) => recsFor(id, i, 'control'));
    return out;
  }, { touched, control, SUB });
  console.log('elementos alterados', touched.length, '· marcações sintéticas', recs.length);
  async function resolve(list) {
    const res = []; const CH = 300;
    for (let k = 0; k < list.length; k += CH) {
      res.push(...await pn.evaluate(({ part, SUB }) => { const RT = window.RMTools, lists = {}; return part.map(h => { const bloco = document.getElementById(h.block_id); lists[h.block_id] = lists[h.block_id] || [...bloco.querySelectorAll(SUB)];
        const a = RT.resolverAncora(bloco, h); if (!a) return { nivel: 0 }; const r = RT.rangeDe(a.idx, a.ini, a.fim); if (!r) return { nivel: 0 };
        return { nivel: a.nivel, elIdx: lists[h.block_id].indexOf(r.startContainer.parentElement.closest(SUB)), txt: a.idx.norm.slice(a.ini, a.fim) }; }); }, { part: list.slice(k, k + CH), SUB }));
    }
    return res;
  }
  const antes = await resolve(recs);
  const remap = recs.map(h => remapRecord(h, pairs)); const depois = await resolve(remap.map(r => r.rec));
  const st = {};
  recs.forEach((h, i) => {
    const key = h.kind + '|' + h.tipo; const t = st[key] = st[key] || { n: 0, tocadas: 0, antes: 0, depois: 0, depois_lugar_errado: 0, depois_nivel2: 0 };
    t.n++; if (remap[i].tocada) t.tocadas++; if (antes[i].nivel) t.antes++;
    const d = depois[i]; if (d.nivel) { t.depois++; if (d.nivel === 2) t.depois_nivel2++; if (d.elIdx !== h.elIdx) t.depois_lugar_errado++; }
  });
  console.log(JSON.stringify(st, null, 1));
  const falhas = recs.map((h, i) => ({ h, r: remap[i], d: depois[i] })).filter(x => x.h.kind === 'tocado' && !x.d.nivel).slice(0, 25);
  console.log('exemplos que ainda não voltam:', falhas.length); falhas.slice(0, 8).forEach(x => console.log(' -', x.h.block_id, x.h.tipo, '|', x.h.exact_text.slice(0, 90)));
  fs.writeFileSync(OUT('hl-remap-result.json'), JSON.stringify({ st, pairs: Object.values(pairs).reduce((n, a) => n + a.length, 0) }, null, 1));
  await b.close(); s.close();
})();
