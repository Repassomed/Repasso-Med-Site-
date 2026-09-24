"""CLI do auto-reparo tecnico OpenAI do Repasso Coordinator."""

from __future__ import annotations

import argparse
import json
import os
import re

from . import openai_client
from .auto_repair_policy import (
    MAX_ATTEMPTS, PR_MARKER, PR_TITLE_PREFIX, SYSTEM_PROMPT,
    apply_plan, assess_failure, auto_merge_eligibility, build_prompt,
    candidate_paths, is_safe_path, parse_plan,
)
from .bridge_pr import GitHubRestApi, disparar_guard
from .classify import Priority
from .error_registry import (
    DEFAULT_ERROR_STATE_BRANCH, ErrorEvent, ErrorRegistry, GitHubErrorApi,
    sanitize_evidence,
)
from .git_state import GitJsonStore, GitUsageLedger
from .openai_budget import OpenAICallLimiter, TIER_NORMAL
from .openai_config import (
    DEFAULT_BUDGET_USD, DEFAULT_HIGH_RISK_MODEL, DEFAULT_MODEL,
    OpenAIAuditorConfig,
)
from .openai_privacy import preflight as privacy_preflight
from .openai_transport import OpenAIResponsesTransport
from .redact import redact
from .runner_contract import RunnerTask
from .runner_dispatch import (
    arquivos_alterados,
    commitar_e_publicar,
    executar_comandos_validacao,
    preparar_branch_de_trabalho,
    resetar_workdir,
)

ENV_ENABLED = "REPASSO_AUTO_REPAIR_ENABLED"
MAX_OUTPUT_TOKENS = 2000


class AttemptStore:
    """Tentativas no MESMO state.json do Error Registry."""

    def __init__(self, store: GitJsonStore) -> None:
        self.store = store

    def claim(self, fp: str, run_id: str) -> tuple[bool, int, str]:
        holder = {"attempt": 0, "reason": ""}

        def evaluate(data):
            records = {
                str(x.get("fingerprint")): dict(x)
                for x in (data.get("errors") or [])
                if isinstance(x, dict) and x.get("fingerprint")
            }
            rec = records.get(fp)
            if not rec:
                holder["reason"] = "fingerprint ausente no Error Registry"
                return False, data
            attempts = int(rec.get("auto_repair_attempts") or 0)
            holder["attempt"] = attempts
            if str(rec.get("auto_repair_last_run_id") or "") == str(run_id):
                holder["reason"] = "run ja considerado"
                return False, data
            if attempts >= MAX_ATTEMPTS:
                holder["reason"] = f"limite {MAX_ATTEMPTS} atingido"
                return False, data
            attempts += 1
            holder.update(attempt=attempts, reason=f"tentativa {attempts}/{MAX_ATTEMPTS}")
            rec.update(
                auto_repair_attempts=attempts,
                auto_repair_last_run_id=str(run_id),
                auto_repair_status="FIXING",
                status="FIXING",
            )
            records[fp] = rec
            return True, {**data, "errors": list(records.values())}

        ok = self.store.conditional_update(evaluate, message=f"auto-repair: claim {fp}")
        return ok, int(holder["attempt"]), str(holder["reason"])

    def record(self, fp: str, status: str, note: str, *,
               pr_number: int | None = None, branch: str | None = None) -> None:
        def mutate(data):
            records = {
                str(x.get("fingerprint")): dict(x)
                for x in (data.get("errors") or [])
                if isinstance(x, dict) and x.get("fingerprint")
            }
            rec = records.get(fp)
            if not rec:
                return data
            rec["auto_repair_status"] = status
            rec["auto_repair_note"] = redact(note)[:2000]
            if pr_number:
                rec["auto_repair_pr_number"] = int(pr_number)
            if branch:
                rec["auto_repair_branch"] = branch
            if status == "MERGED":
                rec.update(
                    status="RESOLVED",
                    resolution=redact(note)[:2000],
                    root_cause=rec.get("root_cause") or "corrigido pelo auto-reparo tecnico",
                )
            elif status not in ("FIXING", "PR_OPEN"):
                rec["status"] = "OPEN"
            records[fp] = rec
            return {**data, "errors": list(records.values())}
        self.store.update(mutate, message=f"auto-repair: {status.lower()} {fp}")


def _parts(repo: str) -> tuple[str, str]:
    p = (repo or "").split("/", 1)
    if len(p) != 2 or not all(p):
        raise ValueError("repo precisa ser owner/name")
    return p[0], p[1]


def _summary(s: str) -> str:
    return re.sub(r"\s+", " ", redact(s)).strip()[:100] or "correcao tecnica"


def _config() -> OpenAIAuditorConfig:
    try:
        budget = float(os.environ.get("REPASSO_OPENAI_AUDITOR_BUDGET_USD") or DEFAULT_BUDGET_USD)
    except ValueError:
        budget = DEFAULT_BUDGET_USD
    return OpenAIAuditorConfig(
        enabled=True,
        model=os.environ.get("REPASSO_OPENAI_AUDITOR_MODEL") or DEFAULT_MODEL,
        high_risk_model=os.environ.get("REPASSO_OPENAI_AUDITOR_HIGH_RISK_MODEL") or DEFAULT_HIGH_RISK_MODEL,
        budget_usd=budget,
    )


def _register(state_remote: str, repo: str, workflow: str, run_id: str,
              signature: str, log: str):
    owner, name = _parts(repo)
    store = GitJsonStore(state_remote, branch=DEFAULT_ERROR_STATE_BRANCH)
    registry = ErrorRegistry(store, GitHubErrorApi(owner, name))
    event = ErrorEvent(
        component="auto-repair", error_type="technical-workflow-failure",
        title=f"Falha tecnica em {workflow}", message=signature,
        severity="HIGH", category="workflow", source=workflow, run_id=run_id,
        evidence=sanitize_evidence(log[-4000:]),
    )
    outcome = registry.register(event)
    return registry, AttemptStore(store), event.fingerprint, outcome.issue_number


def _body(fp: str, run_id: str, workflow: str, step: str, attempt: int,
          files: tuple[str, ...], signature: str) -> str:
    allowed = ", ".join(f"`{p}`" for p in files)
    return "\n".join([
        PR_MARKER, f"<!-- repasso-auto-repair-fingerprint:{fp} -->",
        "## ESCOPO", "",
        f"- **Tarefa:** auto-repair-{fp}-a{attempt}",
        "- **Área:** infraestrutura",
        f"- **Arquivos permitidos:** {allowed}",
        "- **Agente:** ChatGPT API — auto-reparo técnico",
        f"- **Objetivo:** corrigir falha técnica reproduzível do {workflow}",
        f"- **Fonte:** workflow run {run_id}", "- **Dependências:** —", "",
        "## Diagnóstico", "", f"- Etapa: {step or '-'}",
        f"- Assinatura: `{redact(signature)[:500]}`",
        f"- Tentativa: {attempt}/{MAX_ATTEMPTS}", "",
        "## Travas", "",
        "- nenhuma matéria/asset/source pack/backlog foi autorizado;",
        "- edição ancorada; sem shell/diff livre;",
        "- suíte completa passou antes do push;",
        "- Guard é despachado pela branch padrão;",
        "- auto-merge exige Guard verde + HEAD/arquivos + Error Registry coincidentes.",
        "", "Exceção de merge: somente esta classe técnica foi autorizada por José.",
    ])


def repair(args) -> dict:
    if os.environ.get(ENV_ENABLED) != "true":
        return {"status": "SKIPPED", "reason": f"{ENV_ENABLED} != true"}
    log = open(args.log, encoding="utf-8", errors="replace").read()
    assessment = assess_failure(args.workflow_name, log, args.failed_step)
    if not assessment.eligible:
        return {"status": "SKIPPED", "reason": assessment.reason, "signature": assessment.signature}

    registry, attempts, fp, issue = _register(
        args.state_git_remote, args.repo, args.workflow_name, str(args.run_id),
        assessment.signature, log,
    )
    claimed, attempt, reason = attempts.claim(fp, str(args.run_id))
    if not claimed:
        return {"status": "SKIPPED", "reason": reason, "fingerprint": fp, "attempt": attempt}

    paths, lines = candidate_paths(log, args.workflow_name)
    prompt, usable = build_prompt(
        args.workflow_name, str(args.run_id), args.failed_step,
        assessment.signature, log, args.repo_dir, paths, lines,
    )
    if not prompt:
        attempts.record(fp, "NO_SAFE_SCOPE", "nenhum contexto seguro")
        return {"status": "SKIPPED", "reason": "nenhum contexto seguro", "fingerprint": fp}

    privacy = privacy_preflight(SYSTEM_PROMPT + "\n" + prompt)
    if not privacy.safe:
        attempts.record(fp, "PRIVACY_BLOCKED", "; ".join(privacy.reasons))
        return {"status": "SKIPPED", "reason": "privacy preflight bloqueou envio", "fingerprint": fp}

    cfg = _config()
    limiter = OpenAICallLimiter(max_output_tokens=MAX_OUTPUT_TOKENS)
    req = openai_client.build_request(
        model_id=cfg.model, tier=TIER_NORMAL, system=SYSTEM_PROMPT,
        prompt=prompt, limiter=limiter,
    )
    ledger = GitUsageLedger(GitJsonStore(args.state_git_remote, branch="coordinator-state-usage-openai"))
    result = openai_client.call(
        cfg, req, transport=OpenAIResponsesTransport(timeout=120.0, max_retries=0),
        limiter=limiter, ledger=ledger, event_key=f"auto-repair:{fp}:a{attempt}",
    )
    if result.status != "ok":
        attempts.record(fp, "OPENAI_FAILED", f"{result.status}: {result.reason}")
        return {"status": "SKIPPED", "reason": f"OpenAI: {result.status}", "fingerprint": fp}

    try:
        plan = parse_plan(result.text, usable)
    except ValueError as exc:
        attempts.record(fp, "INVALID_PLAN", str(exc))
        return {"status": "SKIPPED", "reason": redact(str(exc)), "fingerprint": fp}
    if not plan.edits:
        attempts.record(fp, "NO_SAFE_FIX", plan.summary)
        return {"status": "SKIPPED", "reason": plan.summary, "fingerprint": fp}

    branch = f"auto-repair/{fp[:12]}-a{attempt}"
    planned_files = tuple(sorted({e.path for e in plan.edits}))
    runner_task = RunnerTask(
        task_id=f"auto-repair-{fp}-a{attempt}",
        priority=Priority.P0,
        source_issue=int(issue) if issue else None,
        branch=branch,
        allowed_files=planned_files,
        instructions=f"Correção técnica automática restrita: {_summary(plan.summary)}",
        checkpoint_commit=None,
        capabilities_required=("codigo",),
        risk_level="MEDIO",
        policy_level="D",
        jose_authorized=True,
        publication_required=False,
    )
    base = None

    try:
        # Todo processo externo passa pela fronteira já auditada do Runner.
        # auto_repair.py não ganha um segundo executor de shell/git.
        base = preparar_branch_de_trabalho(args.repo_dir, runner_task)
        touched = apply_plan(args.repo_dir, plan)
        actual = tuple(arquivos_alterados(args.repo_dir))
        if (
            not touched
            or set(touched) != set(actual)
            or set(actual) != set(runner_task.allowed_files)
            or any(not is_safe_path(p) for p in actual)
        ):
            raise ValueError("diff real divergiu da allowlist/plano")

        tests_ok, test_results = executar_comandos_validacao(
            args.repo_dir, ("coordinator-suite",)
        )
        if not tests_ok:
            detalhe = " | ".join(
                f"{x.get('key')}: rc={x.get('returncode')} "
                f"{x.get('stdout_tail','')} {x.get('stderr_tail','')}"
                for x in test_results
                if not x.get("ok")
            )
            raise RuntimeError("suite falhou: " + redact(detalhe[-3500:]))

        head = commitar_e_publicar(args.repo_dir, runner_task, "origin")

        owner, name = _parts(args.repo)
        api = GitHubRestApi(owner=owner, repo=name)
        pr = api.criar_pr(
            titulo=PR_TITLE_PREFIX + _summary(plan.summary), head=branch,
            base=args.base_branch,
            corpo=_body(fp, str(args.run_id), args.workflow_name, args.failed_step,
                        attempt, actual, assessment.signature),
        )
        n = int(pr["number"])
        guard = disparar_guard(api, pr_number=n, ref=args.base_branch)
        status = "PR_OPEN" if guard.action == "DISPATCHED" else "PR_OPEN_GUARD_FAILED"
        attempts.record(fp, status, f"PR #{n}; Guard={guard.action}", pr_number=n, branch=branch)
        if issue:
            try:
                registry.api.comment(
                    int(issue),
                    f"AUTO-REPARO técnico {attempt}/{MAX_ATTEMPTS}: PR #{n}; Guard={guard.action}. "
                    "Nenhum conteúdo médico foi autorizado.",
                )
            except Exception:
                pass
        return {
            "status": status, "fingerprint": fp, "attempt": attempt,
            "pr_number": n, "branch": branch, "head_sha": head,
            "changed_files": list(actual), "guard": guard.to_dict(),
        }
    except Exception as exc:
        if base:
            resetar_workdir(args.repo_dir, base)
        attempts.record(fp, "REPAIR_FAILED", f"{type(exc).__name__}: {exc}")
        return {"status": "SKIPPED", "reason": redact(f"{type(exc).__name__}: {exc}"), "fingerprint": fp}


def merge_check(args) -> dict:
    pr = json.load(open(args.pr_json, encoding="utf-8"))
    raw = json.load(open(args.files_json, encoding="utf-8"))
    files = tuple(str(x.get("filename") if isinstance(x, dict) else x) for x in raw)
    head = pr.get("head") or {}
    ok, reason, fp = auto_merge_eligibility(
        title=str(pr.get("title") or ""), body=str(pr.get("body") or ""),
        state=str(pr.get("state") or ""), base=str((pr.get("base") or {}).get("ref") or ""),
        head_repo=str((head.get("repo") or {}).get("full_name") or ""),
        head_ref=str(head.get("ref") or ""), expected_repo=args.repo, changed_files=files,
    )
    n = int(pr.get("number") or 0)
    if ok:
        state = GitJsonStore(args.state_git_remote, branch=DEFAULT_ERROR_STATE_BRANCH).read()
        records = {str(x.get("fingerprint")): x for x in (state.get("errors") or []) if isinstance(x, dict)}
        rec = records.get(fp or "")
        if not rec:
            ok, reason = False, "fingerprint ausente no Error Registry"
        elif int(rec.get("auto_repair_pr_number") or 0) != n:
            ok, reason = False, "PR nao coincide com Error Registry"
        elif str(rec.get("auto_repair_branch") or "") != str(head.get("ref") or ""):
            ok, reason = False, "branch nao coincide com Error Registry"
        elif str(rec.get("auto_repair_status") or "") not in ("PR_OPEN", "PR_OPEN_GUARD_FAILED"):
            ok, reason = False, "status do Error Registry nao autoriza merge"
    out = {
        "eligible": ok, "reason": reason, "fingerprint": fp, "pr_number": n,
        "head_sha": str(head.get("sha") or ""), "changed_files": list(files),
    }
    json.dump(out, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return out


def mark_merged(args) -> dict:
    store = GitJsonStore(args.state_git_remote, branch=DEFAULT_ERROR_STATE_BRANCH)
    AttemptStore(store).record(
        args.fingerprint, "MERGED",
        f"PR #{args.pr_number} mergeada apos Guard verde sob excecao tecnica.",
        pr_number=args.pr_number,
    )
    return {"status": "MERGED", "fingerprint": args.fingerprint, "pr_number": args.pr_number}


def parser():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("repair")
    for flag in ("workflow-name", "run-id", "log", "repo-dir", "state-git-remote", "repo"):
        r.add_argument("--" + flag, required=True)
    r.add_argument("--failed-step", default="")
    r.add_argument("--base-branch", default="main")
    m = sub.add_parser("merge-check")
    for flag in ("pr-json", "files-json", "repo", "state-git-remote", "out"):
        m.add_argument("--" + flag, required=True)
    z = sub.add_parser("mark-merged")
    z.add_argument("--fingerprint", required=True)
    z.add_argument("--pr-number", type=int, required=True)
    z.add_argument("--state-git-remote", required=True)
    return p


def main(argv=None) -> int:
    args = parser().parse_args(argv)
    try:
        out = repair(args) if args.cmd == "repair" else (
            merge_check(args) if args.cmd == "merge-check" else mark_merged(args)
        )
    except Exception as exc:
        out = {"status": "SKIPPED", "reason": redact(f"{type(exc).__name__}: {exc}")}
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
