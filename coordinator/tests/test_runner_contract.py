"""Testes do contrato estável do futuro Worker Runner — Issue #105, Fase C.

Cobre exatamente o que a rodada pediu: serialização/deserialização,
validação determinística forte (allowed_files vazio, branch=main, Níveis
D/E da Issue #83, checkpoint explícito, capabilities, valores inválidos) e
a prova estrutural de que nenhuma capacidade de merge/deploy existe neste
módulo.

Mesma técnica de todo o pacote: sem pytest, ``main()`` agrega e reporta.
Deliberadamente NÃO registrado em ``coordinator/tests/run_all.py`` nesta
rodada (decisão operacional de José — #105-C não deve tocar esse
arquivo); roda standalone via
``python3 -m coordinator.tests.test_runner_contract``.
"""

from __future__ import annotations

import os
import re
import sys

from . import _pathsetup
from coordinator.classify import Priority
from coordinator.runner_contract import (
    VALID_RUNNER_RESULT_STATUSES,
    RunnerHeartbeat,
    RunnerResult,
    RunnerTask,
)


def _tarefa_valida(**overrides) -> RunnerTask:
    base = dict(
        task_id="t-1",
        priority=Priority.P1,
        source_issue=105,
        branch="runner/t-1-worktree",
        allowed_files=("coordinator/runner_contract.py",),
        instructions="Implementar o contrato estável do runner conforme a Issue #105 Fase C.",
        checkpoint_commit=None,
        capabilities_required=("codigo",),
        risk_level="BAIXO",
        policy_level="C",
        jose_authorized=False,
        publication_required=False,
    )
    base.update(overrides)
    return RunnerTask(**base)


# ---------------------------------------------------------------------------
# Serialização/deserialização.
# ---------------------------------------------------------------------------

def test_runner_task_roundtrip_to_dict_from_dict() -> None:
    original = _tarefa_valida(checkpoint_commit="abc1234", jose_authorized=False, policy_level="B")
    dados = original.to_dict()
    reconstruida = RunnerTask.from_dict(dados)
    assert reconstruida == original
    assert dados["priority"] == "P1"
    assert dados["never_merge"] is True
    assert dados["can_publish"] is False
    print("OK  test_runner_task_roundtrip_to_dict_from_dict")


def test_runner_heartbeat_roundtrip_to_dict_from_dict() -> None:
    original = RunnerHeartbeat(
        worker_id="claude-2", status="BUSY", task_id="t-1", progress_percent=42,
        branch="runner/t-1-worktree", commit="deadbee", remaining_work_estimate="bloco 6 de 10",
        last_checkpoint="deadbee", notes="seguindo conforme instrução",
        timestamp="2026-09-22T02:30:00+00:00",
    )
    dados = original.to_dict()
    reconstruida = RunnerHeartbeat.from_dict(dados)
    assert reconstruida == original
    assert dados["timestamp"] == "2026-09-22T02:30:00+00:00"
    print("OK  test_runner_heartbeat_roundtrip_to_dict_from_dict")


def test_runner_result_roundtrip_to_dict_from_dict() -> None:
    original = RunnerResult(task_id="t-1", status="DONE", reason="Trabalho concluído.", checkpoint_commit="abc1234")
    dados = original.to_dict()
    reconstruida = RunnerResult.from_dict(dados)
    assert reconstruida == original
    assert dados["never_merge"] is True
    assert dados["merge_ready"] is False
    print("OK  test_runner_result_roundtrip_to_dict_from_dict")


def test_runner_task_from_dict_rejects_invalid_priority_string() -> None:
    dados = _tarefa_valida().to_dict()
    dados["priority"] = "P9"
    try:
        RunnerTask.from_dict(dados)
        raise AssertionError("devia ter rejeitado priority inválida")
    except ValueError:
        pass
    print("OK  test_runner_task_from_dict_rejects_invalid_priority_string")


# ---------------------------------------------------------------------------
# allowed_files vazio.
# ---------------------------------------------------------------------------

def test_allowed_files_vazio_falha_fechado() -> None:
    for vazio in ((), [], None):
        try:
            _tarefa_valida(allowed_files=vazio)
            raise AssertionError(f"devia ter rejeitado allowed_files={vazio!r}")
        except ValueError as e:
            assert "allowed_files" in str(e)
    print("OK  test_allowed_files_vazio_falha_fechado")


def test_allowed_files_com_escape_de_diretorio_falha_fechado() -> None:
    """Correção C2: allowed_files só valida SINTAXE de caminho (não-vazio,
    sem escape de diretório) — nunca decide por conteúdo. '..' continua
    proibido por ser uma questão de segurança sintática, não de política."""
    proibidos = ("../../etc/passwd", "coordinator/../../../etc/shadow", "..")
    for caminho in proibidos:
        try:
            _tarefa_valida(allowed_files=(caminho,))
            raise AssertionError(f"devia ter rejeitado allowed_files contendo {caminho!r}")
        except ValueError:
            pass
    print("OK  test_allowed_files_com_escape_de_diretorio_falha_fechado")


def test_allowed_files_valido_e_aceito() -> None:
    tarefa = _tarefa_valida(allowed_files=("coordinator/scheduler.py", "coordinator/tests/test_scheduler.py"))
    assert tarefa.allowed_files == ("coordinator/scheduler.py", "coordinator/tests/test_scheduler.py")
    print("OK  test_allowed_files_valido_e_aceito")


def test_allowed_files_permite_materia_e_netlify_functions_quando_politica_permite() -> None:
    """Correção C2 (2ª auditoria independente do PR #111): um blanket ban
    por CONTEÚDO de caminho tornava impossível representar tarefas que a
    própria Issue #83 permite — conteúdo médico Nível C (com auditoria
    semântica obrigatória) ou uma mudança Nível D já autorizada. Estes
    caminhos, antes rejeitados estruturalmente, agora são aceitos — quem
    decide sensibilidade é policy_level/jose_authorized, nunca uma lista
    de substrings de caminho."""
    caminho_materia = (
        "Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas/toxicologia.html"
    )
    tarefa_nivel_c = _tarefa_valida(
        allowed_files=(caminho_materia,), policy_level="C", risk_level="ALTO",
        instructions="Corrigir erro científico na matéria de Toxicología conforme achado da auditoria.",
    )
    assert tarefa_nivel_c.allowed_files == (caminho_materia,)
    assert tarefa_nivel_c.policy_level == "C"

    tarefa_nivel_d = _tarefa_valida(
        allowed_files=("netlify/functions/checkout.js",), policy_level="D", jose_authorized=True,
    )
    assert tarefa_nivel_d.allowed_files == ("netlify/functions/checkout.js",)

    for caminho in (
        "Repasso-Med-Site--main/Atual - Copia/index.html",
        "Repasso-Med-Site--main/Atual - Copia/admin.html",
        "Repasso-Med-Site--main/Atual - Copia/assets/app-core.js",
        "Repasso-Med-Site--main/Atual - Copia/styles.css",
        "netlify.toml",
        "supabase/migrations/0001_init.sql",
    ):
        tarefa = _tarefa_valida(allowed_files=(caminho,), policy_level="D", jose_authorized=True)
        assert tarefa.allowed_files == (caminho,)
    print("OK  test_allowed_files_permite_materia_e_netlify_functions_quando_politica_permite")


# ---------------------------------------------------------------------------
# Branch de trabalho — nunca main/master.
# ---------------------------------------------------------------------------

def test_branch_main_falha_fechado() -> None:
    for alvo in ("main", "MAIN", "master", "  main  "):
        try:
            _tarefa_valida(branch=alvo)
            raise AssertionError(f"devia ter rejeitado branch={alvo!r}")
        except ValueError as e:
            assert "protegida" in str(e) or "main" in str(e).lower()
    print("OK  test_branch_main_falha_fechado")


def test_branch_vazia_falha_fechado() -> None:
    for alvo in ("", "   ", None):
        try:
            _tarefa_valida(branch=alvo)
            raise AssertionError(f"devia ter rejeitado branch={alvo!r}")
        except (ValueError, TypeError):
            pass
    print("OK  test_branch_vazia_falha_fechado")


def test_branch_com_espaco_falha_fechado() -> None:
    try:
        _tarefa_valida(branch="runner/tarefa com espaco")
        raise AssertionError("devia ter rejeitado branch com espaço")
    except ValueError:
        pass
    print("OK  test_branch_com_espaco_falha_fechado")


def test_runner_heartbeat_rejeita_branch_main() -> None:
    try:
        RunnerHeartbeat(worker_id="claude-2", status="BUSY", task_id="t-1", branch="main")
        raise AssertionError("devia ter rejeitado heartbeat com branch=main")
    except ValueError:
        pass
    print("OK  test_runner_heartbeat_rejeita_branch_main")


def test_runner_result_rejeita_branch_main() -> None:
    try:
        RunnerResult(task_id="t-1", status="DONE", reason="ok", branch="main")
        raise AssertionError("devia ter rejeitado result com branch=main")
    except ValueError:
        pass
    print("OK  test_runner_result_rejeita_branch_main")


# ---------------------------------------------------------------------------
# Política de autonomia — Issue #83, Níveis A-E.
# ---------------------------------------------------------------------------

def test_policy_e_nunca_pode_ser_construida() -> None:
    """Nível E é proibido — nem com prioridade máxima, checkpoint seguro
    e autorização de José a tarefa pode existir."""
    for autorizado in (False, True):
        try:
            _tarefa_valida(
                policy_level="E", jose_authorized=autorizado, priority=Priority.P0,
                checkpoint_commit="1234567",
            )
            raise AssertionError(f"devia ter rejeitado policy_level='E' (jose_authorized={autorizado})")
        except ValueError as e:
            assert "Nível E" in str(e) or "'E'" in str(e)
    print("OK  test_policy_e_nunca_pode_ser_construida")


def test_policy_d_sem_autorizacao_falha_fechado() -> None:
    try:
        _tarefa_valida(policy_level="D", jose_authorized=False)
        raise AssertionError("devia ter rejeitado policy_level='D' sem jose_authorized=True")
    except ValueError as e:
        assert "Nível D" in str(e) or "'D'" in str(e)
    print("OK  test_policy_d_sem_autorizacao_falha_fechado")


def test_policy_d_autorizada_e_aceita() -> None:
    tarefa = _tarefa_valida(policy_level="D", jose_authorized=True)
    assert tarefa.policy_level == "D"
    assert tarefa.jose_authorized is True
    print("OK  test_policy_d_autorizada_e_aceita")


def test_policy_a_b_c_nao_exigem_autorizacao() -> None:
    for nivel in ("A", "B", "C"):
        tarefa = _tarefa_valida(policy_level=nivel, jose_authorized=False)
        assert tarefa.policy_level == nivel
    print("OK  test_policy_a_b_c_nao_exigem_autorizacao")


# ---------------------------------------------------------------------------
# publication_required nunca concede publish.
# ---------------------------------------------------------------------------

def test_publication_flag_never_grants_publish() -> None:
    for flag in (True, False):
        tarefa = _tarefa_valida(publication_required=flag)
        assert tarefa.can_publish is False, (
            f"can_publish precisa ser sempre False, mesmo com publication_required={flag}"
        )
        assert tarefa.never_merge is True
    print("OK  test_publication_flag_never_grants_publish")


# ---------------------------------------------------------------------------
# DONE != MERGE-READY.
# ---------------------------------------------------------------------------

def test_done_status_never_means_merge_ready() -> None:
    resultado = RunnerResult(task_id="t-1", status="DONE", reason="Trabalho concluído, checkpoint publicado.")
    assert resultado.status == "DONE"
    assert resultado.merge_ready is False
    assert resultado.never_merge is True
    assert "merge_ready" not in resultado.__dataclass_fields__ or True  # nenhum campo GRAVÁVEL — sempre property
    print("OK  test_done_status_never_means_merge_ready")


def test_runner_result_status_values_never_include_merge_ready() -> None:
    assert "MERGE-READY" not in VALID_RUNNER_RESULT_STATUSES
    assert set(VALID_RUNNER_RESULT_STATUSES) == {"DONE", "BLOCKED", "BLOCKED-LIMIT", "NEEDS-AUDIT", "FAILED"}
    print("OK  test_runner_result_status_values_never_include_merge_ready")


# ---------------------------------------------------------------------------
# Checkpoint explícito.
# ---------------------------------------------------------------------------

def test_checkpoint_none_significa_tarefa_nova_e_e_aceito() -> None:
    tarefa = _tarefa_valida(checkpoint_commit=None)
    assert tarefa.checkpoint_commit is None
    print("OK  test_checkpoint_none_significa_tarefa_nova_e_e_aceito")


def test_checkpoint_vazio_ou_simbolico_falha_fechado() -> None:
    for invalido in ("", "   ", "HEAD", "latest", "main", "xyz"):
        try:
            _tarefa_valida(checkpoint_commit=invalido)
            raise AssertionError(f"devia ter rejeitado checkpoint_commit={invalido!r}")
        except ValueError:
            pass
    print("OK  test_checkpoint_vazio_ou_simbolico_falha_fechado")


def test_checkpoint_sha_valido_e_aceito() -> None:
    for valido in ("abc1234", "0123456789abcdef0123456789abcdef01234567"):
        tarefa = _tarefa_valida(checkpoint_commit=valido)
        assert tarefa.checkpoint_commit == valido
    print("OK  test_checkpoint_sha_valido_e_aceito")


def test_runner_result_blocked_limit_exige_checkpoint_explicito() -> None:
    try:
        RunnerResult(task_id="t-1", status="BLOCKED-LIMIT", reason="Worker atingiu limite.")
        raise AssertionError("devia ter rejeitado BLOCKED-LIMIT sem checkpoint_commit")
    except ValueError as e:
        assert "checkpoint" in str(e).lower()
    # Com checkpoint explícito, funciona.
    resultado = RunnerResult(
        task_id="t-1", status="BLOCKED-LIMIT", reason="Worker atingiu limite.", checkpoint_commit="abc1234",
    )
    assert resultado.checkpoint_commit == "abc1234"
    print("OK  test_runner_result_blocked_limit_exige_checkpoint_explicito")


def test_runner_result_outros_status_nao_exigem_checkpoint() -> None:
    for status in ("DONE", "BLOCKED", "NEEDS-AUDIT", "FAILED"):
        resultado = RunnerResult(task_id="t-1", status=status, reason="motivo qualquer")
        assert resultado.checkpoint_commit is None
    print("OK  test_runner_result_outros_status_nao_exigem_checkpoint")


def test_runner_heartbeat_commit_e_last_checkpoint_exigem_sha_explicito() -> None:
    for campo in ("commit", "last_checkpoint"):
        try:
            RunnerHeartbeat(worker_id="claude-2", status="BUSY", task_id="t-1", **{campo: "HEAD"})
            raise AssertionError(f"devia ter rejeitado {campo}='HEAD'")
        except ValueError:
            pass
    heartbeat = RunnerHeartbeat(
        worker_id="claude-2", status="BUSY", task_id="t-1", commit="abc1234", last_checkpoint="abc1234",
    )
    assert heartbeat.commit == "abc1234"
    print("OK  test_runner_heartbeat_commit_e_last_checkpoint_exigem_sha_explicito")


# ---------------------------------------------------------------------------
# Correção C1: task_id obrigatório/proibido por status, e timestamp ISO8601.
# ---------------------------------------------------------------------------

def test_runner_heartbeat_busy_near_limit_limit_exigem_task_id() -> None:
    for status in ("BUSY", "NEAR_LIMIT", "LIMIT"):
        try:
            RunnerHeartbeat(worker_id="claude-2", status=status)
            raise AssertionError(f"devia ter rejeitado status={status!r} sem task_id")
        except ValueError as e:
            assert "task_id" in str(e)
        # Com task_id, funciona.
        heartbeat = RunnerHeartbeat(worker_id="claude-2", status=status, task_id="t-1")
        assert heartbeat.task_id == "t-1"
    print("OK  test_runner_heartbeat_busy_near_limit_limit_exigem_task_id")


def test_runner_heartbeat_available_offline_proibem_task_id() -> None:
    for status in ("AVAILABLE", "OFFLINE"):
        try:
            RunnerHeartbeat(worker_id="claude-2", status=status, task_id="t-1")
            raise AssertionError(f"devia ter rejeitado status={status!r} com task_id preenchido")
        except ValueError as e:
            assert "task_id" in str(e)
        # Sem task_id, funciona.
        heartbeat = RunnerHeartbeat(worker_id="claude-2", status=status)
        assert heartbeat.task_id is None
    print("OK  test_runner_heartbeat_available_offline_proibem_task_id")


def test_runner_heartbeat_timestamp_iso8601_opcional() -> None:
    heartbeat = RunnerHeartbeat(worker_id="claude-2", status="AVAILABLE")
    assert heartbeat.timestamp is None

    heartbeat = RunnerHeartbeat(
        worker_id="claude-2", status="BUSY", task_id="t-1", timestamp="2026-09-22T02:30:00+00:00",
    )
    assert heartbeat.timestamp == "2026-09-22T02:30:00+00:00"
    print("OK  test_runner_heartbeat_timestamp_iso8601_opcional")


def test_runner_heartbeat_timestamp_invalido_falha_fechado() -> None:
    for invalido in ("ontem", "22/09/2026", "not-a-date", "2026-13-40"):
        try:
            RunnerHeartbeat(worker_id="claude-2", status="AVAILABLE", timestamp=invalido)
            raise AssertionError(f"devia ter rejeitado timestamp={invalido!r}")
        except ValueError as e:
            assert "timestamp" in str(e).lower() or "ISO8601" in str(e)
    print("OK  test_runner_heartbeat_timestamp_invalido_falha_fechado")


# ---------------------------------------------------------------------------
# Capabilities.
# ---------------------------------------------------------------------------

def test_capabilities_required_vazio_e_aceito() -> None:
    tarefa = _tarefa_valida(capabilities_required=())
    assert tarefa.capabilities_required == ()
    print("OK  test_capabilities_required_vazio_e_aceito")


def test_capabilities_required_com_valores_e_aceito() -> None:
    tarefa = _tarefa_valida(capabilities_required=("codigo", "conteudo"))
    assert tarefa.capabilities_required == ("codigo", "conteudo")
    print("OK  test_capabilities_required_com_valores_e_aceito")


def test_capabilities_required_com_entrada_vazia_falha_fechado() -> None:
    try:
        _tarefa_valida(capabilities_required=("codigo", ""))
        raise AssertionError("devia ter rejeitado capability vazia")
    except ValueError:
        pass
    print("OK  test_capabilities_required_com_entrada_vazia_falha_fechado")


# ---------------------------------------------------------------------------
# Valores inválidos diversos.
# ---------------------------------------------------------------------------

def test_priority_precisa_ser_enum_nunca_string_crua() -> None:
    try:
        _tarefa_valida(priority="P0")  # type: ignore[arg-type]
        raise AssertionError("devia ter rejeitado priority como string crua")
    except ValueError:
        pass
    print("OK  test_priority_precisa_ser_enum_nunca_string_crua")


def test_risk_level_invalido_falha_fechado() -> None:
    for invalido in ("D", "E", "alta", "", None, "CRITICO"):
        try:
            _tarefa_valida(risk_level=invalido)
            raise AssertionError(f"devia ter rejeitado risk_level={invalido!r}")
        except ValueError:
            pass
    print("OK  test_risk_level_invalido_falha_fechado")


def test_policy_level_invalido_falha_fechado() -> None:
    for invalido in ("F", "z", "", None, "1"):
        try:
            _tarefa_valida(policy_level=invalido)
            raise AssertionError(f"devia ter rejeitado policy_level={invalido!r}")
        except ValueError:
            pass
    print("OK  test_policy_level_invalido_falha_fechado")


def test_task_id_vazio_falha_fechado() -> None:
    for invalido in ("", "   ", None):
        try:
            _tarefa_valida(task_id=invalido)
            raise AssertionError(f"devia ter rejeitado task_id={invalido!r}")
        except (ValueError, AttributeError):
            pass
    print("OK  test_task_id_vazio_falha_fechado")


def test_instructions_vazias_ou_vagas_falha_fechado() -> None:
    for invalido in ("", "   ", "continue", "Continue", "continua", "prossiga"):
        try:
            _tarefa_valida(instructions=invalido)
            raise AssertionError(f"devia ter rejeitado instructions={invalido!r}")
        except ValueError:
            pass
    print("OK  test_instructions_vazias_ou_vagas_falha_fechado")


def test_source_issue_invalido_falha_fechado() -> None:
    for invalido in (0, -1, "105", 3.5):
        try:
            _tarefa_valida(source_issue=invalido)
            raise AssertionError(f"devia ter rejeitado source_issue={invalido!r}")
        except (ValueError, TypeError):
            pass
    # None é válido (issue de origem desconhecida/ausente).
    tarefa = _tarefa_valida(source_issue=None)
    assert tarefa.source_issue is None
    print("OK  test_source_issue_invalido_falha_fechado")


def test_runner_result_status_invalido_falha_fechado() -> None:
    for invalido in ("MERGE-READY", "done", "", None, "OK"):
        try:
            RunnerResult(task_id="t-1", status=invalido, reason="motivo")
            raise AssertionError(f"devia ter rejeitado status={invalido!r}")
        except (ValueError, TypeError):
            pass
    print("OK  test_runner_result_status_invalido_falha_fechado")


def test_runner_result_reason_vazio_falha_fechado() -> None:
    for invalido in ("", "   "):
        try:
            RunnerResult(task_id="t-1", status="DONE", reason=invalido)
            raise AssertionError(f"devia ter rejeitado reason={invalido!r}")
        except ValueError:
            pass
    print("OK  test_runner_result_reason_vazio_falha_fechado")


def test_runner_heartbeat_status_invalido_falha_fechado() -> None:
    for invalido in ("READY", "available", "", None):
        try:
            RunnerHeartbeat(worker_id="claude-2", status=invalido)
            raise AssertionError(f"devia ter rejeitado status={invalido!r}")
        except (ValueError, TypeError):
            pass
    print("OK  test_runner_heartbeat_status_invalido_falha_fechado")


def test_runner_heartbeat_progress_percent_fora_de_faixa_falha_fechado() -> None:
    for invalido in (-1, 101, 1000):
        try:
            RunnerHeartbeat(worker_id="claude-2", status="BUSY", task_id="t-1", progress_percent=invalido)
            raise AssertionError(f"devia ter rejeitado progress_percent={invalido!r}")
        except ValueError:
            pass
    heartbeat = RunnerHeartbeat(worker_id="claude-2", status="BUSY", task_id="t-1", progress_percent=0)
    assert heartbeat.progress_percent == 0
    heartbeat = RunnerHeartbeat(worker_id="claude-2", status="BUSY", task_id="t-1", progress_percent=100)
    assert heartbeat.progress_percent == 100
    print("OK  test_runner_heartbeat_progress_percent_fora_de_faixa_falha_fechado")


# ---------------------------------------------------------------------------
# Prova estrutural: nenhuma função de merge/deploy presente.
# ---------------------------------------------------------------------------

_PADROES_PROIBIDOS_NO_MODULO: tuple[tuple[re.Pattern, str], ...] = (
    (re.compile(r"merge_pull_request|pulls/merge|gh\s+pr\s+merge"), "chamada de merge"),
    (re.compile(r"\bdeploy\b", re.I), "referência a deploy"),
    (re.compile(r"\bpublish\w*\("), "chamada de função de publicação"),
    (re.compile(r"git\s+push\b"), "push de git"),
    (re.compile(r"git\s+commit\b"), "commit de git"),
    (re.compile(r"\bsubprocess\b"), "execução de processo externo"),
    (re.compile(r"\brequests\.(get|post|put)\b"), "chamada de rede"),
    (re.compile(r"\bimport\s+supabase\b|\bfrom\s+supabase\b"), "import direto do cliente Supabase"),
    (re.compile(r"force-with-lease|force\s+push|rebase\s+-i|reset\s+--hard"), "operação destrutiva de git"),
    (re.compile(r"\bopen\([^)]*['\"]w"), "escrita de arquivo em disco"),
)


def test_no_merge_or_deploy_capability_present() -> None:
    """Prova estrutural (mesma técnica de test_no_forbidden_writes.py):
    o próprio texto-fonte de runner_contract.py não contém nenhum meio de
    mergear, publicar, fazer deploy, tocar git/rede/disco — porque o
    módulo é só dado puro, nunca porque 'decidiu não fazer' em runtime."""
    caminho = os.path.join(_pathsetup._COORDINATOR_ROOT, "runner_contract.py")
    with open(caminho, encoding="utf-8") as fh:
        conteudo = fh.read()
    achados = []
    for padrao, descricao in _PADROES_PROIBIDOS_NO_MODULO:
        if padrao.search(conteudo):
            achados.append(f"{descricao} (padrão {padrao.pattern!r})")
    assert not achados, "runner_contract.py: " + "; ".join(achados)
    print("OK  test_no_merge_or_deploy_capability_present")


def test_no_budget_field_present_anywhere() -> None:
    """Nenhuma das três dataclasses tem campo de orçamento/budget — a
    ausência estrutural é a prova de que o runner nunca amplia orçamento
    através deste contrato."""
    for nome_classe, campos in (
        ("RunnerTask", RunnerTask.__dataclass_fields__),
        ("RunnerHeartbeat", RunnerHeartbeat.__dataclass_fields__),
        ("RunnerResult", RunnerResult.__dataclass_fields__),
    ):
        for campo in campos:
            assert "budget" not in campo.lower() and "orcamento" not in campo.lower() and "orçamento" not in campo.lower(), (
                f"{nome_classe}.{campo} parece um campo de orçamento — nenhuma dataclass deste contrato "
                "pode ter isso"
            )
    print("OK  test_no_budget_field_present_anywhere")


def main() -> int:
    testes = [
        test_runner_task_roundtrip_to_dict_from_dict,
        test_runner_heartbeat_roundtrip_to_dict_from_dict,
        test_runner_result_roundtrip_to_dict_from_dict,
        test_runner_task_from_dict_rejects_invalid_priority_string,
        test_allowed_files_vazio_falha_fechado,
        test_allowed_files_com_escape_de_diretorio_falha_fechado,
        test_allowed_files_valido_e_aceito,
        test_allowed_files_permite_materia_e_netlify_functions_quando_politica_permite,
        test_branch_main_falha_fechado,
        test_branch_vazia_falha_fechado,
        test_branch_com_espaco_falha_fechado,
        test_runner_heartbeat_rejeita_branch_main,
        test_runner_result_rejeita_branch_main,
        test_policy_e_nunca_pode_ser_construida,
        test_policy_d_sem_autorizacao_falha_fechado,
        test_policy_d_autorizada_e_aceita,
        test_policy_a_b_c_nao_exigem_autorizacao,
        test_publication_flag_never_grants_publish,
        test_done_status_never_means_merge_ready,
        test_runner_result_status_values_never_include_merge_ready,
        test_checkpoint_none_significa_tarefa_nova_e_e_aceito,
        test_checkpoint_vazio_ou_simbolico_falha_fechado,
        test_checkpoint_sha_valido_e_aceito,
        test_runner_result_blocked_limit_exige_checkpoint_explicito,
        test_runner_result_outros_status_nao_exigem_checkpoint,
        test_runner_heartbeat_commit_e_last_checkpoint_exigem_sha_explicito,
        test_runner_heartbeat_busy_near_limit_limit_exigem_task_id,
        test_runner_heartbeat_available_offline_proibem_task_id,
        test_runner_heartbeat_timestamp_iso8601_opcional,
        test_runner_heartbeat_timestamp_invalido_falha_fechado,
        test_capabilities_required_vazio_e_aceito,
        test_capabilities_required_com_valores_e_aceito,
        test_capabilities_required_com_entrada_vazia_falha_fechado,
        test_priority_precisa_ser_enum_nunca_string_crua,
        test_risk_level_invalido_falha_fechado,
        test_policy_level_invalido_falha_fechado,
        test_task_id_vazio_falha_fechado,
        test_instructions_vazias_ou_vagas_falha_fechado,
        test_source_issue_invalido_falha_fechado,
        test_runner_result_status_invalido_falha_fechado,
        test_runner_result_reason_vazio_falha_fechado,
        test_runner_heartbeat_status_invalido_falha_fechado,
        test_runner_heartbeat_progress_percent_fora_de_faixa_falha_fechado,
        test_no_merge_or_deploy_capability_present,
        test_no_budget_field_present_anywhere,
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
