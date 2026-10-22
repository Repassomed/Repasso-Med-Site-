#!/usr/bin/env node
/* Reconstrói os casos adversariais `advC-041`/`advC-047` a partir da SEÇÃO
 * REAL da matéria (Farmacología II, bloques f2b07 e f2b02, na base da
 * PR #474, commit 2f12e73e), em vez de isolar a linha HTML curta como um
 * "bloco" artificial — foi essa isolação que deu às duas marcações
 * prefix/suffix vazios por acidente de metodologia, não porque o registro
 * real seria assim. Com a seção completa, o prefixo e o sufixo gravados
 * por marcarRange() vêm de texto real que a existe de verdade antes/depois.
 *
 * Gera, para cada um dos dois casos, DUAS variantes adversariais:
 *   - `<id>`  — com o prefix/suffix REAIS, computados pelo indexar() de
 *     verdade (não uma aproximação em Python) sobre o texto real.
 *   - `<id>b` — os MESMOS textos, mas com prefix/suffix forçados vazios,
 *     simulando um registro antigo sem contexto gravado (ver G0/escolher()
 *     em rm-tools.js — essa é exatamente a situação que a correção desta
 *     rodada passou a tratar como "posição não segura, marca pendente").
 *
 * O texto-isca (decoy) é uma segunda ocorrência verbatim da frase antiga,
 * inserida junto de uma frase real e DIFERENTE do mesmo bloco (um
 * flashcard de recapitulação) — o padrão real de "texto de template
 * repetido" que o teste adversarial existe para flagar.
 *
 * Uso:
 *   NODE_PATH="$(npm root -g)" node rebuild_adversarial_real.cjs \
 *     <rm-tools.js> [base_commit] > adversarial_real.json
 *
 * O resultado (um array de objetos no mesmo formato de `adversarial` em
 * cases.json) deve substituir as entradas `advC-041`/`advC-047` do
 * conjunto gerado por build_cases.py antes de rodar run.cjs.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');

const FARMACO2_PATH = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/farmacologia-ii.html';

const TARGETS = [
  {
    id: 'advC-041', label: 'f2b07-fludrocortisona', sectionId: 'f2b07',
    oldPhraseNoEmoji: 'Las dos afirmaciones falsas sobre la fludrocortisona que ya cayeron',
    newPhraseNoEmoji: 'Dos afirmaciones falsas sobre la fludrocortisona',
    emoji: '🪤 ',
    decoyAnchorFront: 'Contraindicaciones de los glucocorticoides',
    decoyLeadIn: ' Repaso del cuadro-trampa: ',
  },
  {
    id: 'advC-047', label: 'f2b02-antihipertensivos', sectionId: 'f2b02',
    oldPhraseNoEmoji: 'Los dos grupos que no son antihipertensivos pero se preguntan',
    newPhraseNoEmoji: 'Dos grupos que no son antihipertensivos pero completan la clasificación',
    emoji: '🧪 11 · ',
    decoyAnchorFront: 'RAM que limita el uso de la espironolactona',
    decoyLeadIn: ' Repaso del bloque: ',
  },
];

const ENTITIES = { '&amp;': '&', '&oacute;': 'ó', '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&uacute;': 'ú', '&ntilde;': 'ñ' };
function stripTags(s) {
  s = s.replace(/<[^>]+>/g, ' ');
  for (const [k, v] of Object.entries(ENTITIES)) s = s.split(k).join(v);
  return s;
}

function extractSection(html, sectionId) {
  const re = /<section[^>]*\bid="([^"]+)"/g;
  const starts = [];
  let m;
  while ((m = re.exec(html))) starts.push({ pos: m.index, id: m[1] });
  starts.push({ pos: html.length, id: null });
  for (let i = 0; i < starts.length - 1; i++) {
    if (starts[i].id === sectionId) return html.slice(starts[i].pos, starts[i + 1].pos);
  }
  return null;
}

function extractFlashcard(html, frontMarker) {
  const re = new RegExp('<div class="flashcard"><div class="fc-front"><b>' + frontMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</b>.*?</div></div>');
  const m = html.match(re);
  if (!m) throw new Error('flashcard não encontrada: ' + frontMarker);
  return stripTags(m[0]).trim();
}

async function main() {
  const rmToolsPath = process.argv[2];
  const baseCommit = process.argv[3] || '2f12e73e6d9a2fef6c3506c672bc1b84c3374d02';
  if (!rmToolsPath) {
    console.error('uso: node rebuild_adversarial_real.cjs <rm-tools.js> [base_commit]');
    process.exit(2);
  }
  const html = execFileSync('git', ['show', baseCommit + ':' + FARMACO2_PATH], { maxBuffer: 1024 * 1024 * 50 }).toString('utf-8');
  const rmToolsSrc = fs.readFileSync(rmToolsPath, 'utf-8');

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e));
  await page.setContent('<!doctype html><html><body><div id="c"></div></body></html>');
  await page.addScriptTag({ content: rmToolsSrc });
  if (!(await page.evaluate(() => !!window.RMTools))) {
    console.error('RMTools não carregou'); process.exit(1);
  }

  const out = [];
  for (const t of TARGETS) {
    const sec = extractSection(html, t.sectionId);
    if (!sec) throw new Error('seção não encontrada: ' + t.sectionId);
    const stripped = stripTags(sec);
    const idx = stripped.indexOf(t.oldPhraseNoEmoji);
    if (idx < 0) throw new Error(t.id + ': frase não encontrada na seção real ' + t.sectionId);

    const WINDOW = 900;
    const winStart = Math.max(0, idx - WINDOW);
    const winEnd = idx + t.oldPhraseNoEmoji.length + WINDOW;
    const oldTextRaw = stripped.slice(winStart, winEnd);
    const newTextRaw = oldTextRaw.split(t.oldPhraseNoEmoji).join(t.newPhraseNoEmoji);
    const exactText = t.emoji + t.oldPhraseNoEmoji;

    const decoySentence = extractFlashcard(html, t.decoyAnchorFront);
    const decoyTextRaw = decoySentence + t.decoyLeadIn + exactText;

    // prefix/suffix REAIS: computados pelo indexar() verdadeiro, sobre o
    // texto principal ANTES da edição — exatamente o que marcarRange()
    // teria gravado se o aluno tivesse marcado esta frase nesta seção.
    const real = await page.evaluate(({ text, exact }) => {
      const c = document.getElementById('c');
      c.innerHTML = '';
      const s = document.createElement('section'); s.id = 'tmp';
      const p = document.createElement('p'); p.textContent = text;
      s.appendChild(p); c.appendChild(s);
      const idxReal = window.RMTools.indexar(s);
      const i = idxReal.norm.indexOf(exact);
      if (i < 0) return { ok: false };
      return {
        ok: true,
        prefix: idxReal.norm.slice(Math.max(0, i - 40), i),
        suffix: idxReal.norm.slice(i + exact.length, i + exact.length + 40),
      };
    }, { text: oldTextRaw, exact: exactText });
    if (!real.ok) throw new Error(t.id + ': exact_text não achado no norm real computado');

    out.push({
      id: t.id, kind: 'adversarial-within-block',
      old_text: oldTextRaw, new_text: newTextRaw, decoy_text: decoyTextRaw,
      exact_text: exactText, prefix: real.prefix, suffix: real.suffix,
      _origem: 'seção real ' + t.label + ' · ' + baseCommit,
    });
    out.push({
      id: t.id + 'b', kind: 'adversarial-within-block',
      old_text: oldTextRaw, new_text: newTextRaw, decoy_text: decoyTextRaw,
      exact_text: exactText, prefix: '', suffix: '',
      _origem: 'seção real ' + t.label + ' · ' + baseCommit + ' · registro antigo sem prefixo/sufixo (contexto forçado vazio)',
    });
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
