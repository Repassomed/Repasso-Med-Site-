/* PRÉ-VOO · QUAIS SEÇÕES CADA MATÉRIA PRECISA DECLARAR COMO «AGREGADORA» (data-rm-agrega) ANTES DE LIGAR O LAYOUT?
   Seção agregadora = cópia da revisão/banco/mazo (cujas questões/cartões já existem nas seções de bloco): se o layout não souber disso, a capa soma em dobro e os modos
   Preguntas/Flashcards listam o banco como se fosse um bloco. O ensaio (ativar.js, modo corr) deriva a lista por CONTEÚDO — a mesma regra que o descritor da matéria teria de declarar.
   Esta ferramenta só IMPRIME essa lista por matéria (id → tipo), para o passo P1 da porta (editorial). Não altera nenhum arquivo.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/marcadores-agrega.cjs [slug …]   → docs/pre-voo-caneta-layout/resultados/marcadores-agrega.json */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');
const filtro = process.argv.slice(2).filter(a => !a.startsWith('--'));
const OUT = process.env.RM_PREVOO_OUT ? path.resolve(process.env.RM_PREVOO_OUT) : path.join(L.REPO, 'docs/pre-voo-caneta-layout/resultados');
(async () => {
  const mats = L.reconciliar().ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await L.servir({ usadas: new Set(), pedidos: [] }); const base = 'http://127.0.0.1:' + srv.address().port; const br = await chromium.launch();
  const out = [];
  for (const m of mats) {
    const r = await L.abrir(br, base, m, { w: 1440, h: 900, modo: 'nav', corr: true });
    const info = await r.page.evaluate(() => {
      const tab = document.querySelector('#materias-container > .tab-content');
      const jaNoHtml = [...tab.querySelectorAll('[data-rm-agrega]')].map(e => e.id);
      const T = (window.__ens && window.__ens.temaGerado) || null;
      const tipos = T && T.tipos ? T.tipos : null;
      return { marcadas: jaNoHtml, tema: T ? Object.keys(T).slice(0, 6) : null, tipos };
    });
    const secs = await r.page.evaluate(() => [...document.querySelectorAll('#materias-container > .tab-content > section[id]')].map(s => ({ id: s.id, agrega: s.hasAttribute('data-rm-agrega'), q: s.querySelectorAll('.quiz-item').length, fc: s.querySelectorAll('.flashcard').length })));
    await r.ctx.close();
    out.push({ slug: m.slug, agregadoras: secs.filter(s => s.agrega).map(s => `${s.id} (${s.q} q · ${s.fc} fc)`), total_secoes: secs.length });
    process.stdout.write(`${m.slug}: ${out[out.length - 1].agregadoras.join(', ') || '— nenhuma —'}\n`);
  }
  await br.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'marcadores-agrega.json'), L.jsonLinhas({ gerado: new Date().toISOString().slice(0, 10), nota: 'derivado por CONTEÚDO pelo ativador do ensaio (modo corr); nenhum arquivo de matéria contém data-rm-agrega hoje', linhas: out }, 'linhas'));
})();
