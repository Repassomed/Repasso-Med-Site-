"""Workers PROGRAMÁTICOS do Worker Bridge — Issue #128, §1.

O PROBLEMA que este módulo resolve (e só ele):

``coordination/tasks.json::agentes_conhecidos`` lista ``Claude 1``-``Claude
4`` — e ``worker_ops.default_seed_workers()`` os registra como
``type="human_session"``. Eles representam SESSÕES HUMANAS/manuais: um
Claude aberto no navegador, que recebe instrução em texto e nunca é
iniciado por código. Transformá-los em worker de API seria exatamente o
que a Issue #128 proíbe ("não transformar sessões humanas manuais em
disponibilidade fictícia") — e apagaria a distinção que o
``handoff_exec``/``worker_commands`` já usam para NUNCA iniciar
automaticamente um ``human_session``.

Por isso os workers do Bridge são OUTRA identidade, com ids próprios:

    claude-worker-1 .. claude-worker-4   (type=api_runner)

Mesmo espírito, mesmos portões e mesmo mecanismo de
``canary_bootstrap.py`` (Issue #105 Fase G, achado G4) — ids FIXOS em
código, criados só quando o Bridge está explicitamente ativado, sempre
por compare-and-set que preserva estado real.

**REGRAS (todas fail-closed):**

1. **Nome nunca é livre.** Só os quatro ``worker_id`` de
   ``BRIDGE_WORKER_IDS`` — sem parâmetro de nome, sem sufixo derivado,
   sem "qualquer id que comece com claude-worker".
2. **Um único worker elegível na V1.** ``ELIGIBLE_WORKER_IDS`` é
   ``("claude-worker-4",)``, literal em código. Só ele nasce
   ``AVAILABLE``/``can_execute=True``; ``claude-worker-1``-``3`` nascem
   ``OFFLINE``/``can_execute=False`` e, por isso, nem o
   ``scheduler._candidatos_disponiveis`` nem
   ``OperationalWorkerRegistry.escolher_disponivel`` jamais os oferecem.
   Ligá-los é uma decisão explícita FUTURA de José (depois do piloto),
   nunca um efeito colateral desta rodada.
3. **``AVAILABLE`` nunca vem de seed global.** ``worker_ops.
   default_seed_workers()`` continua SEM estes quatro workers: enquanto
   ninguém rodar este bootstrap com o Bridge ligado, eles simplesmente
   não existem no registro — então o scheduler não os vê e
   ``heartbeat.aplicar_heartbeat`` REJEITA qualquer heartbeat deles
   (worker desconhecido, Issue #105 Fase B item 7, regra intocada).
4. **Mesmos portões do Bridge.** ``WorkerBridgeConfig.gate()`` precisa
   estar ABERTO (ENABLED + MODE válido + variáveis do piloto + ref
   esperada). Portão fechado = zero escrita. Em modo ``pilot``, o
   ``REPASSO_WORKER_BRIDGE_PILOT_WORKER_ID`` configurado precisa ser
   EXATAMENTE o worker elegível — uma configuração inconsistente falha
   fechado em vez de registrar um worker que o piloto nunca poderia usar.
5. **Nunca sobrescreve estado real.** ``criar_se_ausente_condicional``
   (compare-and-set): um worker que já existe fica EXATAMENTE como está —
   um ``BUSY``/``LIMIT`` no meio de uma execução nunca é rebaixado a
   ``AVAILABLE`` por uma segunda execução do bootstrap. Rodar isto duas
   vezes é idempotente.
6. **Não executa nada.** Não despacha tarefa, não chama modelo nenhum,
   não toca branch de trabalho, não abre PR, não publica — só escreve
   registros na branch de estado dedicada do Worker Registry
   (``coordinator-state-workers``, nunca a branch padrão, nunca matéria).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass

from .worker_ops import DEFAULT_STATE_BRANCH, OperationalWorkerRegistry, WorkerRecord

BRIDGE_WORKER_1 = "claude-worker-1"
BRIDGE_WORKER_2 = "claude-worker-2"
BRIDGE_WORKER_3 = "claude-worker-3"
BRIDGE_WORKER_4 = "claude-worker-4"
BRIDGE_WORKER_IDS: tuple[str, ...] = (
    BRIDGE_WORKER_1, BRIDGE_WORKER_2, BRIDGE_WORKER_3, BRIDGE_WORKER_4,
)

BRIDGE_DISPLAY_NAMES: dict[str, str] = {
    BRIDGE_WORKER_1: "Claude Worker 1",
    BRIDGE_WORKER_2: "Claude Worker 2",
    BRIDGE_WORKER_3: "Claude Worker 3",
    BRIDGE_WORKER_4: "Claude Worker 4",
}

BRIDGE_WORKER_TYPE = "api_runner"
BRIDGE_CAPABILITIES: tuple[str, ...] = ("codigo",)

# Regra 2 — V1/piloto: só o Worker 4. Literal em código, nunca lido de
# env/input/arquivo/Variable.
ELIGIBLE_WORKER_IDS: tuple[str, ...] = (BRIDGE_WORKER_4,)


def e_worker_do_bridge(nome_ou_id: str) -> bool:
    """``True`` só para os quatro workers programáticos — por
    ``worker_id`` ou pelo ``display_name`` exato (as duas formas que
    ``OperationalWorkerRegistry.find_by_name_or_id`` aceita). Nunca abre
    espaço para nome livre, e nunca casa com os ``claude-1``..``claude-4``
    de sessão humana."""
    alvo = (nome_ou_id or "").strip().lower()
    if not alvo:
        return False
    if alvo in BRIDGE_WORKER_IDS:
        return True
    return any(nome.lower() == alvo for nome in BRIDGE_DISPLAY_NAMES.values())


def e_worker_elegivel(worker_id: str) -> bool:
    return (worker_id or "").strip().lower() in ELIGIBLE_WORKER_IDS


def registros_do_bridge() -> list[WorkerRecord]:
    """Os quatro ``WorkerRecord`` exatos que o bootstrap cria —
    construídos aqui, nunca a partir de dado externo. Só o elegível nasce
    ``AVAILABLE``; os outros três nascem ``OFFLINE`` e
    ``can_execute=False``. ``never_merge``/``can_publish`` continuam
    propriedades calculadas de ``WorkerRecord`` (sempre ``True``/
    ``False``, nunca campos graváveis)."""
    registros: list[WorkerRecord] = []
    for worker_id in BRIDGE_WORKER_IDS:
        elegivel = e_worker_elegivel(worker_id)
        registros.append(
            WorkerRecord(
                worker_id=worker_id,
                display_name=BRIDGE_DISPLAY_NAMES[worker_id],
                type=BRIDGE_WORKER_TYPE,
                status=("AVAILABLE" if elegivel else "OFFLINE"),
                capabilities=BRIDGE_CAPABILITIES,
                current_task=None,
                can_execute=elegivel,
                can_audit=False,
            )
        )
    return registros


def workers_programaticos(workers: list[WorkerRecord]) -> list[WorkerRecord]:
    """Filtro que o Worker Bridge aplica ANTES de consultar o scheduler:
    só ``api_runner`` cujo ``worker_id`` está em ``BRIDGE_WORKER_IDS``.

    Isto é o que garante, estruturalmente, que uma sessão humana
    (``human_session``, inclusive um ``claude-1`` marcado ``AVAILABLE``
    por comando de José) NUNCA recebe uma atribuição automática do
    Bridge, e que os ``api_runner`` do canário
    (``api-runner-canary-a``/``-b``) também não são sequestrados por ele:
    cada mecanismo só enxerga os próprios workers."""
    return [
        w for w in workers
        if w.type == BRIDGE_WORKER_TYPE and w.worker_id in BRIDGE_WORKER_IDS
    ]


@dataclass(frozen=True)
class BridgeBootstrapResult:
    action: str  # "PREPARED" | "BLOCKED"
    reason: str
    criados: tuple[str, ...] = ()
    ja_existentes: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "criados": list(self.criados),
            "ja_existentes": list(self.ja_existentes),
        }


def preparar_workers_do_bridge(
    registry: OperationalWorkerRegistry, *, config,
) -> BridgeBootstrapResult:
    """Registra os quatro workers programáticos SE (e só se) o Bridge
    estiver explicitamente ativado. ``config`` é uma
    ``worker_bridge.WorkerBridgeConfig`` (tipagem por duck typing para
    não criar ciclo de import — ``worker_bridge`` importa deste módulo).

    Fail-closed em toda borda: portão fechado, ou piloto configurado para
    um worker que não é o elegível, devolve ``BLOCKED`` sem escrever NADA
    no Worker Registry."""
    gate = config.gate()
    if not gate.open:
        return BridgeBootstrapResult(
            "BLOCKED",
            f"portão do Worker Bridge fechado — nenhum worker programático é preparado: {gate.reason}",
        )

    if config.is_pilot and not e_worker_elegivel(config.pilot_worker_id or ""):
        return BridgeBootstrapResult(
            "BLOCKED",
            (
                f"modo piloto configurado para {config.pilot_worker_id!r}, que não é o worker "
                f"elegível desta V1 ({list(ELIGIBLE_WORKER_IDS)}) — configuração inconsistente, "
                "nada é registrado (fail-closed)."
            ),
        )

    criados: list[str] = []
    ja_existentes: list[str] = []
    for registro in registros_do_bridge():
        if registry.criar_se_ausente_condicional(
            registro, message=f"worker-bridge: prepara worker {registro.worker_id} (Issue #128 §1)"
        ):
            criados.append(registro.worker_id)
        else:
            ja_existentes.append(registro.worker_id)

    return BridgeBootstrapResult(
        "PREPARED",
        (
            f"workers programáticos prontos: criados={criados or '-'}, já existentes "
            f"(preservados exatamente como estavam)={ja_existentes or '-'}. Elegíveis nesta V1: "
            f"{list(ELIGIBLE_WORKER_IDS)}; os demais ficam OFFLINE/can_execute=False."
        ),
        criados=tuple(criados),
        ja_existentes=tuple(ja_existentes),
    )


# ---------------------------------------------------------------------
# CLI — invocado por .github/workflows/coordinator-worker-bridge.yml,
# DEPOIS da confirmação dos portões e ANTES do ciclo do Bridge. Sem
# nenhum input livre: os ids são fixos aqui e o resto vem das Variables
# já validadas pelo próprio portão.
# ---------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Bootstrap dos workers programáticos do Worker Bridge (Issue #128 §1)."
    )
    ap.add_argument(
        "--worker-state-git-remote", required=True,
        help="remoto do Worker Registry operacional (branch de estado dedicada, nunca a branch padrão).",
    )
    ap.add_argument("--worker-state-git-branch", default=DEFAULT_STATE_BRANCH)
    ap.add_argument("--out", default=None, help="onde gravar o resultado em JSON (opcional)")
    return ap


def main(argv: list[str] | None = None) -> int:
    from .git_state import GitJsonStore
    from .redact import redact
    from .worker_bridge import WorkerBridgeConfig

    args = _build_arg_parser().parse_args(argv)
    config = WorkerBridgeConfig.from_env()
    registry = OperationalWorkerRegistry(
        GitJsonStore(args.worker_state_git_remote, branch=args.worker_state_git_branch)
    )

    try:
        resultado = preparar_workers_do_bridge(registry, config=config)
    except Exception as exc:  # fail-closed: job vermelho, nunca sucesso silencioso
        print(f"ERRO fail-closed no bootstrap dos workers do Bridge: {redact(str(exc))}")
        return 1

    saida = json.dumps(resultado.to_dict(), indent=2, ensure_ascii=False)
    print(saida)
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(saida)

    return 0 if resultado.action == "PREPARED" else 1


if __name__ == "__main__":
    sys.exit(main())
