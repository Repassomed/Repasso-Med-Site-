/* =====================================================================
   REPASSO MED · netlify/functions/_audio/lib.js
   Núcleo testável da entrega de AUDIOBOOK (servidor). Sem handler próprio:
   `get-audio-manifest.js` e `get-audio-url.js` são finos e chamam isto.

   O que garante
     · Autorização NO SERVIDOR por UID autenticado (JWT → /auth/v1/user) contra
       a variável RM_PILOT_AUDIO_UIDS + matéria fixa `semiologia-ii`. Nunca só
       is_admin, e-mail ou a beta antiga. O UID não entra no repositório.
     · O cliente nunca escolhe caminho/bucket: só `audio_id`, que tem de estar
       no manifesto PRONTO (ready) do servidor. O caminho do objeto nunca sai
       daqui.
     · URL assinada de CURTA duração (600 s) do bucket privado `audiobooks`,
       criada com a service_role (que só existe aqui, nunca no navegador).
     · Toda negação devolve a MESMA resposta (forma, status e cabeçalhos), sem
       dizer se o UID existe, se o áudio existe ou qual foi o motivo.
     · `Cache-Control: no-store`; nada de UID, token, caminho ou URL em log.

   Manifesto
     Vem da variável de ambiente RM_AUDIO_MANIFEST (JSON) — NÃO do repositório
     (a pasta publicada é a raiz: qualquer arquivo versionado vira URL). Formato:
       { "semiologia-ii": [ { audio_id, block_id, theme, title, duration, order,
                               version, path, ready } ] }
     `path` (objeto no bucket) só existe no servidor. `ready:false` ou item
     inválido ⇒ não existe para o cliente (recurso ausente = acesso ausente).
     Sem variável ⇒ manifesto vazio ⇒ nenhum áudio.

   Kill switch: esvaziar RM_PILOT_AUDIO_UIDS (ou RM_AUDIO_MANIFEST).
   ===================================================================== */
'use strict';

const PILOT_SLUG = 'semiologia-ii';
const BUCKET = 'audiobooks';
const TTL_S = 600;                       // URL assinada: 10 min (o motor reautoriza sem perder o ponto)
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
const PATH_RE = /^[a-z0-9][a-z0-9._\/-]{0,200}$/i;   // sem `..`, sem `//`, sem `?`/`#`

function lista(v) {
  return String(v || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}

/* Campos públicos de um item (os mesmos 8 do validador do motor, rm-audio.js). */
const PUBLIC_KEYS = ['audio_id', 'subject_slug', 'block_id', 'theme', 'title', 'duration', 'order', 'version'];

function urlSegura(p) {
  return typeof p === 'string' && PATH_RE.test(p) && p.indexOf('..') < 0 && p.indexOf('//') < 0 && p.charAt(p.length - 1) !== '/';
}

/* Lê e valida o manifesto da variável. Devolve só itens prontos e bem formados. */
function lerManifesto(raw, validateItem) {
  let j;
  try { j = JSON.parse(String(raw || '')); } catch (e) { return []; }
  const arr = j && Array.isArray(j[PILOT_SLUG]) ? j[PILOT_SLUG] : [];
  const vistos = {}, out = [];
  arr.forEach(function (it) {
    if (!it || typeof it !== 'object' || it.ready !== true || !urlSegura(it.path)) return;
    /* campo desconhecido (p.ex. `url`, `token`) = manifesto mal formado: o item não existe (falha fechada) */
    if (Object.keys(it).some(function (k) { return PUBLIC_KEYS.indexOf(k) < 0 && k !== 'path' && k !== 'ready'; })) return;
    const pub = { subject_slug: PILOT_SLUG };
    PUBLIC_KEYS.forEach(function (k) { if (k !== 'subject_slug') pub[k] = it[k]; });
    const v = validateItem(pub);                    // mesmas regras do motor: recusa URL, caminho, token, etc.
    if (!v.ok || vistos[v.item.audio_id]) return;
    vistos[v.item.audio_id] = true;
    out.push({ pub: Object.assign({}, v.item), path: it.path });
  });
  out.sort(function (a, b) { return a.pub.order - b.pub.order; });
  return out;
}

function json(status, corpo) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    body: JSON.stringify(corpo)
  };
}
const NEGA_MANIFESTO = function () { return json(200, { slug: PILOT_SLUG, items: [] }); };
const NEGA_URL = function () { return json(404, { error: 'unavailable' }); };

/* `env` e `fetchImpl` injetados: o handler real passa process.env e fetch; os testes passam fakes. */
function criar(cfg) {
  const env = cfg.env, doFetch = cfg.fetch, agora = cfg.now || Date.now;
  const validateItem = cfg.validateItem;

  function token(event) {
    const h = (event && event.headers) || {};
    const a = h.authorization || h.Authorization || '';
    return String(a).replace(/^Bearer\s+/i, '');
  }

  /* Quem é o dono do token (só o Supabase sabe) e se está na lista de áudio. */
  async function autorizar(event) {
    const url = env.SUPABASE_URL, anon = env.SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    const uids = lista(env.RM_PILOT_AUDIO_UIDS);
    if (!uids.length) return null;
    const qs = (event && event.queryStringParameters) || {};
    if (String(qs.slug || '') !== PILOT_SLUG) return null;
    const t = token(event);
    if (!t) return null;
    const r = await doFetch(url + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + t } });
    if (!r || !r.ok) return null;
    const u = await r.json();
    const uid = u && typeof u.id === 'string' ? u.id.trim().toLowerCase() : '';
    return uid && uids.indexOf(uid) !== -1 ? uid : null;
  }

  async function manifesto(event) {
    try {
      if (event && event.httpMethod && event.httpMethod !== 'GET') return NEGA_MANIFESTO();
      if (!(await autorizar(event))) return NEGA_MANIFESTO();
      const itens = lerManifesto(env.RM_AUDIO_MANIFEST, validateItem).map(function (x) { return x.pub; });
      return json(200, { slug: PILOT_SLUG, items: itens });
    } catch (e) {
      console.error('get-audio-manifest', e && e.name);
      return NEGA_MANIFESTO();
    }
  }

  async function assinar(event) {
    try {
      if (event && event.httpMethod && event.httpMethod !== 'GET') return NEGA_URL();
      const service = env.SUPABASE_SERVICE_ROLE_KEY;
      if (!service) return NEGA_URL();
      const qs = (event && event.queryStringParameters) || {};
      const id = String(qs.audio_id || '');
      if (!ID_RE.test(id)) return NEGA_URL();
      if (!(await autorizar(event))) return NEGA_URL();
      const item = lerManifesto(env.RM_AUDIO_MANIFEST, validateItem).filter(function (x) { return x.pub.audio_id === id; })[0];
      if (!item) return NEGA_URL();                        // o cliente nunca escolhe o caminho: só o audio_id do manifesto
      const base = env.SUPABASE_URL + '/storage/v1';
      const caminho = item.path.split('/').map(encodeURIComponent).join('/');
      const r = await doFetch(base + '/object/sign/' + BUCKET + '/' + caminho, {
        method: 'POST',
        headers: { apikey: service, Authorization: 'Bearer ' + service, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: TTL_S })
      });
      if (!r || !r.ok) return NEGA_URL();
      const j = await r.json();
      const rel = j && (j.signedURL || j.signedUrl);
      /* só aceitamos o que aponta para o NOSSO bucket, sem desvios */
      if (typeof rel !== 'string' || rel.indexOf('/object/sign/' + BUCKET + '/') !== 0 || rel.indexOf('..') >= 0) return NEGA_URL();
      return json(200, { audio_id: id, src: base + rel, expiresAt: agora() + (TTL_S - 30) * 1000 });
    } catch (e) {
      console.error('get-audio-url', e && e.name);
      return NEGA_URL();
    }
  }

  return { manifesto: manifesto, assinar: assinar };
}

module.exports = { criar, lerManifesto, PILOT_SLUG, BUCKET, TTL_S };
