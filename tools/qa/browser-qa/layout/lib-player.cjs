/* Infraestrutura dos testes/capturas do PLAYER DO AUDIOBOOK no tema (piloto Semiología II).
   Semiología II REAL + shell real (rm-pilot → rm-layout/rm-modes) + caneta V2 real + tema (rm-materia-sistema) + **motor de áudio REAL**
   (rm-audio-boot → rm-audio/store/provider). Só o servidor é simulado: o gate do piloto (get-pilot-flags), o manifesto (get-audio-manifest), a assinatura
   (get-audio-url) e a mídia (mp3 gerado com ffmpeg, servido com Range) — 0 rede externa, 0 escrita em banco.
   O áudio de ausculta da matéria (os 6 <audio> originais) fica como está: o motor pausa um quando o outro toca. */
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const { serve } = require('./serve.cjs');
const JOSE = 'd4d215d3-36dd-4efb-8869-bdea5376c648';
const SUPA = 'https://supa.test';

/* itens do manifesto: 4 áudios (como os do piloto), em blocos reais da matéria */
const ITENS = [
  { audio_id: 's2-b01-motivo', block_id: 's2-b01', theme: 'Semiología II · Bloque 01', title: 'Motivo de consulta y anamnesis respiratoria', duration: 90, order: 1, version: 'v1' },
  { audio_id: 's2-b03-epoc', block_id: 's2-b03', theme: 'Semiología II · Bloque 03', title: 'Síndrome EPOC', duration: 75, order: 2, version: 'v1' },
  { audio_id: 's2-b04-cond', block_id: 's2-b04', theme: 'Semiología II · Bloque 04', title: 'Síndrome de condensación pulmonar', duration: 80, order: 3, version: 'v1' },
  { audio_id: 's2-b05-derrame', block_id: 's2-b05', theme: 'Semiología II · Bloque 05', title: 'Derrame pleural', duration: 70, order: 4, version: 'v1' }
].map(i => Object.assign({ subject_slug: 'semiologia-ii' }, i));

function ffmpeg() {
  if (process.env.RM_FFMPEG) return process.env.RM_FFMPEG;
  const r = cp.spawnSync('which', ['ffmpeg'], { encoding: 'utf8' });
  if (r.status === 0) return r.stdout.trim();
  throw new Error('ffmpeg não encontrado (defina RM_FFMPEG)');
}
function gerarMidia() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-player-')), F = ffmpeg(), out = {};
  ITENS.forEach((it, k) => {
    const f = path.join(tmp, it.audio_id + '.mp3');
    const r = cp.spawnSync(F, ['-y', '-f', 'lavfi', '-i', `sine=frequency=${330 + 55 * k}:duration=${it.duration}`, '-c:a', 'libmp3lame', '-b:a', '32k', f], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
    out[it.audio_id] = fs.readFileSync(f);
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}

/* abre a matéria com o tema + áudio. opts: {visual:true, w, h, touch, scale, manifesto:true, nav:false, hash:'', atrasoManifesto:0}
   `nav:false` (padrão) desliga a NAVEGAÇÃO POR BLOCO (RMNav.detach()) logo após a carga: os testes de geometria/tema/player medem a leitura contínua, como na PR #446;
   a navegação tem o seu próprio teste (nav-sistema.test.cjs, `nav:true`). `hash` abre a página com um deep link; `atrasoManifesto` (ms) segura o manifesto (cards assíncronos). */
async function abrir(br, base, midia, { w, h, visual = true, touch = w < 900, scale = 1, manifesto = true, uid = JOSE, railMin = false, nav = false, hash = '', atrasoManifesto = 0 } = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: false, deviceScaleFactor: scale });
  const page = await ctx.newPage(); const errs = [], reqs = { manifest: 0, url: 0, media: 0 };
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('c:' + m.text().slice(0, 140)); });
  await page.addInitScript(([u, id, rail]) => {
    window.SUPABASE_URL = u;
    if (rail) { try { localStorage.setItem('rm.l2.rail', 'min'); } catch (e) {} }          // aluno minimizou a lateral (trilho de ícones)
    /* o harness devolve uma sessão sem `user`; o boot do áudio exige token + user.id (como a sessão real do Supabase) */
    let v; Object.defineProperty(window, 'RM_SB', { configurable: true, get() { return v; }, set(x) {
      if (x && x.auth) {
        x.auth.getSession = async () => ({ data: { session: { access_token: 'tok-test', user: { id } } } });
        x.auth.onAuthStateChange = (cb) => { (window.__authCbs = window.__authCbs || []).push(cb); return { data: { subscription: { unsubscribe() { window.__authCbs = (window.__authCbs || []).filter(c => c !== cb); } } } }; };   // permite simular SIGNED_OUT
      }
      v = x; } });
    /* toda mídia que tocar fica registrada (o motor usa um Audio fora do DOM): o teste confere que tudo parou */
    window.__media = []; const op = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!window.__media.includes(this)) window.__media.push(this); return op.apply(this, arguments); };
  }, [SUPA, uid, railMin]);
  await page.route('**/get-pilot-flags*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ slug: 'semiologia-ii', layout: true, visual, audio: true }) }));
  await page.route('**/get-audio-manifest*', async r => { reqs.manifest++; if (atrasoManifesto) await new Promise(o => setTimeout(o, atrasoManifesto)); r.fulfill(manifesto ? { status: 200, contentType: 'application/json', body: JSON.stringify({ items: ITENS }) } : { status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }); });
  await page.route('**/get-audio-url*', r => {
    reqs.url++; const id = new URL(r.request().url()).searchParams.get('audio_id');
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ src: `${SUPA}/storage/v1/object/sign/audiobooks/semiologia-ii/${id}.mp3?token=t${reqs.url}`, expiresAt: Date.now() + 600000 }) });
  });
  await page.route(SUPA + '/**', r => {
    reqs.media++;
    const m = /\/audiobooks\/semiologia-ii\/([\w-]+)\.mp3/.exec(r.request().url()); const buf = m && midia[m[1]];
    if (!buf) return r.fulfill({ status: 404, body: '' });
    const rg = /bytes=(\d*)-(\d*)/.exec(r.request().headers().range || '');
    if (!rg) return r.fulfill({ status: 200, headers: { 'accept-ranges': 'bytes', 'content-type': 'audio/mpeg', 'content-length': String(buf.length) }, body: buf });
    const ini = rg[1] === '' ? 0 : +rg[1], fim = rg[2] === '' ? buf.length - 1 : Math.min(+rg[2], buf.length - 1);
    r.fulfill({ status: 206, headers: { 'accept-ranges': 'bytes', 'content-type': 'audio/mpeg', 'content-range': `bytes ${ini}-${fim}/${buf.length}`, 'content-length': String(fim - ini + 1) }, body: buf.subarray(ini, fim + 1) });
  });
  const fd = process.env.RM_FONTS_DIR ? path.resolve(process.env.RM_FONTS_DIR) + '/' : null;
  if (fd && fs.existsSync(fd + 'local.css')) {
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(fd + 'local.css', 'utf8') }));
    await page.route('**/__fonts/**', r => r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(fd + path.basename(new URL(r.request().url()).pathname)) }));
  }
  await page.goto(`${base}/p.html?slug=semiologia-ii&tab=semio2&uid=${uid}&wait=1800${hash}`, { timeout: 120000 });
  await page.waitForFunction('window.__ready===true', { timeout: 120000 });
  await page.waitForTimeout(2200);
  if (!nav) { await page.evaluate(() => { if (window.RMNav && window.RMNav.ativo && window.RMNav.ativo()) window.RMNav.detach(); }); await page.waitForTimeout(300); }
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
  return { ctx, page, errs, reqs };
}

const esperar = (page, ms) => page.waitForTimeout(ms);
/* toca o 1.º áudio pelo card do bloco (como o aluno) e espera o estado «playing» */
async function tocar(page, id) {
  await page.evaluate(i => { const c = document.querySelector(`.rm-audio-card[data-audio-id="${i}"]`); c.scrollIntoView({ block: 'center' }); }, id || 's2-b01-motivo');
  await page.waitForTimeout(500);
  await page.evaluate(i => document.querySelector(`.rm-audio-card[data-audio-id="${i}"] button`).click(), id || 's2-b01-motivo');
  await page.waitForFunction(() => { const s = window.RMAudioBoot && window.RMAudioBoot._estado(); return s && s.motor && s.motor.state === 'playing' && s.motor.position > 1.5; }, null, { timeout: 15000 });
}
const motor = (page) => page.evaluate(() => { const s = window.RMAudioBoot && window.RMAudioBoot._estado(); return s && s.motor; });

/* rola até o fim REAL da página: as seções fora da tela têm content-visibility, então a altura cresce enquanto elas aparecem */
async function irAoFim(page) {
  let ant = -1, igual = 0;
  for (let i = 0; i < 30 && igual < 3; i++) {
    const h = await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); return document.documentElement.scrollHeight; });
    await page.waitForTimeout(300); igual = h === ant ? igual + 1 : 0; ant = h;
  }
}

module.exports = { serve, JOSE, SUPA, ITENS, gerarMidia, abrir, tocar, motor, esperar, irAoFim };
