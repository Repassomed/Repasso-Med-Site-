"""Integração de ponta a ponta dos bloqueadores 5 e 6 da 3ª auditoria:

- o audit-pack REAL do Guard (mesmo schema que tools/qa/guard/__main__.py
  grava) chega até o contexto mínimo que o prompt usaria — não só até o
  payload cru do Event;
- dois GUARD_STATE_CHANGE consecutivos com a MESMA conclusão (verde->verde
  ou vermelho->vermelho), passando pelo pipeline `observe()` de verdade
  com dedup persistente, fazem ZERO chamada nova na segunda vez; uma
  mudança real de estado (vermelho->verde) é tratada como evento novo.
"""

from __future__ import annotations

import os
import sys
import tempfile

from . import _pathsetup
from coordinator.budget import UsageLedger
from coordinator.config import Config
from coordinator.context import build_context
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.github_event import build_event_from_github_context
from coordinator.observe import observe
from coordinator.worker_registry import Worker, WorkerState

REPO = "Repassomed/Repasso-Med-Site-"


def _workers() -> list[Worker]:
    import json

    with open(os.path.join(_pathsetup.FIXTURES, "workers.json"), encoding="utf-8") as fh:
        d = json.load(fh)
    return [Worker(name=w["name"], state=WorkerState(w["state"]),
                    specialization=tuple(w.get("specialization", [])))
            for w in d["workers"]]


class _TransporteContador:
    def __init__(self, resposta) -> None:
        self.resposta = resposta
        self.calls = 0

    def send(self, request):
        self.calls += 1
        return self.resposta


class _RespostaFalsa:
    def __init__(self, texto: str, input_tokens: int, output_tokens: int) -> None:
        self.text = texto
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens


# Mesmo schema real de tools/qa/guard/__main__.py::main() (pacote de auditoria).
_AUDIT_PACK_REAL = {
    "versao": 1,
    "base": "origin/main",
    "head": "HEAD",
    "trusted_source": "base",
    "escopo_declarado": {"tarefa": "infra-x", "area": "infraestrutura"},
    "arquivos_alterados": ["coordinator/observe.py"],
    "resultado": "REPROVADO",
    "contagem": {"HARD FAIL": 1, "WARNING": 0, "INFO": 7},
    "achados": [
        {"check": "segredos", "severity": "HARD FAIL", "message": "possível segredo em 1 linha.",
         "where": "coordinator/observe.py", "detail": {}},
    ],
    "conteudo_medico": {"total": 0},
    "aviso": "Este pacote descreve o que é objetivo.",
}


def test_real_audit_pack_flows_into_minimal_context() -> None:
    payload = {
        "action": "completed",
        "workflow_run": {"name": "Repasso Guard", "conclusion": "failure", "id": 1,
                          "pull_requests": [{"number": 97}]},
    }
    ev = build_event_from_github_context("workflow_run", payload, REPO, audit_pack=_AUDIT_PACK_REAL)
    assert ev is not None

    ctx = build_context(ev)
    assert ctx.guard_result == "REPROVADO"
    assert any("segredo" in h for h in ctx.guard_hard_fails), (
        "o HARD FAIL real do Guard precisa chegar ao contexto mínimo, não só ficar no payload cru"
    )
    print("OK  test_real_audit_pack_flows_into_minimal_context")


def test_pipeline_same_conclusion_twice_makes_zero_new_calls() -> None:
    """Prova de ponta a ponta: red->red não chama de novo, mas red->green
    (mudança real de estado) é tratado como evento novo."""
    dedup = Deduplicator(InMemoryStore())
    cfg = Config(enabled=True, mode="observe")

    def _evento(conclusao: str, run_id: int):
        payload = {
            "action": "completed",
            "workflow_run": {"name": "Repasso Guard", "conclusion": conclusao, "id": run_id,
                              "pull_requests": [{"number": 97}]},
        }
        return build_event_from_github_context("workflow_run", payload, REPO)

    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))

        t1 = _TransporteContador(_RespostaFalsa("ok", 10, 5))
        r1 = observe(_evento("failure", run_id=1), config=cfg, dedup=dedup, ledger=ledger,
                     workers=_workers(), transport=t1)
        assert r1.status == "OBSERVED"
        assert t1.calls == 1

        # Mesmo estado (failure), run_id DIFERENTE (é assim que o Guard
        # realmente re-executa) -> tem que ser tratado como duplicata.
        t2 = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui", 0, 0))
        r2 = observe(_evento("failure", run_id=2), config=cfg, dedup=dedup, ledger=ledger,
                     workers=_workers(), transport=t2)
        assert r2.status == "DUPLICATE", f"vermelho->vermelho tinha que ser DUPLICATE, obtido {r2.status}"
        assert t2.calls == 0

        # Mudança real de estado (failure -> success) -> evento novo.
        t3 = _TransporteContador(_RespostaFalsa("ok de novo", 8, 4))
        r3 = observe(_evento("success", run_id=3), config=cfg, dedup=dedup, ledger=ledger,
                     workers=_workers(), transport=t3)
        assert r3.status == "OBSERVED", f"vermelho->verde tinha que ser um evento novo, obtido {r3.status}"
        assert t3.calls == 1
    print("OK  test_pipeline_same_conclusion_twice_makes_zero_new_calls")


def main() -> int:
    testes = [
        test_real_audit_pack_flows_into_minimal_context,
        test_pipeline_same_conclusion_twice_makes_zero_new_calls,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as e:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {e}")
    print(f"\n{len(testes) - falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
