#!/usr/bin/env node
/* Áudio POR MATÉRIA no servidor (#457): novos arquivos e manifestos entram aos poucos, cada matéria só quando autorizada.
   Sem rede, sem Supabase real, sem áudio — `fetch` é um fake de /auth/v1/user e /storage/v1/object/sign (o mesmo de server.test.cjs).
   Garante: (1) sem RM_AUDIO_SLUGS tudo fica como sempre (só o piloto); (2) matéria fora da lista = a MESMA negação de sempre;
   (3) matéria autorizada sem itens prontos = lista vazia (nenhum card); (4) um audio_id nunca é assinado por outra matéria;
   (5) RM_AUDIO_SLUGS vazio desliga até o piloto (kill switch); (6) slug malformado/protótipo nunca casa. */
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const SITE = path.join(ROOT, 'Repasso-Med-Site--main', 'Atual - Copia');
const { criar, lerManifesto, slugsAutorizados } = require(path.join(SITE, 'netlify', 'functions', '_audio', 'lib.js'));
const RMAudio = require(path.join(SITE, 'assets', 'rm-audio.js'));

let okN = 0, koN = 0;
const ok = (c, n, x) => { if (c) okN++; else { koN++; console.log('  ✗ ' + n + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const sec = t => console.log('\n▸ ' + t);

const SB = 'https://proj.supabase.co';
const it = (id, bloco, ordem, pronto, caminho) => ({ audio_id: id, block_id: bloco, theme: 't', title: 'Título ' + id, duration: 600, order: ordem, version: 'v1', path: caminho || ('m/' + id + '.m4a'), ready: pronto });
const MANIFESTO = {
  'semiologia-ii': [it('s2-b01-motivo', 's2-b01', 1, true)],
  'neurologia': [it('neu-b01', 'neub01', 1, true), it('neu-b02', 'neub02', 2, false)],   // b02 ainda sem arquivo: ready:false
  'toxicologia': [it('tox-b01', 'toxb01', 1, false)],                                    // nada pronto ainda
  '__proto__': [it('proto', 'x', 1, true)]
};
function mkFetch() {
  const calls = [];
  const f = async function (url, init) {
    init = init || {}; calls.push({ url, init });
    if (url === SB + '/auth/v1/user') {
      const a = (init.headers || {}).Authorization || '';
      const map = { 'Bearer tok-jose': { id: 'uid-jose' }, 'Bearer tok-other': { id: 'uid-outro' } };
      const u = map[a]; return u ? { ok: true, status: 200, json: async () => u } : { ok: false, status: 401, json: async () => ({}) };
    }
    if (url.indexOf(SB + '/storage/v1/object/sign/audiobooks/') === 0) { const rel = url.slice((SB + '/storage/v1').length); return { ok: true, status: 200, json: async () => ({ signedURL: rel + '?token=t' }) }; }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  f.calls = calls; return f;
}
const ENV = { SUPABASE_URL: SB, SUPABASE_ANON_KEY: 'ANON', SUPABASE_SERVICE_ROLE_KEY: 'SERVICE', RM_PILOT_AUDIO_UIDS: 'uid-jose', RM_AUDIO_MANIFEST: JSON.stringify(MANIFESTO) };
const mk = envOver => { const fetch = mkFetch(); return { h: criar({ env: Object.assign({}, ENV, envOver || {}), fetch, validateItem: RMAudio.validateItem }), fetch }; };
const ev = (slug, extra) => ({ httpMethod: 'GET', headers: { authorization: 'Bearer tok-jose' }, queryStringParameters: Object.assign({ slug }, extra || {}) });
const forma = r => JSON.stringify({ s: r.statusCode, h: r.headers, b: r.body });

(async () => {
  const oe = console.error; console.error = () => {};
  const NEG_M = forma(await mk().h.manifesto(ev('biologia')));
  const NEG_U = forma(await mk().h.assinar(ev('biologia', { audio_id: 'x' })));

  sec('Sem RM_AUDIO_SLUGS: exatamente como antes (só o piloto)');
  {
    ok(JSON.stringify(slugsAutorizados({})) === '["semiologia-ii"]', 'lista padrão = só semiologia-ii');
    const { h } = mk();
    const r = await h.manifesto(ev('semiologia-ii')), j = JSON.parse(r.body);
    ok(r.statusCode === 200 && j.slug === 'semiologia-ii' && j.items.length === 1 && j.items[0].subject_slug === 'semiologia-ii', 'piloto continua recebendo os seus itens', j);
    const n = await h.manifesto(ev('neurologia'));
    ok(forma(n) === NEG_M, 'neurologia (com manifesto pronto, mas não autorizada) = a MESMA negação de qualquer outra');
    ok(forma(await h.assinar(ev('neurologia', { audio_id: 'neu-b01' }))) === NEG_U, 'nem URL assinada');
  }

  sec('Matéria autorizada: entra aos poucos');
  {
    const { h, fetch } = mk({ RM_AUDIO_SLUGS: 'semiologia-ii, neurologia, toxicologia' });
    const j = JSON.parse((await h.manifesto(ev('neurologia'))).body);
    ok(j.slug === 'neurologia' && j.items.length === 1 && j.items[0].audio_id === 'neu-b01' && j.items[0].subject_slug === 'neurologia', 'neurologia: só o item PRONTO (b02 ready:false fica de fora)', j);
    ok(j.items.every(x => !('path' in x) && !('ready' in x)), 'nenhum caminho/flag interno sai do servidor');
    const t = JSON.parse((await h.manifesto(ev('toxicologia'))).body);
    ok(t.slug === 'toxicologia' && t.items.length === 0, 'toxicologia autorizada mas sem arquivo pronto: lista vazia ⇒ nenhum card', t);
    const s = JSON.parse((await h.manifesto(ev('semiologia-ii'))).body);
    ok(s.items.length === 1 && s.items[0].audio_id === 's2-b01-motivo', 'o piloto não muda quando outra matéria entra');
    const u = await h.assinar(ev('neurologia', { audio_id: 'neu-b01' })), uj = JSON.parse(u.body);
    ok(u.statusCode === 200 && /\/object\/sign\/audiobooks\/m\/neu-b01\.m4a\?token=t$/.test(uj.src), 'URL assinada do item da própria matéria', uj);
    ok(forma(await h.assinar(ev('neurologia', { audio_id: 'neu-b02' }))) === NEG_U, 'item ainda não pronto: sem URL');
    ok(forma(await h.assinar(ev('semiologia-ii', { audio_id: 'neu-b01' }))) === NEG_U, 'audio_id de neurologia pedido como semiologia-ii: negado (nunca cruza matérias)');
    ok(forma(await h.assinar(ev('neurologia', { audio_id: 's2-b01-motivo' }))) === NEG_U, 'e o inverso também');
    ok(fetch.calls.every(c => c.url.indexOf('neu-b02') < 0), 'nenhum pedido de assinatura para o item não pronto');
  }

  sec('Matéria sem chave no manifesto, slug malformado e kill switch');
  {
    const { h } = mk({ RM_AUDIO_SLUGS: 'semiologia-ii,dermatologia,__proto__,Neurologia/../x' });
    const d = JSON.parse((await h.manifesto(ev('dermatologia'))).body);
    ok(d.slug === 'dermatologia' && d.items.length === 0, 'matéria autorizada sem manifesto: lista vazia (sem card)', d);
    ok(forma(await h.manifesto(ev('__proto__'))) === NEG_M, '__proto__ nunca é matéria');
    ok(lerManifesto(JSON.stringify(MANIFESTO), RMAudio.validateItem, '__proto__').length === 0, 'lerManifesto recusa slug malformado');
    ok(forma(await h.manifesto(ev('neurologia/../x'))) === NEG_M, 'slug com caminho: negado');
    const off = mk({ RM_AUDIO_SLUGS: ' ' }).h;
    ok(forma(await off.manifesto(ev('semiologia-ii'))) === NEG_M, 'RM_AUDIO_SLUGS vazio desliga até o piloto (kill switch)');
    const outro = mk({ RM_AUDIO_SLUGS: 'neurologia' }).h;
    ok(forma(await outro.manifesto({ httpMethod: 'GET', headers: { authorization: 'Bearer tok-other' }, queryStringParameters: { slug: 'neurologia' } })) === NEG_M, 'UID fora da lista continua negado em qualquer matéria');
  }
  console.error = oe;
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  process.exit(koN ? 1 : 0);
})();
