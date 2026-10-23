#!/usr/bin/env node
/* Testa o caminho de revisão (rodada 7) pelo FLUXO REAL de carregamento
 * e troca de matéria — não chamando aplicarHighlights()/badge
 * manualmente (a crítica da rodada 6): dispara `window.RMTools
 * .prepararTodas()` (o mesmo que `iniciar()` chama no carregamento real
 * da página) e `window.switchTab(tab)` (a MESMA função que o site
 * real usa para trocar de matéria, embrulhada por rm-tools.js) — ambos
 * exportados/expostos de verdade, nenhum atalho interno.
 *
 * Os grifos são injetados pré-populando `window.RMTools.estado.porSlug`
 * e `estado.carregado` — o cache que `carregarHighlights()` já checa
 * ANTES de tentar o Supabase (ver rm-tools.js: `if (estado.carregado
 * [slug]) return ... estado.porSlug[slug]`). Isso simula "já veio do
 * banco" sem tocar rede nenhuma — a página roda com toda rede
 * bloqueada mesmo assim, para provar que nada tenta escrever nada.
 *
 * Prova as 3 queixas da rodada 6, nesta ordem:
 *   1) o aviso não desaparece sozinho (persistente, não um toast de 6s);
 *   2) tocar repetidamente passa por TODOS os blocos pendentes, não só
 *      o primeiro (cíclico);
 *   3) o aviso acompanha a matéria ATIVA ao trocar de aba pelo fluxo
 *      real (`window.switchTab`), e volta a refletir a anterior se o
 *      aluno voltar — "reencontrar" em qualquer momento, não só no
 *      instante do carregamento.
 */
const fs = require('fs');

async function main() {
  const rmToolsPath = process.argv[2];
  if (!rmToolsPath) { console.error('uso: node test_fluxo_real_pendentes.cjs <rm-tools.js>'); process.exit(2); }
  const { chromium } = require('playwright');
  const src = fs.readFileSync(rmToolsPath, 'utf-8');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e));
  let chamadasDeRede = 0;
  await page.route('**/*', (route) => { chamadasDeRede++; route.abort(); });

  await page.setContent(`<!doctype html><html><body>
    <div id="materias-container">
      <section id="tab-x" class="tab-content active">
        <div id="xb1"><p>Texto do bloco 1 de X, totalmente diferente agora.</p></div>
      </section>
      <section id="tab-y" class="tab-content">
        <div id="yb1"><p>Texto do bloco 1 de Y, também mudou.</p></div>
        <div id="yb2"><p>Texto do bloco 2 de Y, mudou igual.</p></div>
        <div id="yb3"><p>Este bloco de Y resolve normalmente, sem pendência.</p></div>
      </section>
    </div>
    <script>
      window.RM_CATALOGO = [
        { slug: 'materia-x', tab: 'x' },
        { slug: 'materia-y', tab: 'y' }
      ];
      // o mesmo contrato do switchTab real (app-core.js): troca qual
      // .tab-content tem a classe "active". rm-tools.js embrulha esta
      // função — chamar window.switchTab daqui em diante passa pelo
      // wrapper real.
      window.switchTab = function (tab) {
        document.querySelectorAll('#materias-container > .tab-content').forEach(function (el) {
          el.classList.toggle('active', el.id === 'tab-' + tab);
        });
      };
    </script>
  </body></html>`);
  await page.addScriptTag({ content: src });

  // injeta os grifos no MESMO cache que carregarHighlights() consulta
  // antes de tentar a rede — nenhuma chamada a Supabase acontece.
  await page.evaluate(() => {
    const est = window.RMTools.estado;
    est.porSlug['materia-x'] = [
      { id: 'hx1', block_id: 'xb1', exact_text: 'texto que não existe mais', prefix: '', suffix: '', occurrence: 0, color: 'red' },
    ];
    est.carregado['materia-x'] = true;
    est.porSlug['materia-y'] = [
      { id: 'hy1', block_id: 'yb1', exact_text: 'texto que já não está aqui', prefix: '', suffix: '', occurrence: 0, color: 'red' },
      { id: 'hy2', block_id: 'yb2', exact_text: 'outro texto que já não está', prefix: '', suffix: '', occurrence: 0, color: 'red' },
      { id: 'hy3', block_id: 'yb3', exact_text: 'Este bloco de Y resolve normalmente, sem pendência.', prefix: '', suffix: '', occurrence: 0, color: 'red' },
    ];
    est.carregado['materia-y'] = true;
  });

  // dispara o MESMO caminho que o carregamento real da página usa
  await page.evaluate(() => window.RMTools.prepararTodas());
  await page.waitForTimeout(80); // sincronizarAba() é async (await carregarHighlights)

  const estadoX = await page.evaluate(() => {
    const b = document.querySelector('.rm-pendentes-badge');
    return { texto: b ? b.textContent : null, visivel: b ? b.classList.contains('on') : false };
  });
  console.log('[tab-x ativa] badge:', JSON.stringify(estadoX));

  // tab-x tem só 1 bloco pendente — 2 toques seguidos devem sempre
  // apontar pro MESMO bloco (não há "próximo" de verdade, mas não pode
  // travar nem desaparecer sozinho entre os toques)
  const antesScrollX = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => document.querySelector('.rm-pendentes-badge').click());
  await page.waitForTimeout(120);
  const depoisScrollX1 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(500); // bem mais que os 2.2s/6s dos avisos antigos
  const aindaVisivelX = await page.evaluate(() => document.querySelector('.rm-pendentes-badge').classList.contains('on'));
  console.log('badge de tab-x ainda visível depois de 500ms (tinha de sumir aos 6s antes)?', aindaVisivelX);

  // troca para tab-y pelo FLUXO REAL (window.switchTab, não uma chamada interna)
  await page.evaluate(() => window.switchTab('y'));
  await page.waitForTimeout(80);
  const estadoY1 = await page.evaluate(() => {
    const b = document.querySelector('.rm-pendentes-badge');
    return { texto: b.textContent, visivel: b.classList.contains('on') };
  });
  console.log('[trocou p/ tab-y, fluxo real switchTab] badge:', JSON.stringify(estadoY1));

  // tab-y tem 2 blocos pendentes (yb1, yb2) — 3 toques devem passar
  // por yb1, yb2, e voltar a yb1 (cíclico, cobre TODOS os blocos)
  const alvos = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.querySelector('.rm-pendentes-badge').click());
    await page.waitForTimeout(120);
    const alvo = await page.evaluate(() => {
      const el = document.querySelector('.rm-flash-revisao');
      return el ? el.id : null;
    });
    alvos.push(alvo);
  }
  console.log('sequência de blocos visitados em tab-y (tocando 3x):', JSON.stringify(alvos));

  // confirma que nada foi pintado/alterado nos blocos pendentes
  const htmlIntactos = await page.evaluate(() => ({
    xb1: document.getElementById('xb1').querySelector('.rm-hl') === null,
    yb1: document.getElementById('yb1').querySelector('.rm-hl') === null,
    yb2: document.getElementById('yb2').querySelector('.rm-hl') === null,
    yb3_pintado: document.getElementById('yb3').querySelector('.rm-hl') !== null,
  }));
  console.log('blocos pendentes sem pintura (xb1/yb1/yb2) e controle positivo pintado (yb3)?', JSON.stringify(htmlIntactos));

  // volta para tab-x — "reencontrar": o aviso tem de voltar a refletir
  // tab-x, não ficar travado em tab-y
  await page.evaluate(() => window.switchTab('x'));
  await page.waitForTimeout(80);
  const estadoXDeVolta = await page.evaluate(() => {
    const b = document.querySelector('.rm-pendentes-badge');
    return { texto: b.textContent, visivel: b.classList.contains('on') };
  });
  console.log('[voltou p/ tab-x] badge:', JSON.stringify(estadoXDeVolta));

  await browser.close();

  console.log('\nchamadas de rede nesta página inteira:', chamadasDeRede, chamadasDeRede === 0 ? '(nenhuma — sem escrita em dados de alunos)' : '<<< INESPERADO');

  const ok =
    estadoX.visivel && /1\b.*marca/.test(estadoX.texto) &&
    aindaVisivelX === true &&
    estadoY1.visivel && /2\b.*marcas/.test(estadoY1.texto) &&
    alvos[0] === 'yb1' && alvos[1] === 'yb2' && alvos[2] === 'yb1' &&
    htmlIntactos.xb1 && htmlIntactos.yb1 && htmlIntactos.yb2 && htmlIntactos.yb3_pintado &&
    estadoXDeVolta.visivel && /1\b.*marca/.test(estadoXDeVolta.texto) &&
    chamadasDeRede === 0;

  console.log(ok ? '\nOK: caminho de revisão persistente, cíclico, acompanha a aba ativa pelo fluxo real, sem escrita.' : '\nFALHOU');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
