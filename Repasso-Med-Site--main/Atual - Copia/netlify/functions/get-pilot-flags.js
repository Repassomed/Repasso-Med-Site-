/* =====================================================================
   REPASSO MED · netlify/functions/get-pilot-flags.js
   Layout V2 · Fase B1 — GATE DO PILOTO (servidor)

   O que faz
     Recebe o JWT do aluno logado e responde, para UMA matéria, flags
     independentes: { layout, audio, pen, visual }. `layout` (Fase B1) e
     `visual` (sistema visual de matérias: tema aprovado de Semiología II,
     rm-materia-sistema.js) são consumidos hoje; `audio` e `pen` existem
     para manter o contrato das fases seguintes e ficam `false` enquanto a
     variável de ambiente própria não for preenchida.

     `visual` é uma CAMADA SOBRE o Layout V2 e é NEGADO POR PADRÃO: só vale
     para quem tem `layout` E está em RM_PILOT_VISUAL_UIDS (lista própria,
     obrigatória). Variável ausente ou vazia ⇒ `visual:false` para todos —
     o tema NÃO herda automaticamente a lista do layout, para que quem vê o
     novo visual seja sempre uma decisão explícita por UID.
     Kill switch só do tema: esvaziar/remover RM_PILOT_VISUAL_UIDS (o Layout V2
     continua).

   Matéria por matéria (A5, pré-voo 24/10)
     A matéria do piloto continua fixa no código (semiologia-ii) e se comporta
     EXATAMENTE como antes. Qualquer outra matéria só é considerada se o slug
     estiver na lista da flag correspondente — três variáveis de ambiente, TODAS
     ausentes/vazias por padrão (⇒ nenhuma outra matéria, nenhum aluno):
       RM_LAYOUT_SLUGS (layout) · RM_VISUAL_SLUGS (tema; exige descriptor aprovado)
       · RM_PEN_SLUGS (caneta física).
     Duas chaves ao mesmo tempo: o UID (listas RM_PILOT_*_UIDS, como hoje) E o slug.
     Áudio continua só no piloto. Não existe «todos»: liberar para alunos exige
     decisão futura e explícita (nenhum curinga é aceito).
     Falha FECHADA e corpo idêntico em qualquer negação (inclusive slug fora da lista).
     Kill switch por matéria: tirar o slug da variável. Geral: esvaziar as variáveis.

   Quem é piloto
     Decidido por UID AUTENTICADO, lido de variáveis de ambiente do
     Netlify (o UID NUNCA entra no repositório):
       RM_PILOT_LAYOUT_UIDS · RM_PILOT_AUDIO_UIDS · RM_PILOT_PEN_UIDS ·
       RM_PILOT_VISUAL_UIDS (obrigatória para o tema, ver acima)
     (lista separada por vírgula). Não usa profiles.is_admin, não usa
     e-mail, não usa study_tools_beta, não usa BETA_UIDS da caneta.
     A matéria do piloto é fixa no código: semiologia-ii.

   FALHA FECHADA
     Qualquer erro (sem variável, sem token, token inválido, Supabase
     fora do ar, UID fora da lista, outra matéria) devolve as três flags
     em false com HTTP 200 e corpo idêntico — não revela se o UID existe
     nem qual foi o motivo. O cliente trata "false" como "experiência
     atual, sem nenhuma mudança".

   Não grava nada, em lugar nenhum. Só lê /auth/v1/user.
   Kill switch: esvaziar as variáveis de ambiente.
   ===================================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY;

const PILOT_SLUG = 'semiologia-ii';

function lista(v) {
  return String(v || '').split(',').map(function (s) { return s.trim().toLowerCase(); })
    .filter(Boolean);
}

/* slug aceito no formato do catálogo; listas por flag lidas do ambiente (curinga NÃO existe) */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,60}$/;
function listaSlugs(v) { return lista(v).filter(function (x) { return SLUG_RE.test(x); }); }

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
    const slugsLayout = listaSlugs(process.env.RM_LAYOUT_SLUGS);
    const slugsVisual = listaSlugs(process.env.RM_VISUAL_SLUGS);
    const slugsPen    = listaSlugs(process.env.RM_PEN_SLUGS);
    // outra matéria: precisa estar em ALGUMA das listas por matéria; fora delas, negado sem sequer olhar o token
    if (!ehPiloto && !(SLUG_RE.test(slug) && (slugsLayout.indexOf(slug) !== -1 || slugsPen.indexOf(slug) !== -1))) return resp(NEGADO, 'denied');

    const h     = (event && event.headers) || {};
    const auth  = h.authorization || h.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return resp(NEGADO, 'denied');

    const uidsLayout = lista(process.env.RM_PILOT_LAYOUT_UIDS);
    const uidsAudio  = lista(process.env.RM_PILOT_AUDIO_UIDS);
    const uidsPen    = lista(process.env.RM_PILOT_PEN_UIDS);
    const uidsVisual = lista(process.env.RM_PILOT_VISUAL_UIDS);
    if (!uidsLayout.length && !uidsAudio.length && !uidsPen.length) return resp(NEGADO, 'denied');

    // quem é o dono do token: só o Supabase sabe (nunca confiar no cliente)
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return resp(NEGADO, 'denied');
    const u = await r.json();
    const uid = u && typeof u.id === 'string' ? u.id.trim().toLowerCase() : '';
    if (!uid) return resp(NEGADO, 'denied');

    const flags = {
      layout: uidsLayout.indexOf(uid) !== -1 && (ehPiloto || slugsLayout.indexOf(slug) !== -1),
      audio:  ehPiloto && uidsAudio.indexOf(uid) !== -1,                         // áudio: só o piloto
      pen:    uidsPen.indexOf(uid) !== -1 && (ehPiloto || slugsPen.indexOf(slug) !== -1)
    };
    flags.visual = flags.layout && uidsVisual.indexOf(uid) !== -1 && (ehPiloto || slugsVisual.indexOf(slug) !== -1);   // negado por padrão: lista própria obrigatória; camada sobre o Layout V2 (nunca sem `layout`)
    const algum = flags.layout || flags.audio || flags.pen;
    return resp(algum ? flags : NEGADO, algum ? 'pilot' : 'denied', algum ? slug : null);
  } catch (e) {
    // nada de detalhe no corpo; o log fica só no servidor
    console.error('get-pilot-flags', e && e.message);
    return resp(NEGADO, 'denied');
  }
};
