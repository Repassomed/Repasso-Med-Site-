"""Único blocker residual da auditoria final do PR #97 (HEAD `4d8af69`):
uma chamada à Anthropic bem-sucedida cujo ``ledger.append()`` falha DEPOIS
não pode virar "nenhuma chamada foi tentada".

Antes desta correção:

    if resultado_chamada.status == "ok" and resultado_chamada.usage is not None:
        ledger.append(resultado_chamada.usage)   # sem try/except

``GitUsageLedger.append()`` pode lançar (ex.: ``GitJsonStore.update()``
esgotando tentativas de publicar o estado) DEPOIS que
``anthropic_client.call()`` já retornou sucesso. A exceção subia
incapturada por ``observe()`` até ``__main__.py``, onde
``_resultado_de_erro()`` (item 2, rodada anterior) grava sempre
``call_attempted=false``/``usage=null`` — apagando o rastro de uma chamada
paga real que de fato aconteceu.

Os 7 pontos exigidos pela auditoria, um teste (ou grupo de asserts) cada:

    1. mock Anthropic retorna sucesso + usage;
    2. ledger.append lança RuntimeError;
    3. exatamente 1 chamada foi feita;
    4. resultado/artifact informa call_attempted=true;
    5. usage/tokens/custo da chamada continuam visíveis;
    6. erro do ledger aparece sanitizado;
    7. nenhuma segunda chamada/retry.

Dois níveis de prova, mesmo padrão do resto da suíte
(test_observe_real_path.py, test_cli_crash_safety.py):

    - ``test_*_fake_ledger``: unitário, determinístico, contra ``observe()``
      diretamente, com um ledger falso que sempre lança — não depende de
      timing nem de rede;
    - ``test_successful_call_survives_real_git_ledger_failure``: integração
      com o backend REAL de produção (``GitUsageLedger``/``GitJsonStore``,
      remoto inalcançável de verdade), passando por ``observe()`` com o
      mesmo transporte mock (o CLI não permite injetar um transporte
      mock — só o transporte real, que exigiria rede/ANTHROPIC_API_KEY).
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup
from coordinator.anthropic_client import TransportResponse
from coordinator.budget import UsageLedger
from coordinator.config import Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.events import Event
from coordinator.git_state import GitJsonStore, GitUsageLedger
from coordinator.observe import observe
from coordinator.worker_registry import Worker, WorkerState


def _load_event(nome: str) -> Event:
    with open(os.path.join(_pathsetup.FIXTURES, nome), encoding="utf-8") as fh:
        d = json.load(fh)
    return Event(raw_type=d["raw_type"], source=d["source"], repo=d["repo"],
                 identity=d["identity"], payload=d["payload"])


def _workers() -> list[Worker]:
    with open(os.path.join(_pathsetup.FIXTURES, "workers.json"), encoding="utf-8") as fh:
        d = json.load(fh)
    return [Worker(name=w["name"], state=WorkerState(w["state"]),
                    specialization=tuple(w.get("specialization", [])))
            for w in d["workers"]]


class _TransporteContador:
    """Ponto 1: mock Anthropic que sempre retorna sucesso + usage."""

    def __init__(self) -> None:
        self.calls = 0

    def send(self, request):
        self.calls += 1
        return TransportResponse("resumo simulado da resposta", 120, 45)


class _LedgerQueSempreFalha:
    """Ponto 2: mesma superfície pública de UsageLedger/GitUsageLedger
    (``append``/``reserve_if_within_budget`` importam aqui), mas
    ``append`` sempre lança — sem depender de git/rede para o teste
    determinístico. Achado F9-A: a RESERVA conservadora (antes da
    chamada) precisa ter êxito para este cenário — "a chamada aconteceu,
    mas a persistência DEPOIS falhou" — então ``reserve_if_within_budget``
    delega para um ``UsageLedger`` real (nunca lança); só ``append``
    (usado pela correção/uso, depois da chamada) continua sempre
    falhando."""

    def __init__(self, mensagem: str) -> None:
        self.mensagem = mensagem
        self.append_calls = 0
        self._reserva_real = UsageLedger(tempfile.mktemp(suffix=".json"))

    def append(self, record) -> None:
        self.append_calls += 1
        raise RuntimeError(self.mensagem)

    def month_to_date_usd(self, *, now=None) -> float:
        return 0.0

    def all_records(self) -> list[dict]:
        return []

    def reserve_if_within_budget(self, candidate, *, budget_usd, now=None) -> bool:
        return self._reserva_real.reserve_if_within_budget(candidate, budget_usd=budget_usd, now=now)


def test_successful_call_survives_ledger_failure_with_fake_ledger() -> None:
    transporte = _TransporteContador()
    ledger = _LedgerQueSempreFalha("falha de publicação simulada")
    cfg = Config(enabled=True, mode="observe")
    ev = _load_event("event_pr_needs_audit.json")

    r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()), ledger=ledger,
                workers=_workers(), transport=transporte)

    # 3 · exatamente 1 chamada foi feita. Achado F9-A: depois da chamada
    #     bem-sucedida, DOIS registros são tentados (correção para o custo
    #     real + registro informativo de uso) — 2 tentativas de
    #     ledger.append, não mais 1 — mas nenhum retry dentro de cada uma
    #     (mesmo padrão de openai_client.py::_tentar_gravar).
    assert transporte.calls == 1, f"esperava exatamente 1 chamada à Anthropic, obtive {transporte.calls}"
    assert ledger.append_calls == 2, f"esperava exatamente 2 tentativas de ledger.append (correção + uso), obtive {ledger.append_calls}"

    # 4 · resultado informa call_attempted=true — nunca falso só porque o
    #     ledger falhou depois.
    assert r.status == "OBSERVED"
    assert r.call_attempted is True, "a chamada aconteceu de verdade; call_attempted não pode virar False"
    assert r.call_status == "ok_ledger_failed"

    # 5 · usage/tokens/custo da chamada continuam visíveis, mesmo sem
    #     persistência no ledger compartilhado.
    assert r.usage is not None, "usage da chamada não pode desaparecer por causa da falha do ledger"
    assert r.usage["input_tokens"] == 120
    assert r.usage["output_tokens"] == 45
    assert r.usage["estimated_cost_usd"] > 0

    # 6 · o motivo relatado explica a falha do ledger (a mensagem exata é
    #     testada à parte, com um segredo embutido, no teste seguinte).
    assert "ledger" in r.reason.lower()
    assert "sucesso" in r.reason.lower() or "concluída" in r.reason.lower()
    print("OK  test_successful_call_survives_ledger_failure_with_fake_ledger")


def test_ledger_error_is_sanitized_even_with_a_credential_embedded() -> None:
    """Ponto 6, isolado: o erro do ledger passa por redact() antes de
    aparecer em reason — mesmo padrão de segredo embutido em URL que os
    outros testes deste pacote usam (x-access-token:<token>@github.com)."""
    chave_falsa = "ghp_" + "R" * 36
    transporte = _TransporteContador()
    ledger = _LedgerQueSempreFalha(
        f"fatal: could not push to https://x-access-token:{chave_falsa}@github.com/x/y.git"
    )
    cfg = Config(enabled=True, mode="observe")
    ev = _load_event("event_pr_needs_audit.json")

    r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()), ledger=ledger,
                workers=_workers(), transport=transporte)

    assert r.call_attempted is True
    assert r.call_status == "ok_ledger_failed"
    assert chave_falsa not in r.reason, "credencial do erro do ledger vazou para reason sem passar por redact()"
    assert "[REDACTED" in r.reason, "esperava o marcador de redact() no motivo"

    texto_completo = json.dumps(r.to_dict(), ensure_ascii=False)
    assert chave_falsa not in texto_completo, "credencial vazou para algum campo de to_dict()"
    print("OK  test_ledger_error_is_sanitized_even_with_a_credential_embedded")


def test_ledger_success_path_is_unaffected() -> None:
    """Regressão: quando o ledger NÃO falha, o comportamento continua
    exatamente o de antes (call_status='ok', sem o sufixo novo)."""
    transporte = _TransporteContador()
    with tempfile.TemporaryDirectory() as tmp:
        ledger = UsageLedger(os.path.join(tmp, "usage.json"))
        cfg = Config(enabled=True, mode="observe")
        ev = _load_event("event_pr_needs_audit.json")

        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()), ledger=ledger,
                    workers=_workers(), transport=transporte)

        assert r.call_status == "ok"
        assert r.call_attempted is True
        assert r.usage is not None
        # Achado F9-A: 3 registros (reserva + correção + uso), não mais 1.
        registros = ledger.all_records()
        assert len(registros) == 3, f"reserva + correção + uso precisam ter sido persistidos: {registros}"
        assert sorted(r2["kind"] for r2 in registros) == ["correction", "reservation", "usage"]
    print("OK  test_ledger_success_path_is_unaffected")


def _remoto_bare_com_hook_que_recusa_push_apos_a_reserva(tmp: str) -> str:
    """Um remoto git BARE de verdade, com histórico inicial já publicado
    (para que a LEITURA do orçamento em ``check_budget()`` funcione
    normalmente — ``month_to_date_usd()`` roda ANTES da chamada, então
    precisa suceder para o teste sequer chegar no transporte), mas cujo
    hook ``pre-receive`` recusa TODO push a partir do segundo —
    exatamente o tipo de falha que ``GitJsonStore.update()`` relata como
    ``RuntimeError`` depois de esgotar ``max_attempts``.

    Achado F9-A: a reserva CONSERVADORA (achado F9-A) agora é ela mesma
    um push, ANTES da chamada — um remoto que recusa QUALQUER push
    (inclusive o primeiro) faria a RESERVA falhar, e o teste nunca
    chegaria a tentar a chamada (fail-closed correto, mas não é mais o
    cenário que este teste quer provar: "a chamada aconteceu, só a
    persistência DEPOIS falhou"). O hook agora conta os pushes recebidos
    (arquivo contador nos próprios ``hooks/`` do remoto, sobrevive entre
    invocações do hook) e só recusa a partir do 2º — deixando a reserva
    (1º push) passar e a correção/uso (pushes seguintes) falharem, exatamente
    o cenário que a auditoria original descreveu.

    Um remoto "que não existe" (a técnica usada em test_cli_crash_safety.py
    para simular o item 2) não serve aqui: ele falha tanto na leitura
    quanto na escrita, e o teste nunca chegaria a tentar a chamada — o
    orçamento falharia primeiro. Aqui a leitura tem que funcionar; só a
    ESCRITA depois da reserva precisa falhar."""
    remoto = os.path.join(tmp, "remoto-ledger.git")
    import subprocess

    subprocess.run(["git", "init", "-q", "--bare", remoto], check=True)

    seed = os.path.join(tmp, "seed")
    os.makedirs(seed)
    subprocess.run(["git", "init", "-q", seed], check=True)
    subprocess.run(["git", "-C", seed, "remote", "add", "origin", remoto], check=True)
    subprocess.run(["git", "-C", seed, "config", "user.email", "x@example.com"], check=True)
    subprocess.run(["git", "-C", seed, "config", "user.name", "X"], check=True)
    subprocess.run(["git", "-C", seed, "checkout", "-q", "--orphan", "coordinator-state-teste-ledger-hook"], check=True)
    with open(os.path.join(seed, "state.json"), "w", encoding="utf-8") as fh:
        fh.write('{"records": []}')
    subprocess.run(["git", "-C", seed, "add", "-A"], check=True)
    subprocess.run(["git", "-C", seed, "commit", "-q", "-m", "seed"], check=True)
    subprocess.run(["git", "-C", seed, "push", "-q", "origin", "HEAD:coordinator-state-teste-ledger-hook"], check=True)

    # Instalado DEPOIS do push de seed acima — nunca conta esse push.
    contador = os.path.join(remoto, "hooks", ".push-count")
    hook = os.path.join(remoto, "hooks", "pre-receive")
    with open(hook, "w", encoding="utf-8") as fh:
        fh.write(
            "#!/bin/sh\n"
            f"COUNT=$(cat {contador} 2>/dev/null || echo 0)\n"
            "COUNT=$((COUNT + 1))\n"
            f"echo $COUNT > {contador}\n"
            "if [ \"$COUNT\" -gt 1 ]; then\n"
            "  echo 'recusado de propósito (teste, a partir do 2o push)' >&2\n"
            "  exit 1\n"
            "fi\n"
            "exit 0\n"
        )
    os.chmod(hook, 0o755)
    return remoto


def test_successful_call_survives_real_git_ledger_failure() -> None:
    """Mesmo cenário dos dois primeiros testes, mas com o backend REAL de
    produção (``GitUsageLedger``/``GitJsonStore``) contra um remoto git
    bare de verdade cujo push é recusado (a partir do 2º) por um hook
    ``pre-receive`` — prova que ``GitJsonStore.update()`` esgotando
    tentativas e levantando ``RuntimeError`` (o caminho real que a
    auditoria descreveu) é capturado por ``observe()`` do mesmo jeito que
    o ledger falso acima. Achado F9-A: a RESERVA conservadora (o 1º push,
    ANTES da chamada) precisa ter êxito para este cenário existir — só a
    correção/uso (pushes seguintes, DEPOIS da chamada) falham.

    Não passa pelo CLI (``coordinator.__main__.main``): o CLI só injeta
    ``AnthropicTransport()`` real (sem chave/rede neste sandbox, uma
    chamada de verdade nunca teria ``status="ok"``), então a única forma
    honesta de testar "chamada bem-sucedida + ledger real quebrado" é
    chamar ``observe()`` diretamente com um transporte mock — exatamente
    como o resto desta suíte já faz para o caminho real de ponta a ponta
    (``test_observe_real_path.py``)."""
    with tempfile.TemporaryDirectory() as tmp:
        remoto = _remoto_bare_com_hook_que_recusa_push_apos_a_reserva(tmp)
        transporte = _TransporteContador()
        ledger = GitUsageLedger(GitJsonStore(remoto, branch="coordinator-state-teste-ledger-hook"))
        cfg = Config(enabled=True, mode="observe")
        ev = _load_event("event_pr_needs_audit.json")

        r = observe(ev, config=cfg, dedup=Deduplicator(InMemoryStore()), ledger=ledger,
                    workers=_workers(), transport=transporte)

        assert transporte.calls == 1, "exatamente 1 chamada — a reserva (1o push) teve êxito"
        assert r.status == "OBSERVED"
        assert r.call_attempted is True
        assert r.call_status == "ok_ledger_failed"
        assert r.usage is not None
        assert r.usage["input_tokens"] == 120 and r.usage["output_tokens"] == 45
        assert "ledger" in r.reason.lower()

        # Confirma que o push foi mesmo recusado (não um falso positivo
        # por outro motivo) e que a leitura do orçamento e a reserva
        # conservadora (1º push) tinham funcionado antes — a mensagem do
        # hook aparece sanitizada no motivo.
        assert "recusado" in r.reason.lower() or "rejected" in r.reason.lower() or "RuntimeError" in r.reason
    print("OK  test_successful_call_survives_real_git_ledger_failure")


def main() -> int:
    testes = [
        test_successful_call_survives_ledger_failure_with_fake_ledger,
        test_ledger_error_is_sanitized_even_with_a_credential_embedded,
        test_ledger_success_path_is_unaffected,
        test_successful_call_survives_real_git_ledger_failure,
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
