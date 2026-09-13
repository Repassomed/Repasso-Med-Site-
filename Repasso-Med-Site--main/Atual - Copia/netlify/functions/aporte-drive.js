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

    // 5) URLs assinadas — uma por arquivo, 10 minutos
    const arquivos = Array.isArray(linha.files) ? linha.files : [];
    const assinados = [];
    for (const f of arquivos) {
      if (!f || typeof f.path !== 'string') continue;
      const s = await fetch(
        `${SUPABASE_URL}/storage/v1/object/sign/aportes/${encodeURI(f.path)}`,
        { method: 'POST', headers: { ...sr(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: ASSINATURA_SEG }) }
      );
      if (!s.ok) {
        console.error('no se pudo firmar un archivo del aporte', id);
        continue;
      }
      const j = await s.json();
      assinados.push({
        name: String(f.name || 'archivo').slice(0, 200),
        mime: String(f.mime || ''),
        size: Number(f.size) || 0,
        url: `${SUPABASE_URL}/storage/v1${j.signedURL || j.signedUrl || ''}`
      });
    }
    if (arquivos.length && !assinados.length) {
      await marcar(id, { drive_status: 'error', drive_error: 'No se pudo firmar ningún archivo.' });
      return resp(502, { error: 'no se pudieron preparar los archivos' });
    }

    // 6) nome legível da matéria, para a pasta do Drive
    let materia = linha.subject_slug || '';
    if (linha.subject_slug) {
      try {
        const mRes = await fetch(
          `${SUPABASE_URL}/rest/v1/subjects?slug=eq.${encodeURIComponent(linha.subject_slug)}&select=name,semester`,
          { headers: sr() }
        );
        const m = mRes.ok ? (await mRes.json())[0] : null;
        if (m && m.name) materia = m.name;
      } catch (e) { console.error('nombre de materia no resuelto'); }
    }

    // 7) Apps Script. O frontend NUNCA escolhe folder id: mandamos
    //    semestre e matéria, e o script resolve a pasta dentro do root.
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
        semester: linha.semester,
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
      await marcar(id, { drive_status: 'error', drive_error: String(detalhe).slice(0, 500) });
      return resp(502, { error: 'no se pudo copiar al Drive', pending: true });
    }

    await marcar(id, {
      drive_status: 'enviado',
      drive_folder_url: out.folder_url || null,
      drive_error: null,
      drive_sent_at: new Date().toISOString()
    });

    /* O Storage é BUFFER, o Drive é DESTINO. Com a cópia confirmada
       arquivo por arquivo (`complete`), a cópia temporária sai: material
       de aluno não fica guardado em dois lugares sem motivo.

       Só com `complete`. Se UM arquivo faltou, o buffer fica de pé — é
       ele que permite o «Copiar al Drive» do painel tentar de novo. E
       falhar ao apagar o buffer nunca derruba o envio: o material já
       está no Drive, que é o que importa. */
    let limpou = false;
    if (out.complete === true) limpou = await limparBuffer(arquivos);

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
