/* TINTA EM POSIÇÃO REAL (PR #474, rodada 4).
   O que este teste faz que o `ink.test.cjs` não faz:
     1. usa a CANETA DE VERDADE (`rm-tools-v2.js`, não uma transcrição da matemática): `RMToolsV2.escolherFerramenta('pen')` +
        eventos reais do Chromium (CDP `Input.dispatchMouseEvent` com `pointerType:'pen'` → pointerdown/move/up, hit-test, captura);
     2. desenha na matéria da BASE (`origin/main`) traços de verdade, em posições de verdade (sublinhando a 1.ª linha do enunciado ou de uma
        alternativa de questões espalhadas pelo Banco Geral e pelos blocos), e captura o INSERT que o motor faria (anchor_id + pontos normalizados);
     3. reabre a matéria NOVA (e a intermediária) servindo esses traços como «vindos do banco» — o motor real os repinta pela via normal
        (`carregarTracos` → `sincronizarAba` → `elDeAnchor`/`caixa`/`posicionar`, com `ResizeObserver`) — e mede onde a tinta cai em relação
        ao MESMO conteúdo (mesma questão, mesma linha), depois de ROLAR até ele (a página usa `content-visibility:auto`: sem rolar, a altura é estimada).
   Sem login, sem rede, sem Supabase: o «servidor» é um stub em memória (`real-ink.html`); 0 escritas reais.
   Variáveis: W (larguras), NBANCO / NBLOCOS (alvos), RM_MID_REF (commit intermediário, p. ex. a1900931), RM_OUT, RM_CHROMIUM, SEED. */
const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
const { start } = require('./server.cjs');
const fs = require('fs'), path = require('path');
const W = (process.env.W || '390,768,1024,1440').split(',').map(Number);
const NBANCO = +(process.env.NBANCO || 60), NBLOCOS = +(process.env.NBLOCOS || 40);
const VERS = (process.env.VERS || 'orig,mid,new').split(',');
const OUT = process.env.RM_OUT || require('os').tmpdir();
const H = 900;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* ---- dentro da página ---- */
const LISTAR = () => {
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const out = [];
  document.querySelectorAll('section[id]').forEach(sec => {
    sec.querySelectorAll('.quiz-item').forEach((it, k) => {
      const q = it.querySelector('.quiz-question'); if (!q) return;
      const tag = q.querySelector('.quiz-tag'); const stem = norm(q.textContent.slice(tag ? tag.textContent.length : 0));
      out.push({ sec: sec.id, k, key: sec.id + '|' + stem.slice(0, 110), nopt: it.querySelectorAll('ul.options li').length });
    });
  });
  return out;
};
const ACHAR = ({ key, kind }) => {   // devolve o elemento-alvo + a 1.ª linha (rect de viewport) já com o alvo centrado
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const [sid, stem] = [key.split('|')[0], key.split('|').slice(1).join('|')];
  const sec = document.getElementById(sid); if (!sec) return null;
  const it = [...sec.querySelectorAll('.quiz-item')].find(i => { const q = i.querySelector('.quiz-question'); if (!q) return false; const tag = q.querySelector('.quiz-tag'); return norm(q.textContent.slice(tag ? tag.textContent.length : 0)).slice(0, 110) === stem; });
  if (!it) return null;
  const el = kind === 'stem' ? it.querySelector('.quiz-question') : it.querySelector('ul.options li');
  if (!el) return null;
  window.__it = it; window.__el = el;
  return true;
};
const CENTRAR = () => {
  const it = window.__it; const r = it.getBoundingClientRect();
  window.scrollTo(0, Math.max(0, window.pageYOffset + r.top - 180));
};
const LINHA = () => {   // 1.ª linha de texto do elemento-alvo, em coordenadas de VIEWPORT e de PÁGINA
  const el = window.__el, rg = document.createRange(); rg.selectNodeContents(el);
  const rs = [...rg.getClientRects()].filter(x => x.width > 30 && x.height > 6 && x.height < 60).sort((a, b) => a.top - b.top || a.left - b.left);
  const r = rs[0]; if (!r) return null;
  const eb = el.getBoundingClientRect(), ib = window.__it.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, elTop: eb.top, elH: eb.height, itTop: ib.top, itH: ib.height, sy: window.pageYOffset };
};
const MEDIR = ({ key, kind, offY, ancho }) => {   // posição do traço (svg de `anchor`) × alvo, tudo em coordenadas de PÁGINA
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const sid = key.split('|')[0], stem = key.split('|').slice(1).join('|');
  const sec = document.getElementById(sid); if (!sec) return { sem: 'sem-secao' };
  const itens = [...sec.querySelectorAll('.quiz-item')];
  const idx = itens.findIndex(i => { const q = i.querySelector('.quiz-question'); if (!q) return false; const tag = q.querySelector('.quiz-tag'); return norm(q.textContent.slice(tag ? tag.textContent.length : 0)).slice(0, 110) === stem; });
  if (idx < 0) return { sem: 'sem-destino' };
  const it = itens[idx], el = kind === 'stem' ? it.querySelector('.quiz-question') : it.querySelector('ul.options li');
  window.__it = it; window.__el = el;
  const eb = el.getBoundingClientRect(), ib = it.getBoundingClientRect(), sy = window.pageYOffset;
  const sv = document.querySelector('#rm2-ink svg[data-anchor="' + CSS.escape(window.__anchorAtual) + '"]');
  if (!sv) return { sem: 'sem-svg', elTop: eb.top + sy };
  const p = sv.querySelector('path[data-ink="' + CSS.escape(window.__idAtual) + '"]'); if (!p) return { sem: 'sem-path' };
  const pb = p.getBoundingClientRect();
  const cy = pb.top + pb.height / 2 + sy, cx = pb.left + pb.width / 2;
  const alvoY = eb.top + sy + offY;                    // onde estaria a tinta se acompanhasse o conteúdo (mesmo deslocamento dentro do elemento)
  // em que .quiz-item (de qualquer seção) cai o centro da tinta?
  let dentro = null;
  const todos = [...document.querySelectorAll('.quiz-item')];
  for (const t of todos) { const b = t.getBoundingClientRect(); if (cy >= b.top + sy && cy <= b.bottom + sy) { dentro = t === it ? 'mesmo' : 'outro'; if (t !== it) { const q = t.querySelector('.quiz-question'); dentro = 'outro:' + (t.closest('section[id]') || {}).id; } break; } }
  return { cy, cx, alvoY, dy: cy - alvoY, h: pb.height, ancho: pb.width, itTop: ib.top + sy, itBot: ib.bottom + sy, dentro: dentro || 'fora', secH: sec.getBoundingClientRect().height, secTop: sec.getBoundingClientRect().top + sy, svgTop: sv.getBoundingClientRect().top + sy, svgH: sv.getBoundingClientRect().height, sinc: Math.abs(sv.getBoundingClientRect().top + sy - (sec.getBoundingClientRect().top + sy)) < 1.5 && Math.abs(sv.getBoundingClientRect().height - sec.getBoundingClientRect().height) < 1.5 || (it.closest('section[id]') && false) };
};


/* leva o alvo à janela de forma ROBUSTA: as seções usam content-visibility:auto, e uma seção pulada tem altura ESTIMADA e itens sem caixa.
   Rola em direção ao item (proporção do índice dentro da seção) até ele ter caixa real; só então centraliza e confere a estabilidade. */
async function irAte(page, a) {
  for (let t = 0; t < 14; t++) {
    const st = await page.evaluate(ACHAR, a); if (!st) return false;
    const r = await page.evaluate((a) => {
      const it = window.__it, sec = it.closest('section[id]'), itens = [...sec.querySelectorAll('.quiz-item')];
      const b = it.getBoundingClientRect(), ok = it.getClientRects().length > 0 && b.height > 10;
      const sb = sec.getBoundingClientRect();
      return { ok, frac: itens.indexOf(it) / Math.max(1, itens.length), secTop: sb.top + pageYOffset, secH: sb.height };
    }, a);
    if (!r.ok) { await page.evaluate(r => window.scrollTo(0, r.secTop + r.frac * r.secH), r); await sleep(1500); continue; }
    await page.evaluate(CENTRAR); await sleep(500);
    const b2 = await page.evaluate(() => { const b = window.__it.getBoundingClientRect(); return { top: b.top, ok: window.__it.getClientRects().length > 0 && b.height > 10 }; });
    if (b2.ok && b2.top > -100 && b2.top < H) { await page.evaluate(CENTRAR); await sleep(500); return true; }
  }
  return false;
}

async function abrir(br, base, w, v, seed) {
  const page = await br.newPage({ viewport: { width: w, height: H } });
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  if (seed) await page.addInitScript(rows => { window.__SEED = rows; }, seed);
  await page.goto(base + '/real-ink.html?v=' + v, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    /* estado ASSENTADO e comparável entre as duas fases: imagens carregadas (as da matéria são lazy e mudam a altura da seção) e fontes prontas */
    document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.querySelectorAll('img')].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
    await document.fonts.ready;
  });
  await sleep(800);
  return { page, errs };
}
const q = (a, p) => { if (!a.length) return null; a = a.slice().sort((x, y) => x - y); return +a[Math.min(a.length - 1, Math.floor(p * a.length))].toFixed(1); };
const resumo = (rs) => {
  const ok = rs.filter(r => !r.sem), ad = ok.map(r => Math.abs(r.dy));
  const alt = Math.max(1, ...ok.map(r => r.altLinha || 0));
  return {
    n: rs.length, medidos: ok.length, sem: rs.length - ok.length,
    abs_p50: q(ad, .5), abs_p90: q(ad, .9), abs_max: q(ad, 1),
    na_linha: ok.filter(r => Math.abs(r.dy) <= (r.altLinha || 20) / 2).length,                 // centro da tinta a ≤ meia linha do ponto desenhado
    no_mesmo_item: ok.filter(r => r.dentro === 'mesmo').length,
    em_outro_item: ok.filter(r => /^outro/.test(r.dentro)).length,
    fora_de_item: ok.filter(r => r.dentro === 'fora').length,
    mais_de_1_item: ok.filter(r => Math.abs(r.dy) > (r.itH || 200)).length
  };
};

(async () => {
  const { s, base } = await start();
  const br = await chromium.launch({ ...(process.env.RM_CHROMIUM ? { executablePath: process.env.RM_CHROMIUM } : {}) });
  const R = {}; const detalhe = {};
  for (const w of W) {
    console.log('\n=== ' + w + ' px ===');
    // ---- fase 1: desenhar na base ----
    const { page, errs } = await abrir(br, base, w, 'orig');
    const itens = await page.evaluate(LISTAR);
    const rand = rng(+(process.env.SEED || 7) + w);
    const pick = (lista, n) => { const L = lista.slice(); const step = L.length / n; return Array.from({ length: n }, (_, i) => L[Math.min(L.length - 1, Math.floor(i * step + rand() * step))]); };
    const banco = itens.filter(i => i.sec === 'f2b15'), blocos = itens.filter(i => i.sec !== 'f2b15' && i.sec !== 'f2b16');
    const alvos = [];
    pick(banco, NBANCO).forEach((i, n) => alvos.push({ ...i, kind: n % 3 === 2 && i.nopt ? 'opt' : 'stem', regiao: 'banco' }));
    pick(blocos, NBLOCOS).forEach((i, n) => alvos.push({ ...i, kind: n % 3 === 2 && i.nopt ? 'opt' : 'stem', regiao: 'bloco' }));
    /* o pointerup de uma caneta gera `click`; numa alternativa isso chamaria checkAnswer() e REVELARIA a resposta (a seção cresce ~600 px): neutraliza-se, para medir só o efeito da edição da matéria */
    alvos.sort((x, y) => (x.sec === y.sec ? x.k - y.k : (x.sec < y.sec ? -1 : 1)));
    await page.evaluate(() => { window.checkAnswer = function () {}; window.toggleAnswer = function () {}; document.querySelectorAll('ul.options li[onclick]').forEach(li => li.removeAttribute('onclick')); document.querySelectorAll('.reveal-btn[onclick]').forEach(b => b.removeAttribute('onclick')); window.RMToolsV2.escolherFerramenta('pen'); });
    await sleep(300);
    const cdp = await page.context().newCDPSession(page);
    const send = (type, x, y, extra) => cdp.send('Input.dispatchMouseEvent', Object.assign({ type, x, y, pointerType: 'pen' }, extra));
    const tracos = []; let instaveis = 0;
    for (const a of alvos) {
      if (!(await irAte(page, a))) { console.log('  · não consegui levar à janela:', a.key.slice(0, 40)); continue; }
      const ln = await page.evaluate(LINHA); if (!ln || ln.y < 40 || ln.y > H - 60) continue;
      const x0 = ln.x + Math.min(10, ln.w * .1), x1 = ln.x + Math.min(ln.w - 4, 130), y = ln.y + ln.h - 3;
      const pts = []; for (let i = 0; i <= 24; i++) pts.push([x0 + (x1 - x0) * i / 24, y + Math.sin(i / 2.5) * 1.2]);
      const n0 = await page.evaluate(() => window.__rows.length);
      await send('mouseMoved', pts[0][0], pts[0][1], { buttons: 0 });
      await send('mousePressed', pts[0][0], pts[0][1], { button: 'left', buttons: 1, clickCount: 1, force: .5 });
      for (let i = 1; i < pts.length; i++) await send('mouseMoved', pts[i][0], pts[i][1], { button: 'left', buttons: 1, force: .5 });
      await send('mouseReleased', pts[pts.length - 1][0], pts[pts.length - 1][1], { button: 'left', buttons: 0, clickCount: 1 });
      await sleep(250);
      const rows = await page.evaluate(() => window.__rows);
      if (rows.length !== n0 + 1) { console.log('  · sem traço gravado em', a.key.slice(0, 50)); continue; }
      const row = rows[rows.length - 1];
      /* verificação NO ATO: na própria página de desenho o traço tem de estar sobre o ponto desenhado; se o layout andou (imagens, content-visibility), descarta-se o alvo */
      await page.evaluate(a => { window.__anchorAtual = a[0]; window.__idAtual = a[1]; }, [row.anchor_id, String(row.id)]);
      const m0 = await page.evaluate(MEDIR, { key: a.key, kind: a.kind, offY: y - ln.elTop });
      if (m0.sem || Math.abs(m0.dy) > 6) { instaveis++; console.log('  · layout instável no ato (dy ' + (m0.dy && m0.dy.toFixed(1)) + ') em ' + a.key.slice(0, 40)); continue; }
      tracos.push({ secH0: m0.secH,  alvo: a, row: Object.assign({ created_at: '2026-01-01T00:00:00Z' }, row), offY: y - ln.elTop, altLinha: ln.h, itH: ln.itH, anchor: row.anchor_id });
    }
    console.log('  traços desenhados na base:', tracos.length, '/', alvos.length, '(instáveis no ato descartados: ' + instaveis + ')', '· erros JS:', errs.length, '· escritas reais:', 0);
    const tipos = {}; tracos.forEach(t => { const k = t.anchor.includes('>') ? 'elemento' : 'secao'; tipos[k] = (tipos[k] || 0) + 1; });
    console.log('  âncoras:', JSON.stringify(tipos));
    await page.close();
    const seed = tracos.map(t => t.row);
    // ---- fase 2: repintar em cada versão ----
    R[w] = { desenhados: tracos.length, ancoras: tipos };
    for (const v of VERS) {
      const { page: p2, errs: e2 } = await abrir(br, base, w, v, seed);
      await sleep(600);
      const ordem = tracos.map((t, i) => i);   // ordem de leitura (a do desenho): o Banco fica renderizado entre alvos consecutivos
      const rs = [];
      for (const i of ordem) {
        const t = tracos[i];
        await p2.evaluate(a => { window.__anchorAtual = a[0]; window.__idAtual = a[1]; }, [t.anchor, String(t.row.id)]);
        const ok = await irAte(p2, t.alvo); if (!ok) { rs.push({ sem: 'sem-destino', regiao: t.alvo.regiao, kind: t.alvo.kind, anchor: t.anchor }); continue; }
        const t0 = Date.now(); let m = await p2.evaluate(MEDIR, { key: t.alvo.key, kind: t.alvo.kind, offY: t.offY }), estavel = 0;
        /* espera o motor assentar: caixa do svg = caixa da âncora E dy estável em 3 leituras (até 12 s). O tempo gasto é a duração em que o aluno veria a tinta fora do lugar. */
        while (!m.sem && Date.now() - t0 < 12000) { await sleep(200); const m2 = await p2.evaluate(MEDIR, { key: t.alvo.key, kind: t.alvo.kind, offY: t.offY }); estavel = m2.sem ? 0 : (Math.abs(m2.dy - m.dy) < .5 ? estavel + 1 : 0); m = m2; if (estavel >= 2) break; }
        m.espera_ms = Date.now() - t0; m.assentou = estavel >= 2;
        rs.push(Object.assign({ secH0: t.secH0, regiao: t.alvo.regiao, kind: t.alvo.kind, anchor: t.anchor, tipo: t.anchor.includes('>') ? 'elemento' : 'secao', altLinha: t.altLinha, itH: t.itH, sec: t.alvo.sec, k: t.alvo.k }, m));
      }
      const por = (f) => resumo(rs.filter(f));
      R[w][v] = { todos: resumo(rs), banco: por(r => r.regiao === 'banco'), bloco: por(r => r.regiao === 'bloco'), secao: por(r => r.tipo === 'secao'), elemento: por(r => r.tipo === 'elemento'), banco_secao: por(r => r.regiao === 'banco' && r.tipo === 'secao'), erros_js: e2.length };
      detalhe[w + '|' + v] = rs;
      const b = R[w][v];
      console.log(`  [${v}] todos ${JSON.stringify(b.todos)}\n        banco/seção ${JSON.stringify(b.banco_secao)}\n        blocos ${JSON.stringify(b.bloco)}`);
      await p2.close();
      fs.writeFileSync(path.join(OUT, 'real-ink-detalhe.json'), JSON.stringify(detalhe));
    }
  }
  fs.writeFileSync(path.join(OUT, 'real-ink-result.json'), JSON.stringify(R, null, 1));
  fs.writeFileSync(path.join(OUT, 'real-ink-detalhe.json'), JSON.stringify(detalhe));
  await br.close(); s.close();
})().catch(e => { console.error(e); process.exit(1); });
