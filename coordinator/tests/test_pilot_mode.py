"""Modo PILOTO (bloqueador 3 da 3ª auditoria do PR #97).

Prova exigida: enquanto REPASSO_COORDINATOR_PILOT=true, só o evento
explicitamente autorizado (REPASSO_COORDINATOR_PILOT_EVENT_KEY) pode gerar
uma chamada — qualquer outro evento automático, mesmo de tipo permitido e
mesmo com ENABLED=true/MODE=observe/orçamento OK, fica bloqueado.
"""

from __future__ import annotations

import os
import sys
import tempfile

from . import _pathsetup
from coordinator.budget import UsageLedger
from coordinator.config import Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import Event
from coordinator.observe import observe
from coordinator.worker_registry import Worker, WorkerState


def _load(nome: str) -> Event:
    import json

    with open(os.path.join(_pathsetup.FIXTURES, nome), encoding="utf-8") as fh:
        d = json.load(fh)
    return Event(raw_type=d["raw_type"], source=d["source"], repo=d["repo"],
                 identity=d["identity"], payload=d["payload"])


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


def test_pilot_off_does_not_restrict_anything() -> None:
    cfg = Config(enabled=True, mode="observe", pilot=False)
    ev = _load("event_pr_needs_audit.json")
    transporte = _TransporteContador(_RespostaFalsa("ok", 10, 5))
    with tempfile.TemporaryDirectory() as tmp:
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=UsageLedger(os.path.join(tmp, "usage.json")),
                    workers=_workers(), transport=transporte)
    assert r.status == "OBSERVED"
    assert transporte.calls == 1
    print("OK  test_pilot_off_does_not_restrict_anything")


def test_pilot_on_blocks_event_not_in_allowlist() -> None:
    ev = _load("event_pr_needs_audit.json")
    cfg = Config(enabled=True, mode="observe", pilot=True, pilot_event_key="algo-completamente-diferente")
    transporte = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui", 0, 0))
    with tempfile.TemporaryDirectory() as tmp:
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=UsageLedger(os.path.join(tmp, "usage.json")),
                    workers=_workers(), transport=transporte)
    assert r.status == "BLOCKED", f"esperava BLOCKED, obtido {r.status}"
    assert r.call_attempted is False
    assert transporte.calls == 0
    assert "PILOT" in r.reason
    print("OK  test_pilot_on_blocks_event_not_in_allowlist")


def test_pilot_on_allows_only_the_exact_authorized_event() -> None:
    ev = _load("event_pr_needs_audit.json")
    chave = ev.dedup_key()
    cfg = Config(enabled=True, mode="observe", pilot=True, pilot_event_key=chave)
    transporte = _TransporteContador(_RespostaFalsa("ok", 10, 5))
    with tempfile.TemporaryDirectory() as tmp:
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=UsageLedger(os.path.join(tmp, "usage.json")),
                    workers=_workers(), transport=transporte)
    assert r.status == "OBSERVED", f"o único evento autorizado tem que passar, obtido {r.status}"
    assert transporte.calls == 1
    print("OK  test_pilot_on_allows_only_the_exact_authorized_event")


def test_pilot_on_without_configured_key_blocks_everything() -> None:
    """PILOT=true sem nenhuma chave configurada não pode, por omissão,
    liberar nada — o padrão seguro é bloquear tudo até alguém configurar
    a allowlist de verdade."""
    ev = _load("event_pr_needs_audit.json")
    cfg = Config(enabled=True, mode="observe", pilot=True, pilot_event_key=None)
    transporte = _TransporteContador(_RespostaFalsa("nunca devia chegar aqui", 0, 0))
    with tempfile.TemporaryDirectory() as tmp:
        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()),
                    ledger=UsageLedger(os.path.join(tmp, "usage.json")),
                    workers=_workers(), transport=transporte)
    assert r.status == "BLOCKED"
    assert transporte.calls == 0
    print("OK  test_pilot_on_without_configured_key_blocks_everything")


def test_pilot_env_vars_wired_through_from_env() -> None:
    cfg = Config.from_env(env={
        "REPASSO_COORDINATOR_ENABLED": "true",
        "REPASSO_COORDINATOR_MODE": "observe",
        "REPASSO_COORDINATOR_PILOT": "true",
        "REPASSO_COORDINATOR_PILOT_EVENT_KEY": "repo:TIPO:id:abc123",
    })
    assert cfg.pilot is True
    assert cfg.pilot_event_key == "repo:TIPO:id:abc123"
    assert cfg.pilot_allows("repo:TIPO:id:abc123") is True
    assert cfg.pilot_allows("qualquer:outra:coisa") is False
    print("OK  test_pilot_env_vars_wired_through_from_env")


def main() -> int:
    testes = [
        test_pilot_off_does_not_restrict_anything,
        test_pilot_on_blocks_event_not_in_allowlist,
        test_pilot_on_allows_only_the_exact_authorized_event,
        test_pilot_on_without_configured_key_blocks_everything,
        test_pilot_env_vars_wired_through_from_env,
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
