/* =====================================================================
   REPASSO MED · infinitepay-webhook
   Recebe o aviso de pagamento da InfinitePay e libera o acesso.

   SEGURANÇA (importante): o webhook da InfinitePay não traz assinatura,
   então este código NUNCA confia no corpo recebido. Antes de liberar
   qualquer acesso, ele confirma o pagamento diretamente com a InfinitePay
   via POST /payment_check (servidor a servidor). Só libera se a própria
   InfinitePay responder paid=true e o valor cobrir o pedido.

   IDEMPOTÊNCIA: cada transaction_nsu é registrado com UNIQUE em
   webhook_events; reenvios do mesmo evento respondem 200 sem repetir nada.
   (A liberação em si também é idempotente no banco.)

   Respostas: 200 = ok/ignorar · 400 = falha temporária (a InfinitePay
   reenvia depois, conforme a documentação oficial).

   Variáveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
   INFINITEPAY_HANDLE.
   ===================================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
/* Mesma higiene do create-checkout: a InfiniteTag vai SEM «$». Se a
   variável tiver o símbolo, o payment_check falha, o webhook responde 400
   e a InfinitePay fica reenviando um pagamento que nunca é liberado. */
const HANDLE       = String(process.env.INFINITEPAY_HANDLE || '')
  .trim().replace(/^[$@\s]+/, '').replace(/\s+/g, '');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'method not allowed' });

  try {
    if (!SUPABASE_URL || !SERVICE_KEY || !HANDLE) {
      console.error('env faltando'); return resp(400, { error: 'configuración incompleta' });
    }

    let p;
    try { p = JSON.parse(event.body || '{}'); }
    catch { return resp(200, { ok: false, reason: 'json inválido' }); }

    const { order_nsu, transaction_nsu, invoice_slug } = p;
    if (!order_nsu || !transaction_nsu) return resp(200, { ok: false, reason: 'payload incompleto' });

    // 1) IDEMPOTÊNCIA — registra o evento; duplicado → 200 e encerra
    const ev = await fetch(`${SUPABASE_URL}/rest/v1/webhook_events`, {
      method: 'POST',
      headers: { ...sr(), 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=ignore-duplicates' },
      body: JSON.stringify({ provider: 'infinitepay', event_key: String(transaction_nsu), payload: p })
    });
    if (!ev.ok) { console.error('webhook_events', await ev.text()); return resp(400, { error: 'log falló' }); }
    const inserted = await ev.json().catch(() => []);
    if (Array.isArray(inserted) && inserted.length === 0) {
      return resp(200, { ok: true, duplicated: true });
    }

    // 2) o pedido existe?
    const oRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order_nsu)}&select=id,status,amount_cents`,
      { headers: sr() }
    );
    const orders = await oRes.json().catch(() => []);
    if (!Array.isArray(orders) || !orders.length) {
      console.error('orden desconocida', order_nsu);
      return resp(200, { ok: false, reason: 'orden desconocida' }); // reenviar não resolveria
    }
    const order = orders[0];
    if (order.status === 'paid') return resp(200, { ok: true, already: true });

    // 3) VALIDAÇÃO REAL — confirma com a própria InfinitePay
    const chk = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: HANDLE, order_nsu, transaction_nsu, slug: invoice_slug })
    });
    const check = await chk.json().catch(() => ({}));
    if (!chk.ok || check.success !== true || check.paid !== true) {
      console.error('payment_check no confirmó:', chk.status, JSON.stringify(check));
      // 400 → InfinitePay reintenta. Se a resposta for "paid: false" de
      // verdade (pagamento recusado), o reenvio simplesmente repete o 400
      // e nada é liberado — que é o comportamento correto.
      return resp(400, { error: 'pago no confirmado', upstream_status: chk.status });
    }
    const paidAmount = Number(check.amount ?? 0);
    if (paidAmount < Number(order.amount_cents)) {
      console.error('monto insuficiente:', paidAmount, '<', order.amount_cents);
      return resp(200, { ok: false, reason: 'monto insuficiente' }); // fraude/erro: não reintentar
    }

    // 4) libera o acesso (função atômica e idempotente no banco)
    const g = await fetch(`${SUPABASE_URL}/rest/v1/rpc/grant_paid_order`, {
      method: 'POST',
      headers: { ...sr(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_order: order.id,
        p_transaction_nsu: String(transaction_nsu),
        p_invoice_slug: invoice_slug || null,
        p_receipt_url: p.receipt_url || null,
        p_paid_amount: Number(p.paid_amount ?? check.paid_amount ?? paidAmount) || null,
        p_capture_method: p.capture_method || check.capture_method || null
      })
    });
    if (!g.ok) { console.error('grant_paid_order', await g.text()); return resp(400, { error: 'error al liberar acceso' }); }

    return resp(200, { ok: true });
  } catch (e) {
    console.error(e);
    return resp(400, { error: 'error interno' });   // 400 → InfinitePay reintenta
  }
};

function sr() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
}
function resp(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
