"""Contexto mínimo do GitHub/Guard para um evento (Issue #95).

Regra: "não enviar arquivos inteiros quando basta diff/audit-pack" e "não
enviar repositório inteiro; preferir audit-pack/diff/contexto mínimo".

Este módulo não FAZ chamada de rede nenhuma ao GitHub — ele recebe o
payload que o workflow já coletou (é assim que um GitHub Action funciona:
o evento chega com os dados; buscar mais do que isso via API custaria uma
chamada HTTP adicional que esta V2 não precisa fazer) e devolve uma
versão **enxuta e limitada em tamanho**, pronta para eventualmente ir para
uma chamada de API — que nesta V2 nunca acontece de verdade.
"""

from __future__ import annotations

from dataclasses import dataclass

from .events import Event

MAX_CHARS_PER_FIELD = 4_000


def _clip(texto: str | None, limite: int = MAX_CHARS_PER_FIELD) -> str:
    if not texto:
        return ""
    texto = str(texto)
    if len(texto) <= limite:
        return texto
    return texto[:limite] + f"\n… [cortado em {limite} caracteres — ver fonte completa se necessário]"


@dataclass(frozen=True)
class MinimalContext:
    """Só o que a classificação/roteamento precisa — nunca o repositório inteiro."""

    summary: str
    guard_result: str | None
    guard_hard_fails: list[str]
    guard_warnings: list[str]
    extra: dict

    def to_dict(self) -> dict:
        return {
            "summary": self.summary,
            "guard_result": self.guard_result,
            "guard_hard_fails": self.guard_hard_fails,
            "guard_warnings": self.guard_warnings,
            "extra": self.extra,
        }

    def approx_size_chars(self) -> int:
        import json

        return len(json.dumps(self.to_dict(), ensure_ascii=False))


def _from_audit_pack(audit_pack: dict) -> tuple[str | None, list[str], list[str]]:
    resultado = audit_pack.get("resultado")
    achados = audit_pack.get("achados", [])
    duros = [a.get("message", "") for a in achados if a.get("severity") == "HARD FAIL"][:10]
    avisos = [a.get("message", "") for a in achados if a.get("severity") == "WARNING"][:10]
    return resultado, duros, avisos


def build_context(event: Event) -> MinimalContext:
    payload = event.payload
    audit_pack = payload.get("audit_pack")
    guard_result, duros, avisos = (None, [], [])
    if isinstance(audit_pack, dict):
        guard_result, duros, avisos = _from_audit_pack(audit_pack)

    partes_resumo = [f"evento={event.raw_type}", f"repo={event.repo}", f"identidade={event.identity}"]
    if payload.get("titulo"):
        partes_resumo.append(f"título={_clip(payload['titulo'], 200)}")
    if payload.get("area"):
        partes_resumo.append(f"área={payload['area']}")
    if payload.get("body"):
        partes_resumo.append(f"corpo={_clip(payload['body'], 500)}")

    extra = {
        k: _clip(v) if isinstance(v, str) else v
        for k, v in payload.items()
        if k not in {"audit_pack", "body", "titulo", "dedup_fields"}
    }

    return MinimalContext(
        summary=" · ".join(partes_resumo),
        guard_result=guard_result,
        guard_hard_fails=duros,
        guard_warnings=avisos,
        extra=extra,
    )
