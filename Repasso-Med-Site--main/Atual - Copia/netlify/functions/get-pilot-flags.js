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

   NOVA ERA · DUAS ETAPAS POR MATÉRIA (layout, caneta e tema, cada um separado)
     Além das listas acima (que seguem valendo como PRÉVIA, só para a conta de
     quem testa), cada matéria tem uma linha na tabela public.rm_materia_rollout
     (slug, layout_stage, pen_stage, visual_stage), cada coluna com um destes valores:
       off      ninguém (padrão; linha ausente = off)
       preview  só as contas das listas RM_PILOT_*_UIDS (José) — «ver e aprovar no iPad»
       all      TODOS os alunos que JÁ TÊM ACESSO àquela matéria (a mesma view
                my_active_subjects que o get-materia usa: dono + validade)
     Aluno sem acesso, matéria fora da tabela, tabela inexistente, coluna com valor
     estranho, erro de rede: tudo `false` (falha fechada, corpo idêntico). Nenhum
     curinga: cada matéria é uma linha, cada flag uma coluna. Layout e caneta são
     independentes (um pode estar em `all` e o outro em `off`). `visual` só existe
     por cima de `layout` (nunca sozinho). Áudio continua só no piloto.
     Voltar: `update public.rm_materia_rollout set layout_stage='off' where slug='…'`
     (vale na próxima abertura da matéria; sem deploy). A tabela é de LEITURA para o
     aluno (RLS) e só o painel SQL a altera; este arquivo só lê, com o token do aluno.

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
      const slugsLayout = listaSlugs(process.env.RM_LAYOUT_SLUGS);                // PRÉVIA por ambiente (legado das fases A5/A7): continua valendo
      const slugsVisual = listaSlugs(process.env.RM_VISUAL_SLUGS);
      const slugsPen    = listaSlugs(process.env.RM_PEN_SLUGS);
      const est = await lerEstagios(slug, token);
      let acesso = null;                                                          // consultado no máximo uma vez, e só se algum estágio for `all`
      const pode = async function (estagio, uids, slugsEnv) {
        const naPrevia = uids.indexOf(uid) !== -1;                                // as contas de teste (José) enxergam em `preview` e também em `all`
        if (naPrevia && (estagio !== 'off' || slugsEnv.indexOf(slug) !== -1)) return true;
        if (estagio === 'all') { if (acesso === null) acesso = await temAcesso(slug, token); return acesso; }   // todos os alunos COM acesso à matéria
        return false;
      };
      flags = { layout: await pode(est.layout, uidsLayout, slugsLayout), audio: false, pen: await pode(est.pen, uidsPen, slugsPen) };
      flags.visual = flags.layout && await pode(est.visual, uidsVisual, slugsVisual);   // camada sobre o Layout V2: nunca sem `layout`
    }
    const algum = flags.layout || flags.audio || flags.pen;
    return resp(algum ? flags : NEGADO, algum ? 'pilot' : 'denied', algum ? slug : null);
  } catch (e) {
    // nada de detalhe no corpo; o log fica só no servidor
    console.error('get-pilot-flags', e && e.message);
    return resp(NEGADO, 'denied');
  }
};
