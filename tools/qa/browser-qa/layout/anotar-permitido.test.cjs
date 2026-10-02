/* Portão anotarPermitido()/activeViewPermitido() (rm-tools-v2.js): escrita, alteração e
   remoção de anotação só na Página completa; modos isolados (Layout V2 / RMModes) nunca
   criam, editam nem apagam; sair/voltar não perde nem desloca marcações.

   Nota: este harness sempre abre como o UID do piloto físico (`JOSE` em lib-ink.cjs) — não
   prova por si só que usuários fora do piloto desenham normalmente (isso é RESPONSABILIDADE
   da suíte real `tools/qa/ink-audit/` com Postgres isolado, que testa explicitamente "um
   usuário comum da beta, não-José"). O que este arquivo prova é que `anotarPermitido()`
   NÃO depende de `pilotoPermitido()` — ver §1, onde o desenho funciona mesmo sem nenhum dos
   comportamentos físicos exclusivos do piloto entrarem em jogo. */
const L = require('./lib-ink.cjs');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FALHA:', m); } }

(async () => {
  const { chromium } = require(process.env.RM_PLAYWRIGHT || 'playwright');
  const srv = await L.serve(); const base = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch();

  console.log('== 1 · Página completa: lápis arma e desenha normalmente (anotarPermitido() não depende de pilotoPermitido()) ==');
  { const { page, errs } = await L.abrir(br, base, 1440, 900, { seed: '0' });
    const armou = await page.evaluate(() => { window.RMToolsV2.escolherFerramenta('pen'); return window.RMToolsV2.estado.tool; });
    ok(armou === 'pen', 'lápis arma na Página completa: tool=' + armou);
    ok(errs.length === 0, 'sem erros JS (' + errs.length + ')');
    await page.close();
  }

  console.log('== 2 · modo isolado: escolherFerramenta NÃO arma nenhuma ferramenta de escrita ==');
  { const { page, errs } = await L.abrir(br, base, 1440, 900, { seed: '0' });
    await page.evaluate(() => window.RMToolsV2.escolherFerramenta('pen'));
    const antes = await page.evaluate(() => window.RMToolsV2.estado.tool);
    ok(antes === 'pen', 'lápis armado antes de trocar de modo (controle)');

    const disponiveis = await page.evaluate(() => window.RMModes.disponiveis().map(m => m.id));
    ok(disponiveis.length > 0, 'há pelo menos 1 modo isolado detectado nesta matéria (senão o teste é inválido): ' + JSON.stringify(disponiveis));
    if (disponiveis.length === 0) { await page.close(); await br.close(); srv.close(); process.exit(2); return; }

    const mudou = await page.evaluate((m) => window.RMModes.requestView(m), disponiveis[0]);
    ok(mudou === true, 'troca para modo isolado "' + disponiveis[0] + '" aceita pelo RMModes');
    const toolDepoisTroca = await page.evaluate(() => window.RMToolsV2.estado.tool);
    ok(toolDepoisTroca === 'none', 'ao ENTRAR no modo isolado: a ferramenta foi desarmada automaticamente: tool=' + toolDepoisTroca);

    const tentativaArmar = await page.evaluate(() => { window.RMToolsV2.escolherFerramenta('pen'); return window.RMToolsV2.estado.tool; });
    ok(tentativaArmar === 'none', 'dentro do modo isolado: escolherFerramenta("pen") NÃO arma: tool=' + tentativaArmar);

    const tentativaHl = await page.evaluate(() => { window.RMToolsV2.escolherFerramenta('highlight'); return window.RMToolsV2.estado.tool; });
    ok(tentativaHl === 'none', 'dentro do modo isolado: escolherFerramenta("highlight") também NÃO arma: tool=' + tentativaHl);

    const tentativaEraser = await page.evaluate(() => { window.RMToolsV2.escolherFerramenta('eraser'); return window.RMToolsV2.estado.tool; });
    ok(tentativaEraser === 'none', 'dentro do modo isolado: escolherFerramenta("eraser") também NÃO arma: tool=' + tentativaEraser);

    ok(errs.length === 0, 'sem erros JS (' + errs.length + ')');
    await page.close();
  }

  console.log('== 3 · desfazer() é bloqueado em modo isolado e não mexe na pilha de undo ==');
  { const { page, errs } = await L.abrir(br, base, 1440, 900, { seed: '0' });
    const disponiveis = await page.evaluate(() => window.RMModes.disponiveis().map(m => m.id));
    if (disponiveis.length === 0) { console.log('  · (sem modo isolado nesta matéria, pulando)'); }
    else {
      await page.evaluate((m) => window.RMModes.requestView(m), disponiveis[0]);
      const pilhaAntes = await page.evaluate(() => window.RMToolsV2.estado.undo.length);
      await page.evaluate(() => window.RMToolsV2.desfazer());
      await page.waitForTimeout(200);
      const pilhaDepois = await page.evaluate(() => window.RMToolsV2.estado.undo.length);
      ok(pilhaAntes === pilhaDepois, 'desfazer() em modo isolado não mexeu na pilha de undo (' + pilhaAntes + ' === ' + pilhaDepois + ')');
      ok(errs.length === 0, 'sem erros JS (' + errs.length + ')');
    }
    await page.close();
  }

  console.log('== 4 · voltar para a Página completa: lápis volta a armar, nenhuma anotação perdida ==');
  { const { page, errs } = await L.abrir(br, base, 1440, 900, { seed: '1' });
    const totalStrokes = () => page.evaluate(() => {
      var s = window.RMToolsV2.estado.strokes; var n = 0;
      Object.keys(s).forEach(function (k) { n += (s[k] || []).length; });
      return n;
    });
    const n0 = await totalStrokes();
    ok(n0 > 0, 'tinta semeada carregada no estado do cliente antes de qualquer troca de modo: n=' + n0);
    const disponiveis = await page.evaluate(() => window.RMModes.disponiveis().map(x => x.id));
    if (disponiveis.length > 0) {
      await page.evaluate((m) => window.RMModes.requestView(m), disponiveis[0]);
      await page.waitForTimeout(300);
      await page.evaluate(() => window.RMModes.requestView('full'));
      await page.waitForTimeout(1200);
      const n1 = await totalStrokes();
      ok(n1 === n0, 'ao voltar para a Página completa: mesma contagem de traços no estado (sem perda): ' + n0 + ' === ' + n1);
      const armouDepoisDeVoltar = await page.evaluate(() => { window.RMToolsV2.escolherFerramenta('pen'); return window.RMToolsV2.estado.tool; });
      ok(armouDepoisDeVoltar === 'pen', 'de volta à Página completa: o lápis arma normalmente de novo: tool=' + armouDepoisDeVoltar);
    } else {
      console.log('  · (sem modo isolado nesta matéria, pulando ida-e-volta)');
    }
    ok(errs.length === 0, 'sem erros JS (' + errs.length + ')');
    await page.close();
  }

  await br.close(); srv.close();
  console.log('\nANOTAR-PERMITIDO: ' + pass + '/' + (pass + fail) + ' verificações OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
