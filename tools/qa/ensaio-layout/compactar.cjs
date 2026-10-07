/* Compacta resultados/*.json e resultados-corr/*.json (gerados por ensaio.cjs, NÃO versionados) em docs/layout-ensaio/resultado-compacto.json
   (versionado: uma linha por matéria e variante). Guarda, por matéria: contagem PASSA/FALHA/BLOQUEADO por área e por largura, TODAS as falhas e bloqueios
   com `dados` (a evidência), o descritor usado e as adaptações em memória. As verificações que passam não são repetidas: reproduza com ensaio.cjs.
   Uso: node tools/qa/ensaio-layout/compactar.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const DIR = path.join(L.REPO, 'docs/layout-ensaio');
const VAR = { 'como-esta': 'resultados', 'com-correcao': 'resultados-corr' };
const out = { gerado_em: new Date().toISOString(), nota: 'Uma linha por matéria e variante. As verificações que passam aparecem só como contagem; as falhas e bloqueios trazem a evidência (`dados`). Reproduzir: ensaio.cjs [--corr].', variantes: {} };
for (const [v, dir] of Object.entries(VAR)) {
  const d = path.join(DIR, dir); out.variantes[v] = {};
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter(x => x.endsWith('.json')).sort()) {
    const R = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); const porArea = {};
    R.checks.forEach(c => { const a = (porArea[c.area] = porArea[c.area] || { PASSA: 0, FALHA: 0, BLOQUEADO: 0, largFalha: [] }); a[c.estado]++; if (c.estado === 'FALHA' && !a.largFalha.includes(c.w)) a.largFalha.push(c.w); });
    out.variantes[v][R.slug] = { slug: R.slug, title: R.title, larguras: R.larguras, total: R.checks.length, segundos: R.segundos, descritor: R.descritor, adaptacoes: R.adaptacoes, notas: R.notas, porArea,
      falhas: R.checks.filter(c => c.estado === 'FALHA'), bloqueios: R.checks.filter(c => c.estado === 'BLOQUEADO') };
  }
}
const linhas = ['{"gerado_em":' + JSON.stringify(out.gerado_em) + ',"nota":' + JSON.stringify(out.nota) + ',"variantes":{'];
const vs = Object.keys(out.variantes);
vs.forEach((v, i) => {
  linhas.push(JSON.stringify(v) + ':{');
  const sl = Object.keys(out.variantes[v]);
  sl.forEach((s, j) => linhas.push(JSON.stringify(s) + ':' + JSON.stringify(out.variantes[v][s]) + (j < sl.length - 1 ? ',' : '')));
  linhas.push('}' + (i < vs.length - 1 ? ',' : ''));
});
linhas.push('}}');
fs.writeFileSync(path.join(DIR, 'resultado-compacto.json'), linhas.join('\n') + '\n');
console.log('resultado-compacto.json', linhas.length, 'linhas', Object.fromEntries(vs.map(v => [v, Object.keys(out.variantes[v]).length])));
