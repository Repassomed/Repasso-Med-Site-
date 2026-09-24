"""Testes do Source Pack compartilhado (#158)."""

from __future__ import annotations

import hashlib
import json
import os
import tempfile

from coordinator import audit, openai_audit, source_pack, worker_bridge
from coordinator.context import MinimalContext


def _fixture(tmp: str, text: str = "FONTE REAL\nlinha 2") -> tuple[str, str, str]:
    os.makedirs(os.path.join(tmp, "coordination", "source-packs"), exist_ok=True)
    tasks = os.path.join(tmp, "coordination", "tasks.json")
    with open(tasks, "w", encoding="utf-8") as fh:
        json.dump({"tarefas": []}, fh)
    rel = "coordination/source-packs/teste.md"
    full = os.path.join(tmp, rel)
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(text)
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return tasks, rel, digest


def test_pack_valido_e_hash() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tasks, rel, digest = _fixture(tmp)
        loaded = source_pack.load_source_pack(tasks, rel)
        assert loaded.ok and loaded.pack is not None
        assert loaded.pack.sha256 == digest
        assert "FONTE REAL" in loaded.pack.evidence_block()
    print("OK  test_pack_valido_e_hash")


def test_pack_required_falha_em_ausente_escape_e_tamanho() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tasks, _, _ = _fixture(tmp)
        assert not source_pack.load_source_pack(tasks, "coordination/source-packs/nao-existe.md").ok
        assert not source_pack.load_source_pack(tasks, "../segredo.txt").ok
        os.makedirs(os.path.join(tmp, "coordination", "source-packs"), exist_ok=True)
        full = os.path.join(tmp, "coordination", "source-packs", "grande.md")
        with open(full, "w", encoding="utf-8") as fh:
            fh.write("x" * (source_pack.MAX_SOURCE_PACK_CHARS + 1))
        grande = source_pack.load_source_pack(tasks, "coordination/source-packs/grande.md")
        assert not grande.ok and "teto" in (grande.error or "")
    print("OK  test_pack_required_falha_em_ausente_escape_e_tamanho")


def test_pr_fixa_pack_e_sha_e_mismatch_bloqueia() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tasks, rel, digest = _fixture(tmp)
        body = (
            "## ESCOPO\n"
            "- **Tarefa:** tarefa-fonte\n"
            f"- **Source pack:** `{rel}`\n"
            f"- **Source pack SHA-256:** `{digest}`\n"
        )
        assert source_pack.task_id_from_pr_body(body) == "tarefa-fonte"
        ok = source_pack.load_pack_declared_by_pr(tasks, body)
        assert ok.ok and ok.pack is not None
        body_ruim = body.replace(digest, "0" * 64)
        ruim = source_pack.load_pack_declared_by_pr(tasks, body_ruim)
        assert not ruim.ok and "divergiu" in (ruim.error or "")
    print("OK  test_pr_fixa_pack_e_sha_e_mismatch_bloqueia")


def test_worker_bloqueia_pack_obrigatorio_invalido_antes_da_execucao() -> None:
    meta = worker_bridge.BridgeTaskMetadata(
        task_id="t-fonte", automation_enabled=True, bridge_enabled=True,
        risk_level="MEDIO", policy_level="C", jose_authorized=True,
        source_pack_required=True, source_pack_path="coordination/source-packs/x.md",
        source_pack_text=None, source_pack_error="arquivo ausente",
    )
    gate = worker_bridge.avaliar_politica(meta, task_id="t-fonte")
    assert gate.permitido is False
    assert "antes de qualquer chamada paga" in gate.reason
    print("OK  test_worker_bloqueia_pack_obrigatorio_invalido_antes_da_execucao")


def test_os_dois_auditores_recebem_o_mesmo_pack() -> None:
    ctx = MinimalContext(
        summary="evento=teste", guard_result="PASS", guard_hard_fails=[],
        guard_warnings=[], extra={},
    )
    pack = "SOURCE PACK — EVIDÊNCIA\nprova X\nslide Y"
    a = audit.build_audit_prompt(
        ctx, pr_body="body", envolve_questoes=True, pr_diff="diff",
        source_pack_text=pack,
    )
    o = openai_audit.build_openai_audit_prompt(
        ctx, pr_body="body", envolve_questoes=True, pr_diff="diff",
        source_pack_text=pack,
    )
    assert pack in a and pack in o
    assert "mesmo pacote" in a.lower()
    assert "mesmo pacote" in o.lower()
    print("OK  test_os_dois_auditores_recebem_o_mesmo_pack")


def main() -> int:
    testes = [
        test_pack_valido_e_hash,
        test_pack_required_falha_em_ausente_escape_e_tamanho,
        test_pr_fixa_pack_e_sha_e_mismatch_bloqueia,
        test_worker_bloqueia_pack_obrigatorio_invalido_antes_da_execucao,
        test_os_dois_auditores_recebem_o_mesmo_pack,
    ]
    falhas = 0
    for t in testes:
        try:
            t()
        except AssertionError as exc:
            falhas += 1
            print(f"FALHOU  {t.__name__}: {exc}")
    print(f"\n{len(testes)-falhas}/{len(testes)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
