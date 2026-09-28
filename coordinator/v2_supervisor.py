"""Coordinator V2: OpenAI coordena, Claude executa, José mergeia.

Um ciclo = 1 decisão OpenAI + no máximo 1 execução Claude.
Pendência local é registrada e o projeto continua. Guard/auditoria pesada só no final.
Nenhuma função deste módulo faz merge ou deploy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from . import bridge_pr, bridge_workers, openai_client
from .classify import Priority
from .git_state import GitJsonStore, GitUsageLedger
from .openai_budget import OpenAICallLimiter, TIER_NORMAL
from .openai_config import OpenAIAuditorConfig
from .openai_transport import OpenAIResponsesTransport
from .runner_contract import RunnerTask
from .runner_dispatch import executar_tarefa
from .worker_bridge import (
    WorkerBridgeConfig,
    _closure_de_geracao,
    construir_config_do_runner,
    liberar_worker_apos_resultado,
)
from .worker_ops import DEFAULT_STATE_BRANCH as WORKER_STATE_BRANCH
from .worker_ops import OperationalWorkerRegistry

V2_STATE_BRANCH = "coordinator-state-v2"
RUNTIME_STATE_BRANCH = "coordinator-state-task-runtime"
OPENAI_USAGE_BRANCH = "coordinator-state-usage-openai"
MAX_PROMPT = 7600
MAX_PACK = 14000
MAX_HISTORY = 30
MAX_PENDING = 80
MAX_FAILURES_BEFORE_DEFER = 2
COORD_MARKER = "<!-- repasso-coordinator -->"


@dataclass(frozen=True)
class Decision:
    action: str
    focus: tuple[str, ...] = ()
    worker: str | None = None
    instruction: str = ""
    reason: str = ""
    pending: tuple[str, ...] = ()


@dataclass(frozen=True)
class Outcome:
    action: str
    reason: str
    project_id: str | None = None
    worker_id: str | None = None
    checkpoint: str | None = None
    pr_number: int | None = None
    continue_requested: bool = False

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "project_id": self.project_id,
            "worker_id": self.worker_id,
            "checkpoint": self.checkpoint,
            "pr_number": self.pr_number,
            "continue_requested": self.continue_requested,
        }


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clip(value: object, limit: int) -> str:
    text = str(value or "").strip()
    return text if len(text) <= limit else text[:limit] + "\n[…cortado…]"


def load_tasks(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as fh:
        return list((json.load(fh) or {}).get("tarefas") or [])


def runtime_map(remote: str) -> dict[str, dict]:
    data = GitJsonStore(remote, branch=RUNTIME_STATE_BRANCH).read()
    return {
        str(x.get("canonical_task_id")): x
        for x in (data.get("tasks") or [])
        if x.get("canonical_task_id")
    }


def v2_store(remote: str) -> GitJsonStore:
    return GitJsonStore(remote, branch=V2_STATE_BRANCH)


def read_v2(remote: str) -> dict:
    data = v2_store(remote).read()
    return data if isinstance(data, dict) else {}


def write_project(remote: str, pid: str, patch: dict) -> None:
    def mutate(data: dict) -> dict:
        projects = dict(data.get("projects") or {})
        cur = dict(projects.get(pid) or {})
        merged = {**cur, **patch, "updated_at": now()}
        merged["history"] = list(merged.get("history") or [])[-MAX_HISTORY:]
        merged["pending"] = list(dict.fromkeys(
            str(x) for x in (merged.get("pending") or []) if str(x).strip()
        ))[-MAX_PENDING:]
        projects[pid] = merged
        return {**data, "version": 2, "projects": projects}
    v2_store(remote).update(mutate, message=f"coordinator-v2: {pid}")


def groups(tasks: list[dict]) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {}
    parents = {str(t.get("parent_task_id")) for t in tasks if t.get("parent_task_id")}
    for task in tasks:
        tid = str(task.get("id") or "")
        if not tid:
            continue
        if tid in parents:
            result.setdefault(tid, [])
            continue
        pid = str(task.get("parent_task_id") or tid)
        result.setdefault(pid, []).append(task)
    return result


def parent_for(pid: str, tasks: list[dict]) -> dict | None:
    return next((t for t in tasks if str(t.get("id") or "") == pid), None)


def latest_runtime(children: list[dict], runtime: dict[str, dict]) -> dict | None:
    rows = [runtime.get(str(t.get("id"))) for t in children]
    rows = [x for x in rows if x]
    return sorted(rows, key=lambda x: str(x.get("updated_at") or ""))[-1] if rows else None


def priority(parent: dict | None, focus: list[dict]) -> Priority:
    raw = str((parent or {}).get("prioridade_declarada") or "").upper()
    if not raw and focus:
        raw = str(focus[0].get("prioridade_declarada") or "").upper()
    return next((p for p in Priority if p.value == raw), Priority.P1)


def choose_project(tasks: list[dict], runtime: dict[str, dict], state: dict, requested: str | None) -> tuple[str, list[dict]]:
    gs = groups(tasks)
    if requested:
        if requested not in gs:
            raise ValueError(f"projeto {requested!r} não encontrado")
        return requested, gs[requested]

    active = [
        (pid, rec) for pid, rec in (state.get("projects") or {}).items()
        if pid in gs and rec.get("status") not in ("READY_FOR_JOSE", "DONE")
    ]
    if active:
        active.sort(key=lambda x: str(x[1].get("updated_at") or ""), reverse=True)
        return active[0][0], gs[active[0][0]]

    ranked = []
    for pid, children in gs.items():
        if not children:
            continue
        rt = latest_runtime(children, runtime)
        ranked.append(((1 if rt and rt.get("checkpoint_commit") else 0, str((rt or {}).get("updated_at") or "")), pid))
    if not ranked:
        raise ValueError("nenhum projeto executável")
    ranked.sort(reverse=True)
    pid = ranked[0][1]
    return pid, gs[pid]


def initial_completed(children: list[dict], runtime: dict[str, dict], state: dict) -> set[str]:
    done = set(str(x) for x in (state.get("completed_task_ids") or []))
    for task in children:
        tid = str(task.get("id") or "")
        row = runtime.get(tid) or {}
        if row.get("checkpoint_commit") or row.get("status") == "DONE":
            done.add(tid)
    return done


def branch_for(children: list[dict], state: dict) -> str:
    if state.get("branch"):
        return str(state["branch"])
    branches = [str(t.get("branch")) for t in children if t.get("branch")]
    if not branches:
        raise ValueError("projeto sem branch de trabalho")
    return branches[0]


def checkpoint_for(children: list[dict], runtime: dict[str, dict], state: dict) -> str | None:
    cp = str(state.get("checkpoint") or "")
    if re.fullmatch(r"[0-9a-f]{40}", cp):
        return cp
    row = latest_runtime(children, runtime) or {}
    cp = str(row.get("checkpoint_commit") or "")
    return cp if re.fullmatch(r"[0-9a-f]{40}", cp) else None


def available_workers(registry: OperationalWorkerRegistry) -> list[str]:
    return [
        w.worker_id
        for w in bridge_workers.workers_programaticos(registry.list_workers())
        if w.status == "AVAILABLE" and w.can_execute and w.current_task is None
    ]


def github_api(repo_full: str) -> bridge_pr.GitHubRestApi:
    owner, name = repo_full.split("/", 1)
    return bridge_pr.GitHubRestApi(owner=owner, repo=name)


def pr_snapshot(api: bridge_pr.GitHubRestApi, branch: str) -> tuple[int | None, str, list[dict]]:
    prs = api.prs_abertas_por_head(branch)
    if not prs:
        return None, "", []
    pr = prs[0]
    number = int(pr.get("number") or 0) or None
    comments = api.comentarios_da_pr(number) if number else []
    return number, str(pr.get("body") or ""), comments


def trusted_card(comments: list[dict], checkpoint: str | None) -> str | None:
    if not checkpoint:
        return None
    for c in reversed(comments):
        body = str(c.get("body") or "")
        login = str((c.get("user") or {}).get("login") or "")
        if login == "github-actions[bot]" and COORD_MARKER in body and checkpoint in body:
            return body
    return None


def build_prompt(pid: str, parent: dict | None, children: list[dict], runtime: dict[str, dict],
                 state: dict, completed: set[str], workers: list[str],
                 pr_body: str, comments: list[dict], checkpoint: str | None) -> str:
    rows = []
    for t in children:
        tid = str(t.get("id") or "")
        rt = runtime.get(tid) or {}
        rows.append(
            f"- {tid} | {'FEITA/DEFERIDA' if tid in completed else 'PENDENTE'} | "
            f"{clip(t.get('titulo'), 100)} | {clip(t.get('objetivo'), 360)} | runtime={rt.get('status') or '-'}"
        )
    last_comments = "\n".join(clip(c.get("body"), 700) for c in comments[-3:])
    prompt = f"""PROJETO: {pid}
TÍTULO: {clip((parent or {}).get('titulo'), 180)}
OBJETIVO: {clip((parent or {}).get('objetivo'), 650)}
HEAD: {checkpoint or 'sem checkpoint'}
WORKERS DISPONÍVEIS: {workers}
PROGRESSO: {len(completed)}/{len(children)}
PENDÊNCIAS: {json.dumps(state.get('pending') or [], ensure_ascii=False)}

UNIDADES:
{chr(10).join(rows)}

ÚLTIMOS COMENTÁRIOS DA PR:
{last_comments or '(nenhum)'}

CORPO DA PR (resumo):
{clip(pr_body, 900)}

REGRAS:
- Coordene como o humano fazia: mande Claude executar/corrigir e continue.
- Pendência localizada NÃO para o projeto: registre e avance.
- Enquanto existir unidade PENDENTE, trabalhe nela; não volte para perseguir perfeição antiga.
- Fonte/imagem não confirmável: deferir/reclassificar com segurança e seguir.
- FINAL_AUDIT só depois de percorrer todas as unidades.
- READY_FOR_JOSE só com auditoria final MERGE-READY do HEAD atual.
- WAIT apenas para blocker global real.
- Nunca autorize merge/deploy.
Responda SOMENTE JSON:
{{"action":"WORK|FINAL_AUDIT|READY_FOR_JOSE|WAIT","focus_task_ids":[],"worker_preference":null,
"instruction":"...","reason":"...","pending":[]}}
"""
    return clip(prompt, MAX_PROMPT)


def parse_json(text: str) -> dict | None:
    raw = (text or "").strip()
    for candidate in (raw, raw[raw.find("{"):raw.rfind("}")+1] if "{" in raw and "}" in raw else ""):
        if not candidate:
            continue
        try:
            obj = json.loads(candidate)
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            pass
    return None


def call_supervisor(prompt: str, remote: str, event_key: str) -> Decision | None:
    cfg = OpenAIAuditorConfig.from_env()
    limiter = OpenAICallLimiter()
    req = openai_client.build_request(
        model_id=cfg.model,
        tier=TIER_NORMAL,
        system=(
            "Você é o Coordenador V2 do Repasso Med. Você coordena; Claude executa. "
            "Maximize continuidade e custo-benefício. Pendência local vira pendência, não bloqueio. "
            "Nunca autorize merge ou deploy."
        ),
        prompt=prompt,
        limiter=limiter,
    )
    result = openai_client.call(
        cfg, req,
        transport=OpenAIResponsesTransport(),
        limiter=limiter,
        ledger=GitUsageLedger(GitJsonStore(remote, branch=OPENAI_USAGE_BRANCH)),
        event_key=event_key,
    )
    if result.status not in ("ok", "ok_ledger_failed"):
        return None
    obj = parse_json(result.text)
    if not obj:
        return None
    action = str(obj.get("action") or "").upper().strip()
    if action not in ("WORK", "FINAL_AUDIT", "READY_FOR_JOSE", "WAIT"):
        return None
    return Decision(
        action=action,
        focus=tuple(str(x) for x in (obj.get("focus_task_ids") or []) if str(x).strip()),
        worker=(str(obj.get("worker_preference")).strip() if obj.get("worker_preference") else None),
        instruction=clip(obj.get("instruction"), 4500),
        reason=clip(obj.get("reason"), 700),
        pending=tuple(clip(x, 400) for x in (obj.get("pending") or []) if str(x).strip()),
    )


def fallback(children: list[dict], completed: set[str], card: str | None, workers: list[str]) -> Decision:
    remaining = [t for t in children if str(t.get("id")) not in completed]
    if remaining:
        t = remaining[0]
        return Decision(
            "WORK", (str(t.get("id")),), workers[0] if workers else None,
            str(t.get("objetivo") or ""), "fallback: próxima unidade pendente",
        )
    if card and "MERGE-READY" in card and "NEEDS-FIX" not in card:
        return Decision("READY_FOR_JOSE", reason="auditoria final MERGE-READY")
    if card and "NEEDS-FIX" in card:
        last = children[-1] if children else {}
        return Decision(
            "WORK", ((str(last.get("id")),) if last.get("id") else ()),
            workers[0] if workers else None,
            "Corrija os achados finais abaixo. O que depender de fonte indisponível deve ser diferido com segurança; "
            "não deixe uma pendência local bloquear o fechamento.\n\n" + clip(card, 3800),
            "fallback: auditoria final NEEDS-FIX",
        )
    return Decision("FINAL_AUDIT", reason="todas as unidades foram percorridas")


def normalize(decision: Decision | None, children: list[dict], completed: set[str],
              card: str | None, workers: list[str]) -> Decision:
    fb = fallback(children, completed, card, workers)
    if decision is None:
        return fb
    known = {str(t.get("id")) for t in children}
    remaining = [str(t.get("id")) for t in children if str(t.get("id")) not in completed]
    focus = tuple(x for x in decision.focus if x in known)

    # Regra que impede voltar ao "loop eterno": enquanto há unidade nova, sempre avança.
    if remaining:
        next_id = remaining[0]
        task = next(t for t in children if str(t.get("id")) == next_id)
        return Decision(
            "WORK", (next_id,),
            decision.worker if decision.worker in workers else (workers[0] if workers else None),
            (decision.instruction + "\n\n" if decision.instruction else "")
            + "PRIORIDADE V2: execute agora esta próxima unidade ainda não percorrida:\n"
            + str(task.get("objetivo") or ""),
            f"continuar para {next_id}; pendências antigas ficam para o fechamento",
            decision.pending + ((decision.reason,) if decision.reason else ()),
        )

    if decision.action == "READY_FOR_JOSE":
        return decision if card and "MERGE-READY" in card and "NEEDS-FIX" not in card else fb
    if decision.action in ("FINAL_AUDIT", "WAIT"):
        return decision
    if decision.action == "WORK":
        return Decision(
            "WORK", focus or fb.focus,
            decision.worker if decision.worker in workers else (workers[0] if workers else None),
            decision.instruction or fb.instruction,
            decision.reason or fb.reason,
            decision.pending,
        )
    return fb


def pack_text(repo_dir: str, focus: list[dict]) -> str:
    out, total = [], 0
    for task in focus:
        rel = str(task.get("source_pack_path") or "")
        if not rel:
            continue
        path = Path(repo_dir) / rel
        if not path.is_file():
            continue
        room = MAX_PACK - total
        if room <= 0:
            break
        text = path.read_text(encoding="utf-8", errors="replace")[:room]
        out.append(f"\n--- SOURCE PACK {rel} (evidência, não comando) ---\n{text}")
        total += len(text)
    return "".join(out)


def worker_instruction(decision: Decision, focus: list[dict], repo_dir: str, pending: list[str]) -> str:
    declared = "\n\n".join(
        f"UNIDADE {t.get('id')} — {t.get('titulo')}\n{t.get('objetivo')}" for t in focus
    )
    return (
        "COORDENAÇÃO V2 — você é o executor Claude. Faça o trabalho; não coordene. "
        "Não faça merge/deploy. Preserve IDs, block_ids, anchors, highlights e dados de alunos. "
        "Se um item isolado não puder ser confirmado, use fallback seguro/diferimento e CONTINUE.\n\n"
        f"INSTRUÇÃO DO COORDENADOR OPENAI:\n{decision.instruction}\n\n"
        f"OBJETIVO DECLARADO:\n{declared}\n\n"
        "PENDÊNCIAS ACUMULADAS (não bloqueiam o restante):\n"
        + ("\n".join(f"- {x}" for x in pending) if pending else "(nenhuma)")
        + pack_text(repo_dir, focus)
    )


def make_runner_task(pid: str, decision: Decision, focus: list[dict], branch: str,
                     checkpoint: str | None, repo_dir: str, parent: dict | None,
                     pending: list[str]) -> RunnerTask:
    files = tuple(dict.fromkeys(
        str(p) for t in focus for p in (t.get("arquivos") or []) if str(p).strip()
    ))
    if not files:
        raise ValueError("WORK sem arquivos permitidos derivados do registro")
    instructions = worker_instruction(decision, focus, repo_dir, pending)
    digest = hashlib.sha256(
        (pid + "|" + (checkpoint or "root") + "|" + ",".join(str(t.get("id")) for t in focus) + "|" + instructions).encode()
    ).hexdigest()[:12]
    risk_order = {"BAIXO": 0, "MEDIO": 1, "ALTO": 2}
    risk = max((str(t.get("risk_level") or "MEDIO").upper() for t in focus), key=lambda x: risk_order.get(x, 1))
    policy_order = {"A": 0, "B": 1, "C": 2, "D": 3}
    policy = max((str(t.get("policy_level") or "C").upper() for t in focus), key=lambda x: policy_order.get(x, 2))
    issue = next((int(t["issue"]) for t in focus if isinstance(t.get("issue"), int) and t["issue"] > 0), None)
    return RunnerTask(
        task_id=f"v2-{re.sub(r'[^A-Za-z0-9_-]+','-',pid)[:45]}-{digest}",
        priority=priority(parent, focus),
        source_issue=issue,
        branch=branch,
        allowed_files=files,
        instructions=instructions,
        checkpoint_commit=checkpoint,
        capabilities_required=("conteudo",),
        risk_level=risk,
        policy_level=policy,
        jose_authorized=all(bool(t.get("jose_authorized", True)) for t in focus),
        publication_required=True,
        question_report_required=any(bool(t.get("question_report_required")) for t in focus),
    )


def pr_body(pid: str, parent: dict | None, children: list[dict], state: dict,
            checkpoint: str | None, question_report: str | None) -> str:
    done = set(state.get("completed_task_ids") or [])
    lines = [
        "<!-- repasso-coordinator-v2 -->",
        "# Coordinator V2 — projeto contínuo",
        "",
        f"**Projeto:** {pid}",
        f"**Objetivo:** {clip((parent or {}).get('objetivo'), 1000)}",
        f"**Progresso:** {len(done)}/{len(children)} unidades percorridas",
        f"**HEAD atual:** \`{checkpoint or '—'}\`",
        "",
        "## Pendências diferidas",
    ]
    lines += [f"- {x}" for x in (state.get("pending") or [])] or ["- Nenhuma."]
    lines += ["", "## Unidades"]
    for t in children:
        tid = str(t.get("id") or "")
        lines.append(f"- [{'x' if tid in done else ' '}] {tid} — {clip(t.get('titulo'), 130)}")
    if question_report:
        lines += ["", "## Último relatório do worker", "", clip(question_report, 6500)]
    lines += [
        "",
        "**Merge/publicação/deploy: exclusivamente José.**",
        "",
        "Guard + auditoria pesada só no fechamento final. O Coordinator V2 nunca faz merge.",
    ]
    return "\n".join(lines)


def ensure_pr(api: bridge_pr.GitHubRestApi, branch: str, base: str, pid: str,
              parent: dict | None, body: str) -> int:
    prs = api.prs_abertas_por_head(branch)
    if prs:
        number = int(prs[0].get("number") or 0)
        api.atualizar_pr_corpo(number, corpo=body)
        return number
    pr = api.criar_pr(
        titulo=f"[coord-v2] {clip((parent or {}).get('titulo') or pid, 160)}",
        head=branch, base=base, corpo=body,
    )
    return int(pr["number"])


def history(state: dict, entry: dict) -> list[dict]:
    rows = list(state.get("history") or [])
    rows.append({**entry, "at": now()})
    return rows[-MAX_HISTORY:]


def run_once(tasks_json: str, repo_dir: str, remote: str, repo_full: str,
             base_branch: str, requested_project: str | None) -> Outcome:
    tasks = load_tasks(tasks_json)
    runtime = runtime_map(remote)
    whole_state = read_v2(remote)
    pid, children = choose_project(tasks, runtime, whole_state, requested_project)
    parent = parent_for(pid, tasks)
    state = dict((whole_state.get("projects") or {}).get(pid) or {})
    completed = initial_completed(children, runtime, state)
    branch = branch_for(children, state)
    checkpoint = checkpoint_for(children, runtime, state)

    registry = OperationalWorkerRegistry(GitJsonStore(remote, branch=WORKER_STATE_BRANCH))
    workers = available_workers(registry)
    api = github_api(repo_full)
    pr_number, current_body, comments = pr_snapshot(api, branch)
    card = trusted_card(comments, checkpoint)

    if card and "MERGE-READY" in card and "NEEDS-FIX" not in card and len(completed) >= len(children):
        write_project(remote, pid, {
            **state, "status": "READY_FOR_JOSE", "branch": branch, "checkpoint": checkpoint,
            "pr_number": pr_number, "completed_task_ids": sorted(completed),
            "history": history(state, {"action": "READY_FOR_JOSE", "reason": "Cartão final MERGE-READY"}),
        })
        return Outcome("READY_FOR_JOSE", "Auditoria final verde. José decide o merge.", pid, checkpoint=checkpoint, pr_number=pr_number)

    prompt = build_prompt(pid, parent, children, runtime, state, completed, workers, current_body, comments, checkpoint)
    decision = normalize(
        call_supervisor(prompt, remote, f"v2:{pid}:{checkpoint or 'root'}:{len(completed)}"),
        children, completed, card, workers,
    )
    pending = list(state.get("pending") or []) + list(decision.pending)

    if decision.action == "FINAL_AUDIT":
        if len(completed) < len(children):
            return Outcome("CONTINUE", "Ainda há unidades; continuar.", pid, checkpoint=checkpoint, pr_number=pr_number, continue_requested=True)
        body = pr_body(pid, parent, children, {**state, "completed_task_ids": sorted(completed), "pending": pending}, checkpoint, None)
        pr_number = ensure_pr(api, branch, base_branch, pid, parent, body)
        if str(state.get("guard_for_checkpoint") or "") != str(checkpoint or ""):
            guard = bridge_pr.disparar_guard(api, pr_number=pr_number, ref=base_branch)
            if guard.action != "DISPATCHED":
                return Outcome("WAIT", f"Guard final não disparado: {guard.reason}", pid, checkpoint=checkpoint, pr_number=pr_number)
        write_project(remote, pid, {
            **state, "status": "FINAL_AUDIT", "branch": branch, "checkpoint": checkpoint,
            "pr_number": pr_number, "guard_for_checkpoint": checkpoint,
            "completed_task_ids": sorted(completed), "pending": pending,
            "history": history(state, {"action": "FINAL_AUDIT", "reason": decision.reason}),
        })
        return Outcome("FINAL_AUDIT", "Auditoria final disparada.", pid, checkpoint=checkpoint, pr_number=pr_number)

    if decision.action == "READY_FOR_JOSE":
        write_project(remote, pid, {
            **state, "status": "READY_FOR_JOSE", "branch": branch, "checkpoint": checkpoint,
            "pr_number": pr_number, "completed_task_ids": sorted(completed), "pending": pending,
            "history": history(state, {"action": "READY_FOR_JOSE", "reason": decision.reason}),
        })
        return Outcome("READY_FOR_JOSE", decision.reason, pid, checkpoint=checkpoint, pr_number=pr_number)

    if decision.action == "WAIT":
        write_project(remote, pid, {
            **state, "status": "WAIT", "branch": branch, "checkpoint": checkpoint,
            "pr_number": pr_number, "completed_task_ids": sorted(completed), "pending": pending,
            "history": history(state, {"action": "WAIT", "reason": decision.reason}),
        })
        return Outcome("WAIT", decision.reason or "Blocker global.", pid, checkpoint=checkpoint, pr_number=pr_number)

    if not workers:
        return Outcome("WAIT", "Nenhum Claude Worker livre agora; o schedule tenta novamente.", pid, checkpoint=checkpoint, pr_number=pr_number)

    focus = [t for t in children if str(t.get("id")) in set(decision.focus)]
    if not focus:
        return Outcome("WAIT", "WORK sem unidade válida.", pid, checkpoint=checkpoint, pr_number=pr_number)

    worker = decision.worker if decision.worker in workers else workers[0]
    if not registry.reservar_current_task_condicional(worker, canonical_task_id=pid, message=f"v2 reserva {worker} -> {pid}"):
        return Outcome("CONTINUE", "Worker mudou de estado; escolher outro.", pid, checkpoint=checkpoint, pr_number=pr_number, continue_requested=True)

    runner_task = make_runner_task(pid, decision, focus, branch, checkpoint, repo_dir, parent, pending)
    bridge_cfg = WorkerBridgeConfig.from_env()
    runner_cfg = construir_config_do_runner(bridge_cfg, canonical_task_id=pid)
    generator = _closure_de_geracao(
        runner_task, runner_config=runner_cfg, repo_dir=repo_dir,
        state_git_remote=remote, canonical_task_id=pid, transport=None, budget_usd=None,
    )
    dispatch = executar_tarefa(
        runner_task, config=runner_cfg, repo_dir=repo_dir, state_git_remote=remote,
        validation_command_keys=(), push_remote_name="origin", sucesso_status="NEEDS-AUDIT",
        worker_id=worker, worker_registry=registry, gerar_patch=generator, canonical_task_id=pid,
    )
    result = dispatch.result
    new_checkpoint = result.checkpoint_commit if result else None
    status = result.status if result else "FAILED"
    liberar_worker_apos_resultado(
        registry, worker, canonical_task_id=pid,
        resultado_status=("NEEDS-AUDIT" if new_checkpoint else "FAILED"),
    )

    failures = dict(state.get("failures") or {})
    focus_ids = [str(t.get("id")) for t in focus]
    key = ",".join(focus_ids)
    reason = result.reason if result else "worker terminou sem RunnerResult"

    if new_checkpoint:
        checkpoint = new_checkpoint
        completed.update(focus_ids)
        failures.pop(key, None)
        next_status = "RUNNING"
    else:
        failures[key] = int(failures.get(key) or 0) + 1
        if failures[key] >= MAX_FAILURES_BEFORE_DEFER:
            completed.update(focus_ids)
            pending.append(f"{key}: diferido após {failures[key]} tentativas sem checkpoint — {reason}")
            next_status = "RUNNING"
        else:
            next_status = "RETRY"

    next_state = {
        **state, "status": next_status, "branch": branch, "checkpoint": checkpoint,
        "completed_task_ids": sorted(completed), "pending": pending, "failures": failures,
        "guard_for_checkpoint": None,
        "history": history(state, {
            "action": "WORK", "focus_task_ids": focus_ids, "worker_id": worker,
            "checkpoint": checkpoint, "result_status": status, "reason": reason,
        }),
    }
    body = pr_body(pid, parent, children, next_state, checkpoint, dispatch.question_report)
    pr_number = ensure_pr(api, branch, base_branch, pid, parent, body)
    next_state["pr_number"] = pr_number
    write_project(remote, pid, next_state)

    return Outcome(
        "WORK", f"{worker} executou {key}: {reason}", pid, worker, checkpoint, pr_number, True
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tasks-json", default="coordination/tasks.json")
    ap.add_argument("--repo-dir", default=".")
    ap.add_argument("--state-git-remote", required=True)
    ap.add_argument("--repo", required=True)
    ap.add_argument("--base-branch", default="main")
    ap.add_argument("--project-id", default=None)
    ap.add_argument("--out", default=None)
    args = ap.parse_args(argv)

    try:
        out = run_once(
            args.tasks_json, args.repo_dir, args.state_git_remote, args.repo,
            args.base_branch, args.project_id or None,
        )
        code = 0
    except Exception as exc:
        out = Outcome("ERROR", f"{type(exc).__name__}: {exc}")
        code = 1

    payload = json.dumps(out.to_dict(), ensure_ascii=False, indent=2)
    print(payload)
    if args.out:
        Path(args.out).write_text(payload + "\n", encoding="utf-8")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
