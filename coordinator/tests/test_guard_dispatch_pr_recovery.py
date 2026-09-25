"""Caso real PR #286 / Error Registry #287: HARD FAIL de um Guard disparado
por ``workflow_dispatch`` perdia a identidade da PR.

Run Guard 36183381851 (``workflow_dispatch``, HEAD da PR ``3bb6857…``)
→ OBSERVE 36183417967: o workflow recuperou a PR #286 pelo contexto tipado
do Guard, mas ``github_event._from_workflow_run`` montava o
``GUARD_STATE_CHANGE`` só com ``workflow_run.pull_requests`` (vazio no
dispatch) e ``workflow_run.head_sha`` (a MAIN). Resultado: ``PR: #-``,
``HEAD auditado: <main>``, nenhum destino para o Cartão NEEDS-FIX e o Worker
Bridge nunca via a correção pedida.

Estes testes provam:

- a recuperação segura (PR aberta same-repo + HEAD/base iguais aos do
  audit-pack do próprio Guard) → ``pr:<n>`` + HEAD real;
- o ciclo ponta a ponta: Bridge abre PR → Guard via dispatch com
  ``pull_requests`` vazio → OBSERVE liga o NEEDS-FIX à PR certa → Bridge
  consome o Cartão → corrige a MESMA branch → novo HEAD → Guard de novo;
- fail-closed para PR ambígua, HEAD divergente, PR fechada, PR externa,
  base divergente, ``pr_info`` antigo sem os campos de validação e branch
  diferente da registrada no runtime.

Nenhum teste chama API paga: o HARD FAIL corta a auditoria antes de
qualquer transporte, e o transporte injetado falha alto se for usado.
"""

from __future__ import annotations

import os
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator import task_runtime, worker_bridge
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.budget import UsageLedger
from coordinator.github_event import build_event_from_github_context, recuperar_pr_do_guard
from coordinator.observe import observe
from coordinator.tests.test_coordinator_v3 import _workers
from coordinator.tests.test_worker_bridge import (
    _FakeGitHubApi,
    _ciclo,
    _config,
    _patch_padrao,
    _registry_com_workers,
    _runtime_store,
    _tarefa,
)

REPO = "Repassomed/Repasso-Med-Site-"
MAIN_SHA = "1a2a668c8beeeb670264ba0a3007c21ab177e437"
HEAD_286 = "3bb68573f95d280bf5141bd23f3896100af8ddcf"
BRANCH_286 = "runner/cleanup-como-estudar-histologia-i-r2"
TAREFA_286 = "cleanup-como-estudar-histologia-i-r2"
ARQUIVO_286 = "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/histologia-i.html"


def _run_dispatch(*, pull_requests=None, run_id: int = 36183381851, head_sha: str = MAIN_SHA) -> dict:
    """Exatamente o que o passo "Resolver a execução do Guard" sintetiza:
    num Guard via workflow_dispatch, head_sha é a MAIN e não há PR."""
    return {"action": "completed", "workflow_run": {
        "id": run_id, "name": "Repasso Guard", "conclusion": "failure",
        "head_sha": head_sha, "head_branch": "main",
        "pull_requests": list(pull_requests or []),
    }}


def _pr_info(**over) -> dict:
    """O ``/tmp/pr-info.json`` que o passo prctx grava depois de validar a PR
    real pela API contra o contexto tipado do Guard."""
    info = {
        "number": 286, "title": "[worker-bridge] P1 ALTA — Histología I: remover bloco metadidático",
        "body": f"<!-- repasso-worker-bridge-needs-audit -->\n- **Tarefa:** {TAREFA_286}\n- **Área:** materia",
        "labels": [], "updated_at": "2026-09-25T20:03:22Z",
        "head_sha": HEAD_286, "state": "open", "base_ref": "main", "head_ref": BRANCH_286,
        "head_repo_full_name": REPO, "worker_bridge_needs_audit": True,
    }
    info.update(over)
    return info


def _audit_pack(*, head: str = HEAD_286, base: str = "origin/main", tarefa: str = TAREFA_286,
                arquivo: str = ARQUIVO_286) -> dict:
    """Mesmo schema de tools/qa/guard/__main__.py; achados do run real 36183381851."""
    return {
        "versao": 1, "resultado": "REPROVADO", "base": base, "head": head,
        "escopo_declarado": {"tarefa": tarefa, "area": "materia", "arquivos": [arquivo]},
        "arquivos_alterados": [arquivo],
        "achados": [
            {"check": "materia", "severity": "HARD FAIL",
             "message": "block_id de seção removido: histo00. As marcações do aluno são ancoradas por block_id.",
             "where": "histologia-i.html", "detail": {}},
            {"check": "materia", "severity": "HARD FAIL",
             "message": "1 id(s) desapareceram. Isso quebra âncoras e marcações de aluno (Lei 1 e Lei 7).",
             "where": "histologia-i.html", "detail": {}},
        ],
    }


def _evento(*, payload=None, pr_info=None, audit_pack=None, repo: str = REPO):
    return build_event_from_github_context(
        "workflow_run", payload if payload is not None else _run_dispatch(), repo,
        pr_info=pr_info, audit_pack=audit_pack,
    )


class _TransporteProibido:
    calls = 0

    def send(self, _request):  # pragma: no cover - só dispara se houver regressão
        raise AssertionError("HARD FAIL do Guard nunca pode gastar chamada paga")


def _observar(ev):
    tmp = tempfile.mkdtemp()
    return observe(
        ev, config=Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE),
        dedup=Deduplicator(InMemoryStore()), ledger=UsageLedger(os.path.join(tmp, "usage.json")),
        workers=_workers(), transport=_TransporteProibido(), audit_mode=True,
    )


def _assert_sem_pr(ev) -> None:
    assert ev.raw_type == "GUARD_STATE_CHANGE"
    assert ev.identity == "run:36183381851", ev.identity
    r = _observar(ev)
    assert r.audit_decision == "NEEDS-FIX"  # o HARD FAIL continua valendo…
    assert r.comment_target_issue is None  # …mas nunca vai para uma PR adivinhada.


# ---------------------------------------------------------------------------
# Caso real #286
# ---------------------------------------------------------------------------

def test_caso_286_reproduzido_antes_da_correcao_perdia_a_pr() -> None:
    """O ``pr_info`` que o workflow gravava ANTES desta correção (sem
    state/base/branch/repo) não prova PR aberta same-repo: continua
    fail-closed, exatamente como no run real — nunca adivinha a PR."""
    antigo = {k: v for k, v in _pr_info().items()
              if k not in ("state", "base_ref", "head_ref", "head_repo_full_name")}
    ev = _evento(pr_info=antigo, audit_pack=_audit_pack())
    assert ev.payload["head_sha"] == MAIN_SHA
    _assert_sem_pr(ev)
    print("OK  test_caso_286_reproduzido_antes_da_correcao_perdia_a_pr")


def test_caso_286_dispatch_recupera_pr_e_head_reais() -> None:
    ev = _evento(pr_info=_pr_info(), audit_pack=_audit_pack())
    assert ev.raw_type == "GUARD_STATE_CHANGE"
    assert ev.identity == "pr:286", ev.identity
    assert ev.payload["head_sha"] == HEAD_286
    assert ev.payload["dedup_fields"] == {"conclusion": "failure", "head_sha": HEAD_286}
    assert ev.payload["guard_run_id"] == 36183381851

    r = _observar(ev)
    assert r.audit_decision == "NEEDS-FIX"
    assert r.call_attempted is False
    assert r.comment_target_issue == 286
    assert "**PR:** #286" in r.merge_card, r.merge_card
    assert f"**HEAD auditado:** `{HEAD_286}`" in r.merge_card, r.merge_card
    assert MAIN_SHA not in r.merge_card
    assert "histo00" in r.merge_card

    # O Cartão publicado é exatamente o que o Worker Bridge aceita.
    pedido = worker_bridge._audit_fix_request_from_comments(
        [{"id": 1, "user": {"login": worker_bridge.COORDINATOR_BOT_LOGIN}, "body": r.merge_card}],
        pr_number=286,
    )
    assert pedido is not None, "HARD FAIL do Guard tem que virar NEEDS-FIX consumível pelo Bridge"
    assert pedido.audited_head_sha == HEAD_286
    assert "histo00" in pedido.findings
    print("OK  test_caso_286_dispatch_recupera_pr_e_head_reais")


# ---------------------------------------------------------------------------
# Fail-closed
# ---------------------------------------------------------------------------

def test_pr_ambigua_fail_closed() -> None:
    duas = _run_dispatch(pull_requests=[{"number": 286}, {"number": 290}])
    _assert_sem_pr(_evento(payload=duas, pr_info=_pr_info(), audit_pack=_audit_pack()))
    # Uma PR no webhook e OUTRA no pr_info: inconsistência, nunca escolher.
    outra = _run_dispatch(pull_requests=[{"number": 290}])
    _assert_sem_pr(_evento(payload=outra, pr_info=_pr_info(), audit_pack=_audit_pack()))
    print("OK  test_pr_ambigua_fail_closed")


def test_head_divergente_fail_closed() -> None:
    # A PR andou depois do Guard: o HARD FAIL é de outro commit.
    _assert_sem_pr(_evento(pr_info=_pr_info(head_sha="f" * 40), audit_pack=_audit_pack()))
    # SHA abreviado/ inválido também não serve de prova.
    _assert_sem_pr(_evento(pr_info=_pr_info(head_sha=HEAD_286[:7]), audit_pack=_audit_pack(head=HEAD_286[:7])))
    print("OK  test_head_divergente_fail_closed")


def test_pr_fechada_fail_closed() -> None:
    _assert_sem_pr(_evento(pr_info=_pr_info(state="closed"), audit_pack=_audit_pack()))
    print("OK  test_pr_fechada_fail_closed")


def test_pr_externa_fail_closed() -> None:
    _assert_sem_pr(_evento(pr_info=_pr_info(head_repo_full_name="fork/Repasso-Med-Site-"),
                           audit_pack=_audit_pack()))
    print("OK  test_pr_externa_fail_closed")


def test_base_divergente_ou_sem_audit_pack_fail_closed() -> None:
    _assert_sem_pr(_evento(pr_info=_pr_info(), audit_pack=_audit_pack(base="origin/outra-base")))
    # Sem audit-pack não há HEAD auditado para conferir: nenhuma PR recuperada.
    assert _evento(pr_info=_pr_info(), audit_pack=None).identity == "run:36183381851"
    _assert_sem_pr(_evento(pr_info=_pr_info(head_ref=""), audit_pack=_audit_pack()))
    print("OK  test_base_divergente_ou_sem_audit_pack_fail_closed")


def test_caminho_pull_request_continua_igual() -> None:
    webhook = _run_dispatch(pull_requests=[{"number": 201}], head_sha="gsc1")
    ev = _evento(payload=webhook, audit_pack=_audit_pack())
    assert ev.identity == "pr:201" and ev.payload["head_sha"] == "gsc1"
    assert recuperar_pr_do_guard(webhook["workflow_run"], REPO, pr_info=None, audit_pack=None) == (201, "gsc1")
    print("OK  test_caminho_pull_request_continua_igual")


def test_branch_diferente_da_registrada_nunca_vira_correcao() -> None:
    """Quem AGE sobre o NEEDS-FIX é o Bridge, e ele exige PR aberta, mesma
    branch e mesma base do runtime da tarefa, e HEAD auditado == HEAD
    atual. Um Cartão válido numa PR cuja branch não é a registrada nunca
    é consumido."""
    cfg = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        primeiro, caminho, store, registry = _ciclo(
            tmp, [_tarefa()], config=cfg, api=api, nome_workdir="work-branch",
        )
        assert primeiro.action == "DISPATCHED", primeiro
        reg = store.get("infra-bridge-teste")
        api.prs[0]["head_sha"] = reg.checkpoint_commit
        api.prs[0]["head_branch"] = "runner/outra-tarefa"
        ev = _evento(
            pr_info=_pr_info(number=reg.pr_number, head_sha=reg.checkpoint_commit,
                             head_ref="runner/outra-tarefa", base_ref="bootstrap",
                             head_repo_full_name="fake/repo"),
            audit_pack=_audit_pack(head=reg.checkpoint_commit, base="origin/bootstrap",
                                   tarefa="infra-bridge-teste", arquivo="alvo.txt"),
            repo="fake/repo",
        )
        r = _observar(ev)
        api.comentarios[reg.pr_number] = [{"id": 7, "user": {"login": "github-actions[bot]"}, "body": r.merge_card}]
        tarefas, metadados, registros = worker_bridge.visao_da_fila(tasks_json_path=caminho, runtime_store=store)
        assert worker_bridge._candidato_a_correcao_de_auditoria(
            tarefas, metadados, registros, github_api=api, base_branch="bootstrap", config=cfg,
        ) is None
    print("OK  test_branch_diferente_da_registrada_nunca_vira_correcao")


# ---------------------------------------------------------------------------
# Ponta a ponta
# ---------------------------------------------------------------------------

def test_ciclo_bridge_pr_guard_dispatch_needs_fix_bridge_novo_head_guard() -> None:
    """1. PR aberta pelo Bridge; 2. runtime conhecido; 3. Guard via
    workflow_dispatch; 4. pull_requests vazio; 5. audit-pack com tarefa +
    HEAD; 6. recuperação segura da PR; 7. NEEDS-FIX ligado à PR certa →
    Bridge corrige a MESMA branch → novo HEAD → Guard de novo."""
    cfg = _config(mode=worker_bridge.BRIDGE_MODE_ACTIVE_SUPERVISED)
    with tempfile.TemporaryDirectory() as tmp:
        api = _FakeGitHubApi()
        registry = _registry_com_workers(cfg)
        store = _runtime_store()
        tarefa = _tarefa()

        # 1-2. Bridge executa, abre a PR e registra o runtime.
        primeiro, _c1, store, registry = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store,
            api=api, patch=_patch_padrao("alvo.txt", "versao 1\n"), nome_workdir="work-e2e-1",
        )
        assert primeiro.action == "DISPATCHED" and primeiro.pr is not None, primeiro
        reg1 = store.get("infra-bridge-teste")
        pr_numero, branch, head1 = reg1.pr_number, reg1.branch, reg1.checkpoint_commit
        assert reg1.status == task_runtime.RUNTIME_NEEDS_AUDIT and reg1.guard_confirmado
        api.prs[0]["head_sha"] = head1
        guard_dispatches = [d for d in api.dispatches if d[2].get("pr_number") == str(pr_numero)]
        assert len(guard_dispatches) == 1, api.dispatches

        # 3-5. Guard via workflow_dispatch: pull_requests vazio, head_sha da
        # base; audit-pack do Guard traz tarefa + HEAD real e HARD FAIL.
        ev = _evento(
            payload=_run_dispatch(head_sha="b" * 40),
            pr_info=_pr_info(number=pr_numero, head_sha=head1, head_ref=branch, base_ref="bootstrap",
                             head_repo_full_name="fake/repo"),
            audit_pack=_audit_pack(head=head1, base="origin/bootstrap", tarefa="infra-bridge-teste",
                                   arquivo="alvo.txt"),
            repo="fake/repo",
        )
        # 6. PR e HEAD recuperados com segurança.
        assert ev.identity == f"pr:{pr_numero}" and ev.payload["head_sha"] == head1

        # 7. OBSERVE: NEEDS-FIX sem custo, com destino = a PR do Bridge.
        r = _observar(ev)
        assert r.audit_decision == "NEEDS-FIX" and r.comment_target_issue == pr_numero
        assert f"**HEAD auditado:** `{head1}`" in r.merge_card
        # O passo "Comentar o Cartão" do workflow publica como github-actions[bot].
        api.comentarios[pr_numero] = [{"id": 88, "user": {"login": "github-actions[bot]"}, "body": r.merge_card}]

        # Bridge consome o NEEDS-FIX e corrige a MESMA PR/branch.
        segundo, _c2, store, registry = _ciclo(
            tmp, [tarefa], config=cfg, registry=registry, runtime_store=store,
            api=api, patch=_patch_padrao("alvo.txt", "versao 2 — âncora preservada\n"),
            nome_workdir="work-e2e-2",
        )
        assert segundo.action == "AUDIT_FIX", segundo
        reg2 = store.get("infra-bridge-teste")
        assert reg2.pr_number == pr_numero, "a correção nunca abre PR nova"
        assert reg2.branch == branch, "a correção é na MESMA branch"
        assert reg2.checkpoint_commit and reg2.checkpoint_commit != head1, "novo HEAD publicado"
        assert reg2.audit_fix_attempts == 1
        assert len(api.criadas) == 1, "nenhuma PR nova"
        # Guard de novo, para a mesma PR.
        guard_dispatches = [d for d in api.dispatches if d[2].get("pr_number") == str(pr_numero)]
        assert len(guard_dispatches) == 2, api.dispatches
    print("OK  test_ciclo_bridge_pr_guard_dispatch_needs_fix_bridge_novo_head_guard")


TESTS = [
    test_caso_286_reproduzido_antes_da_correcao_perdia_a_pr,
    test_caso_286_dispatch_recupera_pr_e_head_reais,
    test_pr_ambigua_fail_closed,
    test_head_divergente_fail_closed,
    test_pr_fechada_fail_closed,
    test_pr_externa_fail_closed,
    test_base_divergente_ou_sem_audit_pack_fail_closed,
    test_caminho_pull_request_continua_igual,
    test_branch_diferente_da_registrada_nunca_vira_correcao,
    test_ciclo_bridge_pr_guard_dispatch_needs_fix_bridge_novo_head_guard,
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
