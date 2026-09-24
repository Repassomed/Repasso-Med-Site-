"""Testes do auto-reparo tecnico OpenAI."""

from __future__ import annotations
import json
import os
import tempfile

from . import _pathsetup
from coordinator.auto_repair import AttemptStore
from coordinator.auto_repair_policy import (
    PR_MARKER, PR_TITLE_PREFIX, apply_plan, assess_failure,
    auto_merge_eligibility, candidate_paths, is_safe_path, parse_plan,
)


class FakeStore:
    def __init__(self, data):
        self.data = data
    def conditional_update(self, fn, *, message):
        ok, new = fn(json.loads(json.dumps(self.data)))
        if ok:
            self.data = new
        return ok
    def update(self, fn, *, message):
        self.data = fn(json.loads(json.dumps(self.data)))
        return self.data


def test_scope_is_strict():
    assert is_safe_path("coordinator/worker_bridge.py")
    assert is_safe_path("coordinator/tests/test_worker_bridge.py")
    assert not is_safe_path("coordination/tasks.json")
    assert not is_safe_path("Repasso-Med-Site--main/x/materia.html")
    assert not is_safe_path(".github/workflows/coordinator-worker-bridge.yml")
    assert not is_safe_path("coordinator/auto_repair.py")
    assert not is_safe_path("coordinator/auto_repair_policy.py")
    assert not is_safe_path("coordinator/tests/test_workflow_security.py")
    print("OK  test_scope_is_strict")


def test_fileexists_is_technical_timeout_is_not():
    log = """Traceback (most recent call last):
  File "/x/coordinator/tests/test_worker_bridge.py", line 72, in helper
FileExistsError: [Errno 17] File exists: '/tmp/tmpabc/remoto.git'
"""
    a = assess_failure("Repasso Coordinator (WORKER BRIDGE)", log, "Preflight")
    assert a.eligible
    b = assess_failure(
        "Repasso Coordinator (WORKER BRIDGE)",
        log + "\nRequest timed out or interrupted", "Rodar o Worker Bridge",
    )
    assert not b.eligible
    print("OK  test_fileexists_is_technical_timeout_is_not")


def test_candidate_does_not_offer_run_all():
    log = """Traceback (most recent call last):
  File "/x/coordinator/tests/run_all.py", line 92, in main
  File "/x/coordinator/tests/test_worker_bridge.py", line 72, in helper
FileExistsError: boom
"""
    paths, lines = candidate_paths(log, "Repasso Coordinator (WORKER BRIDGE)")
    assert "coordinator/tests/run_all.py" not in paths
    assert "coordinator/tests/test_worker_bridge.py" in paths
    assert 72 in lines["coordinator/tests/test_worker_bridge.py"]
    print("OK  test_candidate_does_not_offer_run_all")


def test_plan_blocks_backlog_and_assert_rewrite():
    bad = json.dumps({"summary":"x","edits":[
        {"path":"coordination/tasks.json","old_text":"a","new_text":"b"}
    ]})
    try:
        parse_plan(bad, ("coordinator/worker_bridge.py",))
        raise AssertionError("path deveria ser recusado")
    except ValueError:
        pass
    weak = json.dumps({"summary":"x","edits":[{
        "path":"coordinator/tests/test_worker_bridge.py",
        "old_text":"assert x == 1","new_text":"pass"
    }]})
    try:
        parse_plan(weak, ("coordinator/tests/test_worker_bridge.py",))
        raise AssertionError("assert deveria ser protegido")
    except ValueError:
        pass
    print("OK  test_plan_blocks_backlog_and_assert_rewrite")


def test_apply_preserves_test_assertions():
    with tempfile.TemporaryDirectory() as tmp:
        os.makedirs(os.path.join(tmp, "coordinator", "tests"))
        path = os.path.join(tmp, "coordinator", "tests", "test_worker_bridge.py")
        open(path, "w", encoding="utf-8").write(
            "def helper(p):\n    os.makedirs(p)\n\n"
            "def test_x():\n    assert 1 == 1\n"
        )
        plan = parse_plan(json.dumps({"summary":"fixture","edits":[{
            "path":"coordinator/tests/test_worker_bridge.py",
            "old_text":"def helper(p):\n    os.makedirs(p)",
            "new_text":"def helper(p):\n    if os.path.isdir(p):\n        return\n    os.makedirs(p)"
        }]}), ("coordinator/tests/test_worker_bridge.py",))
        assert apply_plan(tmp, plan) == ("coordinator/tests/test_worker_bridge.py",)
        text = open(path, encoding="utf-8").read()
        assert "assert 1 == 1" in text and "def test_x" in text
    print("OK  test_apply_preserves_test_assertions")


def test_attempt_limit_and_run_dedup():
    fp = "a" * 20
    s = FakeStore({"errors":[{"fingerprint":fp,"status":"OPEN"}]})
    a = AttemptStore(s)
    assert a.claim(fp, "run1")[:2] == (True, 1)
    assert a.claim(fp, "run1")[:2] == (False, 1)
    assert a.claim(fp, "run2")[:2] == (True, 2)
    assert a.claim(fp, "run3")[:2] == (False, 2)
    print("OK  test_attempt_limit_and_run_dedup")


def test_merge_identity_and_scope():
    fp = "b" * 20
    body = f"{PR_MARKER}\n<!-- repasso-auto-repair-fingerprint:{fp} -->"
    ok, _, got = auto_merge_eligibility(
        title=PR_TITLE_PREFIX+"fixture", body=body, state="open", base="main",
        head_repo="Repassomed/Repasso-Med-Site-",
        head_ref=f"auto-repair/{fp[:12]}-a1",
        expected_repo="Repassomed/Repasso-Med-Site-",
        changed_files=("coordinator/tests/test_worker_bridge.py",),
    )
    assert ok and got == fp
    bad, _, _ = auto_merge_eligibility(
        title=PR_TITLE_PREFIX+"x", body=body, state="open", base="main",
        head_repo="Repassomed/Repasso-Med-Site-",
        head_ref=f"auto-repair/{fp[:12]}-a1",
        expected_repo="Repassomed/Repasso-Med-Site-",
        changed_files=("coordination/tasks.json",),
    )
    assert not bad
    print("OK  test_merge_identity_and_scope")


def test_workflow_is_workflow_run_only_and_self_excluded():
    path = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows", "coordinator-auto-repair.yml")
    text = open(path, encoding="utf-8").read()
    on = text[text.index("\non:"):text.index("\npermissions:")]
    assert "workflow_run:" in on
    assert "pull_request:" not in on and "push:" not in on and "schedule:" not in on
    assert "Repasso Coordinator (AUTO-REPARO)" not in on
    assert "Repasso Guard" in on
    assert "workflow_run.conclusion == 'success'" in text
    assert "typed.source_event !== 'workflow_dispatch'" in text
    print("OK  test_workflow_is_workflow_run_only_and_self_excluded")


TESTS = [
    test_scope_is_strict, test_fileexists_is_technical_timeout_is_not,
    test_candidate_does_not_offer_run_all, test_plan_blocks_backlog_and_assert_rewrite,
    test_apply_preserves_test_assertions, test_attempt_limit_and_run_dedup,
    test_merge_identity_and_scope, test_workflow_is_workflow_run_only_and_self_excluded,
]


def main():
    fails = 0
    for t in TESTS:
        try:
            t()
        except Exception as exc:
            fails += 1
            print(f"FALHOU  {t.__name__}: {type(exc).__name__}: {exc}")
    return fails


if __name__ == "__main__":
    raise SystemExit(main())
