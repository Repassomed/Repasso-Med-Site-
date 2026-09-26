// Issue #160 — PR administrativa do Intake da Inbox #88.
//
// Função PURA com a API do GitHub injetada (testada em intake_pr.test.mjs).
// Regras, todas fail-closed:
//   - só escreve na branch `coordinator/intake-<task_id>`, nunca na base;
//   - só escreve `coordination/tasks.json`;
//   - o conteúdo novo precisa ser EXATAMENTE a base + UMA tarefa no fim
//     (nenhuma outra chave/tarefa alterada);
//   - a base precisa ser o mesmo conteúdo sobre o qual o Intake decidiu;
//   - idempotente: branch/PR já existentes nunca geram segunda PR;
//   - nunca faz merge, nunca fecha nada, nunca toca outro arquivo.

export const PREFIXO_BRANCH = 'coordinator/intake-';
export const CAMINHO_TASKS = 'coordination/tasks.json';
const BRANCH_RE = /^coordinator\/intake-[a-z0-9][a-z0-9-]{0,63}$/;

function igual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function validarProposta(proposta, { baseTexto, baseBranch, sha256 }) {
  if (!proposta || typeof proposta !== 'object') return 'proposta ausente';
  if (!BRANCH_RE.test(String(proposta.branch || ''))) return 'branch fora do prefixo administrativo';
  if (proposta.branch !== `${PREFIXO_BRANCH}${proposta.task_id}`) return 'branch não corresponde ao task_id';
  if (!baseBranch || proposta.branch === baseBranch) return 'branch administrativa não pode ser a base';
  if (proposta.path !== CAMINHO_TASKS) return 'caminho diferente de coordination/tasks.json';
  if (sha256(baseTexto) !== proposta.base_sha256) return 'a base mudou desde a decisão do Intake';
  let base;
  let novo;
  try {
    base = JSON.parse(baseTexto);
    novo = JSON.parse(String(proposta.content || ''));
  } catch (e) {
    return 'JSON inválido';
  }
  const tb = base.tarefas || [];
  const tn = novo.tarefas || [];
  if (tn.length !== tb.length + 1) return 'a proposta precisa adicionar exatamente uma tarefa';
  if (!igual(tn.slice(0, tb.length), tb)) return 'a proposta altera tarefas existentes';
  const { tarefas: _b, ...restoBase } = base;
  const { tarefas: _n, ...restoNovo } = novo;
  if (!igual(restoBase, restoNovo)) return 'a proposta altera campos fora de tarefas';
  const nova = tn[tn.length - 1];
  if (nova.id !== proposta.task_id) return 'tarefa adicionada não é a proposta';
  if (tb.some(t => t.id === nova.id)) return 'task_id já existe na base';
  const arquivos = nova.arquivos || [];
  if (arquivos.length !== 1 || /[*?[\]]/.test(arquivos[0])) return 'allowed_files precisa ser um caminho exato';
  return null;
}

// api: { lerArquivo(path, ref) -> {texto, sha}|null, criarBranch(nome, sha) -> 'criada'|'existe',
//        gravarArquivo({path, branch, texto, blobSha, mensagem}), prsAbertas(branch) -> [{number, html_url}],
//        criarPr({title, body, head, base}) -> {number, html_url} }
export async function abrirPrDoIntake({ api, proposta, baseBranch, baseSha, sha256, log = () => {} }) {
  const existentes = await api.prsAbertas(proposta.branch);
  if (existentes.length) {
    return { acao: 'EXISTENTE', pr: existentes[0], motivo: 'já existe PR aberta para esta proposta' };
  }
  const base = await api.lerArquivo(CAMINHO_TASKS, baseSha);
  if (!base) return { acao: 'RECUSADA', motivo: 'tasks.json da base não encontrado' };
  const erro = validarProposta(proposta, { baseTexto: base.texto, baseBranch, sha256 });
  if (erro) return { acao: 'RECUSADA', motivo: erro };

  const criada = await api.criarBranch(proposta.branch, baseSha);
  if (criada === 'existe') {
    // Corrida ou execução anterior interrompida: só reaproveita a branch se
    // ela já contém EXATAMENTE esta proposta; nunca sobrescreve nada.
    const naBranch = await api.lerArquivo(CAMINHO_TASKS, proposta.branch);
    if (!naBranch || naBranch.texto !== proposta.content) {
      return { acao: 'RECUSADA', motivo: 'branch administrativa já existe com outro conteúdo' };
    }
    const outra = await api.prsAbertas(proposta.branch);
    if (outra.length) return { acao: 'EXISTENTE', pr: outra[0], motivo: 'PR criada por execução concorrente' };
  } else {
    if (proposta.branch === baseBranch) return { acao: 'RECUSADA', motivo: 'nunca escrever na base' };
    await api.gravarArquivo({
      path: CAMINHO_TASKS, branch: proposta.branch, texto: proposta.content, blobSha: base.sha,
      mensagem: `coordination: Intake #88 — proposta ${proposta.task_id}`,
    });
  }
  // criarPr devolve null quando o GitHub recusa uma 2ª PR para o mesmo head
  // (422): a outra execução concorrente venceu — nunca duas PRs.
  const pr = await api.criarPr({ title: proposta.title, body: proposta.body, head: proposta.branch, base: baseBranch });
  if (!pr) {
    const vencedora = await api.prsAbertas(proposta.branch);
    return { acao: 'EXISTENTE', pr: vencedora[0] || null, motivo: 'PR já aberta por execução concorrente' };
  }
  log(`PR administrativa #${pr.number} aberta para ${proposta.task_id}.`);
  return { acao: 'CRIADA', pr };
}
