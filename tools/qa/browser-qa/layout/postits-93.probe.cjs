/* SONDA de post-its/notas encobertos (issue #93) — mede, não deduz.
   Abre cada matéria REAL (styles.css + app-core.js + index <style> reais; fragmento de netlify/functions/materias-privadas) em 390/768/1024/1440 e, para CADA post-it/nota visível:
     · rola até 3 posições (centro · logo abaixo do cabeçalho fixo · rente ao rodapé);
     · amostra 9 pontos dentro da parte visível (fora do cabeçalho fixo) e usa elementFromPoint: o ponto está «encoberto» se o elemento do topo NÃO é o próprio post-it/descendente;
     · registra QUEM cobre (tag.classe, position, z-index, pai com contexto de empilhamento) e se a caixa sai da janela (clipping lateral);
   Para o glossário (#rm-gl-note, abre ao tocar num termo .rmc-gl/.em-gl/…): clica em até N termos por matéria, em 3 posições de rolagem, e confere visibilidade, recorte e cobertura.
   Também registra overflow horizontal da página.
   Uso:  RM_PLAYWRIGHT=... node postits-93.probe.cjs [--slugs=a,b] [--w=390,768,1024,1440] [--json=saida.json] [--gl=3] [--nota=N (amostra por matéria; padrão 8)] [--soPende=1] [--ndjson=arquivo (grava cada resultado ao terminar)] [--capturas=pasta (grava A/B dos casos cobertos)] [--antes=1 (neutraliza a regra da #93 = comportamento da main)] [--layout=0|1 (Layout V2 com lateral/índice)] [--visual=0|1 (tema do piloto)]
   Só leitura: 0 escrita, 0 rede externa. Emulação do Chromium. */
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./serve.cjs');
const MAT = path.join(ROOT, 'netlify/functions/materias-privadas');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };

/* slug → id da aba (do próprio fragmento) */
function catalogo(only) {
  const out = [];
  fs.readdirSync(MAT).filter(f => f.endsWith('.html')).forEach(f => {
    const slug = f.replace(/\.html$/, ''); if (only && !only.includes(slug)) return;
    const m = /<div[^>]*class="[^"]*tab-content[^"]*"[^>]*id="tab-([\w-]+)"|<div[^>]*id="tab-([\w-]+)"[^>]*class="[^"]*tab-content/.exec(fs.readFileSync(path.join(MAT, f), 'utf8'));
    if (m) out.push({ slug, tab: m[1] || m[2] });
  });
  return out;
}

/* roda DENTRO da página: devolve a lista de post-its candidatos (índices estáveis) */
const NOTAS = () => {
  const SEL = '.rmc-margin,[class*="postit"],[class*="post-it"]';
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 40 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const all = [...document.querySelectorAll('#materias-container ' + SEL)].filter(e => !e.closest('[data-rm-ui]') && !e.parentElement.closest(SEL) && vis(e));
  window.__notas = all; return all.map(e => ({ cls: e.className.toString().slice(0, 60), tag: e.tagName }));
};

/* amostra a cobertura de um elemento (cobre) numa posição de rolagem */
/* rola até a posição pedida (chamado 2× com espera no meio: content-visibility/imagens mudam a altura ao entrar na janela) */
const ROLAR = ([idx, pos]) => {
  const HDR = () => Math.max(0, ...['.rm-topbar', '#main-tabs'].map(s => { const h = document.querySelector(s); if (!h) return 0; const cs = getComputedStyle(h); return (cs.position === 'sticky' || cs.position === 'fixed') ? h.getBoundingClientRect().bottom : 0; }));
  const el = window.__notas[idx]; if (!el) return; const vh = window.innerHeight, hdr = HDR();
  const r0 = el.getBoundingClientRect(), top0 = r0.top + scrollY, h = r0.height;
  scrollTo(0, Math.max(0, pos === 'centro' ? top0 - (vh - h) / 2 : pos === 'topo' ? top0 - hdr - 10 : top0 + h - vh + 12));
};
const AMOSTRA = ([idx, pos, kind]) => {
  const HDR = () => Math.max(0, ...['.rm-topbar', '#main-tabs'].map(s => { const h = document.querySelector(s); if (!h) return 0; const cs = getComputedStyle(h); return (cs.position === 'sticky' || cs.position === 'fixed') ? h.getBoundingClientRect().bottom : 0; }));
  const el = kind === 'gl' ? document.getElementById('rm-gl-note') : window.__notas[idx]; if (!el) return null;
  const vw = document.documentElement.clientWidth, vh = window.innerHeight, hdr = HDR();
  const r = el.getBoundingClientRect();
  const x0 = Math.max(0, r.left), x1 = Math.min(vw, r.right), y0 = Math.max(hdr, r.top), y1 = Math.min(vh, r.bottom);
  const out = { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw, vh, hdr: Math.round(hdr), recorteX: r.left < -1 || r.right > vw + 1, visivelPct: Math.round(100 * Math.max(0, (x1 - x0)) * Math.max(0, (y1 - y0)) / (r.width * r.height)), pts: 0, cobertos: 0, quem: {} };
  /* UI fixa/grudada (lateral, índice, faixa, toolbox, player, «Salir»…) cuja caixa se sobrepõe ao post-it VISÍVEL: cobertura PERSISTENTE (não some rolando) quando a posição é «centro» */
  out.fijos = [];
  if (!window.__fixos) window.__fixos = [...document.querySelectorAll('body *')].filter(e => { const p = getComputedStyle(e).position; return p === 'fixed' || p === 'sticky'; });
  for (const f of window.__fixos) {
    if (f === el || f.contains(el) || el.contains(f)) continue; const cs = getComputedStyle(f); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const fr = f.getBoundingClientRect(); if (fr.width < 20 || fr.height < 20) continue;
    const ix = Math.min(fr.right, x1) - Math.max(fr.left, x0), iy = Math.min(fr.bottom, y1) - Math.max(fr.top, y0);
    if (ix > 6 && iy > 6) out.fijos.push((f.id ? '#' + f.id : '') + '.' + (f.className && f.className.toString ? f.className.toString().trim().split(/\s+/).slice(0, 2).join('.') : '') + ' ' + Math.round(ix) + '×' + Math.round(iy));
  }
  if (x1 - x0 < 30 || y1 - y0 < 16) return out;                                       // quase nada na janela: não amostra
  const desc = e => { if (!e) return 'null'; const cs = getComputedStyle(e); return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && e.className.toString ? '.' + e.className.toString().trim().split(/\s+/).slice(0, 2).join('.') : '') + ' [' + cs.position + ' z=' + cs.zIndex + ']'; };
  for (const fx of [.2, .5, .8]) for (const fy of [.2, .5, .8]) {
    const px = x0 + (x1 - x0) * fx, py = y0 + (y1 - y0) * fy; const t = document.elementFromPoint(px, py); out.pts++;
    if (!t || t === el || el.contains(t)) continue;
    out.cobertos++; const k = desc(t); out.quem[k] = (out.quem[k] || 0) + 1;
  }
  return out;
};


/* COBERTURA POR PIXEL (o hit-test acusa a CAIXA de um irmão que só tem texto contornando o float; o aluno só vê o que PINTA).
   A = captura da região visível do post-it como está; B = a mesma região com TUDO o mais `visibility:hidden` (só o post-it e seus filhos visíveis, mesma rolagem/transform).
   Se algo de fora pinta por cima do post-it, A ≠ B nessa região. Devolve a fração de pixels diferentes (interior, margem de 6 px p/ sombra/borda) e grava as capturas se `dir` for passado. */
async function pixel(page, kind, idx, dir, nome) {
  const box = await page.evaluate(([kind, idx]) => {
    const el = kind === 'gl' ? document.getElementById('rm-gl-note') : window.__notas[idx]; if (!el) return null;
    const vw = document.documentElement.clientWidth, vh = innerHeight, h = Math.max(0, ...['.rm-topbar', '#main-tabs'].map(s => { const e = document.querySelector(s); if (!e) return 0; const c = getComputedStyle(e); return (c.position === 'sticky' || c.position === 'fixed') ? e.getBoundingClientRect().bottom : 0; }));
    const r = el.getBoundingClientRect(), x0 = Math.max(0, r.left) + 6, x1 = Math.min(vw, r.right) - 6, y0 = Math.max(h, r.top) + 6, y1 = Math.min(vh, r.bottom) - 6;
    if (x1 - x0 < 24 || y1 - y0 < 16) return null; el.classList.add('__iso'); return { x: Math.floor(x0), y: Math.floor(y0), width: Math.floor(x1 - x0), height: Math.floor(y1 - y0) };
  }, [kind, idx]);
  if (!box) return null;
  /* UI fixa/grudada (cabeçalho, abas, «Salir», índice, ferramentas) é medida à parte: some em A e B, para que a métrica seja só «o CONTEÚDO da página cobre o post-it?» */
  await page.addStyleTag({ content: '[data-__fx]{visibility:hidden!important}html.__isoon *{visibility:hidden!important}html.__isoon .__iso,html.__isoon .__iso *{visibility:visible!important}' });
  await page.evaluate(() => { const n = document.querySelector('.__iso'); document.querySelectorAll('body *').forEach(e => { const p = getComputedStyle(e).position; if ((p === 'fixed' || p === 'sticky') && !e.contains(n) && !n.contains(e)) e.setAttribute('data-__fx', '1'); });
    /* um post-it lateral (float) que pinta sobre a área VAZIA de um bloco largo é o desenho original (o texto do bloco contorna): não conta como «cobertura» do bloco */
    document.querySelectorAll('#materias-container .rmc-margin').forEach(e => { if (!e.contains(n) && !n.contains(e)) e.setAttribute('data-__fx', '1'); }); });
  const A = await page.screenshot({ clip: box, animations: 'disabled', timeout: 120000 });
  await page.evaluate(() => document.documentElement.classList.add('__isoon'));
  const B = await page.screenshot({ clip: box, animations: 'disabled', timeout: 120000 });
  await page.evaluate(() => { document.documentElement.classList.remove('__isoon'); document.querySelectorAll('.__iso').forEach(e => e.classList.remove('__iso')); document.querySelectorAll('[data-__fx]').forEach(e => e.removeAttribute('data-__fx')); });
  const frac = await page.evaluate(async ([a, b]) => {
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const [ia, ib] = await Promise.all([load('data:image/png;base64,' + a), load('data:image/png;base64,' + b)]);
    /* compara em blocos de 8×8 px (média de cor): a serrilha/antialiasing do texto some, um fundo/bloco de outra cor por cima não */
    const W = Math.max(1, Math.round(ia.width / 8)), H = Math.max(1, Math.round(ia.height / 8)), px = im => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.imageSmoothingEnabled = true; cx.drawImage(im, 0, 0, W, H); return cx.getImageData(0, 0, W, H).data; };
    const da = px(ia), db = px(ib); let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) n++;
    return n / (da.length / 4);
  }, [A.toString('base64'), B.toString('base64')]);
  if (dir && frac > 0.005) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, nome + '_como-esta.png'), A); fs.writeFileSync(path.join(dir, nome + '_so-o-postit.png'), B); }
  return Math.round(frac * 10000) / 100;                                                       // % de pixels cobertos
}

async function abrirMateria(br, base, slug, tab, w, h, flags = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await page.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug, layout: !!flags.layout, visual: !!flags.visual, audio: false }) }));
  await page.route('https://**', r => r.abort());
  await page.goto(`${base}/p.html?slug=${slug}&tab=${tab}&uid=${flags.uid || 'u-probe'}&wait=1500${flags.seedmany ? '&seedmany=' + flags.seedmany : ''}`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.waitForTimeout(600);
  if (flags.antes) await page.addStyleTag({ content: '#materias-container .rm-cuaderno .container>:has(>.rmc-margin){z-index:1!important}' });      // ANTES = a main (o filho com post-it segue isolado em z:1)
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  /* «aquece» a página: percorre tudo uma vez, como quem lê, para que as seções com content-visibility:auto guardem o tamanho real (contain-intrinsic-size: auto). Sem isso a 1.ª medição de um post-it
     numa seção que ainda não foi renderizada vê a geometria estimada (e o elemento «cobre» ou «é coberto» por um artefato de layout, não por um defeito que o aluno veja). */
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += Math.round(h * .8)) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(25); }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  return { ctx, page, errs };
}

async function sondar(br, base, c, w, o) {
  const h = w < 600 ? 844 : w < 1000 ? 1024 : 900;
  const { ctx, page, errs } = await abrirMateria(br, base, c.slug, c.tab, w, h, o.flags);
  const res = { slug: c.slug, w, h, notas: [], gl: [], overflowX: null, erros: errs };
  try {
    const lista = await page.evaluate(NOTAS);
    res.nNotas = lista.length;
    /* amostra representativa: até 8 notas por matéria, espalhadas ao longo da página */
    const passo = Math.max(1, Math.floor(lista.length / (+o.nota || 8)));
    /* + todas as notas cuja caixa passa do fim do PAI (float que «pende» abaixo do contêiner): são as candidatas naturais a ficar sob o irmão seguinte */
    const pende = await page.evaluate(() => window.__notas.map((e, i) => { const a = e.getBoundingClientRect(), b = e.parentElement.getBoundingClientRect(); return a.bottom > b.bottom + 1 ? i : -1; }).filter(i => i >= 0));
    const idxs = [...new Set([...(o.soPende ? [] : Array.from({ length: Math.ceil(lista.length / passo) }, (_, k) => k * passo)), ...pende.slice(0, +o.maxPende || 24)])].sort((a, b) => a - b);
    res.pende = pende.length;
    for (const i of idxs) {
      const dados = { i, cls: lista[i].cls, pende: pende.includes(i), pos: {} };
      for (const pos of ['centro', 'topo', 'rodape']) {
        /* content-visibility:auto + imagens mudam a altura das seções ao entrarem na janela: rola, espera e só amostra quando a caixa ficou ESTÁVEL em duas leituras seguidas */
        let a = null, b = null;
        for (let k = 0; k < 5; k++) { await page.evaluate(ROLAR, [i, pos]); await page.waitForTimeout(200); a = await page.evaluate(AMOSTRA, [i, pos, 'nota']); await page.waitForTimeout(150); b = await page.evaluate(AMOSTRA, [i, pos, 'nota']); if (a && b && a.rect[1] === b.rect[1] && a.rect[3] === b.rect[3] && a.cobertos === b.cobertos) break; }
        if (b) b.pixelPct = await pixel(page, 'nota', i, o.dir, `${c.slug}_${w}_n${i}_${pos}`);
        dados.pos[pos] = b;
      }
      const cs = await page.evaluate(i => { const e = window.__notas[i], c = getComputedStyle(e); return { float: c.float, position: c.position, z: c.zIndex, width: Math.round(e.getBoundingClientRect().width) }; }, i);
      dados.css = cs; res.notas.push(dados);
    }
    /* glossário */
    const nGl = +o.gl;
    const termos = await page.evaluate(() => { const GL = '[class~="rmc-gl"],[class~="em-gl"],[class~="f2-gl"],[class~="s2-gl"],[class~="sm-gl"],[class~="hi-gl"]'; window.__gls = [...document.querySelectorAll('#materias-container ' + GL)]; return window.__gls.length; });
    res.nTermos = termos;
    const pasoG = Math.max(1, Math.floor(termos / Math.max(1, nGl)));
    for (let t = 0, n = 0; t < termos && n < nGl; t += pasoG, n++) {
      for (const pos of ['centro', 'topo', 'rodape']) {
        const rolaGl = ([t, pos]) => { const e = window.__gls[t]; const r0 = e.getBoundingClientRect(), top0 = r0.top + scrollY, vh = innerHeight; const hdr = (document.querySelector('#main-tabs') || { getBoundingClientRect() { return { bottom: 0 }; } }).getBoundingClientRect().bottom; scrollTo(0, Math.max(0, pos === 'centro' ? top0 - vh / 2 : pos === 'topo' ? top0 - hdr - 20 : top0 - vh + 40)); };
        await page.evaluate(rolaGl, [t, pos]); await page.waitForTimeout(150); await page.evaluate(rolaGl, [t, pos]); await page.waitForTimeout(150);
        const alvo = await page.evaluate(t => { const e = window.__gls[t], r = e.getClientRects()[0] || e.getBoundingClientRect(), x = r.left + Math.min(r.width / 2, 12), y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, ok: r.bottom > 0 && r.top < innerHeight, termoCoberto: !(top === e || e.contains(top)) }; }, t);
        if (!alvo.ok) continue;
        await page.mouse.click(alvo.x, alvo.y); await page.waitForTimeout(250);
        const a = await page.evaluate(AMOSTRA, [0, pos, 'gl']); if (a) a.pixelPct = await pixel(page, 'gl', 0, o.dir, `${c.slug}_${w}_gl${t}_${pos}`);
        const st = await page.evaluate(() => { const n = document.getElementById('rm-gl-note'); return n ? { on: n.classList.contains('on'), popover: n.hasAttribute('popover'), open: (() => { try { return n.matches(':popover-open'); } catch (e) { return null; } })(), disp: getComputedStyle(n).display } : null; });
        res.gl.push({ t, pos, st, a, termoCoberto: alvo.termoCoberto });
        await page.keyboard.press('Escape'); await page.waitForTimeout(60);
      }
    }
    res.overflowX = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  } finally { await ctx.close(); }
  return res;
}

module.exports = { catalogo, sondar, abrirMateria, NOTAS, AMOSTRA, ROLAR, pixel };

if (require.main === module) (async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const only = arg('slugs', '') ? arg('slugs', '').split(',') : null, ws = arg('w', '390,768,1024,1440').split(',').map(Number), o = { gl: arg('gl', '3'), dir: arg('capturas', ''), soPende: arg('soPende', '0') === '1', nota: arg('nota', '8'), maxPende: arg('maxPende', '24'), flags: { layout: arg('layout', '0') === '1', visual: arg('visual', '0') === '1', antes: arg('antes', '0') === '1' } };
  const cat = catalogo(only); const srv = await serve(); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch(); const out = [];
  for (const c of cat) for (const w of ws) {
    let r; try { r = await sondar(br, base, c, w, o); } catch (e) { r = { slug: c.slug, w, erro: String(e).slice(0, 200) }; }
    out.push(r); if (arg('ndjson', '')) fs.appendFileSync(arg('ndjson', ''), JSON.stringify(r) + '\n');
    if (r.erro) { console.log(`${c.slug.padEnd(30)} ${w}: ERRO ${r.erro}`); continue; }
    const fijosC = r.notas.filter(n => n.pos.centro && n.pos.centro.fijos && n.pos.centro.fijos.length).length, todas = r.notas.flatMap(n => Object.values(n.pos)).filter(Boolean), pior = todas.filter(p => p.pixelPct > 0.5).length, tot = todas.length;
    const clip = r.notas.flatMap(n => Object.values(n.pos)).filter(p => p && p.recorteX).length;
    const glBad = r.gl.filter(g => !g.a || g.a.pixelPct > 0.5 || g.a.recorteX || g.a.visivelPct < 99 || !g.st || !g.st.on).length;
    console.log(`${c.slug.padEnd(30)} ${String(w).padStart(4)}: notas ${r.nNotas} (amostra ${r.notas.length}, pendem ${r.pende}) posições com post-it coberto por pixel ${pior}/${tot} · recortes ${clip} · UI fixa sobre o post-it (centro) ${fijosC} · glossário ${r.gl.length} abertos, ${glBad} com problema · overflowX ${r.overflowX && r.overflowX.sw > r.overflowX.cw + 1 ? 'SIM ' + r.overflowX.sw + '>' + r.overflowX.cw : 'não'} · erros ${r.erros.length}`);
  }
  if (arg('json', '')) fs.writeFileSync(arg('json', ''), JSON.stringify(out, null, 1));
  await br.close(); srv.close();
})();
