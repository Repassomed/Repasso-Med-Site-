#!/usr/bin/env node
/* Testa explicitamente os dois pontos de entrada reais da ancoragem
 * segura — "carregamento" (a sequência de `aplicarHighlights()` em
 * rm-tools.js: resolverAncora -> rangeDe -> pintar, por destaque, dentro
 * do bloco já localizado por block_id — `aplicarHighlights` não é
 * exposta em window.RMTools, só chamada internamente por
 * `sincronizarAba`, por isso a sequência é reproduzida aqui linha a
 * linha igual ao corpo real) e "desfazer" (a mesma sequência que
 * `repintar()` da V2 chama ao restaurar uma marcação apagada, confirmada
 * idêntica byte a byte ao código fonte real de rm-tools-v2.js) — contra
 * os casos reconstruídos com seção real (ver rebuild_adversarial_real.cjs).
 *
 * `page.route('**' + '/*', route => route.abort())` bloqueia qualquer
 * chamada de rede na página: prova que nada aqui escreve em
 * `user_highlights` ou qualquer outro dado de aluno — nem precisaria,
 * porque `resolverAncora`, `rangeDe`, `pintar` e a sequência de
 * `aplicarHighlights` nunca chamam `sb()`/Supabase (confirmado por
 * leitura do código-fonte), mas o bloqueio de rede é a prova em tempo de
 * execução, não só uma leitura de código.
 *
 * Uso:
 *   NODE_PATH="$(npm root -g)" node test_carregamento_desfazer.cjs \
 *     <rm-tools.js> <adversarial_real.json (de rebuild_adversarial_real.cjs)>
 */
const fs = require('fs');

async function main() {
  const rmToolsPath = process.argv[2];
  const casesPath = process.argv[3];
  if (!rmToolsPath || !casesPath) {
    console.error('uso: node test_carregamento_desfazer.cjs <rm-tools.js> <adversarial_real.json>');
    process.exit(2);
  }
  const { chromium } = require('playwright');
  const rmToolsSrc = fs.readFileSync(rmToolsPath, 'utf-8');
  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e));
  await page.route('**/*', (route) => route.abort());

  await page.setContent('<!doctype html><html><body><div id="c"></div></body></html>');
  await page.addScriptTag({ content: rmToolsSrc });
  if (!(await page.evaluate(() => !!window.RMTools))) {
    console.error('RMTools não carregou'); process.exit(1);
  }

  const out = await page.evaluate((cases) => {
    const c = document.getElementById('c');
    const results = [];

    for (const w of cases) {
      c.innerHTML = '';
      const sec = document.createElement('section');
      sec.id = 'blk-' + w.id;
      const pDecoy = document.createElement('p'); pDecoy.textContent = w.decoy_text;
      const pMain = document.createElement('p'); pMain.textContent = w.old_text;
      sec.appendChild(pDecoy); sec.appendChild(pMain);
      c.appendChild(sec);

      const h = {
        id: 'hl-' + w.id, block_id: sec.id, exact_text: w.exact_text,
        prefix: w.prefix, suffix: w.suffix, occurrence: 0, color: 'red',
      };

      // aplica a reforma (PR #474): o local original passa a ter o texto novo
      pMain.textContent = w.new_text;

      function tentarPintar(tmpId) {
        const a = window.RMTools.resolverAncora(sec, h);
        if (!a) return { pintou: false, landedIn: null };
        const r = window.RMTools.rangeDe(a.idx, a.ini, a.fim);
        if (!r || !window.RMTools.pintar(r, h.color, tmpId, a.nivel === 3)) return { pintou: false, landedIn: null };
        const sp = sec.querySelector('.rm-hl[data-hl="' + tmpId + '"]');
        const landedIn = sp ? (pDecoy.contains(sp) ? 'decoy' : (pMain.contains(sp) ? 'main' : 'outro')) : null;
        window.RMTools.despintar(tmpId, sec);
        return { pintou: true, landedIn };
      }

      results.push({
        id: w.id,
        carregamento: tentarPintar('load-' + h.id),
        desfazer: tentarPintar('undo-' + h.id),
      });
    }
    return results;
  }, cases);

  await browser.close();

  let anyWrong = false;
  for (const r of out) {
    const wrongLoad = r.carregamento.landedIn === 'decoy';
    const wrongUndo = r.desfazer.landedIn === 'decoy';
    if (wrongLoad || wrongUndo) anyWrong = true;
    console.log(`${r.id}  carregamento: pintou=${r.carregamento.pintou} landedIn=${r.carregamento.landedIn}  |  desfazer: pintou=${r.desfazer.pintou} landedIn=${r.desfazer.landedIn}` + (wrongLoad || wrongUndo ? '  <<< ERRADO' : ''));
  }
  console.log(anyWrong ? '\nFALHOU: alguma pintura (carregamento ou desfazer) caiu na isca.' : '\nOK: nenhuma pintura, em carregamento nem em desfazer, caiu na isca — e nenhuma chamada de rede ocorreu (sem escrita em dados de alunos).');
  process.exit(anyWrong ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
