// Issue #160 — testes da PR administrativa do Intake (sem rede).
//     node --test .github/workflows/scripts/intake_pr.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { abrirPrDoIntake, validarProposta, CAMINHO_TASKS } from './intake_pr.mjs';

const sha256 = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const BASE = JSON.stringify({ versao: 1, tarefas: [{ id: 'antiga', arquivos: ['x/a.html'] }] }, null, 2) + '\n';

function proposta(extra = {}) {
  const nova = { id: 'neurologia-intake-abc123', arquivos: ['x/neurologia.html'], estado: 'READY' };
  const base = JSON.parse(BASE);
  base.tarefas.push(nova);
  return {
    task_id: nova.id, branch: `coordinator/intake-${nova.id}`, path: CAMINHO_TASKS,
    base_sha256: sha256(BASE), title: 'Intake #88', body: 'corpo',
    content: JSON.stringify(base, null, 2) + '\n', ...extra,
  };
}

function fakeGithub() {
  const estado = { branches: { main: { [CAMINHO_TASKS]: BASE } }, prs: [], escritas: [], merges: 0 };
  const api = {
    async lerArquivo(path, ref) {
      const ramo = ref === 'SHA_MAIN' ? 'main' : ref;
      const texto = estado.branches[ramo] && estado.branches[ramo][path];
      return texto === undefined ? null : { texto, sha: `blob-${ramo}` };
    },
    async criarBranch(nome) {
      if (estado.branches[nome]) return 'existe';
      estado.branches[nome] = { ...estado.branches.main };
      return 'criada';
    },
    async gravarArquivo({ path, branch, texto }) {
      estado.escritas.push({ path, branch });
      estado.branches[branch][path] = texto;
    },
    async prsAbertas(branch) { return estado.prs.filter(p => p.head === branch); },
    async criarPr({ head, base, title }) {
      if (estado.prs.some(p => p.head === head)) return null; // 422 do GitHub
      const pr = { number: 900 + estado.prs.length, html_url: `u/${head}`, head, base, title };
      estado.prs.push(pr);
      return pr;
    },
  };
  return { api, estado };
}

const args = (api, p = proposta()) => ({ api, proposta: p, baseBranch: 'main', baseSha: 'SHA_MAIN', sha256 });

test('proposta válida: uma branch administrativa, só tasks.json, uma PR, nunca a main', async () => {
  const { api, estado } = fakeGithub();
  const r = await abrirPrDoIntake(args(api));
  assert.equal(r.acao, 'CRIADA');
  assert.equal(estado.prs.length, 1);
  assert.deepEqual(estado.escritas, [{ path: CAMINHO_TASKS, branch: 'coordinator/intake-neurologia-intake-abc123' }]);
  assert.equal(estado.branches.main[CAMINHO_TASKS], BASE, 'main intocada');
  assert.equal(estado.prs[0].base, 'main');
});

test('mesma proposta de novo: zero PR nova', async () => {
  const { api, estado } = fakeGithub();
  await abrirPrDoIntake(args(api));
  const r = await abrirPrDoIntake(args(api));
  assert.equal(r.acao, 'EXISTENTE');
  assert.equal(estado.prs.length, 1);
});

test('dois eventos concorrentes: no máximo uma PR', async () => {
  const { api, estado } = fakeGithub();
  const [a, b] = await Promise.all([abrirPrDoIntake(args(api)), abrirPrDoIntake(args(api))]);
  assert.equal(estado.prs.length, 1, JSON.stringify([a, b]));
  assert.ok([a.acao, b.acao].includes('CRIADA'));
});

test('branch existente com outro conteúdo: nunca sobrescreve', async () => {
  const { api, estado } = fakeGithub();
  estado.branches['coordinator/intake-neurologia-intake-abc123'] = { [CAMINHO_TASKS]: 'outra coisa' };
  const r = await abrirPrDoIntake(args(api));
  assert.equal(r.acao, 'RECUSADA');
  assert.equal(estado.escritas.length, 0);
  assert.equal(estado.prs.length, 0);
});

test('recusa: branch fora do prefixo, base como alvo, outro arquivo, base mudou, tarefa alterada, curinga', () => {
  const ctx = { baseTexto: BASE, baseBranch: 'main', sha256 };
  assert.match(validarProposta(proposta({ branch: 'main' }), ctx), /prefixo/);
  assert.match(validarProposta(proposta({ path: 'Repasso/materia.html' }), ctx), /caminho/);
  assert.match(validarProposta(proposta({ base_sha256: 'x' }), ctx), /base mudou/);
  const mexe = JSON.parse(proposta().content);
  mexe.tarefas[0].estado = 'DONE';
  assert.match(validarProposta(proposta({ content: JSON.stringify(mexe) }), ctx), /altera tarefas existentes/);
  const duas = JSON.parse(proposta().content);
  duas.tarefas.push({ id: 'extra', arquivos: ['y'] });
  assert.match(validarProposta(proposta({ content: JSON.stringify(duas) }), ctx), /exatamente uma/);
  const glob = JSON.parse(proposta().content);
  glob.tarefas[1].arquivos = ['x/*.html'];
  assert.match(validarProposta(proposta({ content: JSON.stringify(glob) }), ctx), /caminho exato/);
  const campo = JSON.parse(proposta().content);
  campo.versao = 2;
  assert.match(validarProposta(proposta({ content: JSON.stringify(campo) }), ctx), /fora de tarefas/);
  assert.equal(validarProposta(proposta(), ctx), null);
});

test('o módulo nunca faz merge, deploy ou escrita fora da branch administrativa', async () => {
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('./intake_pr.mjs', import.meta.url), 'utf8');
  for (const proibido of ['merge(', 'pulls.merge', 'deploy', 'updateRef', 'force', 'deleteRef']) {
    assert.ok(!fonte.includes(proibido), proibido);
  }
});
