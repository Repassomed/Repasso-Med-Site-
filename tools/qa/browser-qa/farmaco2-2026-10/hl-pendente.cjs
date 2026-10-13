/* O QUE O ALUNO VÊ QUANDO UM GRIFO NOVO CAI SOBRE UMA FRASE REESCRITA — medido no motor real, sem banco.
   Para cada frase (≥ 25 caracteres) da `main` que deixou de existir literalmente no mesmo elemento da matéria nova (a mesma lista do `hl-ledger.cjs`),
   fabrica-se UM grifo como o motor o gravaria (exact_text + prefixo/sufixo de 40 + ocorrência) e entrega-se a lista inteira ao motor da página nova:
     · `RMTools.aplicarHighlights(aba, lista)` → quantos pintam, quantos ficam pendentes e em QUANTOS BLOCOS;
     · se o motor tem o caminho de revisão da PR #484 (`atualizarBadgePendentes`), mede o aviso persistente («📌 N marcas pendientes · tocá para ver 1/N»),
       o que acontece a cada toque (rola até o bloco e o realça; cíclico) e confirma que NADA é escrito (o objeto da marca não muda);
     · se o motor NÃO tem (a `main` de hoje), diz isso: a marca pendente fica invisível e só há um `console.info`.
   Honestidade: isto NÃO faz a marca «reaparecer»; ela fica guardada no banco, sem pintar, e o aviso leva o aluno ao BLOCO (não à frase).
   Uso (rodar de um checkout cujos assets sejam o motor a medir; p. ex. um worktree da branch da #484 com RM_NEW_HTML/RM_ORIG_HTML apontando para os HTML):
     node hl-pendente.cjs [--out relatorio.json] [--sec f2b01,f2b05]   */
const fs = require('fs');
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { start } = require('./server.cjs');
const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const split = t => t.split(/(?<=[.;:?!])\s+/).filter(x => x.length >= 25 && x.length <= 260);
(async () => {
  const { s, base } = await start();
  const br = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const open = async v => { const p = await br.newPage({ viewport: { width: 1280, height: 900 } }); await p.goto(base + '/qa.html?v=' + v, { waitUntil: 'domcontentloaded' }); await p.waitForFunction('window.__ready===true', { timeout: 120000 }); return p; };
  const po = await open('orig'), pn = await open('new');
  const LIST = `(SUB)=>{const RT=window.RMTools,out={};document.querySelectorAll('section[id]').forEach(sec=>{out[sec.id]=[...sec.querySelectorAll(SUB)].map(e=>({t:RT.indexar(e).norm,opt:!!(e.matches('li')&&e.closest('ul.options'))}));});return out;}`;
  const Lo = await po.evaluate(eval(LIST), SUB), Ln = await pn.evaluate(eval(LIST), SUB);
  const only = arg('sec', '') ? arg('sec').split(',') : null;
  const items = [];
  for (const sid of Object.keys(Lo)) { if (only && !only.includes(sid)) continue; Lo[sid].forEach((e, i) => {
    if (e.opt) return; const nt = Ln[sid][i].t; if (e.t === nt) return;
    for (const f of split(e.t)) if (!nt.includes(f)) items.push({ sec: sid, el: i, sentence: f }); }); }
  const recs = await po.evaluate(({ items, SUB }) => {
    const RT = window.RMTools, secs = {}, out = [];
    const get = id => secs[id] || (secs[id] = (() => { const sec = document.getElementById(id), idx = RT.indexar(sec), pos = new Map(); idx.map.forEach((m, k) => { let mm = pos.get(m.node); if (!mm) { mm = new Map(); pos.set(m.node, mm); } mm.set(m.off, k); }); return { sec, idx, pos, list: [...sec.querySelectorAll(SUB)] }; })());
    items.forEach((it, n) => { const S = get(it.sec), el = S.list[it.el], ie = RT.indexar(el), at = ie.norm.indexOf(it.sentence); if (at < 0) return;
      const m = ie.map[at], mm = S.pos.get(m.node), real = mm && mm.get(m.off); if (real == null || S.idx.norm.substr(real, it.sentence.length) !== it.sentence) return;
      out.push({ id: 'sint-' + n, block_id: it.sec, exact_text: it.sentence, prefix: S.idx.norm.slice(Math.max(0, real - 40), real), suffix: S.idx.norm.slice(real + it.sentence.length, real + it.sentence.length + 40), occurrence: RT.ocorrencias(S.idx.norm, it.sentence).indexOf(real), color: 'yellow' }); });
    return out;
  }, { items, SUB });
  const rep = await pn.evaluate(async (recs) => {
    const RT = window.RMTools, tab = document.querySelector('[id^="tab-"]');
    const tem = typeof RT.aplicarHighlights === 'function', temBadge = typeof RT.atualizarBadgePendentes === 'function';
    if (!tem) {   // motor sem aplicarHighlights exposto: resolve uma a uma
      let ok = 0; const bl = new Set();
      recs.forEach(h => { const b = document.getElementById(h.block_id); const a = b && RT.resolverAncora(b, h); if (a) ok++; else bl.add(h.block_id); });
      return { motor: 'sem aplicarHighlights/atualizarBadgePendentes', total: recs.length, pintam: ok, pendentes: recs.length - ok, blocosPendentes: [...bl], badge: null };
    }
    const antes = JSON.stringify(recs);
    const r = RT.aplicarHighlights(tab, recs);
    const out = { motor: temBadge ? 'com caminho de revisão (#484)' : 'aplicarHighlights sem badge', total: recs.length, pintam: r.ok, pendentes: r.perdidas, blocosPendentes: r.blocosPerdidos || [], porNivel: r.porNivel, badge: null, registrosAlterados: JSON.stringify(recs) !== antes };
    if (temBadge) {
      RT.atualizarBadgePendentes(tab, r);
      const b = document.querySelector('.rm-pendentes-badge');
      if (b) {
        const vis = () => getComputedStyle(b).display !== 'none';
        out.badge = { visivel: vis(), texto: b.textContent, toques: [] };
        const n = (r.blocosPerdidos || []).length;
        for (let k = 0; k < Math.min(n + 1, 4); k++) {
          b.click(); await new Promise(rs => setTimeout(rs, 120));
          const fl = document.querySelectorAll('.rm-flash-revisao');
          out.badge.toques.push({ realcados: fl.length, bloco: fl[0] && fl[0].id, textoDepois: b.textContent });
        }
        out.badge.persistenteApos3s = await new Promise(rs => setTimeout(() => rs(vis()), 3000));
      }
    }
    return out;
  }, recs);
  const porSec = {}; recs.forEach(h => { porSec[h.block_id] = (porSec[h.block_id] || 0) + 1; });
  const res = { frases_em_risco: items.length, marcas_fabricadas: recs.length, por_secao: porSec, ...rep };
  console.log(JSON.stringify(res, null, 1));
  const out = arg('out'); if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(2); });
