"""CLI do Repasso Coordinator V2 — modo OBSERVE.

Dois jeitos de dar o evento:

1. formato interno (testes/uso manual):

    python3 -m coordinator --event evento.json \\
        --dedup-store /tmp/coordinator-seen.json \\
        --usage-ledger /tmp/coordinator-usage.json \\
        --workers workers.json \\
        --out /tmp/coordinator-observe.json

   ``evento.json`` é um JSON com os mesmos campos de ``events.Event``:
   ``{"raw_type": "...", "source": "...", "repo": "...", "identity": "...",
   "payload": {...}}``.

2. payload real do GitHub Actions (uso no workflow — bloqueador 1 da
   auditoria do PR #97), passando o arquivo de
   ``$GITHUB_EVENT_PATH`` e o nome do evento:

    python3 -m coordinator --github-event-name workflow_run \\
        --event "$GITHUB_EVENT_PATH" --repo "$GITHUB_REPOSITORY" \\
        --dedup-git-remote "$(git remote get-url origin)" \\
        --usage-git-remote "$(git remote get-url origin)" \\
        --workers-from-tasks-json coordination/tasks.json \\
        --pr-info-file /tmp/pr-info.json \\
        --guard-audit-pack /tmp/guard-audit-pack/guard-audit-pack.json \\
        --pr-diff-file /tmp/pr-diff.patch \\
        --out /tmp/coordinator-observe.json

   ``--pr-info-file``/``--guard-audit-pack``/``--pr-diff-file`` são
   opcionais e vêm de passos do workflow que leem a PR, o diff real e
   baixam o artifact do Guard (bloqueadores 1 e 5 da 3ª auditoria, e B2 da
   auditoria independente do PR #104) — nunca de código do HEAD do PR.

Persistência entre execuções independentes (bloqueador 2): ``--dedup-store``/
``--usage-ledger`` continuam sendo arquivo local (default, preserva o
comportamento já testado); ``--dedup-git-remote``/``--usage-git-remote``
trocam para o backend compartilhado via git (``coordinator/git_state.py``)
— use estes no workflow real, onde cada execução é um runner efêmero
diferente.

Este CLI só faz chamada de rede à Anthropic se TUDO isto for verdade ao
mesmo tempo: ``REPASSO_COORDINATOR_ENABLED=true``, ``REPASSO_COORDINATOR_MODE=observe``,
e o evento passar por todos os gates do pipeline — ver
``coordinator/config.py`` e ``coordinator/anthropic_client.py``. O
Transport real (``coordinator/anthropic_transport.py``) é usado por
padrão, mas fica inerte até o portão abrir.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from .budget import UsageLedger
from .config import Config
from .dedup import Deduplicator, FileStore
from .events import Event
from .git_state import GitDedupStore, GitJsonStore, GitUsageLedger
from .github_event import build_event_from_github_context
from .observe import observe
from .redact import redact, redact_mapping
from .worker_ops import DEFAULT_STATE_BRANCH, LocalJsonWorkerStateStore, OperationalWorkerRegistry
from .worker_registry import Worker, WorkerState, load_workers_from_tasks_json


def _load_event(path: str) -> Event:
    with open(path, encoding="utf-8") as fh:
        dados = json.load(fh)
    return Event(
        raw_type=dados["raw_type"],
        source=dados.get("source", "fixture"),
        repo=dados.get("repo", ""),
        identity=dados.get("identity", ""),
        payload=dados.get("payload", {}),
    )


def _load_json_if_exists(path: str | None) -> dict | None:
    if not path or not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _load_text_if_exists(path: str | None) -> str | None:
    if not path or not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def _load_github_event(path: str, event_name: str, repo: str, *,
                        pr_info_file: str | None = None,
                        guard_audit_pack: str | None = None,
                        pr_diff_file: str | None = None) -> Event | None:
    with open(path, encoding="utf-8") as fh:
        payload = json.load(fh)
    pr_info = _load_json_if_exists(pr_info_file)
    audit_pack = _load_json_if_exists(guard_audit_pack)
    # B2 da auditoria independente do PR #104: diff real da PR, texto puro
    # (não JSON) — buscado por um passo do workflow via API somente-leitura
    # da branch confiável, nunca do HEAD do PR (ver o comentário em
    # github_event.py). Nunca executado; só atravessa como string até o
    # prompt da auditoria.
    pr_diff = _load_text_if_exists(pr_diff_file)
    return build_event_from_github_context(event_name, payload, repo,
                                            pr_info=pr_info, audit_pack=audit_pack, pr_diff=pr_diff)


def _load_workers(path: str | None) -> list[Worker]:
    if not path or not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as fh:
        dados = json.load(fh)
    out = []
    for w in dados.get("workers", []):
        out.append(
            Worker(
                name=w["name"],
                state=WorkerState(w["state"]),
                specialization=tuple(w.get("specialization", [])),
            )
        )
    return out


def _resultado_de_erro(exc: BaseException) -> dict:
    """Resultado mínimo, SEMPRE sanitizado, para quando o pipeline crasha
    antes de ``observe()`` devolver um ``ObserveResult`` normal — item 2
    do "PACOTE CONSOLIDADO" (PR #97).

    Achado original: ``main()`` não tinha nenhum ``try/except`` em volta
    da execução real; uma exceção não tratada (ex.: ``GitJsonStore``
    esgotando tentativas de publicar o estado — RuntimeError já visto de
    verdade neste projeto) derrubava o processo ANTES das linhas que
    escrevem ``--out``. O workflow ficava vermelho corretamente (código
    de saída != 0), mas sem nenhum arquivo em ``--out``, e
    ``actions/upload-artifact@v4`` usa ``if-no-files-found: ignore`` — ou
    seja, o job falhava sem publicar nenhum artifact estruturado, só o
    traceback bruto no log (que expira e nunca foi sanitizado por
    ``redact()``).

    O mesmo formato de chave de ``ObserveResult.to_dict()`` — para que
    quem já lê ``coordinator-observe.json`` não precise de um segundo
    formato só para o caminho de erro. ``status="ERROR"`` é um valor
    novo, fora dos que ``observe()`` produz (REJECTED/DUPLICATE/BLOCKED/
    OBSERVED) — deixa explícito que isto é uma falha do próprio
    Coordinator, não uma decisão normal do pipeline."""
    return {
        "status": "ERROR",
        "reason": redact(f"{type(exc).__name__}: {exc}"),
        "task_type": None,
        "priority": None,
        "worker_suggestion": None,
        "model_suggestion": None,
        "next_action": "Erro interno do Coordinator antes de decidir o evento — ver o log do job. Nenhuma chamada à Anthropic foi tentada por este caminho.",
        "needs_input": False,
        "requires_jose_authorization": False,
        "context_summary": None,
        "call_attempted": False,
        "call_status": None,
        "response_text": None,
        "usage": None,
        "audit_decision": None,
        "merge_card": None,
        "should_comment": False,
        "comment_target_issue": None,
    }


def _gravar_out(caminho: str, dados: dict) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(caminho)) or ".", exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        json.dump(dados, fh, ensure_ascii=False, indent=2)


def _gravar_comment_out(caminho: str, dados: dict) -> None:
    """V3 (Issue #99): só grava quando o pipeline sinalizou
    ``should_comment`` E de fato produziu um Cartão de Merge E sabe o
    destino explícito (``comment_target_issue`` — correção B4 da
    auditoria independente do PR #104, rodada 4: sem destino conhecido,
    nunca grava o texto, para que o workflow nunca tenha que adivinhar
    onde postar). Nunca grava um arquivo vazio/parcial. O CLI nunca fala
    com a API do GitHub; só deixa o texto pronto para o passo do workflow
    (que já tem o token) publicar."""
    if not dados.get("should_comment") or not dados.get("merge_card"):
        return
    if dados.get("comment_target_issue") is None:
        return
    os.makedirs(os.path.dirname(os.path.abspath(caminho)) or ".", exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        fh.write(dados["merge_card"])


def _gravar_comment_target_out(caminho: str, dados: dict) -> None:
    """Grava só o número da issue/PR de destino — arquivo próprio e
    minúsculo, para o workflow ler sem precisar reabrir/parsear o JSON
    completo de ``--out``. Mesma condição de ``_gravar_comment_out``: só
    escreve quando os três sinais (should_comment, merge_card,
    comment_target_issue) estão presentes juntos."""
    if not dados.get("should_comment") or not dados.get("merge_card"):
        return
    alvo = dados.get("comment_target_issue")
    if alvo is None:
        return
    os.makedirs(os.path.dirname(os.path.abspath(caminho)) or ".", exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as fh:
        fh.write(str(alvo))


def render_human(result_dict: dict) -> str:
    L = ["# Repasso Coordinator · OBSERVE", ""]
    L.append(f"**Status:** {result_dict['status']}")
    L.append(f"**Motivo:** {result_dict['reason']}")
    if result_dict.get("task_type"):
        L.append(f"**Tipo:** {result_dict['task_type']}  ·  **Prioridade:** {result_dict['priority']}")
    if result_dict.get("worker_suggestion"):
        L.append(f"**Worker sugerido:** {result_dict['worker_suggestion']}")
    if result_dict.get("model_suggestion"):
        m = result_dict["model_suggestion"]
        L.append(f"**Modelo sugerido:** {m.get('tier')} ({m.get('model_id')})")
    if result_dict.get("next_action"):
        L.append("")
        L.append(f"**Próxima ação:** {result_dict['next_action']}")
    if result_dict.get("audit_decision"):
        L.append("")
        L.append(f"**Auditoria V3 (active-supervised):** {result_dict['audit_decision']}")
        if result_dict.get("merge_card"):
            L.append("")
            L.append(result_dict["merge_card"])

    # Bloqueador 8 da 3ª auditoria do PR #97: este texto tem que dizer a
    # VERDADE sobre se uma chamada foi tentada — nunca afirmar "nenhuma
    # chamada externa" quando call_attempted=True. Todo o dicionário aqui
    # já passou por redact_mapping() antes de chegar em render_human(),
    # então response_text/usage são seguros para aparecer.
    L.append("")
    if result_dict.get("call_attempted"):
        L.append(f"**Chamada à Anthropic:** SIM — status da chamada: `{result_dict.get('call_status')}`.")
        usage = result_dict.get("usage")
        if usage:
            L.append(
                f"**Uso:** {usage.get('input_tokens')} tokens de entrada + "
                f"{usage.get('output_tokens')} de saída  ·  "
                f"**custo estimado:** US$ {usage.get('estimated_cost_usd')}."
            )
        if result_dict.get("response_text"):
            L.append(f"**Resposta (sanitizada):** {result_dict['response_text']}")
    else:
        L.append("**Chamada à Anthropic:** NÃO — nenhuma chamada externa foi tentada nesta execução.")

    L.append("")
    L.append(
        "O Coordinator nunca decide sozinho correção científica, nunca edita "
        "matéria/Supabase/produção e nunca faz merge."
    )
    return "\n".join(L)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="repasso-coordinator", description="Coordinator V2 — modo OBSERVE.")
    ap.add_argument("--event", required=True,
                    help="arquivo JSON do evento (formato interno, ou o payload cru do "
                         "GitHub quando --github-event-name é usado)")
    ap.add_argument("--github-event-name", default=None,
                    help="nome do evento do GitHub Actions (issue_comment, workflow_run — "
                         "'pull_request' foi removido na 3ª auditoria do PR #97 por segurança: "
                         "não pode segurar segredo num evento que roda código do HEAD de um PR) "
                         "— quando presente, --event é lido como o payload cru de "
                         "$GITHUB_EVENT_PATH, não o formato interno")
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", ""),
                    help="owner/repo — só usado junto com --github-event-name")
    ap.add_argument("--dedup-store", default=None,
                    help="arquivo LOCAL para persistir eventos já vistos (não sobrevive entre "
                         "runners efêmeros — prefira --dedup-git-remote no workflow real)")
    ap.add_argument("--dedup-git-remote", default=None,
                    help="remoto git para dedup compartilhado entre execuções independentes "
                         "(bloqueador 2 — ver coordinator/git_state.py)")
    ap.add_argument("--dedup-git-branch", default="coordinator-state-dedup",
                    help="branch dedicada para o estado de dedup (nunca 'main')")
    ap.add_argument("--usage-ledger", default=".coordinator-state/usage.json",
                    help="arquivo LOCAL de uso/custo (não sobrevive entre runners efêmeros — "
                         "prefira --usage-git-remote no workflow real)")
    ap.add_argument("--usage-git-remote", default=None,
                    help="remoto git para o ledger de uso/custo compartilhado entre execuções")
    ap.add_argument("--usage-git-branch", default="coordinator-state-usage",
                    help="branch dedicada para o ledger de uso (nunca 'main')")
    ap.add_argument("--workers", default=None, help="arquivo JSON com o registro de workers (#82) — formato fixture")
    ap.add_argument("--workers-from-tasks-json", default=None,
                    help="deriva o registro REAL de workers a partir de coordination/tasks.json "
                         "(bloqueador 4 da 3ª auditoria) — usar no workflow real; tem precedência "
                         "sobre --workers quando os dois são passados")
    ap.add_argument("--pr-info-file", default=None,
                    help="JSON com number/title/body/labels/updated_at da PR associada ao "
                         "workflow_run observado, lido por um passo do workflow via API "
                         "somente-leitura (bloqueador 1 da 3ª auditoria) — nunca do HEAD do PR")
    ap.add_argument("--guard-audit-pack", default=None,
                    help="caminho do audit-pack real do Guard (baixado do artifact do run "
                         "observado — bloqueador 5 da 3ª auditoria); mesmo schema que "
                         "tools/qa/guard/__main__.py grava")
    ap.add_argument("--pr-diff-file", default=None,
                    help="V3 (correção B2 da auditoria independente do PR #104): arquivo de TEXTO "
                         "(não JSON) com o diff/patch real da PR, buscado por um passo do workflow "
                         "via API somente-leitura da branch confiável — nunca do HEAD do PR. É a "
                         "evidência principal da auditoria semântica; sem ele, MERGE-READY é "
                         "bloqueado deterministicamente (ver coordinator/merge_card.py::"
                         "aplicar_gate_diff)")
    ap.add_argument("--worker-state-store", default=None,
                    help="arquivo LOCAL para o Worker Registry OPERACIONAL (rodada 3, Issue #99, "
                         "achado B3) — separado de coordination/tasks.json; não sobrevive entre "
                         "runners efêmeros (prefira --worker-state-git-remote no workflow real)")
    ap.add_argument("--worker-state-git-remote", default=None,
                    help="remoto git para o Worker Registry operacional compartilhado entre "
                         "execuções independentes — mesmo padrão de --dedup-git-remote/"
                         "--usage-git-remote")
    ap.add_argument("--worker-state-git-branch", default=DEFAULT_STATE_BRANCH,
                    help="branch dedicada para o Worker Registry operacional (nunca 'main')")
    ap.add_argument("--out", default=None, help="onde gravar o resultado OBSERVE em JSON")
    ap.add_argument("--comment-out", default=None,
                    help="V3 (Issue #99): quando o Coordinator roda em MODE=active-supervised e a "
                         "auditoria semântica produziu um Cartão de Merge (ObserveResult.merge_card), "
                         "grava o texto aqui para um passo do workflow publicar como comentário no "
                         "PR/Issue via github-script — o CLI nunca chama a API do GitHub sozinho. "
                         "Não grava nada quando não há merge_card (ex.: modo observe, ou evento que "
                         "não passou pela auditoria)")
    ap.add_argument("--comment-target-out", default=None,
                    help="V3 (correção B4 da auditoria independente do PR #104, rodada 4): grava só o "
                         "número da issue/PR de destino do comentário (ObserveResult."
                         "comment_target_issue) — nunca escrito junto com --comment-out se o destino "
                         "for desconhecido. O workflow lê este arquivo em vez de inferir o destino "
                         "sozinho (ex.: um POOL-PAUSADO sempre vai para a Inbox #88, mesmo quando o "
                         "checkpoint que o disparou chegou em outra issue)")
    a = ap.parse_args(argv)

    # Item 2 do "PACOTE CONSOLIDADO" (PR #97): tudo que pode lançar —
    # carregar evento/config, montar dedup/ledger/workers, chamar
    # observe() — fica dentro deste try. Antes, uma exceção não tratada
    # (ex.: GitJsonStore esgotando tentativas de publicar o estado)
    # derrubava o processo ANTES de qualquer coisa ser escrita em --out,
    # e actions/upload-artifact@v4 (if-no-files-found: ignore) publicava
    # nada — o job ficava vermelho (correto), mas sem nenhum artifact
    # estruturado. Agora, qualquer exceção vira um resultado ERROR
    # sanitizado, gravado em --out exatamente como um resultado normal
    # seria, e SÓ DEPOIS o processo sai com código != 0.
    try:
        dados_sanitizados = _observar(a)
    except SystemExit:
        raise
    except BaseException as exc:  # noqa: BLE001 — ponto de borda deliberado: qualquer
        # falha vira artifact sanitizado antes do processo sair, nunca um crash mudo.
        dados_sanitizados = _resultado_de_erro(exc)
        print(render_human(dados_sanitizados))
        if a.out:
            _gravar_out(a.out, dados_sanitizados)
        if a.comment_out:
            _gravar_comment_out(a.comment_out, dados_sanitizados)
        if a.comment_target_out:
            _gravar_comment_target_out(a.comment_target_out, dados_sanitizados)
        return 1

    if dados_sanitizados is None:
        # _observar() já imprimiu a mensagem "nada a fazer" e não tem
        # ObserveResult nenhum para gravar (evento do GitHub fora da
        # lista reconhecida) — comportamento inalterado desta rodada.
        return 0

    print(render_human(dados_sanitizados))
    if a.out:
        _gravar_out(a.out, dados_sanitizados)
    if a.comment_out:
        _gravar_comment_out(a.comment_out, dados_sanitizados)
    if a.comment_target_out:
        _gravar_comment_target_out(a.comment_target_out, dados_sanitizados)

    # Auditoria final do PR #97: uma chamada à Anthropic bem-sucedida cujo
    # ledger de uso/custo falhou DEPOIS é um problema operacional real —
    # perde persistência compartilhada de custo entre execuções, mesma
    # classe de risco que uma exceção não tratada (bloqueador 7: erro >
    # job vermelho). observe() já devolveu um ObserveResult honesto
    # (call_attempted=True, usage preservado, nada de exceção) em vez de
    # deixar isto virar um crash mudo — mas o sinal externo (workflow
    # vermelho) continua merecido, então checa aqui, sem reabrir a
    # arquitetura de ObserveResult/render_human.
    if dados_sanitizados.get("call_status") == "ok_ledger_failed":
        return 1
    return 0


def _observar(a: argparse.Namespace) -> dict | None:
    """A execução real de ponta a ponta — extraída de ``main()`` para que
    o ``try/except`` do item 2 cubra exatamente isto, sem duplicar a
    lógica de parsing de argumentos. Devolve ``None`` só no caso "evento
    do GitHub não reconhecido" (não é erro, não tem ObserveResult)."""
    config = Config.from_env()

    if a.github_event_name:
        event = _load_github_event(a.event, a.github_event_name, a.repo,
                                    pr_info_file=a.pr_info_file,
                                    guard_audit_pack=a.guard_audit_pack,
                                    pr_diff_file=a.pr_diff_file)
        if event is None:
            print(
                f"# Repasso Coordinator · OBSERVE\n\n"
                f"Evento do GitHub ({a.github_event_name!r}) não corresponde a nenhum tipo "
                "que esta V2 reconhece — nada a fazer. Isto NÃO é um erro."
            )
            return None
    else:
        event = _load_event(a.event)

    if a.dedup_git_remote:
        dedup = Deduplicator(GitDedupStore(GitJsonStore(a.dedup_git_remote, branch=a.dedup_git_branch)))
    else:
        dedup = Deduplicator(FileStore(a.dedup_store) if a.dedup_store else None)

    if a.usage_git_remote:
        ledger = GitUsageLedger(GitJsonStore(a.usage_git_remote, branch=a.usage_git_branch))
    else:
        ledger = UsageLedger(a.usage_ledger)

    if a.workers_from_tasks_json:
        workers = load_workers_from_tasks_json(a.workers_from_tasks_json)
    else:
        workers = _load_workers(a.workers)

    if a.worker_state_git_remote:
        worker_registry = OperationalWorkerRegistry(
            GitJsonStore(a.worker_state_git_remote, branch=a.worker_state_git_branch, file_name="workers.json")
        )
    else:
        worker_registry = OperationalWorkerRegistry(LocalJsonWorkerStateStore(a.worker_state_store))

    resultado = observe(
        event, config=config, dedup=dedup, ledger=ledger, workers=workers,
        audit_mode=config.is_active_supervised, worker_registry=worker_registry,
    )
    dados = resultado.to_dict()
    return redact_mapping(dados)


if __name__ == "__main__":
    sys.exit(main())
