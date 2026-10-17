/* Remapeamento de marcações (grifos) depois de uma revisão de texto — PR #481.
   ATENÇÃO: foi testado SÓ com marcações sintéticas. Não há prova de que reproduza o que cada aluno marcou; use a saída apenas para conferência humana
   antes de qualquer escrita (que esta ferramenta não faz).
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
   Correção (rodada 3): cada marcação é localizada na matéria antiga (locateAll) e só recebe os pares do SEU elemento; os pares casam simultaneamente no texto original.
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
  const A = await pOld.evaluate(eval(TEXTS), SUB), B = await pNew.evaluate(eval(TEXTS), SUB), by = {}, porEl = {};
  for (const sid of Object.keys(A)) {
    if (!B[sid] || A[sid].length !== B[sid].length) throw new Error('sequência diferente em ' + sid + ': o remapeamento por índice não se aplica');
    A[sid].forEach((t, i) => { if (t !== B[sid][i]) { const ps = pairsOf(t, B[sid][i]); (by[sid] = by[sid] || []).push(...ps); (porEl[sid] = porEl[sid] || {})[i] = ps.slice().sort((x, y) => y.old.length - x.old.length); } });
  }
  for (const sid in by) by[sid].sort((x, y) => y.old.length - x.old.length);   // o trecho mais específico primeiro
  Object.defineProperty(by, '__el', { value: porEl });                          // pares POR ELEMENTO (índice SUB_SEL), usados quando se sabe onde a marcação estava
  return by;
}
/* aplica os pares da seção a prefixo+texto+sufixo e devolve a marcação nova (ou a mesma se nada a toca).
   Os pares são procurados SIMULTANEAMENTE no texto ORIGINAL (do mais longo ao mais curto, sem sobreposição) — nunca no texto já alterado —,
   senão um par posterior casaria dentro do trecho que um par anterior acabou de inserir (foi o defeito achado pelo teste: «Las otras: Las otras:…»).
   `secNorm` (opcional) = texto normalizado da seção NOVA (RMTools.indexar(sec).norm): com ele a ocorrência (`occurrence`) é recalculada,
   escolhendo a ocorrência cujo contexto (prefixo/sufixo) mais coincide — sem isso, uma frase que se repete na seção pode ser resolvida no elemento errado. */
function melhorOcorrencia(secNorm, ex, pre, suf, prevOcc) {
  const occ = []; for (let k = secNorm.indexOf(ex); k !== -1; k = secNorm.indexOf(ex, k + 1)) occ.push(k);
  if (occ.length <= 1) return occ.length ? 0 : prevOcc;
  const comum = (a, b) => { let n = 0; while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++; return n; };
  const comumIni = (a, b) => { let n = 0; while (n < a.length && n < b.length && a[n] === b[n]) n++; return n; };
  let best = 0, bs = -1; occ.forEach((k, idx) => { const sc = comum(secNorm.slice(Math.max(0, k - pre.length), k), pre) + comumIni(secNorm.slice(k + ex.length, k + ex.length + suf.length), suf); if (sc > bs) { bs = sc; best = idx; } });
  return best;
}
function remapRecord(h, pairsBySection, secNorms, elIdx) {
  /* `elIdx` (índice SUB_SEL do elemento onde a marcação ESTAVA na matéria antiga, de locateAll) restringe os pares aos daquele elemento: sem isso,
     um par de inserção com pouco contexto («(a) el» → «Las otras: (a) el») casa em qualquer parágrafo da seção e corrompe marcações de texto intacto. */
  let ps = pairsBySection[h.block_id]; if (!ps) return { rec: h, tocada: false };
  if (elIdx != null && pairsBySection.__el) ps = (pairsBySection.__el[h.block_id] || {})[elIdx] || [];
  if (!ps.length) return { rec: h, tocada: false };
  const P = h.prefix || '', E = h.exact_text, S = h.suffix || ''; let T = P + E + S, a = P.length, b = a + E.length;
  /* o contexto guardado tem só 40 caracteres: se o trecho antigo ficou cortado numa ponta de T, completa-o virtualmente com o que falta (≥ 12 caracteres) */
  for (const { old } of ps) {
    if (T.indexOf(old) !== -1) continue;
    for (let L = old.length - 1; L >= 12; L--) {
      if (T.endsWith(old.slice(0, L))) { T = T + old.slice(L); break; }
      if (T.startsWith(old.slice(old.length - L))) { const add = old.slice(0, old.length - L); T = add + T; a += add.length; b += add.length; break; }
    }
  }
  const taken = []; const hits = [];
  for (const { old, new: nw } of ps) {                                  // ps vem ordenado: o trecho mais longo primeiro
    for (let k = T.indexOf(old); k !== -1; k = T.indexOf(old, k + old.length)) {
      const u = k, v = k + old.length; if (taken.some(([x, y]) => u < y && v > x)) continue;
      taken.push([u, v]); hits.push({ u, v, nw });
    }
  }
  const tocada = hits.some(({ u, v }) => u < b && v > a);
  if (!tocada) return { rec: h, tocada: false };
  hits.sort((x, y) => x.u - y.u); let out = '', pos = 0, na = null, nb = null;
  const map = (x, inclusive) => { let d = 0; for (const { u, v, nw } of hits) { if (x >= v) d += nw.length - (v - u); else if (x > u && x < v) return inclusive ? u + d + nw.length : u + d; } return x + d; };
  na = map(a, false); nb = map(b, true);
  for (const { u, v, nw } of hits) { out += T.slice(pos, u) + nw; pos = v; } out += T.slice(pos); T = out;
  const rec = { ...h, exact_text: T.slice(na, nb), prefix: T.slice(Math.max(0, na - 40), na), suffix: T.slice(nb, nb + 40) };
  if (secNorms && secNorms[h.block_id] != null) rec.occurrence = melhorOcorrencia(secNorms[h.block_id], rec.exact_text, rec.prefix, rec.suffix, h.occurrence);
  return { rec, tocada: true };
}
/* onde (em que elemento da matéria ANTIGA) cada marcação estava — pelo mesmo resolvedor do motor; null = não localizada (marca antiga demais ou texto já alterado) */
const LOCATE = `({recs,SUB})=>{const RT=window.RMTools;const lists={};return recs.map(h=>{const bloco=document.getElementById(h.block_id);if(!bloco)return null;lists[h.block_id]=lists[h.block_id]||[...bloco.querySelectorAll(SUB)];const a=RT.resolverAncora(bloco,h);if(!a)return null;const r=RT.rangeDe(a.idx,a.ini,a.fim);if(!r)return null;const i=lists[h.block_id].indexOf(r.startContainer.parentElement.closest(SUB));return i<0?null:i;});}`;
async function locateAll(pOld, recs) { const out = []; for (let k = 0; k < recs.length; k += 300) out.push(...await pOld.evaluate(eval(LOCATE), { recs: recs.slice(k, k + 300), SUB })); return out; }
const NORMS = `()=>{const RT=window.RMTools,out={};document.querySelectorAll('section[id]').forEach(sec=>{out[sec.id]=RT.indexar(sec).norm;});return out;}`;
async function secNorms(pNew) { return pNew.evaluate(eval(NORMS)); }
module.exports = { buildPairs, remapRecord, pairsOf, secNorms, locateAll };

if (require.main === module) (async () => {
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  const inp = arg('in'), out = arg('out'); if (!inp || !out) { console.error('uso: node remap-highlights.cjs --in marcas.json --out marcas.remap.json'); process.exit(2); }
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright'); const { start } = require('./server.cjs');
  const { s, base } = await start(); const b = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const open = async v => { const p = await b.newPage(); await p.goto(base + '/qa.html?v=' + v, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.__ready===true', { timeout: 60000 }); return p; };
  const po = await open('orig'), pn = await open('new'); const pairs = await buildPairs(po, pn); const norms = await secNorms(pn);
  const marcas = JSON.parse(fs.readFileSync(inp, 'utf8')); const loc = await locateAll(po, marcas); const res = marcas.map((h, i) => remapRecord(h, pairs, norms, loc[i]));
  fs.writeFileSync(out, JSON.stringify(res.map((r, i) => ({ id: marcas[i].id, tocada: r.tocada, ...r.rec })), null, 1));
  console.log(marcas.length, 'marcações;', res.filter(r => r.tocada).length, 'tocadas por edição;', loc.filter(x => x == null).length, 'NÃO localizadas na matéria antiga (ficam como estão); saída:', out);
  await b.close(); s.close();
})();
