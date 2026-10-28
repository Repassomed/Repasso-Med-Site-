/* PRÉ-VOO · DIAGNÓSTICO B1 — placeholder `<section id="…" hidden></section>` no índice do layout novo.
   Abre a matéria com Layout V2 + tema + navegação e mostra: quais seções são vazias e ocultas, o 1.º cartão do índice e o pager do 1.º bloco real.
   `sem` remove os placeholders do DOM antes da montagem (o efeito que a correção C9 teria) para comparar. Somente leitura.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/diagnosticos/secoes-vazias.cjs <slug> [com|sem] */
'use strict';
const { chromium } = require('playwright'); const L = require('../../ensaio-layout/lib.cjs');
(async () => {
  const slug = process.argv[2], sem = process.argv[3] === 'sem'; const m = L.reconciliar().ativas.find(x => x.slug === slug);
  if (!m) { console.error('slug desconhecido'); process.exit(2); }
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'nav', corr: true, initScript: sem ? "new MutationObserver(() => document.querySelectorAll('#materias-container .tab-content > section[hidden]:empty').forEach(s => s.remove())).observe(document, { childList: true, subtree: true });" : null });
  const info = await r.page.evaluate(() => {
    const tab = document.querySelector('#materias-container > .tab-content'); const secs = [...tab.querySelectorAll(':scope > section[id]')];
    const cards = [...document.querySelectorAll('.rm-sis-idx .rm-sis-card, .rm-nav-modeidx .rm-sis-card')].map(c => c.textContent.replace(/\s+/g, ' ').trim().slice(0, 50));
    return { secoes: secs.length, vazias_ocultas: secs.filter(s => s.hidden && !s.textContent.trim()).map(s => s.id), cartoes: cards.length, primeiro_cartao: cards[0] };
  });
  console.log(slug, sem ? '(sem placeholders)' : '(como está)', JSON.stringify(info));
  await br.close(); srv.close();
})();
