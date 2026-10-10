/* Remapeamento de marcações (grifos) depois de uma revisão de texto — PR #481.
   Sem login e sem Supabase: trabalha sobre um JSON de marcações exportado por quem tem acesso (José) e
   devolve outro JSON com o texto atualizado. Nada é escrito em lugar nenhum.

   Como funciona
   1. Abre a matéria ANTIGA (git show origin/main) e a NOVA (working tree) no motor real do site e, para cada
      section[id], pareia os elementos ancoráveis por índice (a sequência é idêntica — invariante de annotation-safety)
      e extrai o texto normalizado de cada elemento com RMTools.indexar (o mesmo que o motor usa).
   2. Diferencia por palavras os elementos alterados → pares «trecho antigo → trecho novo» com 2 palavras de contexto.
   3. Para cada marcação aplica os pares ao conjunto prefixo+texto+sufixo. Se um trecho alterado está inteiro dentro
      do texto marcado, o trecho novo entra no lugar; se a marcação cortava o trecho ao meio, a marcação cresce até
      cobrir o trecho novo inteiro (nunca encolhe nem muda de lugar).
   4. Prefixo e sufixo (40 caracteres) são recalculados no texto novo.
   Uso: node remap-highlights.cjs --in marcas.json --out marcas.remap.json   (marcas = [{id,block_id,exact_text,prefix,suffix,occurrence,...}])
   Exporta também buildPairs/remapRecord para o teste hl-remap.test.cjs. */
const path = require('path'), fs = require('fs');

function wordDiff(a, b) {              // LCS por palavras → [[i1,i2,j1,j2],...] dos trechos diferentes
  const n = a.length, m = b.length; const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0, si = -1, sj = -1;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { if (si >= 0) { out.push([si, i, sj, j]); si = sj = -1; } i++; j++; }
    else { if (si < 0) { si = i; sj = j; } if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) j++; else i++; }
  }
  if (si >= 0) out.push([si, n, sj, m]);
  return out;
}
function pairsOf(oldT, newT) {
  const wa = oldT.split(' '), wb = newT.split(' '); const hunks = [];
  for (const [i1, i2, j1, j2] of wordDiff(wa, wb)) hunks.push([Math.max(0, i1 - 2), Math.min(wa.length, i2 + 2), Math.max(0, j1 - 2), Math.min(wb.length, j2 + 2)]);
  const merged = [];
  for (const h of hunks) { const l = merged[merged.length - 1]; if (l && h[0] <= l[1] && h[2] <= l[3]) { l[1] = Math.max(l[1], h[1]); l[3] = Math.max(l[3], h[3]); } else merged.push(h.slice()); }
  return merged.map(([i1, i2, j1, j2]) => ({ old: wa.slice(i1, i2).join(' '), new: wb.slice(j1, j2).join(' ') }));
}
const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
const TEXTS = `(SUB)=>{const RT=window.RMTools,out={};document.querySelectorAll('section[id]').forEach(sec=>{out[sec.id]=[...sec.querySelectorAll(SUB)].map(e=>RT.indexar(e).norm);});return out;}`;
async function buildPairs(pOld, pNew) {
  const A = await pOld.evaluate(eval(TEXTS), SUB), B = await pNew.evaluate(eval(TEXTS), SUB), by = {};
  for (const sid of Object.keys(A)) {
    if (!B[sid] || A[sid].length !== B[sid].length) throw new Error('sequência diferente em ' + sid + ': o remapeamento por índice não se aplica');
    A[sid].forEach((t, i) => { if (t !== B[sid][i]) (by[sid] = by[sid] || []).push(...pairsOf(t, B[sid][i])); });
  }
  for (const sid in by) by[sid].sort((x, y) => y.old.length - x.old.length);   // o trecho mais específico primeiro
  return by;
}
/* aplica os pares da seção a prefixo+texto+sufixo e devolve a marcação nova (ou a mesma se nada a toca) */
function remapRecord(h, pairsBySection) {
  const ps = pairsBySection[h.block_id]; if (!ps) return { rec: h, tocada: false };
  const P = h.prefix || '', E = h.exact_text, S = h.suffix || ''; let T = P + E + S, a = P.length, b = a + E.length, tocada = false;
  for (const { old, new: nw } of ps) {
    /* o contexto guardado tem só 40 caracteres: se o trecho antigo ficou cortado numa ponta de T, completa-o
       virtualmente com o que falta (só conta se ≥ 12 caracteres coincidem), para não perder marcações que caem
       inteiras dentro de um trecho alterado mais longo que o contexto */
    if (T.indexOf(old) === -1) {
      for (let L = old.length - 1; L >= 12; L--) {
        if (T.endsWith(old.slice(0, L))) { T = T + old.slice(L); break; }
        if (T.startsWith(old.slice(old.length - L))) { const add = old.slice(0, old.length - L); T = add + T; a += add.length; b += add.length; break; }
      }
    }
    let from = 0, k;
    while ((k = T.indexOf(old, from)) !== -1) {
      const u = k, v = k + old.length, d = nw.length - old.length;
      if (u < b && v > a) tocada = true;                              // o trecho alterado cruza o texto marcado
      /* posições antes do trecho não mudam; depois, deslocam d; dentro, a marcação cresce até cobrir o trecho novo */
      a = a <= u ? a : (a >= v ? a + d : u);
      b = b <= u ? b : (b >= v ? b + d : u + nw.length);
      T = T.slice(0, u) + nw + T.slice(v); from = u + nw.length;
    }
  }
  if (!tocada) return { rec: h, tocada: false };
  return { rec: { ...h, exact_text: T.slice(a, b), prefix: T.slice(Math.max(0, a - 40), a), suffix: T.slice(b, b + 40) }, tocada: true };
}
module.exports = { buildPairs, remapRecord, pairsOf };

if (require.main === module) (async () => {
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  const inp = arg('in'), out = arg('out'); if (!inp || !out) { console.error('uso: node remap-highlights.cjs --in marcas.json --out marcas.remap.json'); process.exit(2); }
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright'); const { start } = require('./server.cjs');
  const { s, base } = await start(); const b = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const open = async v => { const p = await b.newPage(); await p.goto(base + '/qa.html?v=' + v, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.__ready===true', { timeout: 60000 }); return p; };
  const po = await open('orig'), pn = await open('new'); const pairs = await buildPairs(po, pn);
  const marcas = JSON.parse(fs.readFileSync(inp, 'utf8')); const res = marcas.map(h => remapRecord(h, pairs));
  fs.writeFileSync(out, JSON.stringify(res.map((r, i) => ({ id: marcas[i].id, tocada: r.tocada, ...r.rec })), null, 1));
  console.log(marcas.length, 'marcações;', res.filter(r => r.tocada).length, 'tocadas por edição; saída:', out);
  await b.close(); s.close();
})();
