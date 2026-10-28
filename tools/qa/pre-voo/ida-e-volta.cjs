/* PRÉ-VOO · TESTE 2 — IDA E VOLTA DOS DADOS DO ALUNO ENTRE O LAYOUT ATUAL E O NOVO
   Pergunta: o que o aluno já gravou (grifos, traços da caneta, notas) aparece igual quando a matéria passa a abrir com o layout novo — e volta a aparecer
   igual se a matéria for desligada (volta à versão anterior)?
   Método (mesma aba, mesmo sessionStorage = o «banco» simulado persistente do harness; nada sai da máquina):
     1. CONTROLE  — abre a matéria como o site a serve hoje; grava com o MOTOR REAL (RMTools.marcarRange) até 10 grifos espalhados pelas secções;
                    semeia 6 traços (âncora calculada pelo motor: RMToolsV2._test.anchorDe) e 1 nota; recarrega e mede a LINHA DE BASE.
     2. LAYOUT    — navega a mesma aba para Layout V2 + tema + navegação e mede de novo; percorre o bloco de cada grifo e confere que o grifo está visível.
     3. VOLTA     — navega de novo para o CONTROLE (rollback) e mede.
   PASSA = (a) os mesmos grifos pintados (mesmo texto, mesma secção), nenhum pendente a mais, nenhum «no lugar errado»;
           (b) os mesmos traços, cada um preso à MESMA caixa (texto da âncora igual) e na mesma posição relativa (≤ 0,02 da caixa; só no mesmo viewport);
           (c) a nota continua listada, com o mesmo rótulo; (d) as fases 2 e 3 não fazem NENHUMA escrita (insert/update/delete) no banco.
   Não grava nada fora do sessionStorage do próprio teste; zero rede externa; nenhuma flag/arquivo de produção tocado.
   Controle negativo (--negativo): na fase LAYOUT insere um <p> no começo da secção do 1.º traço semeado (é onde um layout descuidado desloca o índice); só passa se o teste reprovar.
   Uso: NODE_PATH=$(npm root -g) node tools/qa/pre-voo/ida-e-volta.cjs [slug ...] [--rapido] [--sem-corr] [--negativo]
   Saída: docs/pre-voo-caneta-layout/resultados/ida-e-volta.json */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const L = require('../ensaio-layout/lib.cjs');

const args = process.argv.slice(2), RAPIDO = args.includes('--rapido'), CORR = !args.includes('--sem-corr'), NEG = args.includes('--negativo'), filtro = args.filter(a => !a.startsWith('--'));
const LARGURAS = RAPIDO ? [1440] : [1440, 390];
const ALT = { 390: 844, 768: 1024, 1024: 768, 1440: 900 };
const OUT = process.env.RM_PREVOO_OUT ? path.resolve(process.env.RM_PREVOO_OUT) : path.join(L.REPO, 'docs/pre-voo-caneta-layout/resultados');
const REUNE = /banco|flashcards|repaso|simulacro/i;

const { UID, SEMEAR, MEDIR, comparar } = require('./lib-dados.cjs');

(async () => {
  const rec = L.reconciliar();
  const mats = rec.ativas.filter(m => !filtro.length || filtro.includes(m.slug));
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await L.servir({ usadas: new Set(), pedidos: [] });
  const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  const linhas = []; let nFalha = 0;
  for (const m of mats) {
    process.stdout.write(`ida-e-volta ${m.slug} `);
    for (const W of LARGURAS) {
      const reg = { slug: m.slug, grupo: L.grupoDe(m.slug), w: W, semeado: null, base: null, falhas: [], erro: null };
      let r = null;
      try {
        r = await L.abrir(br, base, m, { w: W, h: ALT[W], modo: 'controle', corr: CORR, extra: '&persist=1' });
        reg.semeado = await r.page.evaluate(SEMEAR, { slug: m.slug, uid: UID, max: 10 });
        await r.page.waitForTimeout(500);
        const url = u => r.page.url().replace(/modo=[a-z]+/, 'modo=' + u);
        /* recarrega o controle (lê tudo do «banco») = linha de base */
        await r.page.goto(url('controle'), { timeout: 120000 }); await r.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await r.page.waitForTimeout(900);
        const ref = await r.page.evaluate(MEDIR);
        reg.base = { grifos: ref.grifos.length, tracos: ref.tracos.length, notas: ref.notas.length, orfaos: ref.orfaos };
        if (!reg.semeado.grifos.length) reg.falhas.push({ fase: 'semeadura', tipo: 'nenhum-grifo-semeado' });
        if (reg.base.grifos < reg.semeado.grifos.length) reg.falhas.push({ fase: 'controle', tipo: 'grifos-nao-voltam-no-proprio-controle', gravados: reg.semeado.grifos.length, pintados: reg.base.grifos });
        if (reg.base.tracos < reg.semeado.tracos) reg.falhas.push({ fase: 'controle', tipo: 'tracos-nao-voltam-no-proprio-controle', gravados: reg.semeado.tracos, desenhados: reg.base.tracos });

        /* fase LAYOUT */
        await r.page.goto(url('nav'), { timeout: 120000 }); await r.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await r.page.waitForTimeout(900);
        if (NEG) await r.page.evaluate(() => { const tr = JSON.parse(sessionStorage.getItem('ens.user_ink_strokes') || '[]'); const s = document.getElementById(((tr[0] || {}).anchor_id || '').split('>')[0]) || document.querySelector('#materias-container > .tab-content section[id]'); const p = document.createElement('p'); p.textContent = 'intruso do controle negativo'; s.insertBefore(p, s.firstChild); });   // na secção do 1.º traço: é onde um layout descuidado desloca o índice
        const lay = await r.page.evaluate(MEDIR);
        reg.falhas.push(...comparar(ref, lay, 'layout'));
        /* o grifo está visível no bloco dele? */
        let invisiveis = 0;
        for (const g of ref.grifos.slice(0, 10)) {
          try { await r.page.evaluate(s => window.RMNav.go(s), { view: 'block', block: g.sec }); await r.page.waitForTimeout(350); } catch (e) { /* sem navegação */ }
          const v = await r.page.evaluate(([sec, t]) => { const sp = [...document.querySelectorAll('#' + CSS.escape(sec) + ' .rm-hl')].find(x => x.textContent.replace(/\s+/g, ' ').includes(t.slice(0, 12))); return !!(sp && sp.checkVisibility && sp.checkVisibility({ checkVisibilityCSS: true }) && sp.getBoundingClientRect().width > 0); }, [g.sec, g.t]);
          if (!v) invisiveis++;
        }
        if (invisiveis) reg.falhas.push({ fase: 'layout', tipo: 'grifo-invisivel-no-proprio-bloco', n: invisiveis });
        reg.layout = { grifos: lay.grifos.length, tracos: lay.tracos.length, notas: lay.notas.length };

        /* fase VOLTA (rollback) */
        await r.page.goto(url('controle'), { timeout: 120000 }); await r.page.waitForFunction('window.__ready===true', { timeout: 120000 }); await r.page.waitForTimeout(900);
        const volta = await r.page.evaluate(MEDIR);
        reg.falhas.push(...comparar(ref, volta, 'volta'));
        reg.volta = { grifos: volta.grifos.length, tracos: volta.tracos.length, notas: volta.notas.length };
      } catch (e) { reg.erro = String(e).slice(0, 220); reg.falhas.push({ fase: 'execucao', tipo: 'excecao', msg: reg.erro }); }
      finally { if (r) await r.ctx.close().catch(() => {}); }
      reg.estado = reg.falhas.length ? 'FALHA' : 'PASSA';
      if (reg.falhas.length) nFalha++;
      reg.falhas = reg.falhas.slice(0, 8);
      linhas.push(reg);
      process.stdout.write(`${W}:${reg.estado}${reg.falhas.length ? '(' + reg.falhas.map(f => f.tipo).join(',') + ')' : ''} g${reg.base && reg.base.grifos}/t${reg.base && reg.base.tracos}/n${reg.base && reg.base.notas} `);
    }
    process.stdout.write('\n');
  }
  await br.close(); srv.close();
  const nome = (NEG ? 'ida-e-volta.negativo' : 'ida-e-volta') + (filtro.length && !process.env.RM_PREVOO_OUT ? '.parcial' : '') + '.json';   // rodada com filtro NUNCA sobrescreve a bateria completa
  fs.writeFileSync(path.join(OUT, nome), L.jsonLinhas({ gerado: new Date().toISOString().slice(0, 10), corr: CORR, ref: process.env.RM_ENSAIO_REF || 'disco', commit: require('child_process').execSync('git rev-parse --short HEAD', { cwd: L.REPO }).toString().trim(), parcial: filtro.length > 0, materias: mats.length, linhas }, 'linhas'));
  console.log(`\n${linhas.length} medidas · ${nFalha} com FALHA → docs/pre-voo-caneta-layout/resultados/${nome}`);
  if (NEG) { const ok = linhas.every(r => r.estado === 'FALHA'); console.log(ok ? 'controle negativo: o teste REPROVOU o defeito inserido (como deve)' : 'controle negativo: o teste NÃO enxergou o defeito inserido'); process.exit(ok ? 0 : 1); }
  process.exit(nFalha ? 1 : 0);
})();
