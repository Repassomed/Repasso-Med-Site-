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
2. **Elegibilidade é por MODO, e o modo vem do portão.** Correção B3
   da auditoria independente do PR #129: antes a elegibilidade era uma
   tupla única (``claude-worker-4``), então mudar para
   ``active-supervised`` depois do piloto NÃO ligava os outros três — só
   uma alteração de código ligaria, exatamente a lacuna que esta
   implementação deveria fechar. Agora existem dois conjuntos FIXOS em
   código, escolhidos pelo modo já validado pelo portão:

   - modo ``pilot``: ``ELIGIBLE_WORKER_IDS_PILOT`` = só
     ``claude-worker-4``. Os outros três nascem
     ``OFFLINE``/``can_execute=False`` e, por isso, nem o
     ``scheduler._candidatos_disponiveis`` nem
     ``OperationalWorkerRegistry.escolher_disponivel`` jamais os oferecem;
   - modo ``active-supervised``: ``ELIGIBLE_WORKER_IDS_ACTIVE_SUPERVISED``
     = os QUATRO ids fixos, e só então ``preparar_workers_do_bridge``
     habilita por compare-and-set os que ainda estavam OFFLINE.

   Isto não inventa disponibilidade: ``active-supervised`` é uma decisão
   explícita de José numa Variable do repositório, tomada depois do
   piloto, e um modo desconhecido devolve conjunto VAZIO (fail-closed).
   Nenhum id sai de env/input/arquivo em nenhum dos dois casos.
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
6. **Habilitar um worker existente é CAS e só sobe de OFFLINE.**
   ``OperationalWorkerRegistry.habilitar_worker_programatico_condicional``
   só escreve quando uma leitura fresca mostra EXATAMENTE
   ``type=api_runner`` + ``OFFLINE`` + ``can_execute=False`` +
   ``current_task=None``. Um worker ``BUSY``/``NEAR_LIMIT``/``LIMIT``, um
   worker com tarefa em andamento e qualquer ``human_session`` são
   impossíveis de habilitar por este caminho — não por convenção, por
   estrutura.
7. **Não executa nada.** Não despacha tarefa, não chama modelo nenhum,
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

# Correção B2 da auditoria independente do PR #129: com só ``("codigo",)``
# o Bridge não conseguiria receber a MAIOR PARTE da fila real do Repasso
# Med. ``scheduler._AREA_TO_CAPABILITY`` mapeia ``materia``/``assets``/
# ``documentacao`` -> ``conteudo``, então Fisiopatologia II, Toxicologia e
# Dermatologia exigem ``conteudo``, e ``_e_compativel`` recusaria o worker
# programático para todas elas. As duas capabilities são as MESMAS das
# sessões humanas (``worker_ops.default_seed_workers``), o que é o ponto:
# a diferença entre um worker humano e um programático é COMO ele é
# iniciado, não o que ele sabe fazer.
#
# Isto não afrouxa nenhuma segurança: quem decide se uma tarefa pode ser
# executada automaticamente continua sendo o portão de política
# DECLARATIVO da própria tarefa (``automation_enabled``, ``risk_level``,
# ``policy_level``, ``jose_authorized`` — ver ``worker_bridge.
# avaliar_politica``), o modo do Bridge e a auditoria obrigatória depois
# do NEEDS-AUDIT. Capability responde "sabe fazer?", não "pode fazer?".
BRIDGE_CAPABILITIES: tuple[str, ...] = ("conteudo", "codigo")

# Os modos do Bridge, por VALOR — ``worker_bridge.BRIDGE_MODE_*`` aponta
# para estas constantes em vez de redeclarar o texto, para que os dois
# módulos nunca divirjam (há teste estrutural provando a identidade).
MODO_PILOT = "pilot"
MODO_ACTIVE_SUPERVISED = "active-supervised"

# Regra 2 — conjuntos FIXOS em código, nunca lidos de
# env/input/arquivo/Variable. O modo (já validado pelo portão) escolhe
# qual vale; um modo desconhecido não escolhe nenhum.
ELIGIBLE_WORKER_IDS_PILOT: tuple[str, ...] = (BRIDGE_WORKER_4,)
ELIGIBLE_WORKER_IDS_ACTIVE_SUPERVISED: tuple[str, ...] = BRIDGE_WORKER_IDS
ELEGIVEIS_POR_MODO: dict[str, tuple[str, ...]] = {
    MODO_PILOT: ELIGIBLE_WORKER_IDS_PILOT,
    MODO_ACTIVE_SUPERVISED: ELIGIBLE_WORKER_IDS_ACTIVE_SUPERVISED,
}


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


def ids_elegiveis(modo: str) -> tuple[str, ...]:
    """Os ids elegíveis NAQUELE modo. Fail-closed: um modo desconhecido
    (ou vazio) devolve tupla vazia, então nenhum worker é elegível e
    nenhuma atribuição acontece — nunca o conjunto mais permissivo."""
    return ELEGIVEIS_POR_MODO.get((modo or "").strip(), ())


def e_worker_elegivel(worker_id: str, *, modo: str) -> bool:
    """``modo`` é OBRIGATÓRIO e nomeado de propósito: não existe
    "elegível" em abstrato, e nenhum chamador pode esquecer o modo por
    acidente de posição (correção B3, PR #129)."""
    return (worker_id or "").strip().lower() in ids_elegiveis(modo)


def registros_do_bridge(*, modo: str) -> list[WorkerRecord]:
    """Os quatro ``WorkerRecord`` exatos que o bootstrap cria —
    construídos aqui, nunca a partir de dado externo. Só os elegíveis
    NAQUELE modo nascem ``AVAILABLE``; os demais nascem ``OFFLINE`` e
    ``can_execute=False``. ``never_merge``/``can_publish`` continuam
    propriedades calculadas de ``WorkerRecord`` (sempre ``True``/
    ``False``, nunca campos graváveis)."""
    registros: list[WorkerRecord] = []
    for worker_id in BRIDGE_WORKER_IDS:
        elegivel = e_worker_elegivel(worker_id, modo=modo)
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
    # Correção B3 (PR #129): quem foi HABILITADO nesta execução (OFFLINE ->
    # AVAILABLE por CAS, só no modo ``active-supervised``) e quem ficou
    # como estava porque a leitura fresca não permitia a transição.
    habilitados: tuple[str, ...] = ()
    nao_habilitados: tuple[str, ...] = ()

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "criados": list(self.criados),
            "ja_existentes": list(self.ja_existentes),
            "habilitados": list(self.habilitados),
            "nao_habilitados": list(self.nao_habilitados),
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

    if config.is_pilot and not e_worker_elegivel(config.pilot_worker_id or "", modo=config.mode):
        return BridgeBootstrapResult(
            "BLOCKED",
            (
                f"modo piloto configurado para {config.pilot_worker_id!r}, que não é o worker "
                f"elegível do piloto ({list(ELIGIBLE_WORKER_IDS_PILOT)}) — configuração "
                "inconsistente, nada é registrado (fail-closed)."
            ),
        )

    elegiveis = ids_elegiveis(config.mode)

    criados: list[str] = []
    ja_existentes: list[str] = []
    for registro in registros_do_bridge(modo=config.mode):
        if registry.criar_se_ausente_condicional(
            registro, message=f"worker-bridge: prepara worker {registro.worker_id} (Issue #128 §1)"
        ):
            criados.append(registro.worker_id)
        else:
            ja_existentes.append(registro.worker_id)

    # Correção B3 (PR #129): o caminho de ativação pós-piloto. Um worker
    # que JÁ existe é preservado por ``criar_se_ausente_condicional``, o
    # que é correto — mas era também o que tornava a promessa "depois basta
    # mudar o modo" falsa: claude-worker-1..3, criados OFFLINE durante o
    # piloto, continuariam OFFLINE para sempre. Aqui eles sobem, e só
    # aqui: exige modo ``active-supervised`` (portão já validado acima),
    # id na lista FIXA de elegíveis daquele modo, e um CAS que só aceita
    # ``api_runner`` + OFFLINE + ``can_execute=False`` + sem tarefa. Nada
    # disso inventa disponibilidade: o modo é uma decisão de José numa
    # Variable, tomada depois do piloto.
    habilitados: list[str] = []
    nao_habilitados: list[str] = []
    for worker_id in ja_existentes:
        if worker_id not in elegiveis:
            continue
        if registry.habilitar_worker_programatico_condicional(
            worker_id,
            message=(
                f"worker-bridge: habilita {worker_id} no modo {config.mode} "
                "(Issue #128 §1 · correção B3 do PR #129)"
            ),
        ):
            habilitados.append(worker_id)
        else:
            nao_habilitados.append(worker_id)

    return BridgeBootstrapResult(
        "PREPARED",
        (
            f"workers programáticos prontos: criados={criados or '-'}, já existentes "
            f"(preservados exatamente como estavam)={ja_existentes or '-'}, habilitados agora "
            f"(OFFLINE -> AVAILABLE por CAS)={habilitados or '-'}, elegíveis que continuaram como "
            f"estavam (em execução, ou já AVAILABLE)={nao_habilitados or '-'}. Elegíveis no modo "
            f"{config.mode!r}: {list(elegiveis)}; os demais ficam OFFLINE/can_execute=False."
        ),
        criados=tuple(criados),
        ja_existentes=tuple(ja_existentes),
        habilitados=tuple(habilitados),
        nao_habilitados=tuple(nao_habilitados),
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
