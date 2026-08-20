/* =====================================================================
   REPASSO MED · get-materia
   Serve o HTML de uma matéria SOMENTE para quem tem acesso válido.

   Antes: os arquivos ficavam em /materias/*.html, públicos — qualquer
   pessoa com a URL baixava o conteúdo sem pagar.
   Agora: os arquivos ficam em materias-privadas/ (fora do site publicado)
   e só saem por aqui, depois de conferir no Supabase que o usuário logado
   tem aquela matéria liberada e não vencida.

   Fluxo:
     1. valida o token de sessão do aluno (Supabase Auth)
     2. confere em my_active_subjects (a mesma view que o site usa) se a
        matéria está liberada e dentro da validade
     3. só então devolve o HTML; senão, 401/403

   Variáveis de ambiente: SUPABASE_URL, SUPABASE_ANON_KEY.

   ---------------------------------------------------------------------
   v2 · 14/08/2026 — DIAGNÓSTICO DE ERRO 500
   Antes, quando o arquivo da matéria não estava no bundle da função, a
   resposta era um 500 seco («Contenido no disponible.») e não dava para
   saber se o problema era permissão, ambiente ou arquivo faltando.
   Agora:
     · a função procura o arquivo em VÁRIOS caminhos possíveis, porque o
       Netlify muda o layout do bundle conforme o tipo de deploy
       (drag-and-drop, CLI ou Git) e conforme o bundler;
     · todo erro devolve o motivo no corpo E no cabeçalho X-RM-Reason,
       que aparece direto no F12 → Network → get-materia → Headers;
     · existe ?diag=1 (só para admin) que lista quais matérias têm o
       arquivo presente, com tamanho — sem devolver conteúdo nenhum.
   Nada mais mudou: mesmo contrato, mesmas checagens de acesso.
   ===================================================================== */

const fs   = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY;

// slug permitido -> nome do arquivo (lista fixa: nada de montar caminho
// a partir do que o cliente manda, para evitar path traversal)
const FILES = {
  'anatomia-patologica':          'anatomia-patologica.html',
  'anatomia-patologica-practica': 'anatomia-patologica-practica.html',
  'fisiopatologia':               'fisiopatologia.html',
  'imagenologia':                 'imagenologia.html',
  'semiologia':                   'semiologia.html',
  'farmacologia':                 'farmacologia.html',
  'medicina-familiar':            'medicina-familiar.html',
  'semiologia-ii':                'semiologia-ii.html',
  'farmacologia-ii':              'farmacologia-ii.html',
  'embriologia':                  'embriologia.html',
  'histologia-i':                 'histologia-i.html',
  'histologia-i-practica':        'histologia-i-practica.html',
  'anatomia-i':                   'anatomia-i.html',
  'biologia':                     'biologia.html',
  'medicina-legal':               'medicina-legal.html',
  'anatomia-patologica-ii':       'anatomia-patologica-ii.html',
  'fisiopatologia-ii':            'fisiopatologia-ii.html',
  'toxicologia':                  'toxicologia.html',
  'dermatologia':                 'dermatologia.html',
};

/* ---------------------------------------------------------------------
   Onde o arquivo pode estar, conforme o tipo de deploy.
   O Netlify não garante um layout único: com esbuild + included_files o
   caminho relativo à raiz do repositório costuma ser preservado, mas em
   deploy manual (arrastar a pasta) e em algumas versões do bundler o
   arquivo aparece ao lado do próprio handler. Procuramos em todos.
   --------------------------------------------------------------------- */
const RAIZ = process.env.LAMBDA_TASK_ROOT || process.cwd();

function candidatos(file) {
  return [
    path.join(__dirname, 'materias-privadas', file),
    path.join(__dirname, '..', 'materias-privadas', file),
    path.join(RAIZ, 'netlify', 'functions', 'materias-privadas', file),
    path.join(RAIZ, 'materias-privadas', file),
    path.join(process.cwd(), 'netlify', 'functions', 'materias-privadas', file),
  ];
}

function localizar(file) {
  for (const p of candidatos(file)) {
    try { if (fs.statSync(p).isFile()) return p; } catch (_) { /* segue tentando */ }
  }
  return null;
}

exports.handler = async (event) => {
  try {
    if (!SUPABASE_URL || !ANON_KEY) {
      console.error('env faltando: SUPABASE_URL/SUPABASE_ANON_KEY');
      return resp(500, 'Configuración del servidor incompleta: faltan SUPABASE_URL o SUPABASE_ANON_KEY.',
                  'env-missing');
    }

    const qs   = event.queryStringParameters || {};
    const slug = qs.slug || '';

    // ---- token do aluno logado (vale também para o modo diagnóstico)
    const auth  = event.headers.authorization || event.headers.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return resp(401, 'No autenticado.', 'no-token');

    // ---- modo diagnóstico: ?diag=1 (SOMENTE admin, e nunca devolve conteúdo)
    if (qs.diag === '1') {
      if (!(await checkAdmin(token))) return resp(403, 'Solo para administradores.', 'diag-not-admin');
      const linhas = Object.entries(FILES).map(([s, f]) => {
        const p = localizar(f);
        let tam = '-';
        try { if (p) tam = fs.statSync(p).size + ' bytes'; } catch (_) {}
        return `${p ? 'OK  ' : 'FALTA'}  ${s.padEnd(30)} ${f.padEnd(38)} ${tam}${p ? '  ' + p : ''}`;
      });
      const cab = [
        '__dirname        : ' + __dirname,
        'LAMBDA_TASK_ROOT : ' + (process.env.LAMBDA_TASK_ROOT || '(no definido)'),
        'cwd              : ' + process.cwd(),
        'node             : ' + process.version,
        '',
        'estado  slug                           archivo                                tamaño / ruta',
        '-------------------------------------------------------------------------------------------',
      ];
      return resp(200, cab.concat(linhas).join('\n'), 'diag');
    }

    const file = FILES[slug];
    if (!file) return resp(404, 'Materia no encontrada.', 'slug-desconocido');

    // ---- confere acesso na view my_active_subjects (já filtra dono + validade)
    const chk = await fetch(
      `${SUPABASE_URL}/rest/v1/my_active_subjects?subject_slug=eq.${encodeURIComponent(slug)}&select=subject_slug`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } }
    );
    if (!chk.ok) {
      if (chk.status === 401) return resp(401, 'Sesión inválida.', 'supabase-401');
      console.error('supabase check', chk.status, await chk.text());
      return resp(502, 'No se pudo verificar el acceso.', 'supabase-' + chk.status);
    }
    const rows = await chk.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      // El alumno no tiene la materia. Antes de negar, vemos si es ADMIN:
      // el panel administrativo necesita leer los bloques de CUALQUIER materia
      // (para el mapeo por parcial), aunque el admin no la haya comprado.
      const isAdmin = await checkAdmin(token);
      if (!isAdmin) return resp(403, 'No tenés acceso a esta materia.', 'sin-acceso');
    }

    // ---- lê o arquivo privado e devolve
    const p = localizar(file);
    if (!p) {
      console.error('archivo no encontrado en ninguna ruta candidata:', file, candidatos(file));
      return resp(500,
        `Contenido no disponible: el archivo «${file}» no está en el bundle de la función.\n` +
        `Copialo a netlify/functions/materias-privadas/ y volvé a publicar.\n` +
        `Rutas probadas:\n  ` + candidatos(file).join('\n  '),
        'archivo-no-bundleado');
    }

    let html;
    try {
      html = fs.readFileSync(p, 'utf8');
    } catch (e) {
      console.error('no se pudo leer', p, e);
      return resp(500, `Contenido no disponible: error al leer «${file}» (${e.code || e.message}).`,
                  'lectura-fallida');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // não cacheia em CDN compartilhada: o acesso é por usuário
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-RM-Bytes': String(Buffer.byteLength(html, 'utf8'))
      },
      body: html
    };
  } catch (e) {
    console.error(e);
    return resp(500, 'Error interno: ' + (e && e.message ? e.message : String(e)), 'excepcion');
  }
};

// Pregunta a Supabase si el token pertenece a un administrador.
// Usa la misma RPC is_admin() que emplea el panel admin.html.
// Devuelve false ante cualquier error (fail-closed: nunca abre por accidente).
async function checkAdmin(token) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch (e) {
    console.error('checkAdmin', e);
    return false;
  }
}

function resp(statusCode, msg, reason) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      // aparece no F12 → Network → get-materia → Headers, sem precisar abrir o corpo
      'X-RM-Reason': reason || 'ok'
    },
    body: msg
  };
}
