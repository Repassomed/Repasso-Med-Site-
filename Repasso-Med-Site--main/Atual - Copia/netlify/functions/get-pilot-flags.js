/* =====================================================================
   REPASSO MED · netlify/functions/get-pilot-flags.js
   Nova Era — LIBERAÇÃO POR MATÉRIA (servidor)

   O que faz
     Recebe o JWT do aluno logado e responde, para UMA matéria, quatro flags
     independentes: { layout, audio, pen, visual }.
       layout  Layout V2 (rm-layout.js)        pen    caneta V2 da matéria
       visual  tema da matéria (camada SOBRE o layout; exige descritor aprovado)
       audio   audiolivro — SÓ no piloto (Semiología II); nunca em outra matéria

   Duas regras, e só duas

     1) SEMIOLOGÍA II (PILOTO) — como sempre foi
        Fixo no código (semiologia-ii). Decidido por UID autenticado, listas de
        variáveis de ambiente do Netlify (o UID NUNCA entra no repositório):
          RM_PILOT_LAYOUT_UIDS · RM_PILOT_AUDIO_UIDS · RM_PILOT_PEN_UIDS ·
          RM_PILOT_VISUAL_UIDS (obrigatória para o tema)
        Estas listas valem SÓ para o piloto. A tabela de estágios é ignorada nele.

     2) QUALQUER OUTRA MATÉRIA — tabela public.rm_materia_rollout
        Uma linha por matéria (slug, layout_stage, pen_stage, visual_stage); cada
        coluna vale um destes estágios:
          off      desligado para TODOS, inclusive administrador (padrão; linha
                   ausente, tabela ausente ou valor estranho = off)
          preview  SÓ ADMINISTRADOR (profiles.is_admin da própria conta; hoje 1
                   conta: José) — «ver e aprovar no iPad»
          all      os ALUNOS QUE JÁ TÊM ACESSO àquela matéria (a mesma view
                   my_active_subjects que o get-materia usa: dono + validade)
                   E o administrador
        Fora do piloto NADA mais liga uma matéria: as listas RM_PILOT_*_UIDS e as
        variáveis antigas RM_LAYOUT_SLUGS / RM_VISUAL_SLUGS / RM_PEN_SLUGS (fases
        A5/A7) NÃO são lidas, mesmo que existam no Netlify. Layout e caneta são
        independentes (um em `all` e o outro em `off`). `visual` só existe por cima
        de `layout`. Não existe curinga nem «todas as matérias»: cada matéria é uma
        linha, cada flag uma coluna.

   Voltar
     update public.rm_materia_rollout set layout_stage='off', pen_stage='off',
       visual_stage='off' where slug='…';   — vale na próxima abertura da matéria;
     sem deploy. A tabela é de LEITURA para o aluno (RLS); só o painel SQL a altera.

   FALHA FECHADA
     Qualquer erro (sem variável, sem token, token inválido, Supabase fora do ar,
     tabela ausente, linha ausente, valor estranho, aluno sem acesso, conta não
     administradora em `preview`, slug inválido) devolve as flags em false com
     HTTP 200 e corpo idêntico — não revela se a matéria existe nem o motivo. O
     cliente trata «false» como «experiência atual, sem nenhuma mudança».

   Somente leitura: nunca grava. Chamadas (todas GET, com o token da própria
   conta): /auth/v1/user, rm_materia_rollout, my_active_subjects e a PRÓPRIA linha
   de profiles (política profiles_self_select: id = auth.uid()).
   ===================================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY;

const PILOT_SLUG = 'semiologia-ii';

function lista(v) {
  return String(v || '').split(',').map(function (s) { return s.trim().toLowerCase(); })
    .filter(Boolean);
}

/* slug aceito no formato do catálogo (curinga NÃO existe) */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;

const ESTAGIOS = ['off', 'preview', 'all'];

/* estágios da matéria, lidos com o TOKEN DO ALUNO (RLS de leitura). Qualquer erro, linha ausente ou valor estranho ⇒ 'off'. */
async function lerEstagios(slug, token) {
  const off = { layout: 'off', pen: 'off', visual: 'off' };
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rm_materia_rollout?slug=eq.' + encodeURIComponent(slug) + '&select=layout_stage,pen_stage,visual_stage&limit=1', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return off;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0]) return off;
    const v = function (x) { return ESTAGIOS.indexOf(x) !== -1 ? x : 'off'; };
    return { layout: v(rows[0].layout_stage), pen: v(rows[0].pen_stage), visual: v(rows[0].visual_stage) };
  } catch (e) { return off; }
}

/* o aluno TEM esta matéria liberada e dentro da validade? Mesma view e mesma pergunta do get-materia.js. */
async function temAcesso(slug, token) {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/my_active_subjects?subject_slug=eq.' + encodeURIComponent(slug) + '&select=subject_slug', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) { return false; }
}

/* o dono do token é administrador? Leitura da PRÓPRIA linha de profiles (RLS profiles_self_select), com o token do aluno. Qualquer erro ⇒ false. */
async function souAdmin(uid, token) {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(uid) + '&select=is_admin&limit=1', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length === 1 && !!rows[0] && rows[0].is_admin === true;
  } catch (e) { return false; }
}

function resp(flags, reason, slugOk) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-RM-Reason': reason || 'denied'
    },
    body: JSON.stringify({
      slug: slugOk || PILOT_SLUG,   // negação: sempre o slug do piloto (corpo idêntico, não revela se a matéria existe na lista)
      layout: !!flags.layout,
      audio:  !!flags.audio,
      pen:    !!flags.pen,
      visual: !!flags.visual
    })
  };
}

const NEGADO = { layout: false, audio: false, pen: false, visual: false };

exports.handler = async function (event) {
  try {
    if (!SUPABASE_URL || !ANON_KEY) return resp(NEGADO, 'denied');

    const qs   = (event && event.queryStringParameters) || {};
    const slug = String(qs.slug || '');
    const ehPiloto = slug === PILOT_SLUG;
    if (!ehPiloto && !SLUG_RE.test(slug)) return resp(NEGADO, 'denied');

    const h     = (event && event.headers) || {};
    const auth  = h.authorization || h.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return resp(NEGADO, 'denied');

    const uidsLayout = lista(process.env.RM_PILOT_LAYOUT_UIDS);
    const uidsAudio  = lista(process.env.RM_PILOT_AUDIO_UIDS);
    const uidsPen    = lista(process.env.RM_PILOT_PEN_UIDS);
    const uidsVisual = lista(process.env.RM_PILOT_VISUAL_UIDS);
    // piloto: sem nenhuma lista de conta não há o que decidir (como sempre foi). Outras matérias podem estar em `all` sem lista alguma.
    if (ehPiloto && !uidsLayout.length && !uidsAudio.length && !uidsPen.length) return resp(NEGADO, 'denied');

    // quem é o dono do token: só o Supabase sabe (nunca confiar no cliente)
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return resp(NEGADO, 'denied');
    const u = await r.json();
    const uid = u && typeof u.id === 'string' ? u.id.trim().toLowerCase() : '';
    if (!uid) return resp(NEGADO, 'denied');

    let flags;
    if (ehPiloto) {
      // Semiología II: EXATAMENTE como antes (listas de conta; a tabela de estágios não se aplica ao piloto)
      flags = {
        layout: uidsLayout.indexOf(uid) !== -1,
        audio:  uidsAudio.indexOf(uid) !== -1,                                    // áudio: só o piloto
        pen:    uidsPen.indexOf(uid) !== -1
      };
      flags.visual = flags.layout && uidsVisual.indexOf(uid) !== -1;
    } else {
      // NOVA ERA: fora do piloto a ÚNICA fonte de verdade é a linha da matéria em rm_materia_rollout. As variáveis antigas RM_LAYOUT_SLUGS / RM_VISUAL_SLUGS /
      // RM_PEN_SLUGS (fases A5/A7) NÃO são mais lidas aqui: matéria `off` (ou sem linha, ou tabela ausente) fica desligada para TODOS, inclusive contas de teste,
      // mesmo que alguma dessas variáveis ainda exista no Netlify.
      const est = await lerEstagios(slug, token);
      let acesso = null, admin = null;                                            // cada consulta no máximo uma vez, e só quando um estágio a exige
      const ehAdmin = async function () { if (admin === null) admin = await souAdmin(uid, token); return admin; };
      const pode = async function (estagio) {
        if (estagio !== 'preview' && estagio !== 'all') return false;             // off / valor estranho ⇒ ninguém
        if (estagio === 'preview') return ehAdmin();                              // PRÉVIA = administrador (hoje, 1 conta: José). NÃO depende das listas RM_PILOT_*_UIDS (que servem também a outros testadores do piloto)
        if (acesso === null) acesso = await temAcesso(slug, token);               // `all`: todos os alunos COM acesso à matéria…
        return acesso || ehAdmin();                                               // …e o administrador continua vendo, mesmo sem ter a matéria comprada
      };
      flags = { layout: await pode(est.layout), audio: false, pen: await pode(est.pen) };
      flags.visual = flags.layout && await pode(est.visual);                      // camada sobre o Layout V2: nunca sem `layout`
    }
    const algum = flags.layout || flags.audio || flags.pen;
    return resp(algum ? flags : NEGADO, algum ? 'pilot' : 'denied', algum ? slug : null);
  } catch (e) {
    // nada de detalhe no corpo; o log fica só no servidor
    console.error('get-pilot-flags', e && e.message);
    return resp(NEGADO, 'denied');
  }
};
