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

function resp(flags, reason) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-RM-Reason': reason || 'denied'
    },
    body: JSON.stringify({
      slug: PILOT_SLUG,
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
    if (slug !== PILOT_SLUG) return resp(NEGADO, 'denied');

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
      layout: uidsLayout.indexOf(uid) !== -1,
      audio:  uidsAudio.indexOf(uid) !== -1,
      pen:    uidsPen.indexOf(uid) !== -1
    };
    flags.visual = flags.layout && uidsVisual.indexOf(uid) !== -1;   // negado por padrão: lista própria obrigatória; camada sobre o Layout V2 (nunca sem `layout`)
    return resp(flags, flags.layout || flags.audio || flags.pen ? 'pilot' : 'denied');
  } catch (e) {
    // nada de detalhe no corpo; o log fica só no servidor
    console.error('get-pilot-flags', e && e.message);
    return resp(NEGADO, 'denied');
  }
};
