"""Bootstrap CANARY-ONLY dos dois ``api_runner`` do canário — Issue #105,
Fase G (``#105-G · integração operacional final para canário ponta a
ponta``), achado G4.

O PROBLEMA que este módulo resolve (e só ele):

``heartbeat.aplicar_heartbeat`` REJEITA, de propósito, um heartbeat de
worker desconhecido — "cadastro é ato explícito de José, nunca inferido de
um heartbeat" (Issue #105 Fase B, item 7). Essa regra continua valendo
INTEIRA e este módulo não a toca. Mas um ``api_runner`` de verdade não tem
como se apresentar sozinho: sem um registro prévio no Worker Registry
operacional, TODO heartbeat da execução inicial do canário seria rejeitado
e ``WorkerRecord.last_checkpoint`` nunca seria preenchido — ou seja, o
handoff real (Fase E) nunca teria um checkpoint persistido de onde partir.

A saída NÃO é afrouxar o heartbeat. É um cadastro explícito, restrito e
GATED: exatamente dois workers, com ids FIXOS em código, criados somente
quando o canário está explicitamente ativado.

**REGRAS (todas fail-closed):**

1. **Nome nunca é livre.** Só os dois ``worker_id`` desta constante
   (``CANARY_WORKER_IDS``) — não há parâmetro de nome, não há sufixo
   derivado, não há "qualquer id que comece com api-runner". Qualquer
   outro worker continua precisando do caminho de sempre (comando
   explícito de José, ``worker_commands.py``).
2. **Mesmos portões do Runner.** ``RunnerDispatchConfig.gate()`` precisa
   estar ABERTO (ENABLED + MODE=canary + CANARY_TASK_ID + ref esperada) E
   o ``canonical_task_id`` recebido precisa ser EXATAMENTE
   ``REPASSO_RUNNER_CANARY_TASK_ID`` (``task_autorizada``, comparação
   estrita — nunca prefixo). Portão fechado = zero escrita.
3. **Nunca nascem disponíveis "por acaso".** ``worker_ops.
   default_seed_workers()`` continua sem eles: enquanto ninguém rodar
   este bootstrap com o canário ligado, esses dois workers simplesmente
   não existem no registro, então nem o scheduler os oferece nem um
   heartbeat deles é aceito. ``AVAILABLE`` aqui é consequência de uma
   ativação explícita do canário, nunca de um default global.
4. **Nunca sobrescreve estado real.** Usa ``OperationalWorkerRegistry.
   criar_se_ausente_condicional`` (compare-and-set): um worker que já
   existe é deixado EXATAMENTE como está — um ``BUSY``/``LIMIT`` no meio
   de uma execução, com ``current_task``/``last_checkpoint`` reais, nunca
   é rebaixado a ``AVAILABLE`` por uma segunda execução do bootstrap.
   Rodar isto duas vezes é idempotente.
5. **Não executa nada.** Este módulo não despacha tarefa, não chama
   modelo nenhum, não toca em branch de trabalho, não publica nada — só
   escreve dois registros na branch de estado dedicada do Worker Registry
   (``coordinator-state-workers``, nunca ``main``, nunca matéria).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass

from .git_state import GitJsonStore
from .redact import redact
from .runner_dispatch import RunnerDispatchConfig
from .worker_ops import DEFAULT_STATE_BRANCH, OperationalWorkerRegistry, WorkerRecord

# Os DOIS únicos workers de canário — ids fixos em código, nunca lidos de
# env/input/arquivo. A ordem importa: o "a" é o executor inicial declarado
# no workflow (``--worker-id api-runner-canary-a``) e o "b" é o receptor
# natural do primeiro handoff.
CANARY_WORKER_A = "api-runner-canary-a"
CANARY_WORKER_B = "api-runner-canary-b"
CANARY_WORKER_IDS: tuple[str, ...] = (CANARY_WORKER_A, CANARY_WORKER_B)

CANARY_DISPLAY_NAMES: dict[str, str] = {
    CANARY_WORKER_A: "API Runner Canary A",
    CANARY_WORKER_B: "API Runner Canary B",
}

CANARY_WORKER_TYPE = "api_runner"
CANARY_CAPABILITIES: tuple[str, ...] = ("codigo",)


def e_worker_de_canario(nome_ou_id: str) -> bool:
    """``True`` só para os dois workers de canário — por ``worker_id`` ou
    pelo ``display_name`` exato (as duas formas que ``worker_ops.
    OperationalWorkerRegistry.find_by_name_or_id`` já aceita). Usado por
    ``worker_commands.py`` (achado G5) para tratar esses dois nomes de
    forma ESTRITAMENTE controlada — nunca para abrir espaço a um nome
    livre."""
    alvo = (nome_ou_id or "").strip().lower()
    if not alvo:
        return False
    if alvo in CANARY_WORKER_IDS:
        return True
    return any(nome.lower() == alvo for nome in CANARY_DISPLAY_NAMES.values())


def registros_do_canario() -> list[WorkerRecord]:
    """Os dois ``WorkerRecord`` exatos que o bootstrap cria — construídos
    aqui, nunca a partir de dado externo. ``can_execute=True``/
    ``can_audit=False``; ``never_merge``/``can_publish`` continuam sendo
    propriedades calculadas de ``WorkerRecord`` (sempre True/False,
    nunca campos graváveis)."""
    return [
        WorkerRecord(
            worker_id=worker_id,
            display_name=CANARY_DISPLAY_NAMES[worker_id],
            type=CANARY_WORKER_TYPE,
            status="AVAILABLE",
            capabilities=CANARY_CAPABILITIES,
            current_task=None,
            can_execute=True,
            can_audit=False,
        )
        for worker_id in CANARY_WORKER_IDS
    ]


@dataclass(frozen=True)
class BootstrapResult:
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


def preparar_workers_do_canario(
    registry: OperationalWorkerRegistry, *, config: RunnerDispatchConfig, canonical_task_id: str,
) -> BootstrapResult:
    """Registra os dois workers de canário SE (e só se) o canário estiver
    explicitamente ativado. Fail-closed em toda borda: portão fechado ou
    tarefa canônica diferente da autorizada devolve ``BLOCKED`` sem
    escrever NADA no Worker Registry."""
    gate = config.gate()
    if not gate.open:
        return BootstrapResult(
            "BLOCKED",
            f"portão do Runner fechado — nenhum worker de canário é preparado: {gate.reason}",
        )

    alvo = (canonical_task_id or "").strip()
    if not config.task_autorizada(alvo):
        return BootstrapResult(
            "BLOCKED",
            f"tarefa canônica {alvo!r} não é o canário autorizado ({config.canary_task_id!r}) — "
            "os workers de canário só são preparados para a tarefa explicitamente autorizada "
            "na Variable do repositório, nunca para qualquer tarefa.",
        )

    criados: list[str] = []
    ja_existentes: list[str] = []
    for registro in registros_do_canario():
        if registry.criar_se_ausente_condicional(
            registro, message=f"canário: prepara worker {registro.worker_id} (Issue #105 Fase G)"
        ):
            criados.append(registro.worker_id)
        else:
            ja_existentes.append(registro.worker_id)

    return BootstrapResult(
        "PREPARED",
        (
            f"workers de canário prontos para {alvo!r}: criados={criados or '-'}, "
            f"já existentes (preservados exatamente como estavam)={ja_existentes or '-'}."
        ),
        criados=tuple(criados),
        ja_existentes=tuple(ja_existentes),
    )


# ---------------------------------------------------------------------
# CLI — invocado pelo .github/workflows/coordinator-runner.yml, DEPOIS do
# passo que confirma os portões e ANTES do Runner Dispatch. Sem nenhum
# input livre: o único dado que entra é a Variable já validada por formato
# no próprio workflow.
# ---------------------------------------------------------------------

def _build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Bootstrap CANARY-ONLY dos dois api_runner do canário (Issue #105 Fase G, achado G4)."
    )
    ap.add_argument(
        "--canonical-task-id", required=True,
        help="id CANÔNICO da tarefa do canário — precisa ser exatamente igual a "
        "REPASSO_RUNNER_CANARY_TASK_ID, senão nada é preparado (fail-closed).",
    )
    ap.add_argument(
        "--worker-state-git-remote", required=True,
        help="remoto do Worker Registry operacional (branch de estado dedicada, nunca 'main').",
    )
    ap.add_argument("--worker-state-git-branch", default=DEFAULT_STATE_BRANCH)
    ap.add_argument("--out", default=None, help="onde gravar o resultado em JSON (opcional)")
    return ap


def main(argv: list[str] | None = None) -> int:
    args = _build_arg_parser().parse_args(argv)
    config = RunnerDispatchConfig.from_env()
    registry = OperationalWorkerRegistry(
        GitJsonStore(args.worker_state_git_remote, branch=args.worker_state_git_branch)
    )

    try:
        resultado = preparar_workers_do_canario(
            registry, config=config, canonical_task_id=args.canonical_task_id
        )
    except Exception as exc:  # fail-closed: job vermelho, nunca sucesso silencioso
        print(f"ERRO fail-closed no bootstrap do canário: {redact(str(exc))}")
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
