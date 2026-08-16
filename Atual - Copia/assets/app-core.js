/* =====================================================================
   REPASSO MED · app-core.js  (v2)
   (1) Interações: abas, revelar resposta, MCQ clicável, V/F
   (2) Camada de padronização NÃO-DESTRUTIVA:
       - normaliza TODA questão de múltipla escolha (com alternativas)
         para o formato clicável (certo/errado + explicação)
       - padroniza etiquetas OFICIAL (de prova) × VARIANTE (derivada)
       - blocos com cabeçalho numerado + índice lateral
       - vídeos com destaque (mantidos colapsáveis, junto ao conteúdo)
       - marca a "Revisão Geral" reaproveitando o banco final já existente
   ===================================================================== */

/* ============================ (1) INTERAÇÕES ============================ */
function switchTab(tab) {
  document.querySelectorAll('.main-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === tab); });
  document.querySelectorAll('.tab-content').forEach(function(c){ c.classList.toggle('active', c.id === 'tab-' + tab); });
  document.body.dataset.tab = tab;
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function toggleAnswer(btn) {
  var answer = btn.nextElementSibling;
  var isShown = answer.classList.toggle('show');
  btn.classList.toggle('shown');
  btn.textContent = isShown ? 'Ocultar respuesta' : 'Ver respuesta';
}

function _revealAnswer(item){
  var answer = item.querySelector('.answer');
  if (!answer) return;
  setTimeout(function(){
    answer.classList.add('show');
    var rect = answer.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) answer.scrollIntoView({behavior:'smooth', block:'nearest'});
  }, 650);
}

function checkAnswer(optEl) {
  var item = optEl.closest('.quiz-item');
  if (!item || item.classList.contains('answered')) return;
  item.classList.add('answered');
  var correct = (item.dataset.correct || '').toLowerCase();
  var chosen = (optEl.dataset.option || '').toLowerCase();
  var isCorrect = chosen === correct;
  item.querySelectorAll('.interactive-options li').forEach(function(li){
    var lo = (li.dataset.option || '').toLowerCase();
    if (lo === correct) li.classList.add('correct');
    if (li === optEl && !isCorrect) li.classList.add('wrong');
  });
  var feedback = document.createElement('div');
  feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');
  feedback.innerHTML = isCorrect
    ? '<span class="quiz-feedback-icon">✅</span><span>¡CORRECTO!</span>'
    : '<span class="quiz-feedback-icon">❌</span><span>¡INCORRECTO! La correcta era la opción ' + correct.toUpperCase() + '.</span>';
  var ul = item.querySelector('.interactive-options');
  ul.parentNode.insertBefore(feedback, ul.nextSibling);
  _revealAnswer(item);
}

function checkTF(btn, expected) {
  var item = btn.closest('.quiz-item');
  if (!item || item.classList.contains('answered')) return;
  item.classList.add('answered');
  var chosen = btn.dataset.tf === 'V';
  var isCorrect = chosen === expected;
  item.querySelectorAll('.tf-btn').forEach(function(b){
    b.disabled = true;
    if ((b.dataset.tf === 'V') === expected) b.classList.add('correct');
    if (b === btn && !isCorrect) b.classList.add('wrong');
  });
  var feedback = document.createElement('div');
  feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');
  feedback.innerHTML = isCorrect
    ? '<span class="quiz-feedback-icon">✅</span><span>¡CORRECTO! Es ' + (expected ? 'VERDADERO' : 'FALSO') + '.</span>'
    : '<span class="quiz-feedback-icon">❌</span><span>¡INCORRECTO! Lo correcto es ' + (expected ? 'VERDADERO' : 'FALSO') + '.</span>';
  var tfBtns = item.querySelector('.tf-buttons');
  tfBtns.parentNode.insertBefore(feedback, tfBtns.nextSibling);
  _revealAnswer(item);
}

/* =================== (2) PADRONIZAÇÃO REPASSO MED =================== */
var RepassoMed = (function(){

  function pad(n){ return (n < 10 ? '0' : '') + n; }

  function leadingLetter(txt){
    var m = (txt || '').trim().match(/^([a-eA-E])\s*[\)\.\-:]/);
    return m ? m[1].toLowerCase() : null;
  }

  function normalizeOne(item){
    if (item.classList.contains('interactive') || item.dataset.correct) return;
    var ul = item.querySelector('ul.options');
    if (!ul || ul.classList.contains('interactive-options')) return;
    var ans = item.querySelector('.answer');
    if (!ans) return;

    var correct = null;
    var strongs = ans.querySelectorAll('strong');
    for (var i = 0; i < strongs.length; i++){
      var L = leadingLetter(strongs[i].textContent);
      if (L){ correct = L; break; }
    }
    if (!correct){
      var mm = ans.textContent.match(/([a-eA-E])\s*[\)\.]/);
      if (mm) correct = mm[1].toLowerCase();
    }
    if (!correct) return;

    var lis = ul.querySelectorAll(':scope > li');
    lis.forEach(function(li, idx){
      var raw = li.innerHTML.trim();
      var letter = leadingLetter(li.textContent) || String.fromCharCode(97 + idx);
      var body = raw.replace(/^\s*[a-eA-E]\s*[\)\.\-:]\s*/, '');
      li.dataset.option = letter;
      li.setAttribute('onclick', 'checkAnswer(this)');
      li.innerHTML = '<span class="opt-letter">' + letter.toUpperCase() + ')</span> ' + body;
    });
    ul.classList.add('interactive-options');
    item.classList.add('interactive');
    item.dataset.correct = correct;

    var btn = item.querySelector('.reveal-btn');
    if (btn) btn.remove();
  }

  function normalizeQuizzes(scope){ scope.querySelectorAll('.quiz-item').forEach(normalizeOne); }


  /* ---------------------------------------------------------------
     IDENTIDAD VISUAL ÚNICA (v4)
     Cada materia nació con su propio vocabulario de clases
     (ap2-postit, s2-flow, an-pill…). Acá se traduce al canónico
     rmc-* y se marca la raíz con .rm-cuaderno, que es lo que
     enciende el design system global de styles.css.
     La clase original NO se borra: si una materia tiene un ajuste
     propio, sigue existiendo; el CSS global simplemente gana por
     especificidad.
     --------------------------------------------------------------- */
  var RMC_PARTS = ['gl-close','postit','margin','detalle','biblio','scroll',
                   'photo','stub','trap','zoom','arrow','bank','exam','flow',
                   'freq','hero','hint','note','pill','cap','fig','bar','gl','ico'];
  var RMC_RE = new RegExp('^[a-z0-9]{1,8}-(' + RMC_PARTS.join('|') + ')$');

  /* Sólo las materias llevan el cuaderno. #rm-home (portada) y #rm-store
     (tienda) también son .tab-content dentro de #materias-container, pero
     tienen su propio diseño: si les aplicáramos la piel, el h2 del bloque
     final oscuro pasaría a azul marino sobre azul marino (ilegible) y
     reaparecería la barra degradada bajo cada título. Las pestañas de
     materia siempre tienen id "tab-XXXX". */
  function adoptCuaderno(tabEl){
    if (!/^tab-/.test(tabEl.id || '')) return;
    tabEl.classList.add('rm-cuaderno');
    if (tabEl.dataset.rmSkin) return;
    tabEl.dataset.rmSkin = '1';
    tabEl.querySelectorAll('[class]').forEach(function(el){
      var add = null;
      for (var i = 0; i < el.classList.length; i++){
        var c = el.classList[i];
        if (c.indexOf('rmc-') === 0) { add = null; break; }
        var m = RMC_RE.exec(c);
        if (m) add = 'rmc-' + m[1];
      }
      if (add) el.classList.add(add);
    });
  }
  /* ---------------------------------------------------------------
     NOMENCLATURA ESTÁNDAR (v4)
     Unifica el rótulo de las preguntas en TODAS las materias, sin
     tocar el contenido: "Pregunta de examen", "⭐ CAYÓ EN EXAMEN",
     "PRUEBA REAL"… -> "Basada en preguntas de examen".
     "Variante", "🔁 EXTRA / EXAMEN"… -> "Pregunta complementaria".
     Sólo se reescribe el TEXTO DEL RÓTULO (.quiz-tag), nunca la prosa:
     "variante folicular" y demás términos médicos quedan intactos.
     --------------------------------------------------------------- */
  var TAG_BASE = 'Basada en preguntas de examen';
  var TAG_VF   = 'Verdadero o falso · basada en examen';
  var TAG_COMP = 'Pregunta complementaria';

  function isVF(tag){
    var t = (tag.textContent || '').toLowerCase();
    if (tag.classList.contains('vf')) return true;
    if (/verdadero\s*o\s*falso|\bv\s*\/\s*f\b/.test(t)) return true;
    var item = tag.closest ? tag.closest('.quiz-item') : null;
    return !!(item && item.querySelector('.tf-buttons'));
  }

  function unifyTags(scope){
    scope.querySelectorAll('.quiz-tag').forEach(function(tag){
      if (tag.dataset.rmTag) return;
      var cls = tag.className || '';
      var txt = (tag.textContent || '').toLowerCase();

      var esBase = /\b(oficial|basada|prova-real|prueba-real|examen-real)\b/.test(cls) ||
                   /cay[óo] en examen|pregunta de examen|prueba real|examen real|pregunta oficial/.test(txt);
      var esComp = /\b(variante|complementaria|extra)\b/.test(cls) ||
                   /^\s*(🔁\s*)?(variante|extra)\b/.test(txt);

      if (!esBase && !esComp) return;              // MCQ, CASO, CITE… no se tocan

      if (esBase){
        tag.classList.add('oficial');
        tag.classList.remove('variante');
        tag.textContent = isVF(tag) ? TAG_VF : TAG_BASE;
      } else {
        tag.classList.add('variante');
        tag.classList.remove('oficial');
        tag.textContent = TAG_COMP;
      }
      tag.dataset.rmTag = '1';
    });
  }

  /* Rótulos y subtítulos: mismo criterio, aplicado SÓLO a encabezados
     y bajadas cortas (nunca al cuerpo del texto). */
  var HEAD_FIXES = [
    [/⭐\s*/g, ''],
    [/🔁\s*/g, ''],
    [/banco de preguntas oficiales?/gi, 'Banco de preguntas basadas en exámenes'],
    [/preguntas oficiales?/gi, 'preguntas basadas en exámenes'],
    [/\(\s*recordadas de la evaluaci[óo]n\s*\)/gi, ''],
    [/\s*[—-]\s*recordadas de la evaluaci[óo]n/gi, ''],
    [/cay[óo] en examen/gi, 'Basada en preguntas de examen'],
    [/\b(?:las|los)?\s*pruebas? reales?(?:\s+de la c[áa]tedra)?/gi, 'exámenes de la cátedra'],
    [/\b(?:los)?\s*ex[áa]menes reales(?:\s+de la c[áa]tedra)?/gi, 'exámenes de la cátedra'],
    [/\b(?:las)?\s*preguntas reales/gi, 'preguntas basadas en exámenes'],
    [/^(\s*)variantes\b/i, '$1Preguntas complementarias'],
    [/\bvariantes\s*\(creadas a partir del an[áa]lisis\)/gi, 'Preguntas complementarias']
  ];
  function unifyHeadings(scope){
    var sel = 'h2, h3, h4, h5, .quiz-section > p, .rm-bank-sub, [class$="-bank-sub"], .section-marker';
    scope.querySelectorAll(sel).forEach(function(el){
      if (el.dataset.rmHead) return;
      el.dataset.rmHead = '1';
      var t = el.textContent || '';
      if (!t || t.length > 160) return;            // sólo rótulos cortos
      var out = t;
      HEAD_FIXES.forEach(function(f){ out = out.replace(f[0], f[1]); });
      out = out.replace(/\s{2,}/g, ' ').replace(/\s+([·,.])/g, '$1').trim();
      if (out !== t && el.children.length === 0) el.textContent = out;
    });
  }

  function kickerFromBlock(block){
    var m = block.querySelector('.section-marker-num');
    if (m){ var t = m.textContent.replace(/^[\s—–-]+/, '').trim(); if (t) return t.replace(/BLOCO/gi,'BLOQUE').replace(/UNIDADE/gi,'UNIDAD'); }
    return 'Tema';
  }
  function decorateBlock(block, index){
    if (block.dataset.rmBlock) return;
    block.dataset.rmBlock = '1';
    var h2 = block.querySelector('h2');
    if (!h2) return;
    var head = document.createElement('div');
    head.className = 'rm-block-head';
    head.innerHTML = '<span class="rm-block-num">' + pad(index) + '</span>' +
                     '<span class="rm-block-kicker">' + kickerFromBlock(block) + '</span>';
    h2.parentNode.insertBefore(head, h2);
  }

  function enhanceVideos(scope){
    scope.querySelectorAll('details.video-collapsible').forEach(function(d){
      var n = d.querySelectorAll('iframe').length;
      if (!n) return;
      var sum = d.querySelector('summary');
      if (sum && sum.dataset.rmV !== '1'){
        sum.dataset.rmV = '1';
        var extra = sum.textContent.trim().replace(/^▶️?\s*/, '');
        sum.innerHTML = '🎥 Videos de Apoyo · ' + n + (n > 1 ? ' videos' : ' video') +
                        (extra ? ' — ' + extra : '');
      }
    });
  }

  function buildTOC(blocks){
    var nav = document.createElement('nav');
    nav.className = 'rm-menu';
    var items = '';
    blocks.forEach(function(b, i){
      var h2 = b.querySelector('h2');
      if (!h2 || !b.id) return;
      var label = h2.textContent.replace(/^[⭐🎥🔥📚\s]+/, '').trim();
      items += '<a href="#' + b.id + '" data-target="' + b.id + '">' +
                 '<span class="rm-menu-num">' + pad(i + 1) + '</span>' +
                 '<span class="rm-menu-label">' + label + '</span>' +
               '</a>';
    });
    nav.innerHTML =
      '<button class="rm-menu-btn" type="button" aria-label="Abrir índice" aria-expanded="false">' +
        '<span class="rm-menu-bars"><i></i><i></i><i></i></span>' +
        '<span class="rm-menu-btn-text">Índice</span>' +
      '</button>' +
      '<div class="rm-menu-panel" role="menu">' +
        '<div class="rm-menu-head">En esta asignatura</div>' +
        '<div class="rm-menu-list">' + items + '</div>' +
      '</div>';
    return nav;
  }

  function markRevisao(scope){
    var sections = Array.prototype.slice.call(scope.querySelectorAll(':scope > section'));
    var isBank = function(s){
      if (!s.id) return false;
      if (/^(prova|simulado|revisao|cuestionario|banco)/i.test(s.id)) return true;
      var h2 = s.querySelector('h2');
      return h2 && /banco de quest|prova oficial|avalia|revis|simulado/i.test(h2.textContent);
    };
    var banks = sections.filter(isBank);
    if (!banks.length) return;

    var first = banks[0];
    var total = scope.querySelectorAll('.quiz-item').length;
    var oficial = scope.querySelectorAll('.quiz-tag.oficial, .quiz-tag.prova-real').length;
    var variante = scope.querySelectorAll('.quiz-tag.variante').length;

    var banner = document.createElement('div');
    banner.className = 'rm-revisao-banner';
    banner.id = 'revisao-geral';
    banner.innerHTML =
      '<div class="rm-revisao-kicker">🎯 Modo examen</div>' +
      '<h2>Repaso General · Simulacro</h2>' +
      '<p>Todas las preguntas de la asignatura reunidas para repaso activo. Hacé clic en las alternativas para corregir al instante.</p>' +
      '<div class="rm-revisao-stats">' +
        '<div class="rm-stat"><b>' + total + '</b><span>Preguntas</span></div>' +
        (oficial ? '<div class="rm-stat"><b>' + oficial + '</b><span>De examen</span></div>' : '') +
        (variante ? '<div class="rm-stat"><b>' + variante + '</b><span>Variantes</span></div>' : '') +
      '</div>';
    first.parentNode.insertBefore(banner, first);
    banks.forEach(function(b){ b.classList.add('rm-bank'); });
  }

  function setupMenu(tabEl, nav){
    var btn = nav.querySelector('.rm-menu-btn');
    var panel = nav.querySelector('.rm-menu-panel');
    function open(){ nav.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
    function close(){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
    function toggle(){ nav.classList.contains('open') ? close() : open(); }
    btn.addEventListener('click', function(e){ e.stopPropagation(); toggle(); });
    // clicar num bloco: navega e fecha
    panel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ close(); });
    });
    // clicar fora fecha
    document.addEventListener('click', function(e){
      if (nav.classList.contains('open') && !nav.contains(e.target)) close();
    });
    // ESC fecha
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  }

  function setupScrollSpy(tabEl){
    var links = tabEl.querySelectorAll('.rm-menu a');
    if (!links.length) return;
    var map = {};
    links.forEach(function(a){
      var id = a.getAttribute('href').slice(1);
      var t = document.getElementById(id);
      if (t) map[id] = a;
    });
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          links.forEach(function(l){ l.classList.remove('active'); });
          var a = map[e.target.id];
          if (a){ a.classList.add('active'); a.scrollIntoView({block:'nearest', inline:'nearest'}); }
        }
      });
    }, { rootMargin: '-130px 0px -65% 0px', threshold: 0 });
    Object.keys(map).forEach(function(id){
      var t = document.getElementById(id);
      if (t) obs.observe(t);
    });
  }

  function enhanceTab(tabEl){
    if (tabEl.dataset.rmDone) return;
    tabEl.dataset.rmDone = '1';

    adoptCuaderno(tabEl);
    normalizeQuizzes(tabEl);
    unifyTags(tabEl);
    unifyHeadings(tabEl);
    enhanceVideos(tabEl);

    var blocks = Array.prototype.slice.call(tabEl.querySelectorAll(':scope > section.container, :scope > section.container-wide'))
      .filter(function(s){ return s.id && s.querySelector('h2') && !s.classList.contains('locked-content'); });

    if (!blocks.length) return;

    blocks.forEach(function(b, i){ decorateBlock(b, i + 1); });

    // menu hambúrguer flutuante (um por matéria)
    var nav = buildTOC(blocks);
    tabEl.insertBefore(nav, tabEl.firstChild);
    setupMenu(tabEl, nav);

    markRevisao(tabEl);
    setupScrollSpy(tabEl);
  }

  function enhanceAll(){
    document.querySelectorAll('#materias-container > .tab-content').forEach(enhanceTab);
  }

  return { enhanceAll: enhanceAll, enhanceTab: enhanceTab, normalizeQuizzes: normalizeQuizzes };
})();

window.RepassoMed = RepassoMed;

/* =====================================================================
   REPASSO MED · módulo interactivo (anatomía patológica práctica) v2
   - Atlas interactivo (tocar números → zoom HD + leyenda + flecha)
   - Flashcards en modo juego: girar / navegar / barajar / progreso / loop
   - Reverso de láminas con 4 aspectos revelables por clic
     (Órgano · Proceso · Descripción · Diagnóstico)
   - Ruleta de láminas (todas las vistas, orden aleatorio)
   Aditivo: envuelve RepassoMed.enhanceAll, no toca lo anterior.
   ===================================================================== */
(function(){
  if(!window.RepassoMed) return;

  function injectCSS(){
    if(document.getElementById('rm-interactive-css')) return;
    var css = `
.rmimg{background-size:contain;background-position:center;background-repeat:no-repeat;background-color:#0d0d12}
/* ---------- ATLAS ---------- */
.rmatlas{margin:0 0 16px;border:1px solid #ead9c6;border-radius:14px;overflow:hidden;background:#fff}
.rmatlas-h{background:linear-gradient(135deg,#4a2030,#7d3a52);color:#fff;padding:9px 14px;font-size:.9rem}
.rmatlas-h b{color:#ffd23f;letter-spacing:.5px}
.rmatlas-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px;align-items:start}
@media(max-width:760px){.rmatlas-grid{grid-template-columns:1fr}}
.rmatlas-overview{position:relative;border-radius:12px;overflow:hidden;background:#000;line-height:0}
.rmatlas-base{width:100%;display:block}
.rmatlas-pt{position:absolute;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;
  border:2px solid #fff;background:rgba(192,57,43,.92);color:#fff;font:800 14px/1 Inter,sans-serif;
  cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.55);transition:transform .15s,background .15s;z-index:2;
  display:flex;align-items:center;justify-content:center;padding:0}
.rmatlas-pt:hover{background:#c0392b;transform:translate(-50%,-50%) scale(1.18)}
.rmatlas-pt.active{background:#ffd23f;color:#4a2030;border-color:#4a2030;transform:translate(-50%,-50%) scale(1.2)}
.rmatlas-hint{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);background:rgba(13,13,18,.8);
  color:#fff;font:700 .66rem/1 Inter,sans-serif;padding:6px 12px;border-radius:999px;letter-spacing:.6px;pointer-events:none;z-index:3}
.rmatlas.opened .rmatlas-hint{opacity:.4}
.rmatlas-detail{display:flex;flex-direction:column;gap:10px}
.rmatlas-zoomstage{position:relative;width:100%;aspect-ratio:1/1;background:#0d0d12;border-radius:12px;overflow:hidden}
.rmatlas-zoomimg{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;transform-origin:0 0;transition:transform .4s cubic-bezier(.4,0,.2,1)}
.rmatlas-zhint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#b79;font:600 .92rem Inter,sans-serif;text-align:center;padding:22px}
.rmatlas.opened .rmatlas-zhint{display:none}
.rmatlas-legend{font:800 1.02rem/1.2 Fraunces,Georgia,serif;color:#4a2030;display:flex;align-items:center;gap:9px;min-height:1.2em}
.rmatlas-legend .rmatlas-badge{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:#7d3a52;color:#fff;font:800 .82rem/1 Inter,sans-serif;display:flex;align-items:center;justify-content:center}
.rmatlas-expl{font-size:.92rem;line-height:1.5;color:#3a2630}
/* ---------- lanzador ---------- */
.rmfc-launch{margin:14px 0}
.rmfc-cover{display:flex;align-items:center;gap:14px;padding:17px 19px;border-radius:16px;background:linear-gradient(135deg,#c0392b,#8e2a1f);color:#fff;box-shadow:0 6px 22px rgba(192,57,43,.34);border:1px solid #e0604f}
.rmfc-cover-n{color:#ffe1da}
.rmfc-roulette .rmfc-cover{background:linear-gradient(135deg,#8e2a1f,#4a2030);border:2px solid #ffd23f;box-shadow:0 8px 26px rgba(142,42,31,.45)}
.rm-menu a[data-target="b12"]{background:linear-gradient(135deg,#c0392b,#8e2a1f);color:#fff;font-weight:800}
.rm-menu a[data-target="b12"] .rm-menu-num{background:#ffd23f;color:#4a2030}
.rm-menu a[data-target="b12"]:hover{filter:brightness(1.08)}
.rm-menu a[data-target="b11"]{background:rgba(192,57,43,.12)}
.rm-menu a[data-target="b11"] .rm-menu-num{background:#c0392b;color:#fff}
.rmfc-cover-ico{font-size:2rem;line-height:1}
.rmfc-cover-meta{flex:1;min-width:0}
.rmfc-cover-t{font:800 1.05rem/1.2 Fraunces,Georgia,serif}
.rmfc-cover-n{font:600 .78rem Inter,sans-serif;color:#ffe1da;margin-top:2px}
.rmfc-play{flex:0 0 auto;background:#ffd23f;color:#4a2030;border:none;border-radius:999px;padding:11px 20px;font:800 .95rem Inter,sans-serif;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.25);transition:transform .12s}
.rmfc-play:hover{transform:translateY(-2px)}
/* ---------- overlay del juego ---------- */
.rmfc-overlay{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(13,8,14,.78);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.rmfc-overlay.show{display:flex;animation:rmfcIn .2s ease}
@keyframes rmfcIn{from{opacity:0}to{opacity:1}}
.rmfc-panel{position:relative;width:min(720px,94vw);max-height:92vh;display:flex;flex-direction:column;gap:12px;background:#1a1016;border:1px solid #5a3245;border-radius:20px;padding:16px 16px 18px;box-shadow:0 24px 70px rgba(0,0,0,.6)}
.rmfc-top{display:flex;align-items:center;gap:10px;color:#f0dfe7}
.rmfc-title{font:800 .98rem/1.2 Fraunces,Georgia,serif;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rmfc-prog{font:800 .82rem Inter,sans-serif;background:#7d3a52;color:#fff;padding:4px 11px;border-radius:999px}
.rmfc-tools{display:flex;gap:6px}
.rmfc-ic{width:34px;height:34px;border-radius:10px;border:1px solid #5a3245;background:#2a1a23;color:#f0dfe7;font-size:1rem;cursor:pointer;transition:.12s;display:flex;align-items:center;justify-content:center}
.rmfc-ic:hover{background:#7d3a52;border-color:#7d3a52}
.rmfc-card{perspective:1400px;cursor:pointer;flex:1;min-height:340px;display:flex}
.rmfc-inner{position:relative;width:100%;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.4,0,.2,1)}
.rmfc-inner.flipped{transform:rotateY(180deg)}
.rmfc-card.slideL{animation:rmfcSL .32s ease}
.rmfc-card.slideR{animation:rmfcSR .32s ease}
@keyframes rmfcSL{from{opacity:.2;transform:translateX(34px)}to{opacity:1;transform:translateX(0)}}
@keyframes rmfcSR{from{opacity:.2;transform:translateX(-34px)}to{opacity:1;transform:translateX(0)}}
.rmfc-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#fff;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:18px;overflow:auto}
.rmfc-front{color:#2a1a23}
.rmfc-back{transform:rotateY(180deg);background:linear-gradient(180deg,#6a2f44,#4a2030);color:#fff;justify-content:flex-start}
.rmfc-face .fc-hint{display:none}
.rmfc-face .fc-img{width:100%;height:44vh;border-radius:10px;margin-bottom:10px}
.rmfc-face img{max-width:100%;max-height:44vh;width:auto;border-radius:10px;border:1px solid #e3d3c4;object-fit:contain;margin-bottom:10px;background:#000}
.rmfc-face .fc-q{display:block;font:700 1.02rem Fraunces,Georgia,serif;color:#7d3a52;margin-top:4px}
.rmfc-back .fc-q{color:#ffd6e3}
.rmfc-face .fc-sub,.rmfc-face .fc-clave,.rmfc-face .fc-matcap{display:block;margin-top:6px;font-size:.92rem;line-height:1.45}
.rmfc-face b{font:800 1.18rem Fraunces,Georgia,serif;color:#4a2030}
.rmfc-back b{color:#fff}
/* reveal de aspectos */
.rev-list{display:flex;flex-direction:column;gap:9px;width:100%;max-width:460px;margin:6px auto 0}
.rev{display:flex;flex-direction:column;text-align:left;border:none;border-radius:11px;background:rgba(255,255,255,.16);color:#fff;padding:11px 14px;cursor:pointer;font:inherit;transition:background .15s}
.rev:hover{background:rgba(255,255,255,.27)}
.rev-k{font-weight:800;font-size:.93rem;display:flex;justify-content:space-between;align-items:center;gap:10px}
.rev-k::after{content:"＋";opacity:.8}
.rev.open .rev-k::after{content:"−"}
.rev-v{max-height:0;overflow:hidden;opacity:0;transition:max-height .3s,opacity .3s,margin .3s;font-size:.9rem;line-height:1.45;font-weight:600}
.rev.open .rev-v{max-height:280px;opacity:1;margin-top:7px}
.rmfc-bar{height:6px;background:#3a2430;border-radius:999px;overflow:hidden}
.rmfc-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd23f,#c0392b);transition:width .3s}
.rmfc-nav{display:flex;gap:10px}
.rmfc-btn{flex:1;padding:13px;border:none;border-radius:12px;background:#2a1a23;color:#f0dfe7;font:800 .95rem Inter,sans-serif;cursor:pointer;transition:.12s;border:1px solid #5a3245}
.rmfc-btn:hover{background:#3a2430}
.rmfc-flip{background:#ffd23f;color:#4a2030;border-color:#ffd23f;flex:1.3}
.rmfc-flip:hover{background:#ffdf6b}
.rmfc-hintkeys{text-align:center;color:#9a7d8a;font:600 .68rem Inter,sans-serif}
@media(max-width:600px){.rmfc-hintkeys{display:none}.rmfc-face .fc-img,.rmfc-face img{height:38vh;max-height:38vh}}
.rmfc-toast{position:absolute;top:60px;left:50%;transform:translateX(-50%);background:#ffd23f;color:#4a2030;font:800 .82rem Inter,sans-serif;padding:8px 16px;border-radius:999px;opacity:0;pointer-events:none;transition:.2s;z-index:5}
.rmfc-toast.show{opacity:1}
.rmfc-done{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(26,16,22,.96);border-radius:20px;color:#fff;text-align:center;padding:24px;z-index:6}
.rmfc-done.show{display:flex}
.rmfc-done h3{font:900 1.5rem Fraunces,Georgia,serif;margin:0;color:#ffd23f}
.rmfc-done button{background:#ffd23f;color:#4a2030;border:none;border-radius:999px;padding:12px 22px;font:800 1rem Inter,sans-serif;cursor:pointer}
`;
    var st=document.createElement('style'); st.id='rm-interactive-css'; st.textContent=css; document.head.appendChild(st);
  }

  /* ---------- ATLAS ---------- */
  function initAtlas(root){
    if(root.dataset.rmAtlas) return; root.dataset.rmAtlas='1';
    var base=root.querySelector('.rmatlas-base'), zimg=root.querySelector('.rmatlas-zoomimg');
    var stage=root.querySelector('.rmatlas-zoomstage'), legend=root.querySelector('.rmatlas-legend');
    var expl=root.querySelector('.rmatlas-expl');
    if(!base||!zimg||!stage) return;
    function sync(){ try{ zimg.src=base.src; }catch(e){} }
    if(base.complete && base.naturalWidth) sync(); else base.addEventListener('load',sync);
    var pts=[].slice.call(root.querySelectorAll('.rmatlas-pt'));
    function activate(btn){
      pts.forEach(function(b){ b.classList.remove('active'); }); btn.classList.add('active');
      var px=parseFloat(btn.dataset.x)/100, py=parseFloat(btn.dataset.y)/100;
      var V=stage.clientWidth||stage.offsetWidth||0, s=2.7;
      if(V>0){
        var tx=V/2 - px*V*s, ty=V/2 - py*V*s;
        tx=Math.min(0,Math.max(V-V*s,tx)); ty=Math.min(0,Math.max(V-V*s,ty));
        zimg.style.transform='translate('+tx+'px,'+ty+'px) scale('+s+')';
      }
      legend.innerHTML='<span class="rmatlas-badge">'+btn.dataset.n+'</span>'+(btn.dataset.name||'');
      expl.textContent=btn.dataset.expl||'';
      root.classList.add('opened');
    }
    pts.forEach(function(b){ b.addEventListener('click',function(){ activate(b); }); });
    window.addEventListener('resize',function(){ var a=root.querySelector('.rmatlas-pt.active'); if(a) activate(a); });
  }

  /* ---------- FLASHCARDS: juego ---------- */
  var ov=null, deck=[], order=[], idx=0, flipped=false, title='';
  function buildDeck(grid){
    return [].slice.call(grid.querySelectorAll('.flashcard')).map(function(fc){
      var f=fc.querySelector('.fc-front'), b=fc.querySelector('.fc-back');
      return { front:f?f.innerHTML:'', back:b?b.innerHTML:'' };
    });
  }
  function ensureOverlay(){
    if(ov) return;
    ov=document.createElement('div'); ov.className='rmfc-overlay';
    ov.innerHTML='<div class="rmfc-panel">'
      +'<div class="rmfc-top"><span class="rmfc-title"></span><span class="rmfc-prog"></span>'
      +'<span class="rmfc-tools"><button class="rmfc-ic" data-a="shuffle" title="Barajar">🔀</button>'
      +'<button class="rmfc-ic" data-a="restart" title="Reiniciar">↻</button>'
      +'<button class="rmfc-ic" data-a="close" title="Cerrar">✕</button></span></div>'
      +'<div class="rmfc-card"><div class="rmfc-inner"><div class="rmfc-face rmfc-front"></div><div class="rmfc-face rmfc-back"></div></div></div>'
      +'<div class="rmfc-bar"><i></i></div>'
      +'<div class="rmfc-nav"><button class="rmfc-btn" data-a="prev">‹ Anterior</button>'
      +'<button class="rmfc-btn rmfc-flip" data-a="flip">Girar 🔄</button>'
      +'<button class="rmfc-btn" data-a="next">Siguiente ›</button></div>'
      +'<div class="rmfc-hintkeys">← / → navegar · espacio = girar · tocá un aspecto para revelarlo · Esc = salir</div>'
      +'<div class="rmfc-done"><h3>🎉 ¡Completaste la ronda!</h3><button data-a="restart">↻ Repetir</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){
      if(e.target===ov){ closeGame(); return; }
      var rev=e.target.closest('[data-rev]');
      if(rev){ rev.classList.toggle('open'); return; }       /* revelar aspecto, sin girar */
      var a=e.target.closest('[data-a]');
      if(a){ var k=a.dataset.a;
        if(k==='close') closeGame(); else if(k==='next') go(1); else if(k==='prev') go(-1);
        else if(k==='flip') flip(); else if(k==='shuffle') shuffle(); else if(k==='restart') restart();
        return; }
      if(e.target.closest('.rmfc-card')) flip();
    });
    document.addEventListener('keydown',function(e){
      if(!ov||!ov.classList.contains('show')) return;
      if(e.key==='ArrowRight'){ go(1); e.preventDefault(); }
      else if(e.key==='ArrowLeft'){ go(-1); e.preventDefault(); }
      else if(e.key===' '||e.key==='Enter'){ flip(); e.preventDefault(); }
      else if(e.key==='Escape'){ closeGame(); }
    });
  }
  function render(){
    var c=deck[order[idx]];
    ov.querySelector('.rmfc-front').innerHTML=c.front;
    ov.querySelector('.rmfc-back').innerHTML=c.back;
    ov.querySelector('.rmfc-title').textContent=title;
    ov.querySelector('.rmfc-prog').textContent=(idx+1)+' / '+deck.length;
    ov.querySelector('.rmfc-bar>i').style.width=(((idx+1)/deck.length)*100)+'%';
    ov.querySelector('.rmfc-inner').classList.toggle('flipped',flipped);
  }
  function flip(){ flipped=!flipped; ov.querySelector('.rmfc-inner').classList.toggle('flipped',flipped); }
  function go(dir){
    flipped=false; var n=deck.length, prev=idx; idx=(idx+dir+n)%n;
    var card=ov.querySelector('.rmfc-card'); card.classList.remove('slideL','slideR'); void card.offsetWidth;
    card.classList.add(dir>0?'slideL':'slideR'); render();
    if(dir>0 && idx===0 && prev===n-1){ ov.querySelector('.rmfc-done').classList.add('show'); }
  }
  function shuffle(){ for(var i=order.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=order[i];order[i]=order[j];order[j]=t;} idx=0;flipped=false;ov.querySelector('.rmfc-done').classList.remove('show');render();toast('🔀 Barajado'); }
  function restart(){ order=deck.map(function(_,i){return i;});idx=0;flipped=false;ov.querySelector('.rmfc-done').classList.remove('show');render();toast('↻ Reiniciado'); }
  function closeGame(){ ov.classList.remove('show'); document.body.style.overflow=''; }
  function toast(m){ var t=ov.querySelector('.rmfc-toast'); if(!t){t=document.createElement('div');t.className='rmfc-toast';ov.querySelector('.rmfc-panel').appendChild(t);} t.textContent=m;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(function(){t.classList.remove('show');},950); }
  function openGame(grid,t){
    deck=buildDeck(grid); if(!deck.length) return;
    title=t||'Flashcards'; order=deck.map(function(_,i){return i;});
    if(grid.dataset && grid.dataset.shuffle){ for(var i=order.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var x=order[i];order[i]=order[j];order[j]=x;} }
    idx=0; flipped=false; ensureOverlay(); ov.querySelector('.rmfc-done').classList.remove('show');
    ov.classList.add('show'); document.body.style.overflow='hidden'; render();
  }
  RepassoMed.playDeck=function(g){ if(g && !g.classList.contains('fc-grid')){var w=g.closest('.rmfc-launch');g=w?w.querySelector('.fc-grid'):null;} if(g) openGame(g, g.dataset.deckTitle||'Flashcards'); };

  function setupDecks(scope){
    scope.querySelectorAll('.fc-grid').forEach(function(grid){
      if(grid.dataset.rmDeck) return; grid.dataset.rmDeck='1';
      var n=grid.querySelectorAll('.flashcard').length; if(!n) return;
      var t='Flashcards', el=grid.previousElementSibling;
      while(el){ if(/^H[1-6]$/.test(el.tagName)||el.tagName==='SUMMARY'){ t=el.textContent.replace(/^[^0-9A-Za-zÁÉÍÓÚÑáéíóúñ¿]+/, '').replace(/\s*\(\d+\)\s*$/, '').trim()||t; break; } el=el.previousElementSibling; }
      grid.dataset.deckTitle=t;
      var ico=grid.dataset.shuffle?'🎲':'🎴';
      var sub=grid.dataset.shuffle?(n+' vistas · orden aleatorio · la cuenta sigue'):(n+' cartas · girar · navegar · barajar');
      var wrap=document.createElement('div'); wrap.className='rmfc-launch'+(grid.dataset.shuffle?' rmfc-roulette':'');
      wrap.innerHTML='<div class="rmfc-cover"><div class="rmfc-cover-ico">'+ico+'</div>'
        +'<div class="rmfc-cover-meta"><div class="rmfc-cover-t">'+t+'</div><div class="rmfc-cover-n">'+sub+'</div></div>'
        +'<button class="rmfc-play" type="button">▶ Jugar</button></div>';
      grid.style.display='none'; grid.parentNode.insertBefore(wrap, grid);
      wrap.querySelector('.rmfc-play').addEventListener('click',function(){ openGame(grid,t); });
    });
  }

  var _orig=RepassoMed.enhanceAll;
  RepassoMed.enhanceAll=function(){
    if(_orig) try{ _orig(); }catch(e){ console.error(e); }
    injectCSS();
    try{ setupDecks(document); }catch(e){ console.error('decks',e); }
    try{ document.querySelectorAll('.rmatlas').forEach(initAtlas); }catch(e){ console.error('atlas',e); }
  };
  RepassoMed.initAtlas=initAtlas;
})();
/* =====================================================================
   GLOSARIO · NOTA LATERAL v3   (reemplaza el "portal" modal anterior)
   - NO oscurece la página · NO centra · NO bloquea el scroll
   - Se abre pegado al término, como una nota al margen
   - Siempre por encima de todo (z-index máximo), nunca recortada
   - Se cierra al tocar de nuevo el término, al tocar fuera o con Esc
   ===================================================================== */
(function(){
  var GL='[class~="em-gl"],[class~="f2-gl"],[class~="s2-gl"],[class~="sm-gl"],[class~="hi-gl"]';
  var note=null, anchor=null;

  function css(){
    if(document.getElementById('rm-gl-note-css')) return;
    var s=document.createElement('style'); s.id='rm-gl-note-css';
    s.textContent=
      '#rm-gl-note{position:absolute;z-index:2147483000;display:none;'
      +'width:min(320px,calc(100vw - 24px));max-height:60vh;overflow:auto;'
      +'background:linear-gradient(175deg,#fff8c9,#ffeea0);color:#4a3c10;'
      +'border:1px solid #e8d77a;border-radius:13px;padding:.95rem 1rem .8rem;'
      +'font:400 .9rem/1.55 var(--font-body,-apple-system,system-ui,sans-serif);'
      +'box-shadow:0 12px 32px rgba(19,49,79,.22);animation:rmGlIn .14s ease-out}'
      +'#rm-gl-note.on{display:block}'
      +'#rm-gl-note b:first-child{display:block;font-family:var(--font-display,inherit);'
      +'font-size:.97rem;font-weight:800;color:#6b5310;margin:0 0 .35rem}'
      +'#rm-gl-note b{color:#5c4a12}#rm-gl-note em{font-style:italic;color:#7a6420}'
      +'#rm-gl-note .em-gl-close,#rm-gl-note .f2-gl-close,#rm-gl-note .s2-gl-close,'
      +'#rm-gl-note .sm-gl-close,#rm-gl-note .hi-gl-close{display:block;margin-top:.6rem;'
      +'font-family:var(--font-mono,monospace);font-size:.56rem;letter-spacing:.07em;'
      +'text-transform:uppercase;color:#8a7420;text-align:right}'
      +'@keyframes rmGlIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'
      +'[class~="em-gl"].on,[class~="f2-gl"].on,[class~="s2-gl"].on,[class~="sm-gl"].on,'
      +'[class~="hi-gl"].on{background:#ffe9a8;border-radius:4px}';
    document.head.appendChild(s);
    var h=document.createElement('style'); h.id='rm-gl-hideinflow';
    h.textContent='[class~="em-gl"]>i,[class~="f2-gl"]>i,[class~="s2-gl"]>i,'
      +'[class~="sm-gl"]>i,[class~="hi-gl"]>i{display:none!important}';
    document.head.appendChild(h);
  }

  function build(){
    if(note) return;
    css();
    note=document.createElement('div'); note.id='rm-gl-note';
    note.setAttribute('role','note');
    document.body.appendChild(note);
    note.addEventListener('click',function(e){ e.stopPropagation(); });
  }

  function place(){
    if(!note||!anchor||!note.classList.contains('on')) return;
    var r=anchor.getBoundingClientRect();
    var sx=window.pageXOffset, sy=window.pageYOffset;
    var vw=document.documentElement.clientWidth;
    var nw=note.offsetWidth, nh=note.offsetHeight, gap=10, m=12;
    // preferimos a la DERECHA del término; si no entra, debajo
    var left, top;
    if(r.right+gap+nw <= vw-m){ left=r.right+gap+sx; top=r.top+sy-6; }
    else if(r.left-gap-nw >= m){ left=r.left-gap-nw+sx; top=r.top+sy-6; }
    else { left=Math.min(Math.max(m, r.left+sx), sx+vw-nw-m); top=r.bottom+sy+gap; }
    // que no se salga por abajo del viewport visible
    var maxTop=sy+document.documentElement.clientHeight-nh-m;
    if(top>maxTop && maxTop>sy+m) top=Math.max(sy+m, maxTop);
    note.style.left=left+'px'; note.style.top=top+'px';
  }

  function open(gl){
    build();
    var i=gl.querySelector(':scope > i');
    note.innerHTML = i ? i.innerHTML : '';
    anchor=gl; note.classList.add('on');
    note.style.left='-9999px'; note.style.top='0';
    place();
  }
  function close(){
    if(note) note.classList.remove('on');
    anchor=null;
    document.querySelectorAll(GL).forEach(function(g){ g.classList.remove('on'); });
  }

  css();

  document.addEventListener('click',function(e){
    if(note && e.target.closest && e.target.closest('#rm-gl-note')) return;
    var gl=e.target.closest && e.target.closest(GL);
    if(!gl){ close(); return; }
    setTimeout(function(){
      // el handler inline ya alternó la clase .on sobre el término
      if(gl.classList.contains('on')) open(gl); else close();
    },0);
  },false);

  document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
  window.addEventListener('scroll',place,true);
  window.addEventListener('resize',place);
})();

/* =====================================================================
   RESPONSIVE PACK  ·  tablet (prioridad) y móvil
   Aditivo: no reescribe styles.css, sólo corrige lo que se rompió con
   el diseño de cuaderno/post-its/cards en pantallas chicas.
   ===================================================================== */
(function(){
  if(document.getElementById('rm-responsive-pack')) return;
  var s=document.createElement('style'); s.id='rm-responsive-pack';
  s.textContent=
  /* nunca scroll horizontal en toda la app */
  'html,body{max-width:100%;overflow-x:hidden}'
  +'img,svg,video,canvas{max-width:100%;height:auto}'
  /* las tablas siempre pueden deslizarse en vez de romper el layout */
  +'.em-scroll,.hi-scroll,.f2-scroll,.s2-scroll{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}'
  +'.em-scroll>table,.hi-scroll>table,.f2-scroll>table,.s2-scroll>table{min-width:520px}'
  /* ---------- TABLET ---------- */
  +'@media (max-width:1024px){'
  +' .container{padding-left:1.15rem;padding-right:1.15rem}'
  +' .fc-grid{grid-template-columns:repeat(auto-fit,minmax(215px,1fr))}'
  +' .em-simple,.hi-simple,.em-flow,.hi-flow{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}'
  +'}'
  /* ---------- MÓVIL ---------- */
  +'@media (max-width:680px){'
  +' .container{padding-left:.95rem;padding-right:.95rem;border-radius:14px}'
  +' h1{font-size:1.5rem;line-height:1.25}'
  +' h2{font-size:1.24rem;line-height:1.3}'
  +' h3{font-size:1.05rem}'
  +' body{font-size:.96rem}'
  /* pilas de una columna: se leen mejor que cajas apretadas */
  +' .fc-grid{grid-template-columns:1fr}'
  +' .em-simple,.hi-simple,.em-flow,.hi-flow,.f2-simple{display:grid;grid-template-columns:1fr;gap:.6rem}'
  +' .em-step,.hi-step{width:auto}'
  /* las flechas del flujo miran hacia abajo en vertical */
  +' .em-flow .em-step:not(:last-child):after,.hi-flow .hi-step:not(:last-child):after{'
  +'  content:"↓";display:block;text-align:center;margin:.3rem 0 -.2rem;opacity:.5}'
  +' .em-bankstats,.hi-bankstats{grid-template-columns:repeat(2,1fr);gap:.5rem}'
  +' .illustration{padding:.6rem}'
  +' .quiz-item,.key-box,.em-postit,.hi-postit{padding:.9rem}'
  +' .options li{padding:.55rem .7rem}'
  +' .reveal-btn{width:100%}'
  +' #rm-gl-note{width:calc(100vw - 20px);max-height:52vh}'
  +'}';
  document.head.appendChild(s);
})();
