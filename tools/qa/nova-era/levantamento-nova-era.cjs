/* NOVA ERA · LEVANTAMENTO DE TODAS AS MATÉRIAS (somente leitura do repositório; nenhuma rede, nenhum Supabase, nenhuma flag tocada).
   Gera docs/nova-era-temas/LEVANTAMENTO-NOVA-ERA.md a partir do CÓDIGO da main:
     · candidatas  = lista CANDIDATAS de assets/rm-pilot.js (1.ª fechadura: só estas perguntam ao servidor)
     · tema        = bloco [data-rm-tema="slug"] em rm-materia-sistema.css  +  entrada em TEMAS de rm-materia-sistema.js
     · conteúdo    = docs/layout-ensaio/inventario.json (seções, perguntas, cartões)
     · porta       = resultado das 7 etapas de tools/qa/pre-voo/porta-da-materia.sh (pasta de .out passada em --portas)
     · testes      = tools/qa/nova-era/{real,temas,integracao}-*.test.cjs que citam o slug
     · lote        = slugs de docs/nova-era-temas/previa-lote.sql
     · ativação    = REGISTRO HISTÓRICO fixo abaixo (última leitura SELECT registrada no painel) — este script NÃO consulta o banco.
   «Preparada» aqui significa: candidata + tema + porta ABERTA (as 7 etapas passam: âncoras, ida-e-volta de grifos/traços/notas, layout em 4 larguras, uso e caneta nos modos).
   A caneta física é liberada por matéria pelo MESMO servidor (coluna pen_stage); a etapa «4-uso-caneta-modos» da porta prova a caneta V2 na matéria real.
   Uso: node tools/qa/nova-era/levantamento-nova-era.cjs --portas <pasta com <slug>.out> [--base <sha>] [--data AAAA-MM-DD] [--out <arquivo>]  */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const APP = path.join(ROOT, 'Repasso-Med-Site--main/Atual - Copia');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORTAS = arg('portas', ''), BASE = arg('base', '(não informada)'), DATA = arg('data', new Date().toISOString().slice(0, 10));
const OUT = arg('out', path.join(ROOT, 'docs/nova-era-temas/LEVANTAMENTO-NOVA-ERA.md'));
const rd = p => fs.readFileSync(p, 'utf8');

const pilot = rd(path.join(APP, 'assets/rm-pilot.js'));
const CAND = [...rd_(/var CANDIDATAS = \[(.*?)\]/s, pilot).matchAll(/'([^']+)'/g)].map(m => m[1]);
function rd_(re, s) { const m = re.exec(s); if (!m) throw new Error('padrão não encontrado: ' + re); return m[1]; }
const css = rd(path.join(APP, 'assets/rm-materia-sistema.css')), js = rd(path.join(APP, 'assets/rm-materia-sistema.js'));
const temCss = s => css.includes('[data-rm-tema="' + s + '"]');
const temJs = s => new RegExp("^    '" + s + "': \\{", 'm').test(js);
const inv = JSON.parse(rd(path.join(ROOT, 'docs/layout-ensaio/inventario.json'))).materias;
const invDe = s => inv.find(m => m.slug === s);
const loteSql = rd(path.join(ROOT, 'docs/nova-era-temas/previa-lote.sql'));
const LOTE = new Set([...rd_(/with alvo\(slug\) as \(values (.*?)\)\s*select a\.slug/s, loteSql).matchAll(/'([^']+)'/g)].map(m => m[1]));
const testes = fs.readdirSync(path.join(ROOT, 'tools/qa/nova-era')).filter(f => /^(real|temas|integracao)-.*\.test\.cjs$/.test(f));
const testesDe = s => testes.filter(f => { const t = rd(path.join(ROOT, 'tools/qa/nova-era', f)); return t.includes('"slug": "' + s + '"') || f.includes(s.replace(/-practica$/, '')); }).map(f => f.replace('.test.cjs', ''));

/* REGISTRO HISTÓRICO DE ATIVAÇÃO (não é leitura de hoje): painel de 17/11/2026 — SELECT somente leitura de rm_materia_rollout. */
const ATIVACAO = { 'medicina-familiar': 'preview (layout, caneta e tema) · só administrador · desde 02/11', 'semiologia-ii': 'PILOTO: liberada por UID nas variáveis do Netlify (a tabela é ignorada nele) — não verificável pelo repositório' };
const SEM_LINHA = 'sem linha (= desligada para todos)';
/* matérias fora do lote por decisão/estado, com o motivo escrito */
const FORA_DO_LOTE = { 'medicina-familiar': 'já em preview desde 02/11 (o lote nunca reduz nem mexe)', 'semiologia-ii': 'piloto: decidido por UID nas variáveis do Netlify, não pela tabela' };
const PR_ABERTA = { anestesiologia: '#710 (conteúdo: blocos 16–20) aberta — refazer a porta depois do merge dela' };
const SEM_CAND = { neurologia: 'não está em CANDIDATAS (1.ª fechadura ausente); porta já aberta em 30/10, mas a matéria está em reconstrução (#687/#682)', imagenologia: 'fora da Nova Era por decisão de José (será refeita)', bioestadistica: 'fora da Nova Era por decisão de José (será refeita)' };

function porta(s) {
  if (!PORTAS) return { estado: 'não rodada' };
  const f = path.join(PORTAS, s + '.out'); if (!fs.existsSync(f)) return { estado: 'não rodada' };
  const t = rd(f), ps = (t.match(/^PASSA /gm) || []).length, fa = [...t.matchAll(/^FALHA\s+(\S+)/gm)].map(m => m[1]);
  if (/PORTA ABERTA/.test(t) && !fa.length) return { estado: 'ABERTA', passos: ps };
  if (/PORTA FECHADA/.test(t) || fa.length) return { estado: 'FECHADA', passos: ps, falhas: fa };
  return { estado: 'em andamento', passos: ps };
}

const linhas = [], cont = { prep: 0, naoPrep: 0 };
const slugs = [...CAND];
for (const s of Object.keys(SEM_CAND)) if (!slugs.includes(s)) slugs.push(s);
for (const s of slugs) {
  const cand = CAND.includes(s), i = invDe(s), P = porta(s);
  const q = i ? i.secoes.reduce((a, x) => a + (x.quiz || 0), 0) : '—', fc = i ? i.secoes.reduce((a, x) => a + (x.fc || 0), 0) : '—';
  const tema = temCss(s) && temJs(s);
  const preparada = cand && tema && P.estado === 'ABERTA';
  preparada ? cont.prep++ : cont.naoPrep++;
  const faltas = [];
  if (!cand) faltas.push(SEM_CAND[s] || 'fora de CANDIDATAS');
  if (cand && !tema) faltas.push('tema incompleto (css/js)');
  if (cand && P.estado !== 'ABERTA') faltas.push('porta ' + P.estado + (P.falhas && P.falhas.length ? ' (' + P.falhas.join(', ') + ')' : ''));
  if (PR_ABERTA[s]) faltas.push(PR_ABERTA[s]);
  const noLote = LOTE.has(s);
  if (preparada && !noLote && !FORA_DO_LOTE[s]) faltas.push('entrar na lista do lote (previa-lote.sql)');
  if (FORA_DO_LOTE[s]) faltas.push('fora do lote: ' + FORA_DO_LOTE[s]);
  if (preparada) faltas.push('José: rodar o bloco 0 (leitura), o bloco 1 (liga) e conferir layout + caneta no iPad');
  linhas.push({ s, cand, tema, P, q, fc, secoes: i ? i.secoes.length : '—', preparada, noLote, ativ: ATIVACAO[s] || (cand ? SEM_LINHA : '—'), testes: testesDe(s), faltas });
}

const ok = b => b ? '✅' : '❌';
let md = `# Levantamento da Nova Era — todas as matérias\n\n`;
md += `**Gerado por** \`tools/qa/nova-era/levantamento-nova-era.cjs\` em ${DATA} sobre a \`main\` ${BASE}. **Somente leitura do repositório**: nada ativado, nenhum SQL, nenhuma variável do Netlify tocada.\n\n`;
md += `## Como ler\n- **Preparada (layout + caneta)** = está em CANDIDATAS do \`rm-pilot.js\`, tem tema (css + js) e a **porta** (\`porta-da-materia.sh\`, 7 etapas) está **ABERTA** nesta \`main\`: inventário em dia, marcadores, âncoras (1440 e 390), ida-e-volta de grifos/traços/notas, layout em 4 larguras e uso/caneta nos modos. Isto **não liga nada**: quem liga é a linha de \`rm_materia_rollout\` (SQL de José, depois do deploy).\n`;
md += `- **Ativação** é o **último registro** do painel (SELECT somente leitura de **17/11/2026**: só \`medicina-familiar\` tinha linha, em \`preview\`). **Não foi reverificada hoje** (esta rodada não executa SQL). Para conferir na hora: bloco 0 de \`previa-lote.sql\` (só leitura).\n`;
md += `- Linha ausente, valor estranho ou erro = **desligada para todos**, inclusive administrador. \`preview\` = só administrador (hoje a conta de José). \`all\` = alunos que já têm a matéria.\n\n`;
md += `## Resumo\n- Candidatas: **${CAND.length}** · **preparadas (porta aberta)**: **${cont.prep}** · não preparadas/pendentes: **${cont.naoPrep}**.\n`;
md += `- Ativas na conta de José (último registro): **medicina-familiar** (preview) e o piloto **semiologia-ii** (por UID). **Todas as demais: inativas** (sem linha).\n- Ativas para alunos: **nenhuma** (último registro).\n\n`;
md += `## Tabela\n\n| matéria | candidata | tema | seções · perguntas · cartões | porta (7 etapas) | ativação (último registro) | no lote | testes dedicados |\n|---|---|---|---|---|---|---|---|\n`;
for (const r of linhas) md += `| **${r.s}** | ${ok(r.cand)} | ${ok(r.tema)} | ${r.secoes} · ${r.q} · ${r.fc} | ${r.P.estado === 'ABERTA' ? '✅ ABERTA' : r.P.estado === 'não rodada' ? '— não rodada' : '❌ ' + r.P.estado} | ${r.ativ} | ${r.noLote ? '✅' : '—'} | ${r.testes.join(', ') || '—'} |\n`;
md += `\n## O que falta para a prévia privada (por matéria)\n`;
for (const r of linhas) md += `- **${r.s}** — ${r.preparada ? 'preparada' : 'NÃO preparada'}: ${r.faltas.join('; ') || 'nada'}.\n`;
md += `\n## Limites\n- «Preparada» é prova de **código + ensaio em navegador com Supabase simulado**, não de que José já viu a matéria no iPad: o roteiro físico de 3 min segue sendo dele.\n- O inventário de perguntas/cartões vem de \`docs/layout-ensaio/inventario.json\` (gerado pela ferramenta; conferido pela etapa 0 da porta).\n- Variáveis do Netlify (piloto) e a tabela real não são lidas aqui.\n`;
fs.writeFileSync(OUT, md);
console.log('levantamento →', path.relative(ROOT, OUT), '· candidatas', CAND.length, '· preparadas', cont.prep, '· pendentes', cont.naoPrep);
