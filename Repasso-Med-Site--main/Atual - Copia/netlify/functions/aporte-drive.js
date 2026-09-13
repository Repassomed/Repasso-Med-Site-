/* =====================================================================
   REPASSO MED · aporte-drive
   Espelha no Google Drive um material que o aluno já subiu.

   O QUE ESTA FUNÇÃO **NÃO** FAZ
   -----------------------------------------------------------------
   Não recebe arquivo. Uma Netlify Function aceita 6 MB de payload por
   requisição; em base64 sobram ~4,4 MB de arquivo real — menos que um
   PDF de aula. Os bytes vão do navegador DIRETO para o bucket privado
   `aportes` do Supabase Storage. Aqui chega só o id do envio.

   O QUE ELA FAZ
   -----------------------------------------------------------------
   1. confere o token de sessão do aluno contra o Supabase Auth;
   2. carrega a linha de `external_contributions` pelo id;
   3. confere que a linha é DESSE aluno (ou que quem chamou é admin);
   4. gera URLs assinadas de curta duração para cada arquivo;
   5. entrega ao Apps Script — que é quem tem permissão no Drive —
      semestre, matéria, autor e essas URLs;
   6. grava no Postgres se o espelhamento deu certo.

   POR QUE A IDENTIDADE NÃO VEM DO CORPO DA REQUISIÇÃO
   -----------------------------------------------------------------
   O navegador manda apenas `contribution_id`. Quem é o aluno sai do
   token, e o dono da linha sai do banco. Um `user_id` enviado pelo
   cliente seria uma promessa que qualquer um pode falsificar.

   POR QUE URL ASSINADA E NÃO O ARQUIVO
   -----------------------------------------------------------------
   O bucket é privado. Uma URL assinada de 10 minutos deixa o Apps
   Script buscar os bytes sem que exista nenhuma URL pública do
   material, e sem que a service_role saia daqui de dentro.

   VARIÁVEIS DE AMBIENTE (Netlify → Site settings → Environment)
     SUPABASE_URL               já existe
     SUPABASE_ANON_KEY          já existe
     SUPABASE_SERVICE_ROLE_KEY  já existe — NUNCA no frontend
     APPS_SCRIPT_URL            ⚠️ NOVA — URL /exec do Web App
     APPS_SCRIPT_TOKEN          ⚠️ NOVA — segredo compartilhado

   Sem as duas novas, a função responde 503 e o envio fica «pendiente».
   O material NÃO se perde: já está no Storage e na tabela.
   ===================================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GAS_URL      = (process.env.APPS_SCRIPT_URL || '').trim();
const GAS_TOKEN    = (process.env.APPS_SCRIPT_TOKEN || '').trim();

const ASSINATURA_SEG = 600;   // 10 min: o Apps Script busca na hora

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(204, {});
  if (event.httpMethod !== 'POST')    return resp(405, { error: 'method not allowed' });

  try {
    for (const [k, v] of Object.entries({ SUPABASE_URL, ANON_KEY, SERVICE_KEY })) {
      if (!v) {
        console.error('env faltando:', k);           // o NOME, nunca o valor
        return resp(500, { error: 'configuración incompleta del servidor' });
      }
    }

    // 1) aluno logado
    const auth  = event.headers.authorization || event.headers.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return resp(401, { error: 'no autenticado' });

    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!uRes.ok) return resp(401, { error: 'sesión inválida' });
    const user = await uRes.json();

    // 2) qual envio
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) {}
    const id = String(body.contribution_id || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return resp(400, { error: 'contribution_id inválido' });
    }

    const cRes = await fetch(
      `${SUPABASE_URL}/rest/v1/external_contributions?id=eq.${encodeURIComponent(id)}` +
      `&select=id,user_id,nombre,email,semester,subject_slug,mensaje,files,created_at,drive_status`,
      { headers: sr() }
    );
    const linha = cRes.ok ? (await cRes.json())[0] : null;
    if (!linha) return resp(404, { error: 'aporte no encontrado' });

    // 3) é dele? (o admin pode reenviar um espelhamento que falhou)
    if (linha.user_id !== user.id) {
      const admin = await checkAdmin(token);
      if (!admin) return resp(403, { error: 'no autorizado' });
    }

    // 4) sem Apps Script configurado não há para onde mandar
    if (!GAS_URL || !GAS_TOKEN) {
      console.error('env faltando: APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN');
      await marcar(id, {
        drive_status: 'pendiente',
        drive_error: 'Apps Script todavía no configurado en Netlify.'
      });
      return resp(503, {
        error: 'La copia al Drive todavía no está configurada.',
        pending: true
      });
    }

    /* 5) DESTINO CONFERIDO NO BANCO, não no que o navegador gravou.
       `semester` e `subject_slug` vêm de uma linha que o próprio aluno
       inseriu: são dados, não verdade. Antes de qualquer coisa tocar o
       Drive, o slug tem que existir em `subjects`, estar ativo e ter o
       semestre que a contribuição diz ter. O NOME da pasta sai do
       registro real — nunca de texto do cliente. */
    let materia = '';
    let semestre = linha.semester;
    if (linha.subject_slug) {
      let m = null;
      try {
        const mRes = await fetch(
          `${SUPABASE_URL}/rest/v1/subjects?slug=eq.${encodeURIComponent(linha.subject_slug)}` +
          `&is_active=is.true&select=slug,name,semester`,
          { headers: sr() }
        );
        m = mRes.ok ? (await mRes.json())[0] : null;
      } catch (e) { console.error('subjects no consultado'); }

      if (!m) {
        console.error('slug inexistente o inactivo en el aporte', id);
        await marcar(id, {
          drive_status: 'error',
          drive_error: 'La materia indicada no existe o no está activa. No se creó ninguna carpeta.'
        });
        return resp(409, { error: 'materia inválida' });
      }
      /* Semestre adulterado: a linha diz um, o catálogo diz outro.
         Não «corrigimos» em silêncio — recusamos, porque a divergência
         em si já é sinal de que o dado não é confiável. */
      if (linha.semester !== null && Number(linha.semester) !== Number(m.semester)) {
        console.error('semestre incoherente con subjects en el aporte', id);
        await marcar(id, {
          drive_status: 'error',
          drive_error: 'El semestre no coincide con el de la materia en el catálogo. No se creó ninguna carpeta.'
        });
        return resp(409, { error: 'semestre incoherente' });
      }
      materia = m.name || '';
      semestre = m.semester;          /* a fonte é o catálogo, não a linha */
    }
    /* Sem matéria é um caminho legítimo — «General / no estoy seguro».
       Vai para o geral do semestre, sem inventar matéria nenhuma. Mas o
       semestre aqui continua sendo número que o navegador gravou, então
       também é conferido: tem que ser um semestre que existe no
       catálogo. Um valor fora disso não recusa o envio — seria perder
       material por um detalhe — e sim cai em «Sin clasificar», que é
       exatamente o lugar de um destino que não dá para confirmar. */
    else if (semestre !== null && semestre !== undefined) {
      try {
        const sRes = await fetch(
          `${SUPABASE_URL}/rest/v1/subjects?semester=eq.${encodeURIComponent(semestre)}` +
          `&is_active=is.true&select=semester&limit=1`,
          { headers: sr() }
        );
        const existe = sRes.ok && (await sRes.json()).length > 0;
        if (!existe) {
          console.error('semestre sin correspondencia en el catálogo, aporte', id);
          semestre = null;
        }
      } catch (e) {
        console.error('semestre no verificado; va a «Sin clasificar»');
        semestre = null;
      }
    }

    /* 6) CAMINHOS CONFERIDOS ANTES DE A SERVICE ROLE ASSINAR QUALQUER
       COISA. Todo objeto deste aporte tem que morar exatamente em
       `<user_id do dono>/<id do aporte>/`. Um metadado adulterado não
       pode fazer a chave de serviço assinar o caminho de outra pessoa.
       Um único caminho fora do lugar aborta o espelhamento inteiro. */
    const arquivos = Array.isArray(linha.files) ? linha.files : [];
    const prefixo = `${linha.user_id}/${linha.id}/`;
    const forasteiros = arquivos.filter(f =>
      !f || typeof f.path !== 'string' ||
      !f.path.startsWith(prefixo) ||
      f.path.length <= prefixo.length ||
      f.path.includes('..')
    );
    if (forasteiros.length) {
      console.error('path fuera del prefijo del aporte', id, forasteiros.length);
      await marcar(id, {
        drive_status: 'error',
        drive_error: 'Hay archivos con una ruta que no pertenece a este aporte. No se copió nada.'
      });
      return resp(409, { error: 'ruta de archivo inválida' });
    }

    /* 7) URLs assinadas — uma por arquivo, 10 minutos.
       OU TODAS, OU NENHUMA. Se um arquivo não consegue assinatura, ele
       não chegaria ao Drive; seguir com os outros faria o Apps Script
       declarar `complete` sobre um conjunto menor, e o buffer inteiro
       — inclusive o arquivo que nunca viajou — seria apagado. */
    const assinados = [];
    let falhaAssinatura = null;
    for (const f of arquivos) {
      const s = await fetch(
        `${SUPABASE_URL}/storage/v1/object/sign/aportes/${encodeURI(f.path)}`,
        { method: 'POST', headers: { ...sr(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: ASSINATURA_SEG }) }
      );
      if (!s.ok) { falhaAssinatura = `HTTP ${s.status}`; break; }
      const j = await s.json();
      const assinada = j.signedURL || j.signedUrl || '';
      if (!assinada) { falhaAssinatura = 'respuesta sin URL firmada'; break; }
      assinados.push({
        original_name: nomeOriginal(f.name),
        /* nome técnico: é ele, e não o nome do aluno, que decide no Apps
           Script se o arquivo já está lá. Ver `nomeDrive()`. */
        drive_name: nomeDrive(assinados.length, linha.id, f.name),
        mime: String(f.mime || ''),
        size: Number(f.size) || 0,
        url: `${SUPABASE_URL}/storage/v1${assinada}`
      });
    }
    if (assinados.length !== arquivos.length) {
      console.error('firma incompleta en el aporte', id, assinados.length, '/', arquivos.length);
      await marcar(id, {
        drive_status: 'error',
        drive_error: 'No se pudieron preparar todos los archivos (' +
          assinados.length + ' de ' + arquivos.length +
          (falhaAssinatura ? ' · ' + falhaAssinatura : '') +
          '). No se copió nada; el material sigue guardado. Probá «Copiar al Drive» de nuevo.'
      });
      return resp(502, { error: 'no se pudieron preparar los archivos', retry: true });
    }

    /* 8) Apps Script. O frontend NUNCA escolhe folder id: mandamos
       semestre e matéria JÁ VALIDADOS, e o script resolve a pasta
       dentro do root. */
    const gas = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      /* NENHUMA identidade atravessa para o Drive: nem nome, nem e-mail,
         nem user_id. Quem enviou só se descobre no painel, com login de
         administrador. O Drive recebe o destino, o recado e os bytes. */
      body: JSON.stringify({
        token: GAS_TOKEN,
        contribution_id: linha.id,
        semester: semestre,
        subject_slug: linha.subject_slug || '',
        subject_name: materia || '',
        message: linha.mensaje || '',
        created_at: linha.created_at,
        files: assinados
      })
    });

    const texto = await gas.text();
    let out = null;
    try { out = JSON.parse(texto); } catch (_) {}

    if (!gas.ok || !out || out.ok !== true) {
      // o detalhe do Apps Script é técnico; guardamos para o painel,
      // cortado, e sem nunca ecoar token nenhum
      const detalhe = (out && out.error) || texto.slice(0, 300) || ('HTTP ' + gas.status);
      console.error('apps script recusou o aporte', linha.id, 'HTTP', gas.status);
      await marcar(id, {
        drive_status: 'error',
        drive_error: String(detalhe).slice(0, 500),
        /* a pasta pode ter sido criada antes de a cópia falhar: guardar
           o link poupa o admin de procurá-la à mão */
        ...(out && out.folder_url ? { drive_folder_url: out.folder_url } : {})
      });
      return resp(502, { error: 'no se pudo copiar al Drive', retry: true });
    }

    /* CÓPIA PARCIAL NÃO É CÓPIA FEITA.
       O Apps Script pode responder `ok:true` com `complete:false` — a
       pasta existe, alguns arquivos entraram, outros não. Marcar isso
       como «enviado» seria dizer ao painel que está resolvido quando
       falta material; e apagar o buffer nesse estado destruiria
       justamente o que permite terminar o trabalho.

       Então: só `ok && complete` vira «enviado», preenche `drive_sent_at`
       e autoriza a limpeza. Qualquer outra coisa é `error` com o link da
       pasta preservado, o buffer INTEIRO de pé, e o «Copiar al Drive» do
       painel pronto para completar o que faltou — o Apps Script conta
       como gravado o arquivo cujo nome já existe na pasta, então o retry
       só busca o que falta. */
    const completo = out.complete === true;

    if (!completo) {
      const detalhe = Array.isArray(out.failed) && out.failed.length
        ? out.failed.join(' · ').slice(0, 380)
        : 'sin detalle del Apps Script';
      console.error('copia parcial en el aporte', linha.id,
                    (out.saved || 0) + '+' + (out.already || 0), '/', arquivos.length);
      await marcar(id, {
        drive_status: 'error',
        drive_folder_url: out.folder_url || null,
        drive_error: 'Copia incompleta: ' +
          ((out.saved || 0) + (out.already || 0)) + ' de ' + arquivos.length +
          ' archivo(s) en el Drive. ' + detalhe +
          ' · El material sigue guardado; probá «Copiar al Drive» de nuevo.'
      });
      return resp(502, {
        error: 'copia incompleta', retry: true,
        folder_url: out.folder_url || null,
        saved: out.saved, already: out.already, total: arquivos.length
      });
    }

    await marcar(id, {
      drive_status: 'enviado',
      drive_folder_url: out.folder_url || null,
      drive_error: null,
      drive_sent_at: new Date().toISOString()
    });

    /* O Storage é BUFFER, o Drive é DESTINO. Com a cópia confirmada
       arquivo por arquivo, a cópia temporária sai: material de aluno não
       fica guardado em dois lugares sem motivo. Falhar ao apagar o
       buffer nunca derruba o envio — o material já está no Drive, que é
       o que importa. */
    const limpou = await limparBuffer(arquivos);

    return resp(200, {
      ok: true, folder_url: out.folder_url || null,
      saved: out.saved, already: out.already, buffer_cleared: limpou
    });

  } catch (e) {
    console.error('aporte-drive', e && e.message ? e.message : String(e));
    return resp(500, { error: 'error interno' });
  }
};

/* ------------------------------------------------------------------ */

/* ---------------------------------------------------------------------
   NOME TÉCNICO DO ARQUIVO NO DRIVE

   Dois arquivos DIFERENTES podem legitimamente se chamar «prova.pdf» —
   a prova de 2024 e a de 2025, duas fotos do mesmo quadro. O Apps
   Script decidia «este já está lá?» procurando pelo nome do aluno, e
   então o segundo «prova.pdf» achava o primeiro, contava como já
   gravado, e a soma `saved + already === total` dava `complete: true`.
   O backend apagava o buffer. O segundo arquivo desaparecia sem que
   ninguém visse — nem o aluno, nem o painel.

   O nome técnico resolve isso sendo três coisas ao mesmo tempo:

     ÚNICO         o ordinal separa homônimos, inclusive os que a
                   sanitização deixaria idênticos («prova final.pdf» e
                   «prova-final.pdf»);
     DETERMINÍSTICO  sai da posição no array `files` e do id do aporte,
                   não de sorteio nem de relógio;
     ESTÁVEL       o mesmo arquivo, na mesma posição, do mesmo aporte,
                   gera o mesmo nome em toda tentativa — é isso que faz
                   o retry reconhecer o que já subiu, um por um.

       01_A82F92C731D4_prova.pdf
       02_A82F92C731D4_prova.pdf

   Gerado AQUI, no servidor, a partir da linha do banco. O navegador
   nunca manda nome técnico: mandar seria deixá-lo escolher onde grava.
   ------------------------------------------------------------------ */

function nomeOriginal(n) {
  return String(n == null ? '' : n).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200)
         || 'archivo';
}

function nomeDrive(i, contributionId, original) {
  const ordinal = String(i + 1).padStart(2, '0');
  const curto = String(contributionId).replace(/-/g, '').slice(0, 12).toUpperCase();
  /* o nome do aluno sobrevive legível — só saem barras, controles e os
     «..» que poderiam virar caminho */
  const base = nomeOriginal(original)
    .replace(/[\/\\]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s]+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, 150) || 'archivo';
  return `${ordinal}_${curto}_${base}`;
}

/* Remove os objetos do bucket privado. Devolve true só se TODOS saíram.
   Nunca lança: é limpeza, não é a entrega. */
async function limparBuffer(arquivos) {
  const paths = (arquivos || []).map(f => f && f.path).filter(p => typeof p === 'string');
  if (!paths.length) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/aportes`, {
      method: 'DELETE',
      headers: { ...sr(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths })
    });
    if (!r.ok) { console.error('buffer no borrado, HTTP', r.status); return false; }
    const out = await r.json().catch(() => null);
    return Array.isArray(out) ? out.length === paths.length : true;
  } catch (e) {
    console.error('buffer no borrado');
    return false;
  }
}

async function marcar(id, campos) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/external_contributions?id=eq.${encodeURIComponent(id)}`,
      { method: 'PATCH',
        headers: { ...sr(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(campos) }
    );
  } catch (e) {
    console.error('no se pudo marcar el estado del aporte');
  }
}

// Mesma RPC que o painel usa. Fail-closed: qualquer erro = não é admin.
async function checkAdmin(token) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`,
                 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch (e) {
    console.error('checkAdmin');
    return false;
  }
}

function sr() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
}

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(obj)
  };
}
