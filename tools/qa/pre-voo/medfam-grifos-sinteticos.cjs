/* Restauração de grifos em Medicina Familiar com dados INVENTADOS (nenhum registro de aluno entra no repositório).
   Os registros são gerados na hora a partir do texto da própria página (fragmentos de parágrafos de `aps` e `portada-medfam`, com prefixo/sufixo de 40 caracteres) e gravados
   no «banco» simulado do harness (sessionStorage), como `user_highlights`. Três famílias:
     A  contexto íntegro (como se gravou);  B  contexto «velho» (sufixo trocado por texto inventado, como se o parágrafo seguinte tivesse mudado; o contexto 100 % trocado NÃO é restaurado, por desenho do motor: é a regra de segurança contra pintar no lugar errado): o texto é único ⇒ o motor ainda restaura;
     C  controle negativo: fragmento INVENTADO que não existe na página ⇒ NÃO pode ser pintado (nem apagar nem pintar no lugar errado).
   PASSA = todos de A e B pintados; nenhum de C; nenhuma escrita no banco. Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/medfam-grifos-sinteticos.cjs */
'use strict';
const { chromium } = require('playwright'); const L = require('../ensaio-layout/lib.cjs'); const UID = require('./lib-dados.cjs').UID;
(async () => {
  const rec = L.reconciliar(); const m = rec.ativas.find(x => x.slug === 'medicina-familiar');
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'controle', corr: true, extra: '&persist=1' });
  const gerar = await r.page.evaluate(() => {
    const out = [];
    for (const bid of ['aps', 'portada-medfam']) {
      const s = document.getElementById(bid); if (!s) continue;
      const norm = s.textContent.replace(/\s+/g, ' ');
      const els = [...s.querySelectorAll('p,li')].filter(e => !e.closest('[data-rm-ui]') && e.textContent.replace(/\s+/g, ' ').trim().length > 90);
      els.slice(0, 40).forEach((e, i) => {
        const w = e.textContent.replace(/\s+/g, ' ').trim().split(' '); if (w.length < 14) return;
        const ex = w.slice(3, 3 + 6 + (i % 5)).join(' ');
        const at = norm.indexOf(ex); if (/Tocá de nuevo/.test(norm.slice(Math.max(0, at - 40), at + ex.length)) || at < 0 || norm.indexOf(ex, at + 1) >= 0) return;   // só texto único na secção
        out.push({ bid, ex, pre: norm.slice(Math.max(0, at - 40), at), suf: norm.slice(at + ex.length, at + ex.length + 40) });
      });
    }
    return out;
  });
  const rows = []; let k = 0;
  gerar.slice(0, 12).forEach(g => rows.push({ fam: 'A', ...g }));
  gerar.slice(12, 24).forEach(g => rows.push({ fam: 'B', ...g, suf: ' trecho inventado depois de' }));
  rows.push({ fam: 'C', bid: 'aps', ex: 'frase inventada que não existe em nenhuma parte da página xyzzy', pre: 'inventado ', suf: ' inventado' });
  const nA = rows.filter(x => x.fam === 'A').length, nB = rows.filter(x => x.fam === 'B').length;
  console.log(`gerados: ${nA} com contexto íntegro, ${nB} com contexto velho, 1 inventado (controle negativo)`);
  await r.page.evaluate(([R, uid]) => { sessionStorage.setItem('ens.user_highlights', JSON.stringify(R.map((g, i) => ({ id: 'sint-' + i, user_id: uid, subject_slug: 'medicina-familiar', block_id: g.bid, exact_text: g.ex, prefix: g.pre, suffix: g.suf, occurrence: 0, color: 'yellow' })))); window.__writes = []; }, [rows, UID]);
  await r.page.goto(r.page.url(), { timeout: 120000 }); await r.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await r.page.waitForTimeout(1500);
  const pint = await r.page.evaluate(() => [...new Set([...document.querySelectorAll('.rm-hl')].map(x => x.getAttribute('data-hl')))].length);
  const quais = await r.page.evaluate(() => [...new Set([...document.querySelectorAll('.rm-hl')].map(x => x.getAttribute('data-hl')))]);
  if (process.env.DEPURA) console.log(JSON.stringify(rows.slice(0, 3)), JSON.stringify(quais), rows.map((x, i) => i + x.fam).join(' '));
  const esc = await r.page.evaluate(() => (window.__writes || []).length);
  const esperado = nA + nB;
  console.log(`motor real: ${pint} pintados (esperado ${esperado}); escritas no banco: ${esc}`);
  await br.close(); srv.close();
  const ok = nA >= 8 && nB >= 8 && pint === esperado && esc === 0;
  console.log(ok ? 'PASSA' : 'FALHA'); process.exit(ok ? 0 : 1);
})();
