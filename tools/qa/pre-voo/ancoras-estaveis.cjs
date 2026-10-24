/* PRÉ-VOO · TESTE 1 — AS ÂNCORAS DOS TRAÇOS SOBREVIVEM À TROCA DE LAYOUT?
   Risco medido: o traço da caneta é guardado como `secção>índice`, e o motor (rm-tools-v2.js → elDeAnchor) resolve o índice com
   `section.querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')` SEM excluir a interface do layout novo. Se o Layout V2, o tema ou a navegação
   inserirem (ou moverem) UM só desses elementos dentro de uma `section[id]`, todo traço posterior a ele passa a apontar para o parágrafo vizinho.
   O teste compara, para cada `section[id]`, a lista ordenada desses elementos (tag + 48 primeiros caracteres) entre
     · CONTROLE  = a matéria como o site a serve hoje (sem nada do layout novo);
     · LAYOUT    = Layout V2 + tema + navegação ativados (ativador do ensaio), no índice geral e depois de percorrer blocos e modos.
   PASSA = listas idênticas em todas as secções e em todos os estados percorridos. Qualquer diferença é FALHA com o primeiro índice divergente.
   Somente leitura: Supabase simulado sem dados, zero escrita, zero rede externa, nenhuma flag nem arquivo de produção tocado.
   Controle negativo: com --negativo o teste INSERE um <p> dentro da 1.ª secção antes de medir (o que um layout descuidado faria) e só passa se detectar a troca
   (saída 0 = o teste reprova o defeito; saída 1 = o teste não enxerga o defeito).
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/ancoras-estaveis.cjs [slug ...] [--rapido] [--sem-corr] [--negativo]
   Saída: docs/pre-voo-caneta-layout/resultados/ancoras-estaveis.json (uma linha por matéria × largura) e código de saída 1 se houver FALHA. */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');

const args = process.argv.slice(2), RAPIDO = args.includes('--rapido'), CORR = !args.includes('--sem-corr'), NEG = args.includes('--negativo'), filtro = args.filter(a => !a.startsWith('--'));
const LARGURAS = RAPIDO ? [1440] : [1440, 390];
const ALT = { 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const OUT = process.env.RM_PREVOO_OUT ? path.resolve(process.env.RM_PREVOO_OUT) : path.join(L.REPO, 'docs/pre-voo-caneta-layout/resultados');

/* a MESMA seleção do motor (rm-tools-v2.js: ANCHOR_SEL / SUB_SEL) — se o motor mudar, mude aqui; o teste 4 (contrato) confere que continuam iguais */
const SNAP = () => {
  const tab = document.querySelector('#materias-container > .tab-content');
  const SUB = 'p,li,h2,h3,h4,h5,table,figure,blockquote';
  const out = {};
  tab.querySelectorAll('section[id]').forEach(s => {
    out[s.id] = [...s.querySelectorAll(SUB)].map(e => e.tagName[0] + (e.tagName[1] || '') + ':' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48) + (e.closest('[data-rm-ui]') ? ' ⟨ui⟩' : ''));
  });
  return out;
};

function comparar(ref, cur) {
  const falhas = [];
  const ids = Object.keys(ref);
  for (const id of ids) {
    if (!(id in cur)) { falhas.push({ id, tipo: 'secao-sumiu' }); continue; }
    const a = ref[id], b = cur[id];
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) { falhas.push({ id, tipo: a.length !== b.length ? 'contagem' : 'troca', i, controle: a[i] || null, layout: b[i] || null, nControle: a.length, nLayout: b.length }); break; }
    }
  }
  Object.keys(cur).forEach(id => { if (!(id in ref)) falhas.push({ id, tipo: 'secao-nova' }); });
  return falhas;
}

(async () => {
  const rec = L.reconciliar();
  const mats = rec.ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  fs.mkdirSync(OUT, { recursive: true });
  const usadas = new Set(), pedidos = [];
  const srv = await L.servir({ usadas, pedidos });
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const linhas = [];
  let nFalha = 0;
  for (const m of mats) {
    process.stdout.write(`âncoras ${m.slug} `);
    for (const W of LARGURAS) {
      const reg = { slug: m.slug, grupo: L.grupoDe(m.slug), w: W, estados: [], falhas: [], erro: null };
      let c = null, l = null;
      try {
        c = await L.abrir(br, base, m, { w: W, h: ALT[W], modo: 'controle', corr: CORR });
        const ref = await c.page.evaluate(SNAP);
        reg.secoes = Object.keys(ref).length;
        reg.elementos = Object.values(ref).reduce((n, a) => n + a.length, 0);
        await c.ctx.close(); c = null;

        l = await L.abrir(br, base, m, { w: W, h: ALT[W], modo: 'nav', corr: CORR });
        const go = async spec => { try { await l.page.evaluate(s => window.RMNav.go(s), spec); await l.page.waitForTimeout(450); } catch (e) { /* modo inexistente nesta matéria */ } };
        const estado = async nome => { const f = comparar(ref, await l.page.evaluate(SNAP)); reg.estados.push({ nome, falhas: f.length }); f.slice(0, 3).forEach(x => reg.falhas.push(Object.assign({ estado: nome }, x))); };
        if (NEG) await l.page.evaluate(() => { const s = document.querySelector('#materias-container > .tab-content section[id]'); const p = document.createElement('p'); p.textContent = 'intruso do controle negativo'; s.insertBefore(p, s.firstChild); });
        await estado('indice-geral');
        const ids = Object.keys(ref);
        const alvos = [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]].filter((x, i, a) => x && a.indexOf(x) === i);
        for (const id of alvos) { await go({ view: 'block', block: id }); await estado('bloco:' + id); }
        for (const modo of ['preguntas', 'flashcards', 'infografias']) {
          await go({ view: 'modeidx', mode: modo });
          await go({ view: 'modeblk', mode: modo, block: alvos[1] || alvos[0] });
          await estado('modo:' + modo);
        }
        await go({ view: 'index' }); await estado('volta-ao-indice');
        reg.errosJs = l.errs.length;
        if (l.errs.length) reg.falhas.push({ tipo: 'erro-js', msg: l.errs.slice(0, 2) });
      } catch (e) { reg.erro = String(e).slice(0, 200); reg.falhas.push({ tipo: 'excecao', msg: reg.erro }); }
      finally { if (c) await c.ctx.close().catch(() => {}); if (l) await l.ctx.close().catch(() => {}); }
      reg.estado = reg.falhas.length ? 'FALHA' : 'PASSA';
      if (reg.falhas.length) nFalha++;
      linhas.push(reg);
      process.stdout.write(`${W}:${reg.estado}${reg.falhas.length ? '(' + reg.falhas.length + ')' : ''} `);
    }
    process.stdout.write('\n');
  }
  await br.close(); srv.close();
  const saida = { gerado: new Date().toISOString().slice(0, 10), corr: CORR, ref: process.env.RM_ENSAIO_REF || 'disco', linhas };
  fs.writeFileSync(path.join(OUT, NEG ? 'ancoras-estaveis.negativo.json' : 'ancoras-estaveis.json'), L.jsonLinhas(saida, 'linhas'));
  console.log(`\n${linhas.length} medidas · ${nFalha} com FALHA → ${path.relative(L.REPO, path.join(OUT, NEG ? 'ancoras-estaveis.negativo.json' : 'ancoras-estaveis.json'))}`);
  if (NEG) { const detectou = linhas.every(r => r.estado === 'FALHA'); console.log(detectou ? 'controle negativo: o teste REPROVOU o defeito inserido (como deve)' : 'controle negativo: o teste NÃO enxergou o defeito inserido'); process.exit(detectou ? 0 : 1); }
  process.exit(nFalha ? 1 : 0);
})();
