"""Pausa da auditoria paga (decisão do José, 22/10/2026) — ZERO chamada de API.

Garante, só lendo os workflows e o portão em código, que:
    - OBSERVE e WORKER BRIDGE entregam ``REPASSO_OPENAI_AUDITOR_ENABLED="false"`` FIXO
      (não dependem da variável do repositório);
    - o AUTO-REPARO não recebe a chave da OpenAI (o passo termina em "ausente; pulado");
    - o Repasso Guard continua sem nenhuma referência à OpenAI e continua existindo;
    - com ENABLED=false o portão do OpenAI Auditor fecha, mesmo com uma chave presente.
"""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

from ..openai_config import OpenAIAuditorConfig

RAIZ = Path(__file__).resolve().parents[2]
WF = RAIZ / ".github" / "workflows"


def _passos(arquivo: str):
    dados = yaml.safe_load((WF / arquivo).read_text(encoding="utf8"))
    for job in (dados.get("jobs") or {}).values():
        for passo in job.get("steps") or []:
            yield passo


def test_observe_e_bridge_fixam_enabled_false() -> None:
    for arq in ("coordinator-observe.yml", "coordinator-worker-bridge.yml"):
        valores = [
            (p.get("env") or {}).get("REPASSO_OPENAI_AUDITOR_ENABLED")
            for p in _passos(arq)
            if "REPASSO_OPENAI_AUDITOR_ENABLED" in (p.get("env") or {})
        ]
        assert valores, f"{arq}: nenhum passo define REPASSO_OPENAI_AUDITOR_ENABLED"
        assert all(v == "false" for v in valores), f"{arq}: ENABLED precisa ser 'false' fixo: {valores!r}"
        assert "vars.REPASSO_OPENAI_AUDITOR_ENABLED" not in (WF / arq).read_text(encoding="utf8").replace(
            "restaura `${{ vars.REPASSO_OPENAI_AUDITOR_ENABLED }}`", ""
        ), f"{arq}: a variável do repositório não pode mais ligar a chamada"
    print("OK  test_observe_e_bridge_fixam_enabled_false")


def test_auto_reparo_sem_chave_da_openai() -> None:
    chaves = [(p.get("env") or {}).get("OPENAI_API_KEY") for p in _passos("coordinator-auto-repair.yml")
              if "OPENAI_API_KEY" in (p.get("env") or {})]
    assert chaves and all(c in ("", None) for c in chaves), f"AUTO-REPARO ainda recebe a chave: {chaves!r}"
    print("OK  test_auto_reparo_sem_chave_da_openai")


def test_guard_preservado_e_sem_openai() -> None:
    texto = (WF / "guard.yml").read_text(encoding="utf8")
    assert "Repasso Guard" in texto
    assert "OPENAI" not in texto.upper(), "o Guard não pode depender da OpenAI"
    print("OK  test_guard_preservado_e_sem_openai")


def test_portao_fecha_com_enabled_false_mesmo_com_chave() -> None:
    cfg = OpenAIAuditorConfig.from_env(env={
        "REPASSO_OPENAI_AUDITOR_ENABLED": "false",
        "OPENAI_API_KEY": "sk-chave-falsa-so-para-teste",
    })
    r = cfg.gate()
    assert r.open is False, "portão aberto com ENABLED=false"
    print("OK  test_portao_fecha_com_enabled_false_mesmo_com_chave")


def main() -> int:
    testes = [
        test_observe_e_bridge_fixam_enabled_false,
        test_auto_reparo_sem_chave_da_openai,
        test_guard_preservado_e_sem_openai,
        test_portao_fecha_com_enabled_false_mesmo_com_chave,
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
