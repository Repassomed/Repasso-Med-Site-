#!/usr/bin/env node
/* Testa o caminho de revisão novo (rodada 6): quando aplicarHighlights()
 * deixa marcas pendentes, o aviso (toast) fica visível e tocável, e
 * tocar nele rola e realça o bloco certo — sem nenhuma escrita em dados
 * de aluno (página com rede bloqueada; a marca pendente nunca é
 * modificada/apagada, só não é pintada).
 *
 * `sincronizarAba()` em si não é testável sem simular o Supabase (ela
 * chama `carregarHighlights`, que tenta a rede e, sem ela, devolve [] —
 * aí nunca chegaria a `aplicarHighlights`/`avisarPendentes`). O que ela
 * faz depois de ter a lista é só isto, visível no diff:
 *   var r = aplicarHighlights(tabEl, lista);
 *   if (r.perdidas) { console.info(...); avisarPendentes(tabEl, r); }
 * — por isso o teste chama aplicarHighlights()/avisarPendentes() reais
 * (exportados), na mesma ordem, em vez de reconstruir a lógica.
 */
const fs = require('fs');

async function main() {
  const rmToolsPath = process.argv[2];
  if (!rmToolsPath) { console.error('uso: node test_aviso_pendente.cjs <rm-tools.js>'); process.exit(2); }
  const { chromium } = require('playwright');
  const src = fs.readFileSync(rmToolsPath, 'utf-8');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e));
  await page.route('**/*', (route) => route.abort());
  await page.setContent('<!doctype html><html><body>' +
    '<div id="materias-container">' +
    '<section id="tab-x" class="tab active">' +
    '<div id="blocoB"><p>Outro bloco qualquer, perto do topo.</p></div>' +
    '<div id="blocoA" style="margin-top:4000px"><p>Texto totalmente diferente agora, bem mais abaixo na página.</p></div>' +
    '</section></div></body></html>');
  await page.addScriptTag({ content: src });

  const out = await page.evaluate(() => {
    const tab = document.getElementById('tab-x');
    const blocoA = document.getElementById('blocoA');
    const blocoB = document.getElementById('blocoB');
    // h1: grifo pendente de verdade (exact_text não existe mais em blocoA)
    // h2: grifo que resolve normalmente em blocoB (controle positivo)
    const lista = [
      { id: 'h1', block_id: 'blocoA', exact_text: 'texto que já não existe', prefix: '', suffix: '', occurrence: 0, color: 'red' },
      { id: 'h2', block_id: 'blocoB', exact_text: 'Outro bloco qualquer, perto do topo.', prefix: '', suffix: '', occurrence: 0, color: 'red' },
    ];
    const antesHtmlA = blocoA.innerHTML, antesHtmlB = blocoB.innerHTML;

    const r = window.RMTools.aplicarHighlights(tab, lista);
    const depoisHtmlA = blocoA.innerHTML;

    // simula exatamente o que sincronizarAba() faz a seguir
    if (r.perdidas) window.RMTools.avisarPendentes(tab, r);

    const t = document.querySelector('.rm-toast');
    const toastMsg = t ? t.textContent : null;
    const toastAcionavel = t ? t.classList.contains('acionavel') : null;
    const scrollAntes = window.scrollY;

    // "toca" no aviso (dispara o onclick real atribuído por toast())
    if (t && t.onclick) t.onclick();

    return {
      r, antesHtmlA, depoisHtmlA, b_pintado: blocoB.querySelector('.rm-hl') !== null,
      toastMsg, toastAcionavel, scrollAntes,
      blocoAFlashApos: blocoA.classList.contains('rm-flash-revisao'),
    };
  });

  // dá tempo pro scrollIntoView (smooth) assentar e lê o resultado
  await page.waitForTimeout(150);
  const out2 = await page.evaluate(() => ({ scrollDepois: window.scrollY, blocoAindaFlash: document.getElementById('blocoA').classList.contains('rm-flash-revisao') }));

  await browser.close();

  console.log('aplicarHighlights:', JSON.stringify(out.r));
  const htmlAIntacto = out.antesHtmlA === out.depoisHtmlA;
  console.log('blocoA (pendente) teve HTML alterado?', !htmlAIntacto ? 'SIM <<< ERRADO (deveria ficar intacto)' : 'não — correto, marca segue no banco sem pintura');
  console.log('blocoB (resolve normal) foi pintado?', out.b_pintado ? 'sim — correto (controle positivo)' : 'NÃO <<< ERRADO');
  console.log('toast mostrado:', JSON.stringify(out.toastMsg));
  console.log('toast tocável (.acionavel)?', out.toastAcionavel);
  console.log('scroll mudou ao tocar no aviso?', out.scrollAntes, '->', out2.scrollDepois, out2.scrollDepois > out.scrollAntes ? '(rolou — correto)' : '<<< NÃO ROLOU');
  console.log('blocoA ganhou a classe de realce ao tocar?', out.blocoAFlashApos ? 'sim — correto' : '<<< NÃO');

  const ok = htmlAIntacto
    && out.b_pintado
    && out.r && out.r.perdidas === 1
    && Array.isArray(out.r.blocosPerdidos) && out.r.blocosPerdidos.length === 1 && out.r.blocosPerdidos[0] === 'blocoA'
    && !!out.toastMsg && out.toastAcionavel
    && out2.scrollDepois > out.scrollAntes
    && out.blocoAFlashApos;

  console.log(ok ? '\nOK: marca pendente preservada, aviso visível e tocável, caminho de revisão funciona.' : '\nFALHOU');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
