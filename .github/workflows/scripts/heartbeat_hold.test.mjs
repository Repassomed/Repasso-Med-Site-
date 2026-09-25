// Issue #281 — HOLD / PAUSADO POR JOSÉ no Heartbeat (guard_reconcile).
//
// Executa o script REAL do passo "Reconciliar uma PR NEEDS-AUDIT sem Cartão
// de Merge", extraído de coordinator-guard-heartbeat.yml, com `github`,
// `context` e `core` falsos. Nenhuma rede, nenhum dispatch real.
//
// Caso real de referência: PR #196 (Bioestadística). José pediu em
// comentário para não gastar auditoria paga; cada bump de auditPolicyVersion
// fez o Heartbeat redisparar o Guard → OBSERVE → Anthropic + OpenAI.
//
//     node --test .github/workflows/scripts/heartbeat_hold.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const YAML = readFileSync(join(aqui, '..', 'coordinator-guard-heartbeat.yml'), 'utf8');

function extrairScript(yaml) {
  const linhas = yaml.split('\n');
  const passo = linhas.findIndex(l => l.includes('Reconciliar uma PR NEEDS-AUDIT sem Cartão de Merge'));
  assert.ok(passo >= 0, 'passo guard_reconcile não encontrado');
  const idx = linhas.findIndex((l, i) => i > passo && /^\s*script:\s*\|\s*$/.test(l));
  assert.ok(idx > passo, 'bloco script: | não encontrado');
  const indentScript = linhas[idx].match(/^\s*/)[0].length;
  const corpo = [];
  for (let i = idx + 1; i < linhas.length; i++) {
    const l = linhas[i];
    if (l.trim() && l.match(/^\s*/)[0].length <= indentScript) break;
    corpo.push(l);
  }
  const indent = Math.min(...corpo.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
  return corpo.map(l => l.slice(indent)).join('\n');
}

const SCRIPT = extrairScript(YAML);
const POLICY = SCRIPT.match(/const auditPolicyVersion = '([^']+)'/)[1];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const executar = new AsyncFunction('github', 'context', 'core', SCRIPT);

const REPO = { owner: 'Repassomed', repo: 'Repasso-Med-Site-' };
const HEAD_196 = '06c5950c402f64c6c99075a09dffc36331a04464';
const MARKER_BRIDGE = '<!-- repasso-worker-bridge-needs-audit -->';

function pr(numero, { head = HEAD_196, labels = [] } = {}) {
  return {
    number: numero, state: 'open', body: `${MARKER_BRIDGE}\n- **Tarefa:** cleanup-como-estudar-bioestadistica`,
    labels: labels.map(name => ({ name })),
    base: { ref: 'main' },
    head: { sha: head, ref: `runner/pr-${numero}`, repo: { full_name: `${REPO.owner}/${REPO.repo}` } },
  };
}

// Cartão real da #196 de 25/09 17:56Z: política ANTERIOR, mesmo HEAD.
function cartao(policy, head = HEAD_196, criado = '2026-09-25T17:56:11Z') {
  return {
    user: { login: 'github-actions[bot]' }, created_at: criado, updated_at: criado,
    body: `<!-- repasso-coordinator -->\n## 🟣 CARTÃO DE MERGE — Coordinator V3\n` +
      `**Política de auditoria:** \`${policy}\`\n**HEAD auditado:** \`${head}\`\n`,
  };
}

// Comentário humano real de José na #196 (24/09 19:33Z): texto livre, NUNCA HOLD.
const COMENTARIO_JOSE_196 = {
  user: { login: 'Repassomed' }, created_at: '2026-09-24T19:33:08Z', updated_at: '2026-09-24T19:33:08Z',
  body: 'Decisão atual do José: … Manter a PR aberta/preservada; não fechar, não mergear e ' +
    'não gastar nova auditoria paga sem necessidade até nova priorização. HOLD <!-- repasso-hold --> coordinator:hold',
};

function fakes(pulls, comentariosPorPr) {
  const dispatches = [];
  const leituras = [];
  const logs = [];
  const github = {
    paginate: async (fn, params) => fn(params),
    rest: {
      pulls: { list: async () => pulls },
      issues: {
        listComments: async ({ issue_number }) => {
          leituras.push(issue_number);
          return comentariosPorPr[issue_number] || [];
        },
      },
      repos: {
        getCommit: async () => ({ data: { commit: { committer: { date: '2026-09-24T04:40:00Z' } } } }),
        listCommits: async () => ({ data: [] }),
      },
      actions: {
        createWorkflowDispatch: async (args) => { dispatches.push(args); },
      },
    },
  };
  const context = { repo: REPO, payload: { repository: { default_branch: 'main' } } };
  const core = { info: m => logs.push(String(m)), warning: m => logs.push(String(m)) };
  return { github, context, core, dispatches, leituras, logs };
}

const POLICY_ANTIGA = '2026-09-24-material-scope-head-context-privacy-redact-v2';

test('caso real #196: HOLD + mudança de auditPolicyVersion → zero Guard/reauditoria', async () => {
  const f = fakes([pr(196, { labels: ['coordinator:hold'] })], { 196: [cartao(POLICY_ANTIGA), COMENTARIO_JOSE_196] });
  await executar(f.github, f.context, f.core);
  assert.equal(f.dispatches.length, 0, 'PR em HOLD nunca recebe Guard de reconciliação');
  assert.deepEqual(f.leituras, [], 'nem sequer lê comentários da PR pausada');
  assert.ok(f.logs.some(l => l.includes('PR #196: em HOLD')), f.logs.join('\n'));
});

test('HOLD + heartbeat repetido → zero em todas as rodadas', async () => {
  for (let rodada = 0; rodada < 3; rodada++) {
    const f = fakes([pr(196, { labels: ['coordinator:hold', 'NEEDS-AUDIT'] })], { 196: [] });
    await executar(f.github, f.context, f.core);
    assert.equal(f.dispatches.length, 0);
  }
});

test('comentário humano arbitrário (texto/marcador) NÃO cria HOLD: fluxo normal redispara', async () => {
  const f = fakes([pr(196)], { 196: [cartao(POLICY_ANTIGA), COMENTARIO_JOSE_196] });
  await executar(f.github, f.context, f.core);
  assert.equal(f.dispatches.length, 1);
  assert.equal(f.dispatches[0].workflow_id, 'guard.yml');
  assert.deepEqual(f.dispatches[0].inputs, { pr_number: '196' });
});

test('PR não pausada → fluxo normal; HOLD de outra PR não trava a fila', async () => {
  const f = fakes(
    [pr(196, { labels: ['coordinator:hold'] }), pr(286, { head: '3bb68573f95d280bf5141bd23f3896100af8ddcf' })],
    { 196: [], 286: [] },
  );
  await executar(f.github, f.context, f.core);
  assert.equal(f.dispatches.length, 1);
  assert.deepEqual(f.dispatches[0].inputs, { pr_number: '286' });
});

test('remover HOLD → retoma; HEAD+política atuais continuam obrigatórios', async () => {
  // Sem o label, o cartão da política antiga não conta: redispara.
  const retomada = fakes([pr(196)], { 196: [cartao(POLICY_ANTIGA)] });
  await executar(retomada.github, retomada.context, retomada.core);
  assert.deepEqual(retomada.dispatches.map(d => d.inputs.pr_number), ['196']);

  // Com cartão da política ATUAL mas de OUTRO HEAD: também redispara.
  const outroHead = fakes([pr(196)], { 196: [cartao(POLICY, 'a'.repeat(40), '2026-09-25T19:00:00Z')] });
  await executar(outroHead.github, outroHead.context, outroHead.core);
  assert.equal(outroHead.dispatches.length, 1);

  // Cartão do HEAD e da política atuais: nada a fazer (nenhum gasto repetido).
  const jaAuditada = fakes([pr(196)], { 196: [cartao(POLICY, HEAD_196, '2026-09-25T19:00:00Z')] });
  await executar(jaAuditada.github, jaAuditada.context, jaAuditada.core);
  assert.equal(jaAuditada.dispatches.length, 0);
});

test('o script nunca faz merge/deploy: só despacha guard.yml', () => {
  for (const proibido of ['pulls.merge', 'merge(', 'deploy', 'createDeployment', 'pulls.update', 'issues.update']) {
    assert.ok(!SCRIPT.includes(proibido), `script do Heartbeat não pode conter ${proibido}`);
  }
  assert.ok(SCRIPT.includes("workflow_id: 'guard.yml'"));
});
