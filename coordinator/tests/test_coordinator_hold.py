"""Issue #281 — HOLD / PAUSADO POR JOSÉ (label ``coordinator:hold``).

Caso real de referência: PR #196 (Bioestadística, HEAD ``06c5950c…``).
Em 24/09 19:33Z José comentou na PR para não gastar auditoria paga. Cada
bump de ``auditPolicyVersion`` fez o Heartbeat redisparar o Guard, e o
OBSERVE auditou de novo:

- 25/09 17:56Z, política v2: Anthropic US$ 0.035614 + OpenAI US$ 0.018374;
- 25/09 18:29Z, política v3: Anthropic US$ 0.034570 + OpenAI US$ 0.013806.

Um comentário em texto livre nunca pôde (nem deve) virar trava
automática. O mecanismo explícito é o LABEL atual da PR. Provas:

1. HOLD + mudança de política → zero chamada paga;
2. HOLD + Heartbeat → zero (prova comportamental em
   ``heartbeat_hold.test.mjs``, rodado aqui via ``node --test``);
3. HOLD + Bridge → não corrige, e runtime/branch/checkpoint ficam intactos;
4. PR não pausada → fluxo normal;
5. remover HOLD → fluxo normal retoma;
6. HEAD e política continuam obrigatórios depois da retomada;
7. comentário humano arbitrário não cria HOLD;
8. nenhum merge/deploy.

Nenhum teste chama API paga: os transportes são contadores falsos.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile

from . import _pathsetup
from coordinator import task_runtime, worker_bridge
from coordinator.budget import UsageLedger
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.github_event import (
    AUDIT_POLICY_VERSION,
    LABEL_HOLD,
    build_event_from_github_context,
    pr_em_hold,
)
from coordinator.observe import observe
from coordinator.openai_config import OpenAIAuditorConfig
from coordinator.tests.test_coordinator_v3 import (
    _OPENAI_MERGE_READY,
    _RespostaFalsa,
    _TransporteContador,
    _workers,
)
from coordinator.tests.test_worker_bridge import (
    _FakeGitHubApi,
    _cartao_needs_fix,
    _ciclo,
    _config,
    _patch_padrao,
    _registry_com_workers,
    _runtime_store,
    _tarefa,
)

REPO = "Repassomed/Repasso-Med-Site-"
HEAD_196 = "06c5950c402f64c6c99075a09dffc36331a04464"
MAIN_SHA = "368b26bca0ddc7c013ace565afb83e6219cc682f"
ARQUIVO_196 = "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/bioestadistica.html"
COMENTARIO_JOSE_196 = (
    "Decisão atual do José: Bioestatística ainda não foi lançada e fica em prioridade muito "
    "baixa por enquanto. … Manter a PR aberta/preservada; não fechar, não mergear e não gastar "
    "nova auditoria paga sem necessidade até nova priorização."
)
_NODE_TEST = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "scripts", "heartbeat_hold.test.mjs")


def _pr_info_196(*, labels=(), head_sha: str = HEAD_196, body_extra: str = "") -> dict:
    """``/tmp/pr-info.json`` que o passo prctx do OBSERVE grava para a #196."""
    return {
        "number": 196,
        "title": "[worker-bridge] P1 ALTA — Bioestadística: remover bloco metadidático “Como estudar”",
        "body": ("<!-- repasso-worker-bridge-needs-audit -->\n- **Tarefa:** cleanup-como-estudar-bioestadistica\n"
                 "- **Área:** materia\n" + body_extra),
        "labels": list(labels), "updated_at": "2026-09-25T18:29:48Z",
        "head_sha": head_sha, "state": "open", "base_ref": "main",
        "head_ref": "runner/cleanup-como-estudar-bioestadistica",
        "head_repo_full_name": REPO, "worker_bridge_needs_audit": True,
    }


def _evento_196(*, labels=(), conclusao: str = "success", head_sha: str = HEAD_196, body_extra: str = "",
                run_id: int = 36170000000):
    # Guard despachado pelo Heartbeat (workflow_dispatch): pull_requests vazio.
    payload = {"action": "completed", "workflow_run": {
        "id": run_id, "name": "Repasso Guard", "conclusion": conclusao,
        "head_sha": MAIN_SHA, "head_branch": "main", "pull_requests": [],
    }}
    pack = {"versao": 1, "resultado": "APROVADO" if conclusao == "success" else "REPROVADO",
            "base": "origin/main", "head": head_sha,
            "escopo_declarado": {"tarefa": "cleanup-como-estudar-bioestadistica", "area": "materia",
                                 "arquivos": [ARQUIVO_196]},
            "arquivos_alterados": [ARQUIVO_196],
            "achados": ([] if conclusao == "success" else [
                {"check": "materia", "severity": "HARD FAIL", "message": "id removido: bio00",
                 "where": "bioestadistica.html", "detail": {}}])}
    return build_event_from_github_context(
        "workflow_run", payload, REPO,
        pr_info=_pr_info_196(labels=labels, head_sha=head_sha, body_extra=body_extra),
        audit_pack=pack,
        pr_diff=f"diff --git a/{ARQUIVO_196} b/{ARQUIVO_196}\n-<h2>Cómo estudiar</h2>\n",
    )


class _Ambiente:
    """Dedup/ledgers/transportes compartilhados entre execuções — como em
    produção, onde o dedup sobrevive entre runs do OBSERVE."""

    def __init__(self) -> None:
        tmp = tempfile.mkdtemp()
        self.dedup = Deduplicator(InMemoryStore())
        self.ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        self.openai_ledger = UsageLedger(os.path.join(tmp, "usage-openai.json"))
        self.anthropic = _TransporteContador(_RespostaFalsa("DECISÃO: MERGE-READY\nLimpeza correta."))
        self.openai = _TransporteContador(_RespostaFalsa(_OPENAI_MERGE_READY))

    def observar(self, ev):
        return observe(
            ev, config=Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE), dedup=self.dedup,
            ledger=self.ledger, workers=_workers(), transport=self.anthropic, audit_mode=True,
            openai_config=OpenAIAuditorConfig(enabled=True), openai_ledger=self.openai_ledger,
            openai_transport=self.openai,
        )

    @property
    def chamadas_pagas(self) -> int:
        return self.anthropic.calls + self.openai.calls


def _assert_hold(r) -> None:
    assert r.status == "HOLD", (r.status, r.reason)
    assert r.call_attempted is False
    assert r.audit_decision is None and r.merge_card is None
    assert r.should_comment is False and r.comment_target_issue is None


# ---------------------------------------------------------------------------
# OBSERVE
# ---------------------------------------------------------------------------

def test_196_hold_com_politica_atual_zero_chamada_paga() -> None:
    """Prova 1: mesma situação dos cartões pagos de 25/09 (política nova,
    HEAD sem cartão), agora com o label: zero Anthropic, zero OpenAI."""
    amb = _Ambiente()
    ev = _evento_196(labels=[LABEL_HOLD, "NEEDS-AUDIT"])
    assert ev.raw_type == "PR_NEEDS_AUDIT" and ev.identity == "pr:196"
    assert ev.payload["dedup_fields"]["audit_policy_version"] == AUDIT_POLICY_VERSION
    _assert_hold(amb.observar(ev))
    assert amb.chamadas_pagas == 0
    assert amb.ledger.all_records() == [] and amb.openai_ledger.all_records() == []
    # Heartbeat/Guard repetidos no mesmo HEAD: continua zero, sempre.
    for _ in range(3):
        _assert_hold(amb.observar(_evento_196(labels=[LABEL_HOLD])))
    assert amb.chamadas_pagas == 0
    print("OK  test_196_hold_com_politica_atual_zero_chamada_paga")


def test_hold_com_guard_reprovado_nao_gera_needs_fix_para_o_bridge() -> None:
    amb = _Ambiente()
    ev = _evento_196(labels=[LABEL_HOLD], conclusao="failure")
    assert ev.raw_type == "GUARD_STATE_CHANGE" and ev.identity == "pr:196"
    _assert_hold(amb.observar(ev))
    assert amb.chamadas_pagas == 0
    print("OK  test_hold_com_guard_reprovado_nao_gera_needs_fix_para_o_bridge")


def test_comentario_humano_arbitrario_nao_cria_hold() -> None:
    """Prova 7: o próprio comentário de José, frases com HOLD, o nome do
    label e marcadores HTML no corpo da PR não pausam nada. Só o label."""
    amb = _Ambiente()
    texto = COMENTARIO_JOSE_196 + "\nHOLD — PAUSADO POR JOSÉ\ncoordinator:hold\n<!-- repasso-hold -->"
    ev = _evento_196(labels=["NEEDS-AUDIT"], body_extra=texto)
    assert ev.payload["coordinator_hold"] is False
    assert not pr_em_hold({"labels": [], "body": texto})
    r = amb.observar(ev)
    assert r.status == "OBSERVED" and amb.anthropic.calls == 1
    print("OK  test_comentario_humano_arbitrario_nao_cria_hold")


def test_pr_nao_pausada_fluxo_normal() -> None:
    amb = _Ambiente()
    r = amb.observar(_evento_196(labels=["NEEDS-AUDIT"]))
    assert r.status == "OBSERVED" and r.audit_decision == "MERGE-READY", (r.status, r.audit_decision)
    assert amb.anthropic.calls == 1 and amb.openai.calls == 1
    assert f"**HEAD auditado:** `{HEAD_196}`" in r.merge_card
    assert f"`{AUDIT_POLICY_VERSION}`" in r.merge_card
    print("OK  test_pr_nao_pausada_fluxo_normal")


def test_remover_hold_retoma_no_head_e_politica_atuais() -> None:
    """Provas 5 e 6: o HOLD não consome a chave de dedup. Tirado o label, o
    MESMO HEAD/política é auditado uma vez (nada de aprovação antiga
    reaproveitada), um rerun idêntico é DUPLICATE, e um HEAD novo exige
    auditoria nova."""
    amb = _Ambiente()
    _assert_hold(amb.observar(_evento_196(labels=[LABEL_HOLD])))
    assert amb.chamadas_pagas == 0

    r = amb.observar(_evento_196(labels=[]))
    assert r.status == "OBSERVED" and amb.anthropic.calls == 1 and amb.openai.calls == 1
    assert f"**HEAD auditado:** `{HEAD_196}`" in r.merge_card
    assert f"`{AUDIT_POLICY_VERSION}`" in r.merge_card

    assert amb.observar(_evento_196(labels=[])).status == "DUPLICATE"
    assert amb.chamadas_pagas == 2

    novo_head = "b" * 40
    r2 = amb.observar(_evento_196(labels=[], head_sha=novo_head, run_id=36170000001))
    assert r2.status == "OBSERVED" and amb.anthropic.calls == 2
    assert f"**HEAD auditado:** `{novo_head}`" in r2.merge_card
    print("OK  test_remover_hold_retoma_no_head_e_politica_atuais")


# ---------------------------------------------------------------------------
# Worker Bridge
# ---------------------------------------------------------------------------

class _ApiComLabels(_FakeGitHubApi):
    def __init__(self) -> None:
        super().__init__()
        self.labels: dict[int, list[str]] = {}

    def pr_por_numero(self, pr_number: int) -> dict:
        dados = super().pr_por_numero(pr_number)
        dados["labels"] = [{"name": n} for n in self.labels.get(pr_number, [])]
        return dados


def test_bridge_nao_corrige_pr_em_hold_e_retoma_sem_o_label() -> None:
    """Prova 3: com um Cartão NEEDS-FIX válido no HEAD atual, a PR em HOLD
    não recebe correção, e runtime/branch/checkpoint/PR ficam intactos.
    Removido o label, o mesmo Cartão volta a ser elegível."""
    cfg = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    with tempfile.TemporaryDirectory() as tmp:
        api = _ApiComLabels()
        registry = _registry_com_workers(cfg)
        store = _runtime_store()
        tarefa = _tarefa()
        primeiro, _c1, store, registry = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store, api=api,
            patch=_patch_padrao("alvo.txt", "versao 1\n"), nome_workdir="work-hold-1",
        )
        assert primeiro.action == "DISPATCHED", primeiro
        antes = store.get("infra-bridge-teste")
        api.prs[0]["head_sha"] = antes.checkpoint_commit
        api.comentarios[antes.pr_number] = [{
            "id": 5, "user": {"login": "github-actions[bot]"},
            "body": _cartao_needs_fix("restaurar âncora", head_sha=antes.checkpoint_commit),
        }]
        api.labels[antes.pr_number] = [LABEL_HOLD]
        dispatches_antes = len(api.dispatches)

        def _geracao_proibida():
            raise AssertionError("PR em HOLD nunca pode gerar patch (chamada paga do Runner)")

        segundo, _c2, store, registry = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store, api=api,
            gerar_patch=_geracao_proibida, nome_workdir="work-hold-2",
        )
        assert segundo.action != "AUDIT_FIX", segundo
        depois = store.get("infra-bridge-teste")
        assert depois.status == task_runtime.RUNTIME_NEEDS_AUDIT, "HOLD não é DONE/CANCELLED"
        assert (depois.pr_number, depois.branch, depois.checkpoint_commit) == (
            antes.pr_number, antes.branch, antes.checkpoint_commit)
        assert depois.audit_fix_attempts == 0
        assert len(api.dispatches) == dispatches_antes, "nenhum Guard novo para PR em HOLD"
        assert len(api.criadas) == 1

        # Retomada: sem o label, o mesmo parecer vira correção normal.
        api.labels[antes.pr_number] = []
        terceiro, _c3, store, registry = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store, api=api,
            patch=_patch_padrao("alvo.txt", "versao 2\n"), nome_workdir="work-hold-3",
        )
        assert terceiro.action == "AUDIT_FIX", terceiro
        final = store.get("infra-bridge-teste")
        assert final.pr_number == antes.pr_number and final.branch == antes.branch
        assert final.checkpoint_commit != antes.checkpoint_commit
    print("OK  test_bridge_nao_corrige_pr_em_hold_e_retoma_sem_o_label")


# ---------------------------------------------------------------------------
# Heartbeat (comportamental, node) e ausência de merge/deploy
# ---------------------------------------------------------------------------

def test_heartbeat_hold_node() -> None:
    node = shutil.which("node")
    if node is None:
        print("AVISO  node ausente — pulando a prova comportamental do Heartbeat.")
        print("OK  test_heartbeat_hold_node (pulado)")
        return
    r = subprocess.run([node, "--test", _NODE_TEST], cwd=_pathsetup.REPO_ROOT,
                       capture_output=True, text=True, timeout=60)
    saida = r.stdout + r.stderr
    assert r.returncode == 0, saida
    assert "# fail 0" in saida and "# pass 6" in saida, saida
    print("OK  test_heartbeat_hold_node")


def test_hold_nunca_vira_merge_deploy_nem_estado_terminal() -> None:
    """Prova 8: o mecanismo só lê o label. Nenhum código novo fecha PR,
    mergeia, deploya, cria/remove label ou escreve estado de runtime."""
    arquivos = [
        os.path.join(_pathsetup.REPO_ROOT, "coordinator", "github_event.py"),
        os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "coordinator-guard-heartbeat.yml"),
    ]
    for caminho in arquivos:
        with open(caminho, encoding="utf-8") as fh:
            texto = fh.read()
        for proibido in ("pulls.merge", "merge_pull_request", "addLabels", "removeLabel",
                         "createDeployment", "state: 'closed'", "RUNTIME_DONE"):
            assert proibido not in texto, (caminho, proibido)
    print("OK  test_hold_nunca_vira_merge_deploy_nem_estado_terminal")


TESTS = [
    test_196_hold_com_politica_atual_zero_chamada_paga,
    test_hold_com_guard_reprovado_nao_gera_needs_fix_para_o_bridge,
    test_comentario_humano_arbitrario_nao_cria_hold,
    test_pr_nao_pausada_fluxo_normal,
    test_remover_hold_retoma_no_head_e_politica_atuais,
    test_bridge_nao_corrige_pr_em_hold_e_retoma_sem_o_label,
    test_heartbeat_hold_node,
    test_hold_nunca_vira_merge_deploy_nem_estado_terminal,
]


def main() -> int:
    falhas = 0
    for t in TESTS:
        try:
            t()
        except Exception as exc:  # noqa: BLE001
            falhas += 1
            print(f"FALHOU  {t.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(TESTS) - falhas}/{len(TESTS)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
