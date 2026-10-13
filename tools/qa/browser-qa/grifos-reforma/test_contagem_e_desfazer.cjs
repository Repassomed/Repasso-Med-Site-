#!/usr/bin/env node
/* Rodada 8 — dois defeitos novos, dois testes funcionais (nenhum por
 * inspeção textual do código: ambos disparam os caminhos REAIS de
 * produção e leem o DOM/estado resultante).
 *
 * PARTE A — contagem do aviso (queixa do usuário: "hoje ele conta blocos
 * pendentes, mas os chama de marcas"). Prova com um bloco de verdade
 * carregando DUAS marcas que não resolvem: o aviso tem de dizer "2
 * marcas", nunca "1" (que seria o nº de blocos). Usa o MESMO fluxo real
 * do test_fluxo_real_pendentes.cjs: window.RMTools.prepararTodas() +
 * window.switchTab(tab), nenhuma chamada interna manual.
 *
 * PARTE B — desfazer. Usa window.RMToolsV2.desfazer() de verdade — não
 * uma função espelho. Para chegar lá sem autenticação real: o próprio
 * arranque da V2 (arrancar→tentar→iniciar→hasStudyToolsV2Access) só
 * precisa de um uid em BETA_UIDS; window.RMTools.estado.userId já
 * cacheado evita qualquer chamada de rede (userId() devolve o cache
 * sem tocar em sb()). sb() continua null (RM_SB/_sb nunca definidos),
 * então o ramo de INSERT no Supabase de restaurarHighlight() nunca
 * executa — zero escrita, confirmado também pelo contador de rede.
 * Simula "uma marca foi apagada" empurrando o MESMO formato de operação
 * que apagarHighlight() da V2 empurra (`{tipo:'hl-del', slug, rec}`)
 * direto em window.RMToolsV2.estado.undo — não há gesto de seleção de
 * texto neste harness, mas o que se testa é o desfazer em si, que recebe
 * esse op pronto de qualquer forma. A partir daí, desfazer() roda sem
 * atalho: restaurarHighlight() → repintar() → resolverAncora() → (falha)
 * → RT().adicionarPendente().
 */
const fs = require('fs');
const path = require('path');

const JOSE = 'd4d215d3-36dd-4efb-8869-bdea5376c648'; // BETA_UIDS[0], público no código da V2

async function main() {
  const rmToolsPath = process.argv[2];
  const rmToolsV2Path = process.argv[3];
  if (!rmToolsPath || !rmToolsV2Path) {
    console.error('uso: node test_contagem_e_desfazer.cjs <rm-tools.js> <rm-tools-v2.js>');
    process.exit(2);
  }
  const { chromium } = require('playwright');
  const srcV1 = fs.readFileSync(rmToolsPath, 'utf-8');
  const srcV2 = fs.readFileSync(rmToolsV2Path, 'utf-8');

  const browser = await chromium.launch();
  let okGeral = true;

  /* ================================================================ */
  /* PARTE A — contagem: 1 bloco, 2 marcas pendentes                   */
  /* ================================================================ */
  {
    const page = await browser.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    let chamadasDeRede = 0;
    await page.route('**/*', (route) => { chamadasDeRede++; route.abort(); });

    await page.setContent(`<!doctype html><html><body>
      <div id="materias-container">
        <section id="tab-y" class="tab-content active">
          <div id="yb1"><p>Texto do bloco 1 de Y, mudou bastante desde que os grifos foram salvos.</p></div>
          <div id="yb3"><p>Este bloco de Y resolve normalmente, sem pendência.</p></div>
        </section>
      </div>
      <script>
        window.RM_CATALOGO = [{ slug: 'materia-y', tab: 'y' }];
        window.switchTab = function (tab) {
          document.querySelectorAll('#materias-container > .tab-content').forEach(function (el) {
            el.classList.toggle('active', el.id === 'tab-' + tab);
          });
        };
      </script>
    </body></html>`);
    await page.addScriptTag({ content: srcV1 });

    await page.evaluate(() => {
      const est = window.RMTools.estado;
      // DUAS marcas, MESMO block_id — o caso real confirmado em f2b02
      // (farmacologia-ii) e em 7 outros blocos de produção.
      est.porSlug['materia-y'] = [
        { id: 'hy1', block_id: 'yb1', exact_text: 'texto que já não está aqui, primeira marca', prefix: '', suffix: '', occurrence: 0, color: 'red' },
        { id: 'hy2', block_id: 'yb1', exact_text: 'texto que já não está aqui, segunda marca', prefix: '', suffix: '', occurrence: 0, color: 'green' },
        { id: 'hy3', block_id: 'yb3', exact_text: 'Este bloco de Y resolve normalmente, sem pendência.', prefix: '', suffix: '', occurrence: 0, color: 'red' },
      ];
      est.carregado['materia-y'] = true;
    });

    await page.evaluate(() => window.RMTools.prepararTodas());
    await page.waitForTimeout(80);

    const estado = await page.evaluate(() => {
      const b = document.querySelector('.rm-pendentes-badge');
      return { texto: b ? b.textContent : null, visivel: b ? b.classList.contains('on') : false };
    });
    console.log('[Parte A] badge com 1 bloco / 2 marcas pendentes:', JSON.stringify(estado));

    // clicar deve navegar dentro do ÚNICO bloco (nada de "1/2" — só 1 bloco existe)
    await page.evaluate(() => document.querySelector('.rm-pendentes-badge').click());
    await page.waitForTimeout(120);
    const alvo = await page.evaluate(() => {
      const el = document.querySelector('.rm-flash-revisao');
      return el ? el.id : null;
    });

    await browser.close ? null : null; // no-op, mantém lint feliz sem fechar o browser ainda (parte B usa outro contexto)
    await page.close();

    const condA =
      estado.visivel &&
      /2\b.*marcas pendientes/.test(estado.texto) &&   // tem de dizer "2 marcas", não "1"
      !/^1\b/.test(estado.texto.replace('📌 ', '')) &&
      alvo === 'yb1' &&
      chamadasDeRede === 0 &&
      erros.length === 0;

    console.log('texto completo do badge:', JSON.stringify(estado.texto));
    console.log('chamadas de rede (Parte A):', chamadasDeRede, '· erros de página:', erros.length);
    console.log(condA ? 'PARTE A: OK — conta MARCAS (2), não blocos (1).' : 'PARTE A: FALHOU');
    okGeral = okGeral && condA;
  }

  /* ================================================================ */
  /* PARTE B — desfazer real: window.RMToolsV2.desfazer()              */
  /* ================================================================ */
  {
    const page = await browser.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    let chamadasDeRede = 0;
    await page.route('**/*', (route) => { chamadasDeRede++; route.abort(); });

    await page.setContent(`<!doctype html><html><body>
      <div id="materias-container">
        <section id="tab-z" class="tab-content active">
          <div id="zb1"><p>Bloco que vai perder o texto da marca restaurada — já não contém mais nada daquele trecho antigo.</p></div>
          <div id="zb2"><p>Bloco que continua com o texto original intacto, a marca deve repintar aqui sem pendência.</p></div>
        </section>
      </div>
      <script>
        window.RM_CATALOGO = [{ slug: 'materia-z', tab: 'z' }];
        window.switchTab = function (tab) {
          document.querySelectorAll('#materias-container > .tab-content').forEach(function (el) {
            el.classList.toggle('active', el.id === 'tab-' + tab);
          });
        };
      </script>
    </body></html>`);
    await page.addScriptTag({ content: srcV1 });

    // cache do uid ANTES da V2 arrancar — userId() devolve o cache sem
    // tocar sb() (que é null de propósito, sem RM_SB/_sb), então
    // hasStudyToolsV2Access(uid) resolve por BETA_UIDS sem rede nenhuma.
    await page.evaluate((uid) => { window.RMTools.estado.userId = uid; }, JOSE);
    await page.evaluate(() => { window.RMTools.estado.porSlug['materia-z'] = []; window.RMTools.estado.carregado['materia-z'] = true; });
    await page.evaluate(() => window.RMTools.prepararTodas());
    await page.waitForTimeout(80);

    await page.addScriptTag({ content: srcV2 });
    await page.waitForFunction(() => !!window.RMToolsV2, { timeout: 4000 }).catch(() => {});

    const montouV2 = await page.evaluate(() => !!window.RMToolsV2);
    console.log('[Parte B] window.RMToolsV2 montado via BETA_UID (sem rede):', montouV2);

    if (montouV2) {
      // simula "um highlight acabou de ser apagado" empurrando o MESMO
      // formato de op que apagarHighlight() da V2 usa, direto na pilha
      // real de desfazer — não existe atalho de teste aqui, é a pilha
      // de verdade que window.RMToolsV2.desfazer() lê.
      await page.evaluate(() => {
        window.RMToolsV2.estado.undo.push({
          tipo: 'hl-del', slug: 'materia-z',
          rec: { id: 'z-antigo-1', block_id: 'zb1', exact_text: 'trecho antigo que não existe mais no bloco', prefix: '', suffix: '', occurrence: 0, color: 'yellow' }
        });
        window.RMToolsV2.estado.undo.push({
          // grifo = bloco inteiro (única exceção estrutural sem prefix/suffix,
          // endurecida nas rodadas 2-3): confirma a posição sem precisar de contexto.
          tipo: 'hl-del', slug: 'materia-z',
          rec: { id: 'z-antigo-2', block_id: 'zb2', exact_text: 'Bloco que continua com o texto original intacto, a marca deve repintar aqui sem pendência.', prefix: '', suffix: '', occurrence: 0, color: 'yellow' }
        });
      });

      // desfaz a 2ª marca primeiro (pilha = LIFO): deve repintar normalmente, SEM pendência
      await page.evaluate(() => window.RMToolsV2.desfazer());
      await page.waitForTimeout(150);
      const depoisRestauroOk = await page.evaluate(() => ({
        pintouZb2: document.getElementById('zb2').querySelector('.rm-hl') !== null,
        badgeOn: document.querySelector('.rm-pendentes-badge') ? document.querySelector('.rm-pendentes-badge').classList.contains('on') : false,
      }));
      console.log('depois de desfazer a marca que AINDA resolve:', JSON.stringify(depoisRestauroOk));

      // desfaz a 1ª marca: o texto mudou demais, repintar() tem de falhar
      // e adicionarPendente() tem de acrescentar ao MESMO badge
      await page.evaluate(() => window.RMToolsV2.desfazer());
      await page.waitForTimeout(150);
      const depoisRestauroPendente = await page.evaluate(() => {
        const b = document.querySelector('.rm-pendentes-badge');
        return {
          pintouZb1: document.getElementById('zb1').querySelector('.rm-hl') !== null,
          badgeTexto: b ? b.textContent : null,
          badgeOn: b ? b.classList.contains('on') : false,
        };
      });
      console.log('depois de desfazer a marca cujo texto mudou:', JSON.stringify(depoisRestauroPendente));

      // o aluno consegue reencontrar o bloco a qualquer momento: clicar no badge leva a zb1
      // (código antigo sem adicionarPendente(): o botão nem aparece — não crasheia o teste, só falha a condição abaixo)
      await page.evaluate(() => { const b = document.querySelector('.rm-pendentes-badge'); if (b) b.click(); });
      await page.waitForTimeout(120);
      const alvoClicado = await page.evaluate(() => {
        const el = document.querySelector('.rm-flash-revisao');
        return el ? el.id : null;
      });
      console.log('bloco encontrado ao tocar no caminho de revisão após o desfazer:', alvoClicado);

      const condB =
        montouV2 &&
        depoisRestauroOk.pintouZb2 === true &&
        depoisRestauroPendente.pintouZb1 === false &&     // NUNCA pinta no lugar errado — fica pendente, não chuta
        depoisRestauroPendente.badgeOn === true &&
        /1\b.*marca pendiente\b/.test(depoisRestauroPendente.badgeTexto || '') &&
        alvoClicado === 'zb1' &&
        chamadasDeRede === 0 &&
        erros.length === 0;

      console.log('chamadas de rede (Parte B):', chamadasDeRede, '· erros de página:', erros.length);
      console.log(condB ? 'PARTE B: OK — desfazer real, sem rede, sem pintar no lugar errado, badge reencontra o bloco.' : 'PARTE B: FALHOU');
      okGeral = okGeral && condB;
    } else {
      console.log('PARTE B: FALHOU — window.RMToolsV2 não montou (ver erros de página):', JSON.stringify(erros));
      okGeral = false;
    }

    await page.close();
  }

  await browser.close();
  console.log(okGeral ? '\nOK GERAL: contagem honesta (marcas != blocos) e desfazer real deixam o aluno sempre capaz de reencontrar a marca, sem rede e sem pintura incorreta.' : '\nFALHOU');
  process.exit(okGeral ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
