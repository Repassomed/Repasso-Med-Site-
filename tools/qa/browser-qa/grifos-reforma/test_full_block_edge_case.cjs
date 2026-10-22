#!/usr/bin/env node
/* Caso estrutural: a ÚNICA forma de um registro real ter `prefix` E
 * `suffix` vazios simultaneamente é o grifo cobrir o bloco INTEIRO (não
 * falta de dado — `marcarRange()` sempre grava os dois; ver rm-tools.js).
 * Consulta real ao Supabase (rodada 4, PR #484) confirmou 0/1910 grifos
 * reais nas 25 matérias elegíveis neste estado — mas o caso é possível a
 * partir de agora, e merece teste próprio:
 *
 *  A) controle positivo — bloco de um parágrafo, grifo = texto inteiro,
 *     SEM edição: tem de resolver (nada mudou, é seguro por construção —
 *     uma segunda cópia do bloco inteiro dentro do próprio bloco é
 *     impossível por comprimento).
 *  B) o mesmo grifo, texto EDITADO: tem de ficar pendente (não existe
 *     mais candidato algum).
 *  C) adversarial — o mesmo grifo (prefix/suffix vazios), mas a edição
 *     REESCREVE o parágrafo original E acrescenta um segundo parágrafo
 *     com cópia verbatim do texto antigo (decoy). Depois da edição,
 *     `norm` passa a ter mais conteúdo que o decoy sozinho, então
 *     `exact_text.length !== norm.length` — a exceção do bloco-inteiro
 *     NUNCA dispara aqui, cai no caminho normal (exige contexto) e,
 *     sem contexto gravado, fica pendente. NUNCA pode pintar no decoy.
 *
 * Uso:
 *   NODE_PATH="$(npm root -g)" node test_full_block_edge_case.cjs <rm-tools.js>
 */
const fs = require('fs');

async function main() {
  const rmToolsPath = process.argv[2];
  if (!rmToolsPath) {
    console.error('uso: node test_full_block_edge_case.cjs <rm-tools.js>');
    process.exit(2);
  }
  const { chromium } = require('playwright');
  const src = fs.readFileSync(rmToolsPath, 'utf-8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e));
  await page.route('**/*', (route) => route.abort());
  await page.setContent('<!doctype html><html><body><div id="c"></div></body></html>');
  await page.addScriptTag({ content: src });

  const out = await page.evaluate(() => {
    const c = document.getElementById('c');
    const results = {};

    {
      const sec = document.createElement('section'); sec.id = 'blk-full-unchanged';
      const p = document.createElement('p'); p.textContent = 'Hola mundo.';
      sec.appendChild(p); c.appendChild(sec);
      const idx = window.RMTools.indexar(sec);
      const h = { id: 'full-unchanged', block_id: sec.id, exact_text: idx.norm, prefix: '', suffix: '', occurrence: 0, color: 'red' };
      const a = window.RMTools.resolverAncora(sec, h);
      results.controlePositivo = { ok: !!a, nivel: a ? a.nivel : null };
      c.removeChild(sec);
    }

    {
      const sec = document.createElement('section'); sec.id = 'blk-full-edited';
      const p = document.createElement('p'); p.textContent = 'Hola mundo.';
      sec.appendChild(p); c.appendChild(sec);
      const idx = window.RMTools.indexar(sec);
      const h = { id: 'full-edited', block_id: sec.id, exact_text: idx.norm, prefix: '', suffix: '', occurrence: 0, color: 'red' };
      p.textContent = 'Hola planeta.';
      const a = window.RMTools.resolverAncora(sec, h);
      results.textoEditado = { ok: !!a, nivel: a ? a.nivel : null };
      c.removeChild(sec);
    }

    {
      const sec = document.createElement('section'); sec.id = 'blk-full-decoy';
      const p = document.createElement('p'); p.textContent = 'Texto único deste bloque.';
      sec.appendChild(p); c.appendChild(sec);
      const idx = window.RMTools.indexar(sec);
      const h = { id: 'full-decoy', block_id: sec.id, exact_text: idx.norm, prefix: '', suffix: '', occurrence: 0, color: 'red' };
      p.textContent = 'Este párrafo fue reescrito por completo.';
      const pDecoy = document.createElement('p'); pDecoy.textContent = 'Texto único deste bloque.';
      sec.appendChild(pDecoy);
      const a = window.RMTools.resolverAncora(sec, h);
      let landedIn = null;
      if (a) {
        const r = window.RMTools.rangeDe(a.idx, a.ini, a.fim);
        if (r && window.RMTools.pintar(r, h.color, 'c-full-decoy', a.nivel === 3)) {
          const sp = sec.querySelector('.rm-hl[data-hl="c-full-decoy"]');
          landedIn = sp ? (pDecoy.contains(sp) ? 'decoy' : (p.contains(sp) ? 'main' : 'outro')) : null;
          window.RMTools.despintar('c-full-decoy', sec);
        }
      }
      results.adversarialComDecoy = { ok: !!a, landedIn };
      c.removeChild(sec);
    }

    return results;
  });

  await browser.close();

  console.log('A) controle positivo (texto inalterado, tem de resolver): ' + JSON.stringify(out.controlePositivo) + (out.controlePositivo.ok ? '  OK' : '  <<< FALHOU'));
  console.log('B) texto editado (tem de ficar pendente): ' + JSON.stringify(out.textoEditado) + (!out.textoEditado.ok ? '  OK' : '  <<< FALHOU'));
  const wrong = out.adversarialComDecoy.landedIn === 'decoy';
  console.log('C) adversarial com decoy (NUNCA pode pintar em "decoy"): ' + JSON.stringify(out.adversarialComDecoy) + (wrong ? '  <<< PINTOU NA ISCA' : '  OK'));

  const failed = !out.controlePositivo.ok || out.textoEditado.ok || wrong;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
