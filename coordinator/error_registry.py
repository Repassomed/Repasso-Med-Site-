"""Error Registry V1 - Issue #130.

GitHub-native observability for actionable failures. State lives on the
coordinator-state-errors branch. This module never merges, deploys or
changes product content. Registration is best-effort: registry failure
must never turn an already completed task into a failed task.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Protocol

from .redact import redact

DEFAULT_ERROR_STATE_BRANCH = "coordinator-state-errors"
GITHUB_TOKEN_ENV = "GITHUB_TOKEN"
VALID_SEVERITIES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
VALID_STATUSES = ("OPEN", "FIXING", "RESOLVED", "RECURRENT")

_RE_NAME = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
_RE_SHA = re.compile(r"\b[0-9a-fA-F]{7,40}\b")
_RE_UUID = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,36}\b")
_RE_LONG_NUM = re.compile(r"\b\d{6,}\b")
_RE_WS = re.compile(r"\s+")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_message(value: object) -> str:
    text = redact(str(value or ""))
    text = _RE_UUID.sub("<uuid>", text)
    text = _RE_SHA.sub("<sha>", text)
    text = _RE_LONG_NUM.sub("<id>", text)
    return _RE_WS.sub(" ", text).strip().lower()[:1500]


def sanitize_evidence(value: object) -> str:
    return redact(str(value or "")).strip()[:4000]


@dataclass(frozen=True)
class ErrorEvent:
    component: str
    error_type: str
    title: str
    message: str
    severity: str = "HIGH"
    category: str = "workflow"
    source: str = "coordinator"
    task_id: str | None = None
    worker_id: str | None = None
    pr_number: int | None = None
    commit_sha: str | None = None
    run_id: str | int | None = None
    evidence: str = ""

    def __post_init__(self) -> None:
        for name, value in (
            ("component", self.component),
            ("error_type", self.error_type),
            ("category", self.category),
        ):
            if not _RE_NAME.match((value or "").strip().lower()):
                raise ValueError(f"{name} invalido: {value!r}")
        if (self.severity or "").upper() not in VALID_SEVERITIES:
            raise ValueError(f"severity invalida: {self.severity!r}")
        if not (self.title or "").strip() or not normalize_message(self.message):
            raise ValueError("title/message nao podem ser vazios")
        if self.pr_number is not None and (
            not isinstance(self.pr_number, int) or self.pr_number <= 0
        ):
            raise ValueError("pr_number precisa ser inteiro positivo ou None")

    @property
    def fingerprint(self) -> str:
        base = "|".join(
            (
                self.component.lower().strip(),
                self.error_type.lower().strip(),
                normalize_message(self.message),
                (self.task_id or "").lower().strip(),
            )
        )
        return hashlib.sha256(base.encode("utf-8")).hexdigest()[:20]

    @property
    def error_id(self) -> str:
        return "ERR-" + self.fingerprint[:10].upper()


@dataclass(frozen=True)
class ErrorRegistryOutcome:
    action: str
    error_id: str
    fingerprint: str
    reason: str
    issue_number: int | None = None
    occurrence_count: int = 0

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "error_id": self.error_id,
            "fingerprint": self.fingerprint,
            "reason": self.reason,
            "issue_number": self.issue_number,
            "occurrence_count": self.occurrence_count,
        }


class StateStore(Protocol):
    def read(self) -> dict: ...
    def update(self, mutate: Callable[[dict], dict], *, message: str) -> dict: ...
    def conditional_update(
        self, evaluate: Callable[[dict], tuple[bool, dict]], *, message: str
    ) -> bool: ...


class GitHubErrorApiError(RuntimeError):
    pass


class GitHubErrorApiProtocol(Protocol):
    def find_issue(self, fingerprint: str) -> dict | None: ...
    def create_issue(self, title: str, body: str) -> dict: ...
    def get_issue(self, number: int) -> dict: ...
    def comment(self, number: int, body: str) -> None: ...
    def reopen(self, number: int) -> None: ...


class GitHubErrorApi:
    """Minimal Issues client. There is intentionally no merge/deploy API."""

    def __init__(self, owner: str, repo: str, timeout: float = 30.0) -> None:
        if not owner.strip() or not repo.strip():
            raise ValueError("owner/repo vazios")
        self.owner, self.repo, self.timeout = owner.strip(), repo.strip(), timeout

    def _token(self) -> str:
        token = os.environ.get(GITHUB_TOKEN_ENV)
        if not token:
            raise GitHubErrorApiError("GITHUB_TOKEN ausente")
        return token

    def _request(self, method: str, path: str, payload: dict | None = None) -> object:
        url = "https://api.github.com" + path
        body = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Authorization", "Bearer " + self._token())
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        req.add_header("User-Agent", "repasso-error-registry")
        if body is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw.strip() else {}
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = exc.read().decode("utf-8")[:500]
            except Exception:
                pass
            raise GitHubErrorApiError(
                f"GitHub {exc.code} em {method} {path}: {redact(detail)}"
            ) from exc
        except urllib.error.URLError as exc:
            raise GitHubErrorApiError(
                f"falha de rede: {redact(str(exc.reason))}"
            ) from exc

    def find_issue(self, fingerprint: str) -> dict | None:
        marker = "repasso-error-fingerprint:" + fingerprint
        q = urllib.parse.quote(
            f'repo:{self.owner}/{self.repo} is:issue in:body "{marker}"', safe=""
        )
        data = self._request("GET", "/search/issues?q=" + q + "&per_page=20")
        for item in data.get("items", []) if isinstance(data, dict) else []:
            if "<!-- " + marker + " -->" in str(item.get("body") or ""):
                return item
        return None

    def create_issue(self, title: str, body: str) -> dict:
        data = self._request(
            "POST", f"/repos/{self.owner}/{self.repo}/issues",
            {"title": title, "body": body},
        )
        if not isinstance(data, dict) or not data.get("number"):
            raise GitHubErrorApiError("Issue criada sem numero utilizavel")
        return data

    def get_issue(self, number: int) -> dict:
        data = self._request("GET", f"/repos/{self.owner}/{self.repo}/issues/{number}")
        return data if isinstance(data, dict) else {}

    def comment(self, number: int, body: str) -> None:
        self._request(
            "POST", f"/repos/{self.owner}/{self.repo}/issues/{number}/comments",
            {"body": body},
        )

    def reopen(self, number: int) -> None:
        self._request(
            "PATCH", f"/repos/{self.owner}/{self.repo}/issues/{number}",
            {"state": "open"},
        )


def _records(data: dict) -> dict[str, dict]:
    return {
        str(x["fingerprint"]): dict(x)
        for x in (data.get("errors") or [])
        if isinstance(x, dict) and x.get("fingerprint")
    }


def _evidence_hash(event: ErrorEvent) -> str:
    return hashlib.sha256(sanitize_evidence(event.evidence).encode()).hexdigest()[:20]


def _issue_body(event: ErrorEvent, first_seen: str) -> str:
    evidence = sanitize_evidence(event.evidence) or "(sem evidencia adicional)"
    return "\n".join(
        [
            "<!-- repasso-error-fingerprint:" + event.fingerprint + " -->",
            "# " + event.error_id + " - " + redact(event.title)[:160],
            "",
            "## Registro",
            "",
            "- Origem: " + redact(event.source),
            "- Componente: " + event.component,
            "- Categoria: " + event.category,
            "- Tipo: " + event.error_type,
            "- Severidade: " + event.severity.upper(),
            "- Status: OPEN",
            "- Task: " + (redact(event.task_id) if event.task_id else "-"),
            "- Worker: " + (redact(event.worker_id) if event.worker_id else "-"),
            "- PR: " + (("#" + str(event.pr_number)) if event.pr_number else "-"),
            "- Commit/checkpoint: " + (redact(event.commit_sha) if event.commit_sha else "-"),
            "- Run: " + (redact(str(event.run_id)) if event.run_id else "-"),
            "- First seen: " + first_seen,
            "- Fingerprint: " + event.fingerprint,
            "",
            "## Resumo",
            "",
            redact(event.message)[:2000],
            "",
            "## Evidencia sanitizada",
            "",
            evidence,
            "",
            "Observabilidade apenas. Nao autoriza merge, deploy ou correcao automatica.",
        ]
    )


def _occurrence_comment(event: ErrorEvent, count: int, recurrent: bool) -> str:
    prefix = "RECORRENCIA" if recurrent else "Nova ocorrencia"
    return "\n".join(
        [
            f"{prefix} #{count}",
            "Task: " + (redact(event.task_id) if event.task_id else "-"),
            "Worker: " + (redact(event.worker_id) if event.worker_id else "-"),
            "PR: " + (("#" + str(event.pr_number)) if event.pr_number else "-"),
            "Run: " + (redact(str(event.run_id)) if event.run_id else "-"),
            "Severidade: " + event.severity.upper(),
            "",
            redact(event.message)[:1600],
            "",
            sanitize_evidence(event.evidence) or "(sem evidencia adicional)",
        ]
    )


class ErrorRegistry:
    def __init__(self, store: StateStore, api: GitHubErrorApiProtocol) -> None:
        self.store, self.api = store, api

    def _get(self, fp: str) -> dict | None:
        return _records(self.store.read()).get(fp)

    def _insert(self, event: ErrorEvent, token: str) -> bool:
        now = _now()
        fp = event.fingerprint
        def evaluate(data: dict) -> tuple[bool, dict]:
            items = _records(data)
            if fp in items:
                return False, data
            items[fp] = {
                "error_id": event.error_id,
                "fingerprint": fp,
                "component": event.component,
                "error_type": event.error_type,
                "category": event.category,
                "severity": event.severity.upper(),
                "status": "OPEN",
                "task_id": event.task_id,
                "worker_id": event.worker_id,
                "pr_number": event.pr_number,
                "commit_sha": event.commit_sha,
                "run_id": str(event.run_id) if event.run_id is not None else None,
                "summary": redact(event.message)[:2000],
                "first_seen": now,
                "last_seen": now,
                "occurrence_count": 1,
                "last_evidence_hash": _evidence_hash(event),
                "issue_number": None,
                "issue_sync_status": "PENDING",
                "issue_sync_token": token,
            }
            return True, {**data, "errors": list(items.values())}
        return self.store.conditional_update(
            evaluate, message="error-registry: claim " + event.error_id
        )

    def _set_sync(self, fp: str, token: str, *, number: int | None, failed: bool) -> None:
        def mutate(data: dict) -> dict:
            items = _records(data)
            rec = items.get(fp)
            if rec and rec.get("issue_sync_token") == token:
                rec["issue_sync_token"] = None
                rec["issue_sync_status"] = "FAILED" if failed else "SYNCED"
                if number is not None:
                    rec["issue_number"] = number
                items[fp] = rec
            return {**data, "errors": list(items.values())}
        self.store.update(mutate, message="error-registry: sync " + fp)

    def _sync_new(self, event: ErrorEvent, token: str) -> ErrorRegistryOutcome:
        try:
            found = self.api.find_issue(event.fingerprint)
            if found:
                number = int(found["number"])
                action = "RECOVERED"
            else:
                rec = self._get(event.fingerprint) or {}
                created = self.api.create_issue(
                    f"[ERROR][{event.severity.upper()}][{event.component}] "
                    f"{redact(event.title)[:100]} [{event.error_id}]",
                    _issue_body(event, str(rec.get("first_seen") or _now())),
                )
                number = int(created["number"])
                action = "CREATED"
            self._set_sync(event.fingerprint, token, number=number, failed=False)
            rec = self._get(event.fingerprint) or {}
            return ErrorRegistryOutcome(
                action, event.error_id, event.fingerprint,
                f"Issue #{number} sincronizada.", number,
                int(rec.get("occurrence_count") or 1),
            )
        except Exception as exc:
            try:
                self._set_sync(event.fingerprint, token, number=None, failed=True)
            except Exception:
                pass
            return ErrorRegistryOutcome(
                "FAILED", event.error_id, event.fingerprint,
                "falha ao sincronizar Issue: " + redact(str(exc)),
            )

    def _claim_retry_sync(self, fp: str, token: str) -> bool:
        def evaluate(data: dict) -> tuple[bool, dict]:
            items = _records(data)
            rec = items.get(fp)
            if not rec or rec.get("issue_number"):
                return False, data
            if rec.get("issue_sync_status") != "FAILED":
                return False, data
            rec["issue_sync_status"] = "PENDING"
            rec["issue_sync_token"] = token
            items[fp] = rec
            return True, {**data, "errors": list(items.values())}
        return self.store.conditional_update(
            evaluate, message="error-registry: retry issue " + fp
        )

    def _update_existing(self, event: ErrorEvent) -> ErrorRegistryOutcome:
        before = self._get(event.fingerprint) or {}
        number = before.get("issue_number")
        closed = False
        if number:
            try:
                closed = str(self.api.get_issue(int(number)).get("state")).lower() == "closed"
            except Exception:
                pass
        evidence_changed = _evidence_hash(event) != before.get("last_evidence_hash")
        recurrent = closed or before.get("status") == "RESOLVED"
        now = _now()

        def mutate(data: dict) -> dict:
            items = _records(data)
            rec = items.get(event.fingerprint)
            if not rec:
                return data
            rec["occurrence_count"] = int(rec.get("occurrence_count") or 0) + 1
            rec["last_seen"] = now
            rec["summary"] = redact(event.message)[:2000]
            rec["severity"] = event.severity.upper() if (
                VALID_SEVERITIES.index(event.severity.upper()) >
                VALID_SEVERITIES.index(str(rec.get("severity") or "LOW"))
            ) else rec.get("severity")
            rec["task_id"] = event.task_id or rec.get("task_id")
            rec["worker_id"] = event.worker_id or rec.get("worker_id")
            rec["pr_number"] = event.pr_number or rec.get("pr_number")
            rec["commit_sha"] = event.commit_sha or rec.get("commit_sha")
            rec["run_id"] = str(event.run_id) if event.run_id is not None else rec.get("run_id")
            if evidence_changed:
                rec["last_evidence_hash"] = _evidence_hash(event)
            if recurrent:
                rec["status"] = "RECURRENT"
            items[event.fingerprint] = rec
            return {**data, "errors": list(items.values())}

        state = self.store.update(
            mutate, message="error-registry: occurrence " + event.error_id
        )
        rec = _records(state).get(event.fingerprint) or before
        number = rec.get("issue_number")
        count = int(rec.get("occurrence_count") or 0)

        if not number:
            token = uuid.uuid4().hex
            if self._claim_retry_sync(event.fingerprint, token):
                return self._sync_new(event, token)
            return ErrorRegistryOutcome(
                "PENDING", event.error_id, event.fingerprint,
                "erro persistido; sincronizacao da Issue ainda pendente.",
                occurrence_count=count,
            )

        try:
            if recurrent:
                self.api.reopen(int(number))
                self.api.comment(int(number), _occurrence_comment(event, count, True))
                action = "RECURRENT"
            elif evidence_changed:
                self.api.comment(int(number), _occurrence_comment(event, count, False))
                action = "UPDATED"
            else:
                action = "DEDUPED"
            return ErrorRegistryOutcome(
                action, event.error_id, event.fingerprint,
                f"ocorrencia #{count} registrada na Issue #{number}.",
                int(number), count,
            )
        except Exception as exc:
            return ErrorRegistryOutcome(
                "FAILED", event.error_id, event.fingerprint,
                "estado persistido, mas Issue falhou: " + redact(str(exc)),
                int(number), count,
            )

    def register(self, event: ErrorEvent) -> ErrorRegistryOutcome:
        token = uuid.uuid4().hex
        try:
            first = self._insert(event, token)
            if first:
                return self._sync_new(event, token)
            return self._update_existing(event)
        except Exception as exc:
            return ErrorRegistryOutcome(
                "FAILED", event.error_id, event.fingerprint,
                "Error Registry falhou: " + redact(str(exc)),
            )


def register_best_effort(
    event: ErrorEvent, *, state_git_remote: str, owner: str, repo: str
) -> ErrorRegistryOutcome:
    try:
        from .git_state import GitJsonStore
        registry = ErrorRegistry(
            GitJsonStore(state_git_remote, branch=DEFAULT_ERROR_STATE_BRANCH),
            GitHubErrorApi(owner, repo),
        )
        return registry.register(event)
    except Exception as exc:
        return ErrorRegistryOutcome(
            "FAILED", event.error_id, event.fingerprint,
            "Error Registry indisponivel (best-effort): " + redact(str(exc)),
        )
