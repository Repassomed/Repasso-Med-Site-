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
  sec('Autorização = UID E slug pedido (as duas condições, sempre no servidor)');
  {
    const { h } = mk({ RM_AUDIO_SLUGS: 'semiologia-ii,neurologia' });
    const pede = (tok, slug) => h.manifesto({ httpMethod: 'GET', headers: { authorization: 'Bearer ' + tok }, queryStringParameters: { slug } });
    const casos = [['tok-jose', 'neurologia', true], ['tok-jose', 'semiologia-ii', true], ['tok-jose', 'toxicologia', false],
                   ['tok-other', 'neurologia', false], ['tok-other', 'semiologia-ii', false], ['tok-falso', 'neurologia', false]];
    for (const [tok, slug, sim] of casos) {
      const r = await pede(tok, slug), j = JSON.parse(r.body);
      ok(sim ? (r.statusCode === 200 && j.slug === slug && j.items.length > 0) : forma(r) === NEG_M, `${tok} × ${slug} → ${sim ? 'autorizado' : 'a MESMA negação'}`, j);
    }
    const u = await h.assinar({ httpMethod: 'GET', headers: { authorization: 'Bearer tok-other' }, queryStringParameters: { slug: 'neurologia', audio_id: 'neu-b01' } });
    ok(forma(u) === NEG_U, 'URL: UID fora da lista negado mesmo com slug autorizado e audio_id pronto');
  }

  sec('O audio_id é buscado SÓ no manifesto da matéria pedida');
  {
    /* o mesmo audio_id em duas matérias, com objetos diferentes: a URL assinada sai sempre do objeto da matéria pedida */
    const DUP = { 'semiologia-ii': [it('comum', 's2-b01', 1, true, 'semiologia-ii/comum.m4a')], 'neurologia': [it('comum', 'neub01', 1, true, 'neurologia/comum.m4a')], 'toxicologia': [it('so-tox', 'toxb01', 1, true)] };
    const { h, fetch } = mk({ RM_AUDIO_SLUGS: 'semiologia-ii,neurologia,toxicologia', RM_AUDIO_MANIFEST: JSON.stringify(DUP) });
    const a1 = JSON.parse((await h.assinar(ev('semiologia-ii', { audio_id: 'comum' }))).body), a2 = JSON.parse((await h.assinar(ev('neurologia', { audio_id: 'comum' }))).body);
    ok(/\/audiobooks\/semiologia-ii\/comum\.m4a\?/.test(a1.src) && /\/audiobooks\/neurologia\/comum\.m4a\?/.test(a2.src), 'audio_id repetido: cada matéria assina o SEU objeto', { a1: a1.src, a2: a2.src });
    ok(forma(await h.assinar(ev('neurologia', { audio_id: 'so-tox' }))) === NEG_U && forma(await h.assinar(ev('semiologia-ii', { audio_id: 'so-tox' }))) === NEG_U, 'audio_id que só existe em toxicologia: negado como neurologia e como semiologia-ii');
    const assinados = fetch.calls.filter(c => /\/object\/sign\//.test(c.url)).map(c => c.url.split('/audiobooks/')[1]);
    ok(JSON.stringify(assinados) === JSON.stringify(['semiologia-ii/comum.m4a', 'neurologia/comum.m4a']), 'Storage só recebeu os 2 pedidos legítimos', assinados);
  }

  sec('Sem RM_AUDIO_SLUGS: só Semiología II, para TODA matéria do manifesto');
  {
    const TODAS = Object.assign({}, MANIFESTO, { 'biologia': [it('bio-b01', 'bio01', 1, true)], 'imagenologia': [it('img-b01', 'img01', 1, true)] });
    delete TODAS.__proto__;
    const { h } = mk({ RM_AUDIO_MANIFEST: JSON.stringify(TODAS) });
    for (const slug of Object.keys(TODAS)) {
      const r = await h.manifesto(ev(slug));
      ok(slug === 'semiologia-ii' ? JSON.parse(r.body).items.length === 1 : forma(r) === NEG_M, `${slug}: ${slug === 'semiologia-ii' ? 'liberado (piloto)' : 'negado'}`);
    }
    ok(forma(await h.manifesto(ev('Semiologia-II'))) === NEG_M && forma(await h.manifesto({ httpMethod: 'GET', headers: { authorization: 'Bearer tok-jose' }, queryStringParameters: {} })) === NEG_M, 'slug com maiúsculas ou ausente: negado, exatamente como na main');
  }

  sec('Piloto idêntico à main (diferencial: mesmas respostas da lib.js da main e desta PR, sem RM_AUDIO_SLUGS)');
  {
    let base = null;
    try {
      const cp = require('child_process'), os = require('os'), fs = require('fs');
      const rel = 'Repasso-Med-Site--main/Atual - Copia/netlify/functions/_audio/lib.js';
      const src = cp.execFileSync('git', ['show', (process.env.RM_BASE_REF || 'origin/main') + ':' + rel], { cwd: ROOT, encoding: 'utf8' });
      const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rm-lib-main-')), 'lib.js'); fs.writeFileSync(f, src); base = require(f);
    } catch (e) { console.log('  · sem git/origin/main: diferencial não rodou'); }
    if (base) {
      const ENVS = [{}, { RM_AUDIO_MANIFEST: JSON.stringify({ 'semiologia-ii': MANIFESTO['semiologia-ii'], neurologia: MANIFESTO.neurologia }) }, { RM_PILOT_AUDIO_UIDS: '' }];
      const EVS = [ev('semiologia-ii'), ev('neurologia'), ev('Semiologia-II'), ev('semiologia-ii', { audio_id: 's2-b01-motivo' }), ev('semiologia-ii', { audio_id: 'neu-b01' }), ev('neurologia', { audio_id: 'neu-b01' }),
                   { httpMethod: 'GET', headers: { authorization: 'Bearer tok-other' }, queryStringParameters: { slug: 'semiologia-ii' } }, { httpMethod: 'POST', headers: { authorization: 'Bearer tok-jose' }, queryStringParameters: { slug: 'semiologia-ii' } },
                   { httpMethod: 'GET', headers: {}, queryStringParameters: { slug: 'semiologia-ii', audio_id: 's2-b01-motivo' } }];
      let iguais = 0, dif = [];
      for (const e0 of ENVS) for (const e of EVS) for (const fn of ['manifesto', 'assinar']) {
        const env = Object.assign({}, ENV, e0), mkH = lib => lib.criar({ env, fetch: mkFetch(), validateItem: RMAudio.validateItem, now: () => 1e12 });
        const x = forma(await mkH(base)[fn](e)), y = forma(await mkH(require(path.join(SITE, 'netlify', 'functions', '_audio', 'lib.js')))[fn](e));
        if (x === y) iguais++; else dif.push({ fn, ev: e.queryStringParameters, x, y });
      }
      ok(dif.length === 0, `${iguais} combinações (ambiente × pedido × função): respostas byte a byte iguais às da main`, dif.slice(0, 3));
    }
  }

  console.error = oe;
  console.log(`\n${okN} verificações OK · ${koN} falhas`);
  process.exit(koN ? 1 : 0);
})();
