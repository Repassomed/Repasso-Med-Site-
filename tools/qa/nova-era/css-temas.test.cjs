/* TEMAS EM CSS · integridade (estático): cada bloco `html.rm-sis[data-rm-tema="X"] { … }` é uma regra SEPARADA e COMPLETA — fecha com «}», não contém outra regra,
   traz --rm-surface/--rm-accent/--rm-tag-radius e as 6 paletas --rm-pal-1…6 — e cada tema do rm-materia-sistema.js tem o seu bloco (exceto os de formato antigo).
   Nasceu de um erro de merge que inseriu a regra de Toxicología dentro da de Histología II (e deixou a de Histología I sem fechar).
   Também fixa as cores de superfície/acento de cada tema (mudar cor de um tema exige mudar a tabela abaixo de propósito).
   Uso: node tools/qa/nova-era/css-temas.test.cjs */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const A = path.join(__dirname, '../../../Repasso-Med-Site--main/Atual - Copia/assets/');
const css = fs.readFileSync(A + 'rm-materia-sistema.css', 'utf8'), js = fs.readFileSync(A + 'rm-materia-sistema.js', 'utf8');
let n = 0, ko = 0; const ok = (c, m, x) => { n++; if (c) console.log('    ✓', m); else { ko++; console.log('    ✗ FALHA:', m, x !== undefined ? '→ ' + JSON.stringify(x).slice(0, 300) : ''); } return !!c; };
const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '');
console.log('\n▸ 1 · chaves balanceadas');
ok((limpo.match(/\{/g) || []).length === (limpo.match(/\}/g) || []).length, 'nº de «{» = nº de «}» no CSS', [(limpo.match(/\{/g) || []).length, (limpo.match(/\}/g) || []).length]);
console.log('\n▸ 2 · blocos de tema separados e completos');
const blocos = [...limpo.matchAll(/html\.rm-sis\[data-rm-tema="([a-z0-9-]+)"\] \{\n([\s\S]*?)\n\}\n/g)];
const vistos = {};
for (const [, slug, corpo] of blocos) {
  vistos[slug] = (vistos[slug] || 0) + 1;
  const pals = new Set([...corpo.matchAll(/--rm-pal-(\d):/g)].map(m => m[1]));
  ok(!/[{}]/.test(corpo) && !/html\.rm-sis/.test(corpo), `${slug}: a regra não contém outra regra`);
  ok(/--rm-surface:/.test(corpo) && /--rm-accent:/.test(corpo) && /--rm-tag-radius:/.test(corpo), `${slug}: tem superfície, acento e raio`);
  ok(pals.size === 6 && ['1', '2', '3', '4', '5', '6'].every(k => pals.has(k)), `${slug}: tem as 6 paletas (--rm-pal-1…6)`, [...pals]);
}
ok(Object.values(vistos).every(v => v === 1), 'nenhum tema tem o bloco declarado duas vezes', vistos);
console.log('\n▸ 3 · cada tema do módulo tem o seu bloco');
const w = { addEventListener() {}, document: { addEventListener() {}, readyState: 'loading', documentElement: { classList: { add() {}, remove() {} }, setAttribute() {} }, querySelector() { return null }, querySelectorAll() { return [] }, createElement() { return { style: {}, setAttribute() {}, appendChild() {}, classList: { add() {} } } }, head: { appendChild() {} }, body: {} }, location: { search: '' }, navigator: {}, matchMedia() { return { matches: false, addEventListener() {} } }, CSS: { escape: x => x } };
w.window = w; vm.runInNewContext(js, w);
const temas = Object.keys((w.RMSistema || {}).TEMAS || {});
const LEGADO = ['semiologia-ii', 'medicina-familiar', 'fisiopatologia', 'farmacologia'];   // formato antigo (variáveis em outro seletor)
for (const t of temas) ok(LEGADO.includes(t) || css.includes(`data-rm-tema="${t}"`), `${t}: tema do módulo tem CSS`);
ok(temas.length >= 11, `o módulo carrega ${temas.length} temas`, temas);
console.log('\n▸ 4 · cores fixas (superfície · acento) das matérias deste lote');
const COR = { 'histologia-i': ['#E0DBF0', '#5B4FA8'], 'histologia-i-practica': ['#EADCEB', '#8E3F94'], 'histologia-ii': ['#DCEBE3', '#2F8A6B'], 'histologia-ii-practica': ['#EFDDDD', '#A33A3A'], 'toxicologia': ['#E3EAD6', '#5C7F2A'],
  'anestesiologia': ['#D9E8EF', '#2F7FA6'], 'ortopedia': ['#EADFD2', '#A0663A'], 'oftalmologia': ['#DCE3F0', '#3E5FA8'] };
for (const [slug, [sup, ace]] of Object.entries(COR)) {
  const b = blocos.find(x => x[1] === slug); if (!b) { if (!['anestesiologia', 'ortopedia', 'oftalmologia'].includes(slug)) ok(false, `${slug}: bloco existe`); continue; }
  ok(new RegExp('--rm-surface: ' + sup, 'i').test(b[2]) && new RegExp('--rm-accent: ' + ace, 'i').test(b[2]), `${slug}: superfície ${sup} e acento ${ace}`);
}
console.log(`\ncss-temas: ${n - ko}/${n} verificações OK${ko ? ' — ' + ko + ' FALHAS' : ''}`); process.exit(ko ? 1 : 0);
