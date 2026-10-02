/* Corridas de transição e caneta × reposicionamento (blockers da auditoria do #425, HEAD 94006e54).

   1) rm-modes.js: o callback da volta à Página completa (espera de 2 frames + 120 ms) continuava rodando depois de uma nova
      troca de modo, de um detach ou de sair da matéria — reposicionava a tinta e devolvia a rolagem da Página completa já
      DENTRO de outro modo. Agora cada transição tem geração (`RMModes.gen`) e aba; depois da espera confere de novo (ainda é a
      transição atual? mesma aba? ainda full? ainda anexado?) e, se não, vira NO-OP.
   2) rm-layout.js: `RMToolsV2.reposicionar()` não pode rodar com `body.rm2-pen-down` (nem com traço em curso). O pedido é
      coalescido e espera pointerup/pointercancel; ao executar reconfere matéria/aba/modo/attach e a ausência de novo traço.
   3) irPara(): salto novo, troca de modo, troca de matéria ou detach invalidam o salto anterior (e o seu acompanhamento).

   Testes:  A preguntas→full→flashcards antes de concluir 2 frames+120 ms · B flashcards→full→preguntas rápido ·
            C sair da matéria durante a espera · D detach durante a transição · E reposicionamento pedido → o usuário começa um
            traço antes da execução · F pointerup → o pedido pendente executa UMA vez · G pointercancel · H irPara(A)→irPara(B) ·
            I irPara() → sair da matéria.
   Tinta VISÍVEL obrigatória (lib-ink.cjs): «0 px com 0 paths» = TESTE INVÁLIDO.
   Eventos de caneta SINTÉTICOS (PointerEvent pointerType=pen): provam o caminho de código, NÃO o hardware (iPad = teste físico).

   Uso:  export NODE_PATH=$(npm root -g)   # ou RM_PLAYWRIGHT=/caminho/do/modulo
         node tools/qa/browser-qa/layout/race.test.cjs                                                                   */
const L = require('./lib-ink.cjs');
const { ok, info, okTinta, medir, ate, abrir, clicarBloco, trazerTinta, INSTRUMENTAR, agora } = L;

/* página pronta: salta a s2-b10, traz a tinta à janela, mede (VÁLIDO) e instrumenta scrollTo/reposicionar */
async function preparar(br, base, w, h) {
  const f = await abrir(br, base, w, h);
  await clicarBloco(f.page, w, 's2-b10'); await f.page.waitForTimeout(800); await trazerTinta(f.page, 's2-b10'); await f.page.waitForTimeout(500);
  const r = await ate(f.page);
  f.Y = await f.page.evaluate(() => Math.round(window.pageYOffset));
  f.ancTop = () => f.page.evaluate(() => { const sv = [...document.querySelectorAll('#rm2-ink svg[data-anchor]')].find(s => s.getAttribute('data-anchor').startsWith('s2-b10>')); const a = sv.getAttribute('data-anchor').split('>'); return Math.round(document.getElementById(a[0]).querySelectorAll('p,li,h2,h3,h4,h5,table,figure,blockquote')[+a[1]].getBoundingClientRect().top); });
  f.t0 = await f.ancTop();
  f.valido = L.valida(r.m) && r.m.desvio <= L.MAX;
  await f.page.evaluate(INSTRUMENTAR);
  return f;
}
const rmScrolls = (page, depois) => page.evaluate((t) => window.__sc.filter(c => c.t >= t && c.rm).map(c => ({ arg: c.arg, view: c.view })), depois);
const reposApos = (page, depois) => page.evaluate((t) => window.__rp.filter(c => c.t >= t), depois);
const restaurou = (sc, Y) => sc.filter(c => c.arg && c.arg.length >= 2 && Math.abs(c.arg[1] - Y) < 100 && Y > 100);   // scrollTo(0, Y) = a rolagem da Página completa devolvida

async function cenariosModos(br, base, w, h) {
  console.log(`\n===== ${w}×${h} · transições de modo =====`);

  console.log('  -- A · preguntas → full → flashcards ANTES de concluir 2 frames + 120 ms');
  { const f = await preparar(br, base, w, h);
    ok(f.valido && f.Y > 100, `baseline com tinta visível e alinhada em posição profunda (Y=${f.Y} px)`);
    await f.page.evaluate(async () => { window.__dep = 0; const M = window.RMModes; M.requestView('preguntas'); await new Promise(r => setTimeout(r, 300)); M.requestView('full', { depois: () => { window.__dep++; } }); window.__tFull = performance.now(); M.requestView('flashcards'); window.__tFlash = performance.now(); });
    await f.page.waitForTimeout(1000);
    const t = await f.page.evaluate(() => window.__tFull);
    const sc = await rmScrolls(f.page, t); const rp = await reposApos(f.page, t);
    ok(await f.page.evaluate(() => window.RMModes.view) === 'flashcards', 'o modo final é flashcards (a transição de full foi substituída)');
    ok(restaurou(sc, f.Y).length === 0, `nenhuma rolagem da Página completa foi devolvida dentro de flashcards (scrollTo do shell: ${JSON.stringify(sc.map(c => c.arg))})`);
    ok(rp.length === 0, `0 chamadas a RMToolsV2.reposicionar depois da transição invalidada (${rp.length})`);
    ok(await f.page.evaluate(() => window.__dep) === 0, 'o callback opts.depois da volta a full invalidada não executou');
    /* e a posição de saída ORIGINAL continua guardada: voltar de verdade devolve o aluno ao mesmo ponto, com tinta visível */
    await f.page.evaluate(() => window.RMModes.requestView('full')); await f.page.waitForTimeout(900);
    const t1 = await f.ancTop(); ok(Math.abs(t1 - f.t0) <= 60, `depois, ao voltar de verdade, a posição original é devolvida (âncora top ${f.t0} → ${t1})`);
    okTinta((await ate(f.page, 4000)).m, 'e a tinta está visível e alinhada na volta de verdade');
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await f.page.close(); }

  console.log('  -- B · flashcards → full → preguntas rápido');
  { const f = await preparar(br, base, w, h);
    await f.page.evaluate(async () => { const M = window.RMModes; M.requestView('flashcards'); await new Promise(r => setTimeout(r, 300)); M.requestView('full'); window.__tFull = performance.now(); M.requestView('preguntas'); });
    await f.page.waitForTimeout(1000);
    const t = await f.page.evaluate(() => window.__tFull);
    const sc = await rmScrolls(f.page, t); const rp = await reposApos(f.page, t);
    ok(restaurou(sc, f.Y).length === 0 && rp.length === 0, `nenhum scroll/tinta da transição intermediária (restaurações=${restaurou(sc, f.Y).length}, reposicionar=${rp.length})`);
    ok(await f.page.evaluate(() => window.RMModes.view) === 'preguntas', 'o modo final é preguntas');
    ok(await f.page.evaluate(() => Math.round(window.pageYOffset)) < 50, 'a rolagem ficou no topo do modo isolado (não foi “puxada” para a posição da Página completa)');
    await f.page.evaluate(() => window.RMModes.requestView('full')); await f.page.waitForTimeout(900);
    const t1 = await f.ancTop(); ok(Math.abs(t1 - f.t0) <= 60, `ao voltar de verdade, o ponto original foi preservado (âncora top ${f.t0} → ${t1})`);
    okTinta((await ate(f.page, 4000)).m, 'tinta visível e alinhada na volta de verdade');
    await f.page.close(); }
}

async function cenariosSairDaMateria(br, base, w, h) {
  console.log(`\n===== ${w}×${h} · sair da matéria / detach =====`);
  const comBiologia = async () => {                                     // pré-carrega a 2ª matéria para o «sair» ser síncrono (switchTab)
    const f = await abrir(br, base, w, h);
    await f.page.evaluate(() => openMateria('biologia', 'bio')); await f.page.waitForTimeout(1200);
    await f.page.evaluate(() => switchTab('semio2')); await f.page.waitForTimeout(1500);
    ok(await f.page.evaluate(() => !!window.RMLayout._estado()), 'Semiología II reanexada (shell presente) antes do teste');
    await clicarBloco(f.page, w, 's2-b10'); await f.page.waitForTimeout(800); await trazerTinta(f.page, 's2-b10'); await f.page.waitForTimeout(500);
    const r = await ate(f.page); f.Y = await f.page.evaluate(() => Math.round(window.pageYOffset)); f.valido = L.valida(r.m) && r.m.desvio <= L.MAX;
    await f.page.evaluate(INSTRUMENTAR); return f;
  };

  console.log('  -- C · sair da matéria durante a espera da volta à Página completa');
  { const f = await comBiologia();
    ok(f.valido && f.Y > 100, `baseline com tinta visível e alinhada (Y=${f.Y} px)`);
    await f.page.evaluate(async () => { window.__dep = 0; const M = window.RMModes; M.requestView('preguntas'); await new Promise(r => setTimeout(r, 300)); M.requestView('full', { depois: () => { window.__dep++; } }); window.__tSai = performance.now(); window.switchTab('bio'); });
    await f.page.waitForTimeout(1500);
    const t = await f.page.evaluate(() => window.__tSai);
    const sc = await rmScrolls(f.page, t); const rp = await reposApos(f.page, t);
    ok(sc.length === 0, `0 rolagens do shell depois de sair da matéria (${JSON.stringify(sc.map(c => c.arg))})`);
    ok(rp.length === 0, `0 reposicionamentos depois de sair da matéria (${rp.length})`);
    ok(await f.page.evaluate(() => window.__dep) === 0, '0 callbacks (opts.depois) depois de sair');
    ok(await f.page.evaluate(() => window.RMLayout._estado() === null), 'o shell foi desanexado ao sair da matéria');
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await f.page.close(); }

  console.log('  -- D · detach durante a transição');
  { const f = await comBiologia();
    await f.page.evaluate(async () => { window.__dep = 0; const M = window.RMModes; M.requestView('preguntas'); await new Promise(r => setTimeout(r, 300)); M.requestView('full', { depois: () => { window.__dep++; } }); window.__tDet = performance.now(); window.RMLayout.detach(); });
    await f.page.waitForTimeout(1500);
    const t = await f.page.evaluate(() => window.__tDet);
    const sc = await rmScrolls(f.page, t); const rp = await reposApos(f.page, t);
    ok(restaurou(sc, f.Y).length === 0 && sc.length === 0, `0 rolagens tardias do shell depois do detach (${JSON.stringify(sc.map(c => c.arg))})`);
    ok(await f.page.evaluate(() => window.__dep) === 0, '0 callbacks (opts.depois) depois do detach');
    ok(rp.length === 1 && rp.every(c => c.view === 'full'), `EXATAMENTE 1 reposicionamento — o do PRÓPRIO detach (a matéria continua na tela: a tinta volta ao X original); nada da transição (${rp.length})`);
    ok(await f.page.evaluate(() => !document.documentElement.classList.contains('rm-l2') && !document.querySelector('[data-rm-ui]')), 'shell removido por completo (classe rm-l2 e [data-rm-ui])');
    ok(await f.page.evaluate(() => window.RMModes.gen > 0), 'a geração do módulo avançou (callbacks velhos invalidados)');
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await f.page.close(); }

  console.log('  -- I · irPara() → sair da matéria');
  { const f = await comBiologia();
    await f.page.evaluate(() => window.scrollTo(0, 0)); await f.page.waitForTimeout(400);
    await f.page.evaluate(INSTRUMENTAR);
    await f.page.evaluate(() => { if (window.innerWidth < 768) document.querySelector('.rm-l2-hamb').click(); const t = document.querySelector('.rm-l2-tree-toggle'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); });
    await f.page.waitForTimeout(300);
    await f.page.evaluate(() => { document.querySelector('.rm-l2-block-link[data-target="s2-b10"]').click(); window.__tSai = performance.now(); window.switchTab('bio'); });
    await f.page.waitForTimeout(2500);
    const t = await f.page.evaluate(() => window.__tSai);
    const sc = await rmScrolls(f.page, t); const rp = await reposApos(f.page, t);
    ok(sc.length === 0, `0 rolagens do salto antigo depois de sair da matéria (${JSON.stringify(sc.map(c => c.arg))})`);
    ok(rp.length === 0, `0 reposicionamentos do salto antigo depois de sair (${rp.length})`);
    ok(await f.page.evaluate(() => window.RMLayout._estado() === null), 'shell desanexado');
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await f.page.close(); }
}

/* caneta (eventos SINTÉTICOS de stylus) */
const PEN = {
  down: () => { const ps = [...document.querySelectorAll('#materias-container section[id] p')].filter(x => { const r = x.getBoundingClientRect(); return x.textContent.length > 150 && r.height >= 50 && r.top > 80 && r.bottom < innerHeight - 20; });
    const e = ps[0]; const r = e.getBoundingClientRect(); const mk = (t, x, y, p) => new PointerEvent(t, { pointerType: 'pen', pointerId: 7, isPrimary: true, clientX: x, clientY: y, pressure: p, buttons: p ? 1 : 0, bubbles: true, cancelable: true, composed: true });
    window.__penMk = mk; window.__penX = r.left + r.width * 0.2; window.__penY = r.top + r.height / 2; window.__penEl = e;
    e.dispatchEvent(mk('pointerdown', window.__penX, window.__penY, 0.5)); for (let k = 1; k <= 6; k++) document.dispatchEvent(mk('pointermove', window.__penX + k * 9, window.__penY + Math.sin(k / 2) * 8, 0.5)); return document.body.classList.contains('rm2-pen-down'); },
  up: (tipo) => { document.dispatchEvent(window.__penMk(tipo, window.__penX + 70, window.__penY, 0)); },
  novoDown: () => { window.__penEl.dispatchEvent(window.__penMk('pointerdown', window.__penX, window.__penY + 3, 0.5)); return document.body.classList.contains('rm2-pen-down'); }
};
async function cenariosCaneta(br, base, w, h) {
  console.log(`\n===== ${w}×${h} · caneta × reposicionamento (eventos sintéticos de stylus) =====`);
  for (const [rotulo, fim] of [['E+F · pointerup', 'pointerup'], ['G · pointercancel', 'pointercancel']]) {
    console.log(`  -- ${rotulo}: reposicionamento pedido → o usuário começa um traço antes da execução`);
    const f = await preparar(br, base, w, h);
    ok(f.valido, 'baseline com tinta visível e alinhada');
    await f.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await f.page.waitForTimeout(200);
    const t0 = await agora(f.page);
    /* mesmo tick: pede o reposicionamento e começa o traço (antes dos 2 frames + 120 ms da execução) */
    const penDown = await f.page.evaluate((fn) => { window.RMLayout.assentarTinta(); return (new Function('return ' + fn))()(); }, PEN.down.toString());
    ok(penDown, 'o contato da caneta ligou body.rm2-pen-down (a V2 reconheceu o traço sintético)');
    await f.page.waitForTimeout(900);
    ok((await reposApos(f.page, t0)).length === 0, `nenhum RMToolsV2.reposicionar() enquanto rm2-pen-down (${(await reposApos(f.page, t0)).length} em 0,9 s de contato)`);
    /* mais pedidos DURANTE o contato: viram um só */
    await f.page.evaluate(() => { window.RMLayout.assentarTinta(); window.RMLayout.assentarTinta(); window.RMLayout.assentarTinta(); });
    await f.page.waitForTimeout(600);
    ok((await reposApos(f.page, t0)).length === 0, 'pedidos adicionais durante o contato também não executam');
    ok(await f.page.evaluate(() => document.body.classList.contains('rm2-pen-down')), 'o contato continua ligado');
    const tUp = await agora(f.page);
    await f.page.evaluate((a) => { (new Function('return ' + a.fn))()(a.tipo); }, { fn: PEN.up.toString(), tipo: fim });
    await f.page.waitForTimeout(900);
    const rp = await reposApos(f.page, t0);
    ok(rp.length === 1, `${fim}: o pedido pendente executa UMA vez (${rp.length}; vários pedidos coalescidos)`);
    ok(rp.length === 1 && rp[0].t >= tUp && !rp[0].penDown && rp[0].full, `${fim}: executou só depois do fim do contato, sem rm2-pen-down e na Página completa`);
    ok(!(await f.page.evaluate(() => document.body.classList.contains('rm2-pen-down'))), 'o contato terminou');
    await f.page.waitForTimeout(600); ok((await reposApos(f.page, t0)).length === 1, 'e não repete depois (1 execução no total)');
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await f.page.close();
  }

  console.log('  -- E3 · pointerup → NOVO traço antes de o pedido pendente executar');
  { const f = await preparar(br, base, w, h);
    await f.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await f.page.waitForTimeout(200);
    const t0 = await agora(f.page);
    await f.page.evaluate((fn) => { window.RMLayout.assentarTinta(); return (new Function('return ' + fn))()(); }, PEN.down.toString());
    await f.page.waitForTimeout(500);
    await f.page.evaluate((a) => { (new Function('return ' + a.up))()('pointerup'); }, { up: PEN.up.toString() });
    await f.page.waitForTimeout(30);                                    // dentro dos 80 ms de espera do shell
    const novo = await f.page.evaluate((fn) => (new Function('return ' + fn))()(), PEN.novoDown.toString());
    await f.page.waitForTimeout(900);
    ok(novo && (await reposApos(f.page, t0)).length === 0, `um novo traço começou antes da execução: 0 reposicionamentos enquanto há contato (${(await reposApos(f.page, t0)).length})`);
    await f.page.evaluate((a) => { (new Function('return ' + a.up))()('pointerup'); }, { up: PEN.up.toString() });
    await f.page.waitForTimeout(900);
    ok((await reposApos(f.page, t0)).length === 1, `só depois do fim do 2º traço executa, e UMA vez (${(await reposApos(f.page, t0)).length})`);
    await f.page.close(); }

  console.log('  -- E4 · pedido pendente e a matéria sai antes de a caneta levantar');
  { const f = await abrir(br, base, w, h);
    await f.page.evaluate(() => openMateria('biologia', 'bio')); await f.page.waitForTimeout(1200);
    await f.page.evaluate(() => switchTab('semio2')); await f.page.waitForTimeout(1500);
    await clicarBloco(f.page, w, 's2-b10'); await f.page.waitForTimeout(800); await trazerTinta(f.page, 's2-b10'); await f.page.waitForTimeout(500);
    await f.page.evaluate(INSTRUMENTAR); await f.page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen')); await f.page.waitForTimeout(200);
    const t0 = await agora(f.page);
    await f.page.evaluate((fn) => { window.RMLayout.assentarTinta(); return (new Function('return ' + fn))()(); }, PEN.down.toString());
    await f.page.waitForTimeout(500);
    await f.page.evaluate(() => window.switchTab('bio')); await f.page.waitForTimeout(500);
    await f.page.evaluate((a) => { (new Function('return ' + a.up))()('pointerup'); }, { up: PEN.up.toString() });
    await f.page.waitForTimeout(1200);
    ok((await reposApos(f.page, t0)).length === 0, `o pedido pendente não executa depois de a matéria sair (${(await reposApos(f.page, t0)).length})`);
    await f.page.close(); }
}

async function cenariosSalto(br, base, w, h) {
  console.log(`\n===== ${w}×${h} · irPara(A) → irPara(B) =====`);
  console.log('  -- H · começar irPara(A) e imediatamente irPara(B)');
  for (const [A, B] of [['s2-b10', 's2-b03'], ['s2-banco', 's2-b06']]) {
    const f = await abrir(br, base, w, h);
    await f.page.evaluate(() => window.scrollTo(0, 0)); await f.page.waitForTimeout(400);
    await f.page.evaluate(INSTRUMENTAR);
    await f.page.evaluate(() => { if (window.innerWidth < 768) document.querySelector('.rm-l2-hamb').click(); const t = document.querySelector('.rm-l2-tree-toggle'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); });
    await f.page.waitForTimeout(300);
    const topo = await f.page.evaluate(() => document.getElementById('rm-l2-band').offsetHeight + 16);
    await f.page.evaluate(({ A, B }) => { document.querySelector(`.rm-l2-block-link[data-target="${A}"]`).click(); window.__tB = performance.now(); document.querySelector(`.rm-l2-block-link[data-target="${B}"]`).click(); }, { A, B });
    /* amostra a posição de B a cada 50 ms por 3 s: depois de chegar, nunca mais pode sair (A jamais recupera o controle) */
    const amostras = []; const t0 = Date.now();
    while (Date.now() - t0 < 3000) { amostras.push(await f.page.evaluate((b) => Math.round(document.getElementById(b).getBoundingClientRect().top), B)); await f.page.waitForTimeout(50); }
    /* «chegou» = estável: 5 amostras seguidas (≈ 250 ms) a ≤ 3 px da faixa (o layout muda de altura por baixo e o laço de irPara reajusta: o transiente não conta) */
    const chegou = amostras.findIndex((v, i) => i + 5 <= amostras.length && amostras.slice(i, i + 5).every(x => Math.abs(x - topo) <= 3));
    const depois = chegou < 0 ? amostras : amostras.slice(chegou);
    const desvioMax = Math.max(...depois.map(v => Math.abs(v - topo)));
    ok(chegou >= 0, `${A}→${B}: B chega e FICA sob a faixa (top=${topo}) — estável a partir de ${chegou * 50} ms`);
    ok(desvioMax <= 6, `${A}→${B}: depois de chegar, B nunca mais sai do lugar (desvio máx. ${desvioMax} px em ${depois.length} amostras)`);
    /* rolagens do shell depois do clique em B, classificadas pelo ALVO: «dirigida a A» = o destino (top) está mais perto da posição
       de A no documento do que da de B. A já tinha dado o seu 1º passo antes do clique em B; depois, nenhum passo pode ser de A. */
    const dir = await f.page.evaluate(({ A, B }) => { const y = window.pageYOffset; const doc = (id) => y + document.getElementById(id).getBoundingClientRect().top; const dA = doc(A), dB = doc(B);
      const calls = window.__sc.filter(c => c.rm && c.t >= window.__tB && c.arg[0] && typeof c.arg[0].top === 'number'); return { n: calls.length, paraA: calls.filter(c => Math.abs(c.arg[0].top - dA) < Math.abs(c.arg[0].top - dB)).length }; }, { A, B });
    ok(dir.paraA === 0, `${A}→${B}: 0 rolagens dirigidas a A depois do clique em B (${dir.paraA} de ${dir.n} rolagens do shell)`);
    const topoA = await f.page.evaluate((a) => Math.round(document.getElementById(a).getBoundingClientRect().top), A);
    ok(Math.abs(topoA - topo) > 400, `A não recuperou o controle (A está em top=${topoA}, longe da faixa)`);
    ok(f.errs.length === 0, `0 erros JS (${f.errs.length})`);
    await f.page.close();
  }
}

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await cenariosModos(br, base, w, h);
    await cenariosSairDaMateria(br, base, w, h);
    await cenariosSalto(br, base, w, h);
  }
  await cenariosCaneta(br, base, 1440, 900);
  await br.close(); srv.close();
  process.exit(L.finish('race') ? 1 : 0);
})();
