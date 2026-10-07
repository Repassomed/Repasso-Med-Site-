/* MODELO POR ITEM de uma matéria (issue #457 · validador do contrato). Somente leitura.
   Extrai de um HTML (arquivo real OU fixture de teste) a estrutura que as regras R1–R9 precisam: seções, perguntas, flashcards, figuras, vídeos, ausculta,
   ids, mídia local e números declarados. A extração roda num DOMParser (scripts NÃO executam) dentro do Chromium do Playwright;
   as regras (`regras.cjs`) são funções puras sobre este modelo, então os mesmos casos valem para as 27 matérias e para os fixtures negativos. */
'use strict';

/* função serializada: roda DENTRO da página. `html` é o texto da matéria. */
function extrair(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const limpo = s => String(s || '').replace(/\s+/g, ' ').trim();
  const norm = s => limpo(s).toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, ' ').trim();
  const tab = doc.querySelector('.tab-content[id^="tab-"]') || doc.querySelector('[id^="tab-"]') || doc.body;
  const ehInfo = f => !!(f.querySelector('figcaption') && f.querySelector('img, .s2-photo[role="img"], img.rmc-photo') && !f.closest('.material-slide, .med-image'));
  const secs = [...tab.querySelectorAll(':scope > section[id]')].map(s => {
    const h2 = s.querySelector(':scope > h2'), mk = s.querySelector(':scope > .section-marker');
    const u = /UNIDAD\s+([IVX]+)/i.exec(limpo(mk && mk.textContent));
    return {
      id: s.id, h2: limpo(h2 && h2.textContent).slice(0, 90), unidadMarcador: u ? u[1].toUpperCase() : '',
      role: s.getAttribute('data-rm-role'), n: s.getAttribute('data-rm-n'), unidad: s.getAttribute('data-rm-unidad'), agrega: s.getAttribute('data-rm-agrega'),
      quiz: [...s.querySelectorAll('.quiz-item')].map(q => ({
        id: q.id || '', q: q.getAttribute('data-rm-q'), copiaDe: q.getAttribute('data-rm-copia-de'),
        stem: norm((q.querySelector('.quiz-question') || q).textContent),
        opts: norm((q.querySelector('.options, .tf-buttons') || { textContent: '' }).textContent)
      })),
      fc: [...s.querySelectorAll('.flashcard')].map(f => ({
        fc: f.getAttribute('data-rm-fc'), copiaDe: f.getAttribute('data-rm-copia-de'),
        front: norm((f.querySelector('.fc-front') || f).textContent), back: norm((f.querySelector('.fc-back') || { textContent: '' }).textContent)
      })),
      fig: [...s.querySelectorAll('figure')].filter(ehInfo).map(f => ({ chave: norm((f.querySelector('img') || {}).getAttribute ? (f.querySelector('img').getAttribute('src') || '') : '') + '|' + norm((f.querySelector('figcaption') || {}).textContent) })),
      video: [...s.querySelectorAll('details.video-collapsible')].map(d => ({ id: d.getAttribute('data-rm-video'), chave: [...d.querySelectorAll('iframe')].map(i => i.getAttribute('src') || '').join(',') })),
      aus: [...s.querySelectorAll('.audio-player')].map(a => ({ id: a.getAttribute('data-rm-aus'), chave: (a.querySelector('audio') || { getAttribute: () => '' }).getAttribute('src') || '' }))
    };
  });
  /* números declarados à mão no texto (candidatos a deriva) */
  const decl = [];
  const re = /(\d{1,4})\s*(preguntas|cuestiones|cuestionario|flashcards|tarjetas|infograf[ií]as|bloques|esquemas|videos|sonidos)\b/gi;   // TODOS os números do texto, não só o primeiro
  const w = doc.createTreeWalker(tab, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.nodeValue; if (!t || t.length > 400) continue;
    const pe = n.parentElement; if (!pe || pe.closest('[data-rm-ui], .quiz-item, .flashcard, script, style')) continue;
    let top = pe; while (top && top.parentElement !== tab) top = top.parentElement;   // filho direto da aba que contém o texto
    const sec = top && top.tagName === 'SECTION' && top.id ? top : null;
    const capa = !!top && !sec && !/^(STYLE|SCRIPT|LINK|FOOTER)$/.test(top.tagName);   // hero/banner sem id: também é «capa»
    re.lastIndex = 0;
    for (let m; (m = re.exec(t));) decl.push({ n: +m[1], rec: m[2].toLowerCase().replace('í', 'i'), ctx: limpo(t).slice(0, 80), sec: sec ? sec.id : (capa ? '(capa)' : '') });
  }
  const ids = [...tab.querySelectorAll('[id]')].map(e => e.id);
  const media = { audio: [], img: [], video: [] };
  tab.querySelectorAll('audio').forEach(a => media.audio.push(a.getAttribute('src') || (a.querySelector('source') || { getAttribute: () => '' }).getAttribute('src') || ''));
  tab.querySelectorAll('img[src]').forEach(i => media.img.push(i.getAttribute('src')));
  tab.querySelectorAll('video source[src], video[src]').forEach(v => media.video.push(v.getAttribute('src') || ''));
  return { tabId: tab.id || '', secs, decl, ids, media };
}

async function abrirPagina(chromium) {
  const br = await chromium.launch(); const ctx = await br.newContext(); const page = await ctx.newPage();
  await page.goto('about:blank');
  return { br, page, modelar: html => page.evaluate(extrair, html), fechar: () => br.close() };
}

module.exports = { extrair, abrirPagina };
