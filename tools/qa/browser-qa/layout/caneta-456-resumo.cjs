/* Resume as medições do pen-bench (JSON antes/depois) em tabelas markdown — #456.
   Uso: node caneta-456-resumo.cjs <antes.json> <depois.json> [titulo]   (cada JSON é a saída de pen-bench.cjs --json) */
const fs = require('fs');
const [, , fa, fd, titulo] = process.argv;
const med = (a) => { a = a.filter(x => x !== null && x !== undefined && !isNaN(x)).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const f = (x, d = 1) => x === null || x === undefined ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
function agrupa(rs) {
  const g = {};
  rs.forEach(r => { const k = r.nome + '|' + r.cfg; (g[k] = g[k] || []).push(r); });
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, {
    n: v.length,
    upProc: med(v.map(r => r.quente && r.quente.upProcMs)), downProc: med(v.map(r => r.quente && r.quente.downProcMs)), upDur: med(v.map(r => r.quente && r.quente.upDurMs)),
    downDur: med(v.map(r => r.quente && r.quente.downDurMs)),
    moveP95: med(v.map(r => r.quente && r.quente.moveDurP95)), tinta: med(v.map(r => r.quente && r.quente.tintaP95)),
    quadroMax: med(v.map(r => r.quente && r.quente.maxQuadroMs)), lt: med(v.map(r => r.quente && r.quente.tarefasLongas)),
    cpu: med(v.map(r => r.cpuPorQuadro.tarefaMs)),
    perd: v.reduce((a, r) => a + (r.perdas.perdidos || 0) + (r.quente ? r.quente.perdidos : 0), 0),
    env: v.reduce((a, r) => a + r.enviados * (r.quente ? 1 + r.quente.tracos : 1), 0),
    erros: v.reduce((a, r) => a + r.erros, 0)
  }]));
}
const A = agrupa(JSON.parse(fs.readFileSync(fa))), D = agrupa(JSON.parse(fs.readFileSync(fd)));
let out = `### ${titulo || ''}\n\nMediana das repetições; traços «quentes» (2.º em diante) salvo onde dito. ms.\n\n| gesto | config | pointerup: processamento JS (antes → depois) | pointerup: duração até o quadro | pointermove p95 | tinta p95 | pior quadro | tarefas longas | CPU/quadro | pontos perdidos (antes → depois) |\n|---|---|---|---|---|---|---|---|---|---|\n`;
const ks = [...new Set([...Object.keys(A), ...Object.keys(D)])].sort();
ks.forEach(k => {
  const [g, c] = k.split('|'), a = A[k], d = D[k]; if (!a || !d) return;
  const par = (x, y) => `${f(x)} → ${f(y)}`;
  out += `| ${g} | ${c} | ${par(a.upProc, d.upProc)} | ${par(a.upDur, d.upDur)} | ${par(a.moveP95, d.moveP95)} | ${par(a.tinta, d.tinta)} | ${par(a.quadroMax, d.quadroMax)} | ${par(a.lt, d.lt)} | ${par(a.cpu, d.cpu)} | ${a.perd}/${a.env} → ${d.perd}/${d.env} |\n`;
});
console.log(out);
