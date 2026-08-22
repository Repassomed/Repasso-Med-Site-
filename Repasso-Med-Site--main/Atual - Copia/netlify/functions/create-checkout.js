/* =====================================================================
   REPASSO MED · create-checkout
   Cria um pedido pendente no Supabase e gera o link de pagamento na
   InfinitePay (Checkout Integrado). Chamado pelo site com o token de
   sessão do aluno logado.

   ENDPOINT (confirmado na documentação oficial, agosto/2026):
     POST https://api.checkout.infinitepay.io/links
     obrigatórios: handle, order_nsu, items[{quantity, price, description}]
     opcionais:    redirect_url, webhook_url, customer, address
     resposta:     { "url": "https://checkout.infinitepay.com.br/..." }

   v3 · o que mudou e POR QUÊ (o site vinha dando 502 «no se pudo generar
   el link de pago» sem dizer o motivo):

   1. O ERRO REAL AGORA APARECE. Antes, qualquer recusa da InfinitePay
      virava um 502 genérico e a causa só existia no log da Netlify.
      Agora a mensagem da InfinitePay volta ao navegador em `detail`.
   2. HANDLE SANEADO. A InfiniteTag tem que ir SEM o «$». Se a variável
      de ambiente foi salva como «$repassomed», a API recusa. O código
      agora remove «$», «@» e espaços.
   3. order_nsu SEMPRE STRING e price SEMPRE INTEIRO. A documentação usa
      string no order_nsu; e price_cents vindo do Postgres como numeric
      pode chegar em JSON como "1990" (string), que a API não aceita.
   4. SEGUNDA TENTATIVA SEM `customer`. Esse bloco é opcional; se vier
      incompleto ou com um telefone que a API não aceita, ela recusa o
      pedido inteiro. Se a primeira tentativa falhar, repetimos com o
      payload mínimo. Melhor vender com o aluno digitando o nome do que
      não vender.
   5. redirect_url/webhook_url DERIVADOS DA REQUISIÇÃO. Antes vinham de
      SITE_URL; se essa variável apontasse para um domínio diferente do
      que está no ar, o aluno pagava e o webhook nunca chegava — venda
      paga sem liberar acesso. Agora usamos o próprio host que atendeu a
      chamada, e SITE_URL vira apenas reserva.
   6. CARRINHO CONFERIDO. Se algum produto do carrinho não existir ou
      estiver inativo, o pedido é recusado em vez de cobrar só parte.
   7. MODO DIAGNÓSTICO: GET nesta função responde quais variáveis de
      ambiente estão configuradas (só sim/não — nenhum segredo) e faz um
      teste real contra a InfinitePay. É a forma rápida de descobrir a
      causa sem abrir o log da Netlify.

   Variáveis de ambiente (Netlify → Site settings → Environment):
     SUPABASE_URL               ex.: https://xxxx.supabase.co
     SUPABASE_ANON_KEY          chave anon (só valida o token do aluno)
     SUPABASE_SERVICE_ROLE_KEY  chave service_role (NUNCA no frontend)
     INFINITEPAY_HANDLE         sua InfiniteTag, SEM o $
     SITE_URL                   opcional — só reserva para o redirect
   ===================================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL     = (process.env.SITE_URL || '').replace(/\/+$/, '');
const IP_LINKS     = 'https://api.checkout.infinitepay.io/links';

/* A InfiniteTag vai sem «$». Um handle salvo como «$repassomed» é a
   causa mais banal — e mais frequente — de recusa na criação do link. */
const HANDLE = String(process.env.INFINITEPAY_HANDLE || '')
  .trim().replace(/^[$@\s]+/, '').replace(/\s+/g, '');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return resp(204, {});
  if (event.httpMethod === 'GET')     return diagnostico(event);
  if (event.httpMethod !== 'POST')    return resp(405, { error: 'method not allowed' });

  try {
    for (const [k, v] of Object.entries({ SUPABASE_URL, ANON_KEY, SERVICE_KEY, HANDLE })) {
      if (!v) {
        console.error('env faltando:', k);
        return resp(500, { error: 'configuración incompleta del servidor', detail: 'falta ' + k });
      }
    }
    const BASE = baseUrl(event);

    // 1) valida o aluno logado (token JWT do Supabase)
    const auth  = event.headers.authorization || event.headers.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return resp(401, { error: 'no autenticado' });

    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!uRes.ok) return resp(401, { error: 'sesión inválida' });
    const user = await uRes.json();

    // 1b) dados do cadastro, para PRÉ-PREENCHER o checkout (menos atrito)
    let customer = null;
    try {
      const prRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=full_name,phone`,
        { headers: sr() }
      );
      const prof  = prRes.ok ? (await prRes.json())[0] : null;
      const name  = prof && prof.full_name ? String(prof.full_name).trim().slice(0, 80) : '';
      const phone = prof && prof.phone ? onlyPhone(prof.phone) : '';
      const mail  = String(user.email || '').trim();
      if (mail) {
        customer = { email: mail };
        if (name)  customer.name = name;
        if (phone) customer.phone_number = phone;
      }
    } catch (e) {
      console.error('perfil (pré-preenchimento) falhou, seguindo sem ele:', e);
      if (user.email) customer = { email: user.email };
    }

    // 2) produtos (aceita um id ou uma lista — carrinho)
    const body = JSON.parse(event.body || '{}');
    let ids = body.product_ids || (body.product_id ? [body.product_id] : []);
    const couponCode = (body.coupon || '').trim();
    if (!Array.isArray(ids)) ids = [ids];
    ids = [...new Set(ids.filter(Boolean))];
    if (!ids.length)     return resp(400, { error: 'product_id(s) requerido(s)' });
    if (ids.length > 30) return resp(400, { error: 'demasiados items' });

    const inList = ids.map(encodeURIComponent).join(',');
    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=in.(${inList})&active=is.true&select=*`,
      { headers: sr() }
    );
    const prods = await pRes.json();
    if (!Array.isArray(prods) || !prods.length) return resp(404, { error: 'producto no encontrado' });

    // Se algum item do carrinho sumiu ou foi desativado, NÃO cobramos os
    // outros pela metade: o aluno pagaria esperando o carrinho inteiro.
    if (prods.length !== ids.length) {
      const faltan = ids.filter(id => !prods.some(p => String(p.id) === String(id)));
      console.error('produtos ausentes/inativos:', faltan);
      return resp(409, {
        error: 'Algún ítem del carrito ya no está disponible. Actualizá la página y probá de nuevo.',
        detail: 'ids no disponibles: ' + faltan.join(', ')
      });
    }

    // preço SEMPRE recalculado no servidor (o cliente nunca define o valor)
    let total = prods.reduce((s, p) => s + cents(p.price_cents), 0);
    if (!total || total < 1) return resp(400, { error: 'total inválido' });

    // cupom: validado NO BANCO com o token do próprio aluno
    let discount = 0, appliedCoupon = null;
    if (couponCode) {
      const vRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_coupon`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_code: couponCode, p_total: total })
      });
      const v = vRes.ok ? await vRes.json().catch(() => null) : null;
      if (!v || v.ok !== true) {
        return resp(400, { error: 'Cupón inválido o vencido.', coupon_reason: v && v.reason });
      }
      discount = Math.min(cents(v.discount_cents), total - 100); // nunca zera o pedido (mín. 1,00)
      if (discount < 0) discount = 0;
      appliedCoupon = v.code;
      total = total - discount;
    }

    // 3) pedido pendente (o id vira o order_nsu na InfinitePay)
    const oRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: { ...sr(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: user.id,
        product_id: prods.length === 1 ? prods[0].id : null,
        amount_cents: total, status: 'pending',
        coupon_code: appliedCoupon, discount_cents: discount || null
      })
    });
    if (!oRes.ok) {
      const t = await oRes.text();
      console.error('orders insert', oRes.status, t);
      return resp(500, { error: 'no se pudo crear la orden', detail: corte(t) });
    }
    const order = (await oRes.json())[0];

    // 3b) itens do pedido
    const iRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
      method: 'POST',
      headers: { ...sr(), 'Content-Type': 'application/json' },
      body: JSON.stringify(prods.map(p => ({
        order_id: order.id, product_id: p.id, price_cents: cents(p.price_cents)
      })))
    });
    if (!iRes.ok) {
      const t = await iRes.text();
      console.error('order_items insert', iRes.status, t);
      return resp(500, { error: 'no se pudieron registrar los items', detail: corte(t) });
    }

    // 4) link de checkout na InfinitePay
    const items = appliedCoupon
      ? [{ quantity: 1, price: total,
           description: desc(prods.map(p => p.name).join(' + ') + ' (cupón ' + appliedCoupon + ')') }]
      : prods.map(p => ({ quantity: 1, price: cents(p.price_cents), description: desc(p.name) }));

    const base = {
      handle: HANDLE,
      order_nsu: String(order.id),          // a documentação usa string
      redirect_url: `${BASE}/?compra=ok&pedido=${encodeURIComponent(order.id)}`,
      webhook_url: `${BASE}/.netlify/functions/infinitepay-webhook`,
      items
      // address NÃO é enviado: produto digital não precisa de entrega
    };

    // 1ª tentativa: com os dados do aluno pré-preenchidos.
    let out = await pedirLink({ ...base, customer });
    // 2ª tentativa: sem `customer`. Se o bloco opcional for o problema,
    // ainda assim a venda acontece (o aluno digita no checkout).
    if (!out.url && customer) {
      console.error('tentando de novo sem customer…');
      const semCustomer = await pedirLink(base);
      if (semCustomer.url) out = semCustomer;
      else out.detail = out.detail || semCustomer.detail;
    }

    if (!out.url) {
      console.error('infinitepay /links falhou:', out.status, out.detail);
      return resp(502, {
        error: 'no se pudo generar el link de pago',
        detail: out.detail,
        upstream_status: out.status
      });
    }

    // 5) guarda o link no pedido (auditoria) e devolve ao site
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      headers: { ...sr(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkout_url: out.url })
    });

    return resp(200, { url: out.url, order_id: order.id });
  } catch (e) {
    console.error(e);
    return resp(500, { error: 'error interno', detail: corte(String((e && e.message) || e)) });
  }
};

/* ---------------------------------------------------------------------
   Chamada à InfinitePay. Devolve sempre { url|null, status, detail }
   — nunca lança, para que o chamador decida se tenta de novo.
   --------------------------------------------------------------------- */
async function pedirLink(payload) {
  try {
    const r = await fetch(IP_LINKS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch (_) {}
    const url = j && (j.url || j.link || j.checkout_url || (j.data && (j.data.url || j.data.link)));
    if (r.ok && url) return { url, status: r.status, detail: null };
    return { url: null, status: r.status, detail: corte(mensagem(j) || txt) };
  } catch (e) {
    return { url: null, status: 0,
             detail: 'no se pudo contactar a InfinitePay: ' + corte(String((e && e.message) || e)) };
  }
}

/* Extrai a mensagem de erro seja qual for o formato que a API use. */
function mensagem(j) {
  if (!j || typeof j !== 'object') return '';
  if (typeof j.message === 'string') return j.message;
  if (typeof j.error === 'string')   return j.error;
  if (Array.isArray(j.errors))       return j.errors.map(e => (e && (e.message || e.detail)) || String(e)).join(' · ');
  if (j.errors && typeof j.errors === 'object') {
    return Object.entries(j.errors).map(([k, v]) => k + ': ' + [].concat(v).join(', ')).join(' · ');
  }
  return '';
}

/* ---------------------------------------------------------------------
   MODO DIAGNÓSTICO — abra no navegador:
     https://SEUSITE/.netlify/functions/create-checkout
   Mostra o que está configurado (sem revelar nenhum segredo) e faz um
   teste real de R$ 1,00 contra a InfinitePay para expor a mensagem dela.
   --------------------------------------------------------------------- */
async function diagnostico(event) {
  const BASE = baseUrl(event);
  const info = {
    env: {
      SUPABASE_URL:              !!SUPABASE_URL,
      SUPABASE_ANON_KEY:         !!ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!SERVICE_KEY,
      INFINITEPAY_HANDLE:        !!HANDLE,
      SITE_URL:                  !!SITE_URL
    },
    handle_usado: HANDLE || '(vacío)',
    handle_tenia_simbolo: /^[$@\s]/.test(String(process.env.INFINITEPAY_HANDLE || '')),
    base_url_detectada: BASE,
    site_url_configurada: SITE_URL || '(no definida)',
    site_url_coincide: !SITE_URL || SITE_URL === BASE,
    webhook_que_se_enviara: `${BASE}/.netlify/functions/infinitepay-webhook`
  };

  if (HANDLE) {
    const t = await pedirLink({
      handle: HANDLE,
      order_nsu: 'diag-' + Date.now(),
      redirect_url: `${BASE}/?diag=1`,
      items: [{ quantity: 1, price: 100, description: 'Prueba de configuración' }]
    });
    info.prueba_infinitepay = t.url
      ? { ok: true, mensaje: 'La API generó un link de prueba: la configuración está correcta.' }
      : { ok: false, status: t.status, mensaje: t.detail };
  } else {
    info.prueba_infinitepay = { ok: false, mensaje: 'INFINITEPAY_HANDLE no está configurada.' };
  }
  return resp(200, info);
}

/* ---------------------------------------------------------------------
   Base do site. Preferimos o host que atendeu ESTA requisição: é o único
   que temos certeza de estar no ar. Uma SITE_URL desatualizada apontando
   para um domínio que não responde faria o webhook nunca chegar — venda
   paga e acesso não liberado.
   --------------------------------------------------------------------- */
function baseUrl(event) {
  try {
    if (event && event.rawUrl) return new URL(event.rawUrl).origin;
  } catch (_) {}
  const h = (event && event.headers) || {};
  const host  = h['x-forwarded-host'] || h.host;
  const proto = h['x-forwarded-proto'] || 'https';
  if (host) return `${proto}://${host}`;
  return SITE_URL;
}

function sr() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
}

/* Centavos como INTEIRO. O Postgres pode devolver numeric como string
   ("1990"), e a InfinitePay espera número. */
function cents(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* Descrição do item: sem quebras de linha e curta. */
/* Descrição do item: curta e em ASCII puro.
   ⚠️ POR QUE TIRAR ACENTO:
   O Pix é um BR Code no formato EMV, onde cada campo é precedido pelo seu
   TAMANHO. Vários geradores contam CARACTERES, mas gravam BYTES — e em
   UTF-8 «í» ou «·» ocupam 2 bytes. Quando isso acontece, o tamanho
   declarado não bate com o conteúdo, o CRC final fica errado e o app do
   banco recusa com «QR Code inválido».
   Não temos como saber se a InfinitePay usa a descrição dentro do BR
   Code, mas mandar ASCII simples não custa nada e elimina a hipótese.
   Nomes como «Semiología II · Parcial 1» viram «Semiologia II - Parcial 1». */
function desc(s) {
  let t = String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // tira os acentos
    .replace(/[·•–—]/g, '-')                            // separadores «bonitos» -> hífen
    .replace(/[^\x20-\x7E]/g, '')                       // sobra só ASCII imprimível
    .replace(/\s+/g, ' ')
    .trim();
  return (t || 'Material de estudio').slice(0, 60);
}

function corte(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 300);
}

/* Telefone para pré-preencher o checkout — SOMENTE BRASILEIRO (+55).
   ⚠️ POR QUE SÓ +55:
   A tela de pagamento da InfinitePay é brasileira: o campo de telefone
   usa máscara de celular do Brasil (DDI 55 + DDD de 2 dígitos + 8/9
   dígitos) e é por ele que a InfinitePay manda o código de verificação
   por SMS/WhatsApp. Mandar um número paraguaio (+595) pré-preenchia o
   campo com algo que a máscara não aceita e a página quebrava.
   Guardamos o telefone do aluno no perfil de qualquer jeito (serve para
   suporte), mas só o encaminhamos quando é um número brasileiro válido.
   Qualquer outro caso devolve '' e o campo é omitido — melhor o aluno
   digitar na tela do que travar. */
function onlyPhone(raw) {
  const s = String(raw || '').trim();
  const d = s.replace(/\D+/g, '');
  if (!d) return '';
  // 55 + DDD (2) + número (8 ou 9) = 12 ou 13 dígitos
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return '+' + d;
  // 10/11 dígitos sem DDI, começando por DDD válido (11–99): assume Brasil
  if ((d.length === 10 || d.length === 11) && /^[1-9][1-9]/.test(d)) return '+55' + d;
  return '';
}

function resp(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}
