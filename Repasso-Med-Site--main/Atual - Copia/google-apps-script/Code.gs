/* =====================================================================
   REPASSO MED · APORTES DE ALUMNOS → GOOGLE DRIVE
   Web App de Apps Script. É a única peça com permissão no Drive.

   COMO ISTO SE ENCAIXA
   -----------------------------------------------------------------
   navegador → Supabase Storage (buffer privado)
             → linha em external_contributions
             → Netlify Function aporte-drive
             → ESTE script → Drive

   A função Netlify manda URLs ASSINADAS de 10 minutos. Este script
   busca os bytes por elas. Assim o bucket continua privado e nenhuma
   chave do Supabase precisa existir aqui dentro.

   ONDE O MATERIAL VAI PARAR — e o que mudou
   -----------------------------------------------------------------
   A pasta raiz JÁ É «Material Externo» e JÁ TEM a árvore montada à mão:

       Material Externo/
         1º Semestre/   Anatomia I · Biologia · Embriologia · ...
         2 semestre/    ...
         5 semestre/    ...
         6 semestre/    ...
         7 semestre/    Oftalmologia · Toxicologia · Neurologia · ...

   A versão anterior deste arquivo criava «Aportes de alumnos» e, dentro
   dela, «7.º semestre» e «Oftalmología» — uma SEGUNDA árvore paralela à
   que já existe. Agora o script REUTILIZA a árvore real:

       Material Externo/7 semestre/Oftalmologia/2026-09-13_1420_A82F92/

   REUTILIZAR EXIGE NORMALIZAR, porque os dois lados escrevem diferente
   -----------------------------------------------------------------
   · o semestre aparece como «1º Semestre» e como «7 semestre»;
   · as pastas estão em PORTUGUÊS sem acento («Oftalmologia»,
     «Ortopedia e Traumatologia»), e o catálogo do site está em
     CASTELHANO («Oftalmología», «Ortopedia y Traumatología»).

   Comparar os nomes crus criaria «Oftalmología» ao lado de
   «Oftalmologia». Então comparamos uma forma reduzida: minúsculas, sem
   acento, sem pontuação, sem os conectores «e»/«y»/«de», com
   «pratica»↔«practica» unificados e o sufixo «teórica» descartado —
   é ele que separa «Histologia I Teórica» de «Histología I».

   O QUE ESTE SCRIPT NUNCA FAZ
   -----------------------------------------------------------------
   Não apaga. Não move. Não renomeia. Não toca a Biblioteca. Só CRIA, e
   sempre abaixo de ROOT_FOLDER_ID. Nenhum nome, e-mail ou user_id vai
   para o Drive: a identidade fica no Supabase, visível só no painel.

   ANTES DE PUBLICAR
   -----------------------------------------------------------------
   Veja CONTRIBUICOES-MATERIAL-EXTERNO.md §5. Em resumo: colar este
   arquivo em um projeto novo, rodar `setup()` UMA vez, e implantar como
   Aplicativo da Web (Executar como: Eu · Acesso: Qualquer pessoa).
   ===================================================================== */

/* «Material Externo». Nada é criado fora dela. */
var ROOT_FOLDER_ID = '1jE4fwQblxZsPWR6R8IM02iMI-DxxwZoQ';

/* Onde cai um envio cujo semestre não corresponde a nenhuma pasta.
   Fica dentro do root, ao lado dos semestres. */
var PASTA_SEM_CLASIFICAR = 'Sin clasificar';

var PROP_TOKEN = 'APPS_SCRIPT_TOKEN';
var PROP_ARVORE = 'RM_ARVORE';      /* cache dos ids canônicos */

/* =====================================================================
   setup() — RODE UMA VEZ, À MÃO

   Valida a raiz, mapeia a árvore REAL que já existe e guarda os ids
   canônicos. Não cria, não move, não apaga nada. Imprime um diagnóstico
   sem nenhum dado de aluno.
   ===================================================================== */
function setup() {
  var props = PropertiesService.getScriptProperties();

  /* 1 · a raiz é mesmo «Material Externo»?
     FAIL CLOSED. Um aviso no log seria lido depois de o script já estar
     publicado apontando para a pasta errada — e material de aluno
     espalhado no lugar errado não se desfaz com um Ctrl+Z. Então aqui
     não se avisa: aborta. */
  var root, nome;
  try {
    root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    nome = root.getName();
  } catch (e) {
    throw new Error(
      'ROOT_FOLDER_ID inaccesible o inexistente (' + ROOT_FOLDER_ID + '). ' +
      'Verificá el id y que esta cuenta de Google tenga acceso a la carpeta. ' +
      'setup() no continuó: nada fue creado ni configurado.');
  }
  Logger.log('Raiz: "' + nome + '"  (' + ROOT_FOLDER_ID + ')');
  if (reduzir(nome).indexOf('material externo') < 0) {
    throw new Error(
      'La carpeta raíz se llama "' + nome + '", no «Material Externo». ' +
      'Corregí ROOT_FOLDER_ID antes de seguir. setup() no continuó: no se generó ' +
      'token, no se guardó el árbol y nada fue creado.');
  }

  /* 2 · mapeia semestres e matérias existentes */
  var arvore = lerArvore(root);
  var semestres = Object.keys(arvore).sort(function (a, b) { return Number(a) - Number(b); });
  Logger.log('Semestres encontrados: ' + semestres.length);
  for (var i = 0; i < semestres.length; i++) {
    var s = arvore[semestres[i]];
    var mats = Object.keys(s.materias);
    Logger.log('  · semestre ' + semestres[i] + '  pasta "' + s.nome + '"  → ' +
               mats.length + ' materia(s)');
    for (var j = 0; j < mats.length; j++) Logger.log('      - ' + s.materias[mats[j]].nome);
  }
  props.setProperty(PROP_ARVORE, JSON.stringify(arvore));
  Logger.log('Árvore guardada em ScriptProperties. Matérias novas ainda assim são');
  Logger.log('procuradas ao vivo antes de criar qualquer pasta.');

  /* 3 · segredo compartilhado */
  var token = props.getProperty(PROP_TOKEN);
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty(PROP_TOKEN, token);
    Logger.log('');
    Logger.log('APPS_SCRIPT_TOKEN gerado. COPIE a linha abaixo e cole no Netlify:');
    Logger.log(token);
  } else {
    Logger.log('');
    Logger.log('APPS_SCRIPT_TOKEN já existia — não foi gerado outro.');
    Logger.log('Se o perdeu: Configurações do projeto → Propriedades do script,');
    Logger.log('apague a propriedade e rode setup() de novo.');
  }
  return 'ok';
}

/* Relê a árvore do Drive sem gerar token nem escrever nada além do
   cache. Útil depois de criar pastas de semestre/matéria à mão. */
function recarregarArvore() {
  var root = raizValidada();
  var arvore = lerArvore(root);
  PropertiesService.getScriptProperties().setProperty(PROP_ARVORE, JSON.stringify(arvore));
  Logger.log('Árvore recarregada: ' + Object.keys(arvore).length + ' semestre(s).');
  return 'ok';
}

/* =====================================================================
   doPost — o endpoint
   ===================================================================== */
function doPost(e) {
  try {
    var dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    var esperado = PropertiesService.getScriptProperties().getProperty(PROP_TOKEN);
    if (!esperado) return json({ ok: false, error: 'setup() todavía no fue ejecutado' });
    /* O token recebido nunca é registrado: um log não é lugar de segredo,
       nem do certo nem do errado. */
    if (!igual(String(dados.token || ''), esperado)) {
      return json({ ok: false, error: 'token inválido' });
    }

    var id = String(dados.contribution_id || '').trim();
    if (!/^[0-9a-f-]{16,40}$/i.test(id)) return json({ ok: false, error: 'contribution_id inválido' });

    /* 1 · a pasta da matéria, reaproveitando a árvore que já existe */
    var destinoMateria = resolverMateria(dados.semester, dados.subject_name, dados.subject_slug);


    /* 2 · a pasta do envio. O nome NÃO leva identidade: data, hora e um
       pedaço do id bastam para achar, e o resto está no painel.
       Reenviar o mesmo aporte reaproveita a pasta em vez de duplicá-la. */
    var quando = dados.created_at ? new Date(dados.created_at) : new Date();
    if (isNaN(quando.getTime())) quando = new Date();
    var tz = Session.getScriptTimeZone();
    /* 12 hex = 48 bits. Com 6 (24 bits) duas contribuições diferentes
       colidiriam por acaso já na casa das dezenas de milhares — e uma
       colisão aqui significaria material de um aluno caindo na pasta de
       outro. 12 afasta isso do domínio do plausível. */
    var sufixo = id.replace(/-/g, '').slice(0, 12).toUpperCase();
    var nomeEnvio = Utilities.formatDate(quando, tz, 'yyyy-MM-dd_HHmm') + '_' + sufixo;

    var destino = acharPorSufixo(destinoMateria, sufixo) || destinoMateria.createFolder(nomeEnvio);

    /* 3 · ficha do envio, também sem identidade */
    var ficha =
      'APORTE · REPASSO MED\n' +
      '====================\n' +
      'Id:        ' + id + '\n' +
      'Fecha:     ' + Utilities.formatDate(quando, tz, 'yyyy-MM-dd HH:mm') + '\n' +
      'Semestre:  ' + (numeroSemestre(dados.semester) || '(sin indicar)') + '\n' +
      'Materia:   ' + (limpo(dados.subject_name) || '(general)') +
        (dados.subject_slug ? ' [' + limpo(dados.subject_slug) + ']' : '') + '\n' +
      '\nMensaje del alumno\n------------------\n' +
      ((dados.message || '').trim() || '(sin mensaje)') + '\n' +
      '\nArchivos\n--------\n' +
      ((dados.files || []).map(function (a, i) {
        return (i + 1) + '. ' + (a.name || 'archivo');
      }).join('\n') || '(ninguno)') + '\n' +
      '\nEl remitente se identifica solo en el panel administrativo.\n';
    gravarFicha(destino, ficha);

    /* 4 · os arquivos. Cada URL assinada vale poucos minutos. Um arquivo
       que falha não derruba os outros — volta listado, e o painel
       mostra o motivo. Reenvio não duplica: nome que já existe é
       considerado gravado. */
    var arquivos = dados.files || [];
    var gravados = 0, jaEstavam = 0, falhas = [];
    for (var i = 0; i < arquivos.length; i++) {
      var a = arquivos[i];
      var nomeArq = limpoArquivo(a.name) || ('archivo-' + (i + 1));
      try {
        if (destino.getFilesByName(nomeArq).hasNext()) { jaEstavam++; continue; }
        var r = UrlFetchApp.fetch(a.url, { muteHttpExceptions: true, followRedirects: true });
        if (r.getResponseCode() !== 200) {
          falhas.push(nomeArq + ': HTTP ' + r.getResponseCode());
          continue;
        }
        destino.createFile(r.getBlob().setName(nomeArq));
        gravados++;
      } catch (err) {
        falhas.push(nomeArq + ': ' + err);
      }
    }

    var completo = (gravados + jaEstavam) === arquivos.length;
    if (arquivos.length && !completo && gravados === 0) {
      return json({ ok: false, error: 'ningún archivo pudo copiarse — ' + falhas.join(' · '),
                    folder_url: destino.getUrl() });
    }

    return json({
      ok: true,
      folder_url: destino.getUrl(),
      saved: gravados,
      already: jaEstavam,
      total: arquivos.length,
      complete: completo,          /* só com isto o backend limpa o buffer */
      failed: falhas
    });

  } catch (err) {
    return json({ ok: false, error: String(err).slice(0, 300) });
  }
}

/* GET só confirma que a implantação está de pé. Não revela token, id de
   pasta nem conteúdo. */
function doGet() {
  return json({ ok: true, service: 'repasso-med-aportes' });
}

/* =====================================================================
   Árvore do Drive
   ===================================================================== */

/* A raiz, conferida a cada uso. Se o id for trocado por engano depois da
   publicação, o endpoint para em vez de escrever no lugar errado. */
function raizValidada() {
  var f;
  try { f = DriveApp.getFolderById(ROOT_FOLDER_ID); }
  catch (e) { throw new Error('ROOT_FOLDER_ID inaccesible'); }
  if (reduzir(f.getName()).indexOf('material externo') < 0) {
    throw new Error('la carpeta raíz no es «Material Externo»');
  }
  return f;
}

/* Lê root → semestres → matérias. Só leitura. */
function lerArvore(root) {
  var arvore = {};
  var it = root.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    var n = numeroSemestre(f.getName());
    if (n === null) continue;                  /* não é pasta de semestre */
    var sem = { id: f.getId(), nome: f.getName(), materias: {} };
    var im = f.getFolders();
    while (im.hasNext()) {
      var m = im.next();
      sem.materias[reduzir(m.getName())] = { id: m.getId(), nome: m.getName() };
    }
    arvore[String(n)] = sem;
  }
  return arvore;
}

function arvoreCache() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(PROP_ARVORE) || '{}'); }
  catch (e) { return {}; }
}
function salvarCache(arvore) {
  try { PropertiesService.getScriptProperties().setProperty(PROP_ARVORE, JSON.stringify(arvore)); }
  catch (e) { /* cache é conveniência: perdê-lo não pode derrubar o envio */ }
}

/* Devolve a pasta da matéria, criando o mínimo possível.
   O chamador manda semestre e nome; QUEM decide o caminho é este script,
   e sempre abaixo do root — um `subject_name` com barras ou «..» é
   achatado por `limpo()` e nunca vira travessia de diretório. */
function resolverMateria(semestre, nomeMateria, slug) {
  var root = raizValidada();
  var n = numeroSemestre(semestre);
  var arvore = arvoreCache();

  /* --- pasta do semestre --- */
  var pastaSem = null;
  if (n !== null) {
    var c = arvore[String(n)];
    if (c && c.id) { try { pastaSem = DriveApp.getFolderById(c.id); } catch (e) { pastaSem = null; } }
    if (!pastaSem) {                            /* cache frio ou pasta nova */
      arvore = lerArvore(root); salvarCache(arvore);
      var c2 = arvore[String(n)];
      if (c2 && c2.id) { try { pastaSem = DriveApp.getFolderById(c2.id); } catch (e) { pastaSem = null; } }
    }
    /* Semestre sem pasta: criamos UMA, com o mesmo feitio das que já
       existem («7 semestre»), dentro do root. */
    if (!pastaSem) pastaSem = root.createFolder(n + ' semestre');
  } else {
    pastaSem = subpasta(root, PASTA_SEM_CLASIFICAR);
  }

  /* --- pasta da matéria --- */
  var chaves = chavesMateria(nomeMateria, slug);
  if (!chaves.length) return subpasta(pastaSem, 'General');

  /* procura ao vivo: alguém pode ter criado a pasta à mão hoje */
  var it = pastaSem.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (chaves.indexOf(reduzir(f.getName())) >= 0) return f;
  }
  /* não existe: cria com o nome do catálogo do site, dentro do semestre
     já validado. Nunca fora do root. */
  return pastaSem.createFolder(limpo(nomeMateria) || limpo(slug) || 'General');
}

/* Reaproveita a pasta de um envio que já veio antes (retry do painel). */
function acharPorSufixo(pai, sufixo) {
  var it = pai.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().slice(-(sufixo.length + 1)) === '_' + sufixo) return f;
  }
  return null;
}

function gravarFicha(pasta, texto) {
  var it = pasta.getFilesByName('contribuicao.txt');
  if (it.hasNext()) { it.next().setContent(texto); return; }
  pasta.createFile('contribuicao.txt', texto, MimeType.PLAIN_TEXT);
}

function subpasta(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

/* =====================================================================
   Normalização — o coração da reutilização
   ===================================================================== */

/* «1º Semestre» → 1 · «7 semestre» → 7 · 7 → 7 · «Sin clasificar» → null */
function numeroSemestre(v) {
  if (v === 0 || v) {
    var m = String(v).match(/\d+/);
    if (m) {
      var n = parseInt(m[0], 10);
      if (n >= 1 && n <= 20) return n;
    }
  }
  return null;
}

/* Forma reduzida usada para comparar nomes dos dois lados. */
function reduzir(txt) {
  var t = String(txt == null ? '' : txt).toLowerCase();
  /* tira acento sem depender de normalize(), que o motor antigo do
     Apps Script nem sempre tem */
  var de = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
  var para = 'aaaaaeeeeiiiiooooouuuucn';
  var out = '';
  for (var i = 0; i < t.length; i++) {
    var p = de.indexOf(t.charAt(i));
    out += p >= 0 ? para.charAt(p) : t.charAt(i);
  }
  out = out
    .replace(/[^a-z0-9]+/g, ' ')                 /* pontuação e hífen do slug */
    /* PT ↔ ES e singular/plural: «Prática», «Praticas», «Práctica» */
    .replace(/\bpraticas?\b/g, 'practica')
    .replace(/\bpracticas\b/g, 'practica')
    /* a cátedra escreve «Anatopatologia»; o catálogo, «Anatomía Patológica» */
    .replace(/\banatomia patologica\b/g, 'anatopatologia')
    .replace(/\banatomia patologico\b/g, 'anatopatologia')
    /* «Teórica» é o curso padrão: o que distingue é só a «Práctica» */
    .replace(/\bteoricas?\b|\bteoricos?\b|\bteorias?\b/g, '')
    .replace(/\b(e|y|de|del|da|do|la|el)\b/g, '')/* conectores */
    .replace(/\s+/g, ' ')
    .trim()
    /* «Fisiopatología» no catálogo é «Fisiopatologia I» no Drive. Um «i»
       solto no fim não distingue nada; «ii» e «iii» sim, e ficam. */
    .replace(/\si$/, '');
  return out;
}

/* Todas as formas pelas quais a mesma matéria pode estar escrita. */
function chavesMateria(nome, slug) {
  var ks = [];
  [nome, slug].forEach(function (v) {
    var r = reduzir(v);
    if (r && ks.indexOf(r) < 0) ks.push(r);
  });
  return ks;
}

/* Nome de pasta: sem barra, sem quebra de linha, sem «..», sem espaço
   sobrando. É o que impede um `subject_name` manipulado de virar caminho. */
function limpo(txt) {
  return String(txt == null ? '' : txt)
    .replace(/[\/\\\r\n\t]+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/* Nome de arquivo: o do aluno, preservado, menos o que quebraria o Drive. */
function limpoArquivo(txt) {
  var t = limpo(txt).replace(/^[.\s]+/, '');
  return t.slice(0, 200);
}

/* Comparação de tamanho constante: um `==` devolve no primeiro caractere
   diferente, e esse tempo é informação. */
function igual(a, b) {
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
