/* =====================================================================
   REPASSO MED · APORTES DE ALUMNOS → GOOGLE DRIVE
   Web App de Apps Script. É a única peça que tem permissão no Drive.

   COMO ISTO SE ENCAIXA
   -----------------------------------------------------------------
   navegador → Supabase Storage (bucket privado)
             → linha em external_contributions
             → Netlify Function aporte-drive
             → ESTE script → Drive

   A função Netlify manda URLs ASSINADAS de 10 minutos. Este script
   busca os bytes por elas. Assim o bucket continua privado e nenhuma
   chave do Supabase precisa existir dentro do Apps Script.

   O QUE ESTE SCRIPT NUNCA FAZ
   -----------------------------------------------------------------
   Não apaga nada. Não move nada. Não toca na Biblioteca. Só CRIA, e
   sempre abaixo da pasta raiz configurada em ROOT_FOLDER_ID.

   ANTES DE PUBLICAR
   -----------------------------------------------------------------
   1. Cole este arquivo em um projeto novo em https://script.google.com
   2. Rode UMA VEZ a função `setup()` (ela pede a autorização do Google
      e guarda o segredo). Veja o passo-a-passo no arquivo
      CONTRIBUICOES-MATERIAL-EXTERNO.md do repositório.
   3. Implantar → Nova implantação → Aplicativo da Web
        Executar como: Eu
        Quem pode acessar: Qualquer pessoa
      «Qualquer pessoa» é o que permite a chamada do servidor da
      Netlify. Quem protege o endpoint é o token compartilhado, não a
      obscuridade da URL.
   4. Copie a URL /exec e cole no Netlify como APPS_SCRIPT_URL.
   ===================================================================== */

/* Pasta raiz do Drive da equipe. Nada é criado fora dela. */
var ROOT_FOLDER_ID = '1jE4fwQblxZsPWR6R8IM02iMI-DxxwZoQ';

/* Nome da pasta que agrupa tudo o que vem dos alunos. Criada na
   primeira vez; depois é sempre reaproveitada. */
var PASTA_APORTES = 'Aportes de alumnos';

/* =====================================================================
   setup() — RODE ESTA FUNÇÃO UMA VEZ, À MÃO
   Guarda o segredo compartilhado e confirma que o script enxerga a
   pasta raiz. O segredo fica nas Propriedades do Script, nunca no
   código: assim ele não vai parar no repositório.
   ===================================================================== */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('APPS_SCRIPT_TOKEN');

  if (!token) {
    /* Gera um segredo forte na primeira execução. Copie-o do log e
       cole no Netlify como APPS_SCRIPT_TOKEN. */
    token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('APPS_SCRIPT_TOKEN', token);
    Logger.log('APPS_SCRIPT_TOKEN gerado. COPIE a linha abaixo e cole no Netlify:');
    Logger.log(token);
  } else {
    Logger.log('APPS_SCRIPT_TOKEN já existia. Se você o perdeu, apague a propriedade');
    Logger.log('em Configurações do projeto → Propriedades do script e rode setup() de novo.');
  }

  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  var base = subpasta(root, PASTA_APORTES);
  Logger.log('Raiz OK: ' + root.getName());
  Logger.log('Pasta de aportes: ' + base.getUrl());
  return 'ok';
}

/* =====================================================================
   doPost — o endpoint
   ===================================================================== */
function doPost(e) {
  try {
    var dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    var esperado = PropertiesService.getScriptProperties().getProperty('APPS_SCRIPT_TOKEN');
    if (!esperado) return json({ ok: false, error: 'setup() todavía no fue ejecutado' });
    if (!igual(String(dados.token || ''), esperado)) {
      /* Não registramos o token recebido: um log é um lugar onde um
         segredo não deve existir, nem o certo nem o errado. */
      return json({ ok: false, error: 'token inválido' });
    }

    var id = String(dados.contribution_id || '').trim();
    if (!id) return json({ ok: false, error: 'contribution_id ausente' });

    /* Árvore: raiz → Aportes de alumnos → Semestre N → Materia → envio.
       O chamador manda semestre e nome de matéria; quem decide o
       caminho real é este script, e sempre abaixo da raiz. */
    var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var base = subpasta(root, PASTA_APORTES);

    var sem  = dados.semester;
    var semNome = (sem === 0 || sem) ? (sem + '.º semestre') : 'Sin semestre';
    var matNome = limpo(dados.subject_name || dados.subject_slug || '') || 'General';

    var pasta = subpasta(subpasta(base, limpo(semNome)), matNome);

    /* Uma pasta por envio: data + aluno + os 8 primeiros dígitos do id.
       O id evita colisão quando o mesmo aluno manda duas vezes no mesmo
       dia; a data e o nome deixam a pasta legível sem abrir nada. */
    var quando = Utilities.formatDate(
      dados.created_at ? new Date(dados.created_at) : new Date(),
      Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var quem = limpo(dados.student_name || dados.student_email || 'Alumno').slice(0, 60);
    var destino = subpasta(pasta, quando + ' — ' + quem + ' — ' + id.slice(0, 8));

    /* Ficha do envio: quem mandou, para que matéria e o que escreveu.
       Sem ela, daqui a um mês a pasta é um monte de PDF sem contexto. */
    var ficha =
      'APORTE DE ALUMNO · REPASSO MED\n' +
      '================================\n' +
      'Id:        ' + id + '\n' +
      'Fecha:     ' + quando + '\n' +
      'Alumno:    ' + (dados.student_name || '(sin nombre)') + '\n' +
      'Correo:    ' + (dados.student_email || '(sin correo)') + '\n' +
      'Semestre:  ' + semNome + '\n' +
      'Materia:   ' + matNome + (dados.subject_slug ? ' (' + dados.subject_slug + ')' : '') + '\n' +
      '\nMensaje del alumno\n------------------\n' +
      ((dados.message || '').trim() || '(sin mensaje)') + '\n';
    destino.createFile('_ficha.txt', ficha, MimeType.PLAIN_TEXT);

    /* Os arquivos. Cada URL assinada vale poucos minutos e é usada uma
       vez só. Um arquivo que falha não derruba os outros: fica listado
       no resultado para o painel administrativo mostrar. */
    var arquivos = dados.files || [];
    var gravados = 0, falhas = [];
    for (var i = 0; i < arquivos.length; i++) {
      var a = arquivos[i];
      try {
        var r = UrlFetchApp.fetch(a.url, { muteHttpExceptions: true, followRedirects: true });
        if (r.getResponseCode() !== 200) {
          falhas.push((a.name || 'archivo') + ': HTTP ' + r.getResponseCode());
          continue;
        }
        var blob = r.getBlob().setName(a.name || ('archivo-' + (i + 1)));
        if (a.mime) { try { blob = blob.getAs(a.mime); } catch (ignora) {} }
        destino.createFile(blob);
        gravados++;
      } catch (err) {
        falhas.push((a.name || 'archivo') + ': ' + err);
      }
    }

    if (arquivos.length && gravados === 0) {
      return json({ ok: false, error: 'ningún archivo pudo copiarse — ' + falhas.join(' · '),
                    folder_url: destino.getUrl() });
    }

    return json({
      ok: true,
      folder_url: destino.getUrl(),
      saved: gravados,
      failed: falhas
    });

  } catch (err) {
    return json({ ok: false, error: String(err).slice(0, 300) });
  }
}

/* GET serve só para conferir, do navegador, que a implantação está de
   pé. Não revela nada: nem token, nem id de pasta, nem conteúdo. */
function doGet() {
  return json({ ok: true, service: 'repasso-med-aportes' });
}

/* =====================================================================
   Auxiliares
   ===================================================================== */

/* Pega a subpasta pelo nome, ou cria se não existir. Nunca apaga e
   nunca sobe um nível: só desce a partir da pasta recebida. */
function subpasta(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

/* Nome de pasta sem os caracteres que o Drive trata de forma estranha
   e sem espaço sobrando nas pontas. */
function limpo(txt) {
  return String(txt == null ? '' : txt)
    .replace(/[\/\\\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/* Comparação de tamanho constante: um `==` normal devolve mais cedo no
   primeiro caractere diferente, e esse tempo é informação. */
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
