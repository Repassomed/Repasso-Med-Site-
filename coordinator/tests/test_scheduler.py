"""Scheduler determinístico / fila lógica — Issue #105, Fase A.

Cobre os critérios de aceitação 2-7 e 10 da Issue #105 em fixture (sem
execução real — isso é Fase D/E, fora desta rodada) e os casos extras
pedidos no design DESIGN-READY publicado na própria Issue #105:
concorrência (mesma decisão em chamadas repetidas), dois workers
disputando a mesma tarefa, colisão de arquivo, retomada sem duplicar
trabalho, todos LIMIT (pool pausado) e nunca merge/deploy.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.classify import Priority
from coordinator.scheduler import (
    QueueDecision,
    TaskRecord,
    avaliar_handoff_de_tarefa,
    escolher_proxima_atribuicao,
    load_tasks_from_tasks_json,
    proxima_tarefa_pronta,
    reprocessar_retorno,
)
from coordinator.worker_ops import WorkerRecord


def _worker(worker_id: str, *, status: str = "AVAILABLE", capabilities=(), current_task=None,
            type_: str = "human_session", can_execute: bool = True) -> WorkerRecord:
    return WorkerRecord(
        worker_id=worker_id, display_name=worker_id, type=type_, status=status,
        capabilities=tuple(capabilities), current_task=current_task, can_execute=can_execute,
    )


def _tarefa(id_: str, *, estado: str = "READY", area: str | None = "materia",
            agente: str | None = None, arquivos=(), dependencias=(),
            prioridade_declarada: Priority | None = None) -> TaskRecord:
    return TaskRecord(
        id=id_, estado=estado, area=area, agente=agente,
        arquivos=tuple(arquivos), dependencias=tuple(dependencias),
        prioridade_declarada=prioridade_declarada,
    )


# ---------------------------------------------------------------------
# Prioridade derivada (área -> tipo -> prioridade padrão, igual a classify.py)
# ---------------------------------------------------------------------

def test_priority_derived_from_area_matches_classify_defaults() -> None:
    assert _tarefa("t1", area="materia").priority == Priority.P1
    assert _tarefa("t2", area="assets").priority == Priority.P2
    assert _tarefa("t3", area="documentacao").priority == Priority.P2
    assert _tarefa("t4", area="ferramentas").priority == Priority.P3
    assert _tarefa("t5", area="infraestrutura").priority == Priority.P3
    assert _tarefa("t6", area=None).priority == Priority.P2
    print("OK  test_priority_derived_from_area_matches_classify_defaults")


def test_prioridade_declarada_vence_o_mapeamento_padrao() -> None:
    """Issue #84 §1: 'se José declarar prioridade, ela vence a fila
    automática' — mesmo uma tarefa de área 'materia' (padrão P1) pode ser
    declarada P0 explicitamente."""
    t = _tarefa("urgente", area="materia", prioridade_declarada=Priority.P0)
    assert t.priority == Priority.P0
    print("OK  test_prioridade_declarada_vence_o_mapeamento_padrao")


# ---------------------------------------------------------------------
# proxima_tarefa_pronta: dependências, colisão de arquivo, ordenação
# ---------------------------------------------------------------------

def test_tarefa_com_dependencia_nao_concluida_fica_fora_da_fila() -> None:
    tarefas = [
        _tarefa("base", estado="IN-PROGRESS", arquivos=["a.html"]),
        _tarefa("segue", estado="READY", dependencias=["base"], arquivos=["b.html"]),
    ]
    assert proxima_tarefa_pronta(tarefas) == []
    print("OK  test_tarefa_com_dependencia_nao_concluida_fica_fora_da_fila")


def test_tarefa_libera_quando_dependencia_termina() -> None:
    tarefas = [
        _tarefa("base", estado="DONE", arquivos=["a.html"]),
        _tarefa("segue", estado="READY", dependencias=["base"], arquivos=["b.html"]),
    ]
    prontas = proxima_tarefa_pronta(tarefas)
    assert [t.id for t in prontas] == ["segue"]
    print("OK  test_tarefa_libera_quando_dependencia_termina")


def test_tarefa_com_dependencia_inexistente_nunca_e_oferecida() -> None:
    tarefas = [_tarefa("orfa", estado="READY", dependencias=["nao-existe"])]
    assert proxima_tarefa_pronta(tarefas) == []
    print("OK  test_tarefa_com_dependencia_inexistente_nunca_e_oferecida")


def test_colisao_de_arquivo_com_tarefa_ativa_bloqueia_a_fila() -> None:
    """Lei 3 (#82/#85): nenhuma tarefa READY que toque um arquivo já
    reservado por uma tarefa IN-PROGRESS/BLOCKED-LIMIT entra na fila."""
    tarefas = [
        _tarefa("ativa", estado="IN-PROGRESS", arquivos=["materias/x.html"]),
        _tarefa("colide", estado="READY", arquivos=["materias/x.html"]),
        _tarefa("livre", estado="READY", arquivos=["materias/y.html"]),
    ]
    prontas = proxima_tarefa_pronta(tarefas)
    assert [t.id for t in prontas] == ["livre"]
    print("OK  test_colisao_de_arquivo_com_tarefa_ativa_bloqueia_a_fila")


def test_colisao_so_conta_para_tarefas_ativas_nao_para_needs_audit() -> None:
    """NEEDS-AUDIT/MERGE-READY/DONE não reservam mais o arquivo — só
    IN-PROGRESS/BLOCKED-LIMIT reservam (coordination/README.md, 'Reserva
    de arquivos')."""
    tarefas = [
        _tarefa("em-auditoria", estado="NEEDS-AUDIT", arquivos=["materias/x.html"]),
        _tarefa("nova", estado="READY", arquivos=["materias/x.html"]),
    ]
    prontas = proxima_tarefa_pronta(tarefas)
    assert [t.id for t in prontas] == ["nova"]
    print("OK  test_colisao_so_conta_para_tarefas_ativas_nao_para_needs_audit")


def test_fila_ordenada_por_prioridade_depois_por_id() -> None:
    tarefas = [
        _tarefa("baixa", area="ferramentas"),       # P3
        _tarefa("alta", area="materia"),            # P1
        _tarefa("media-b", area="assets"),          # P2
        _tarefa("media-a", area="documentacao"),    # P2
    ]
    ordem = [t.id for t in proxima_tarefa_pronta(tarefas)]
    assert ordem == ["alta", "media-a", "media-b", "baixa"], ordem
    print("OK  test_fila_ordenada_por_prioridade_depois_por_id")


def test_fila_e_deterministica_independente_da_ordem_de_entrada() -> None:
    a = _tarefa("alta", area="materia")
    b = _tarefa("baixa", area="ferramentas")
    assert [t.id for t in proxima_tarefa_pronta([a, b])] == [t.id for t in proxima_tarefa_pronta([b, a])]
    print("OK  test_fila_e_deterministica_independente_da_ordem_de_entrada")


# ---------------------------------------------------------------------
# escolher_proxima_atribuicao — critérios 2, 6, 7, 10 da Issue #105
# ---------------------------------------------------------------------

def test_sem_tarefa_pronta_devolve_wait() -> None:
    decisao = escolher_proxima_atribuicao([], [_worker("claude-4")])
    assert decisao.action == "WAIT"
    assert decisao.task_id is None
    print("OK  test_sem_tarefa_pronta_devolve_wait")


def test_sem_worker_disponivel_devolve_wait_com_tarefa_identificada() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    decisao = escolher_proxima_atribuicao(tarefas, [_worker("claude-1", status="BUSY")])
    assert decisao.action == "WAIT"
    assert decisao.task_id == "t1"
    assert decisao.worker_id is None
    print("OK  test_sem_worker_disponivel_devolve_wait_com_tarefa_identificada")


def test_oferece_tarefa_de_maior_prioridade_ao_worker_disponivel() -> None:
    tarefas = [_tarefa("baixa", area="ferramentas"), _tarefa("alta", area="materia")]
    decisao = escolher_proxima_atribuicao(tarefas, [_worker("claude-1")])
    assert decisao.action == "OFFER"
    assert decisao.task_id == "alta"
    assert decisao.worker_id == "claude-1"
    print("OK  test_oferece_tarefa_de_maior_prioridade_ao_worker_disponivel")


def test_especializacao_desempata_entre_workers_disponiveis() -> None:
    tarefas = [_tarefa("t1", area="ferramentas")]
    generico = _worker("claude-1")
    especialista = _worker("claude-2", capabilities=("ferramentas",))
    decisao = escolher_proxima_atribuicao(tarefas, [generico, especialista])
    assert decisao.worker_id == "claude-2"
    print("OK  test_especializacao_desempata_entre_workers_disponiveis")


def test_worker_com_status_available_mas_current_task_preenchido_nunca_e_candidato() -> None:
    """Defesa em profundidade da regra #82.1 (uma tarefa ativa por vez):
    mesmo que o registro esteja inconsistente (AVAILABLE + current_task
    preenchido), o scheduler nunca oferece uma segunda tarefa a ele."""
    tarefas = [_tarefa("t1", area="materia")]
    inconsistente = _worker("claude-1", current_task="outra-tarefa")
    decisao = escolher_proxima_atribuicao(tarefas, [inconsistente])
    assert decisao.action == "WAIT"
    assert decisao.worker_id is None
    print("OK  test_worker_com_status_available_mas_current_task_preenchido_nunca_e_candidato")


def test_worker_busy_nunca_e_ofertado() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    decisao = escolher_proxima_atribuicao(tarefas, [_worker("claude-1", status="BUSY")])
    assert decisao.action == "WAIT"
    print("OK  test_worker_busy_nunca_e_ofertado")


def test_auditor_nunca_e_candidato_a_executar_tarefa() -> None:
    """chatgpt-auditor (ou qualquer type='auditor') nunca executa tarefa —
    can_execute=False é a garantia estrutural (worker_ops.py)."""
    tarefas = [_tarefa("t1", area="materia")]
    auditor = _worker("chatgpt-auditor", type_="auditor", can_execute=False)
    decisao = escolher_proxima_atribuicao(tarefas, [auditor])
    assert decisao.action == "WAIT"
    assert decisao.worker_id is None
    print("OK  test_auditor_nunca_e_candidato_a_executar_tarefa")


def test_todos_limit_ou_offline_produz_pool_paused_sem_olhar_a_fila() -> None:
    """Critério 5 da Issue #105: todos LIMIT/OFFLINE -> pausa global, sem
    tentar oferecer nada (mesmo havendo tarefa READY pronta)."""
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1", status="LIMIT"), _worker("claude-2", status="OFFLINE")]
    decisao = escolher_proxima_atribuicao(tarefas, workers)
    assert decisao.action == "POOL_PAUSED"
    print("OK  test_todos_limit_ou_offline_produz_pool_paused_sem_olhar_a_fila")


def test_pool_nao_pausa_se_pelo_menos_um_executor_disponivel() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1", status="LIMIT"), _worker("claude-2", status="AVAILABLE")]
    decisao = escolher_proxima_atribuicao(tarefas, workers)
    assert decisao.action == "OFFER"
    assert decisao.worker_id == "claude-2"
    print("OK  test_pool_nao_pausa_se_pelo_menos_um_executor_disponivel")


def test_chamada_repetida_com_mesmo_snapshot_e_deterministica() -> None:
    """Concorrência (seção 6 do design #105-A): duas chamadas com o MESMO
    snapshot sempre devolvem a MESMA decisão — a resolução de qual das
    duas 'vence' de verdade (aplicar a decisão) é responsabilidade de
    quem escreve o estado (claim() atômico, Fase E), não deste módulo."""
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1"), _worker("claude-2")]
    d1 = escolher_proxima_atribuicao(tarefas, workers)
    d2 = escolher_proxima_atribuicao(tarefas, workers)
    assert d1.to_dict() == d2.to_dict()
    print("OK  test_chamada_repetida_com_mesmo_snapshot_e_deterministica")


def test_dois_workers_disponiveis_para_mesma_tarefa_so_um_e_ofertado() -> None:
    """Dois workers tentando a mesma tarefa: a decisão pura só nomeia UM
    (o primeiro por especialização/ordem) — nunca 'oferece' a mesma
    tarefa a dois workers na mesma resposta."""
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1"), _worker("claude-2")]
    decisao = escolher_proxima_atribuicao(tarefas, workers)
    assert decisao.action == "OFFER"
    assert decisao.worker_id in ("claude-1", "claude-2")
    # Nunca os dois: QueueDecision só carrega um único worker_id.
    assert isinstance(decisao.worker_id, str)
    print("OK  test_dois_workers_disponiveis_para_mesma_tarefa_so_um_e_ofertado")


# ---------------------------------------------------------------------
# avaliar_handoff_de_tarefa — casca sobre handoff.decidir_handoff
# ---------------------------------------------------------------------

def test_handoff_p1_com_checkpoint_seguro_e_worker_disponivel_recomenda_handoff() -> None:
    tarefa = _tarefa("t1", area="materia")  # P1
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2")]
    )
    assert decisao.action == "HANDOFF"
    assert decisao.novo_worker == "claude-2"
    print("OK  test_handoff_p1_com_checkpoint_seguro_e_worker_disponivel_recomenda_handoff")


def test_handoff_p3_prefere_esperar_mesmo_com_worker_disponivel() -> None:
    tarefa = _tarefa("t1", area="ferramentas")  # P3
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2")]
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_p3_prefere_esperar_mesmo_com_worker_disponivel")


def test_handoff_sem_checkpoint_seguro_nunca_transfere() -> None:
    tarefa = _tarefa("t1", area="materia")  # P1
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=False, workers=[_worker("claude-2")]
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_sem_checkpoint_seguro_nunca_transfere")


def test_handoff_commit_inexistente_e_responsabilidade_de_quem_monta_checkpoint_seguro() -> None:
    """Este módulo não valida se o commit realmente existe no repositório
    — recebe `checkpoint_seguro` já resolvido por quem chama (Fase A não
    inclui I/O de git; isso é Fase D). Documentado aqui como prova de que
    'sem checkpoint_seguro=True explícito, nunca HANDOFF' — o caminho
    seguro por padrão."""
    tarefa = _tarefa("t1", area="materia")
    decisao = avaliar_handoff_de_tarefa(tarefa, checkpoint_seguro=False, workers=[])
    assert decisao.action == "WAIT"
    print("OK  test_handoff_commit_inexistente_e_responsabilidade_de_quem_monta_checkpoint_seguro")


# ---------------------------------------------------------------------
# reprocessar_retorno — critérios 4 e 6 da Issue #105
# ---------------------------------------------------------------------

def test_worker_retomando_tarefa_ainda_blocked_limit_recebe_a_mesma_tarefa() -> None:
    original = _tarefa("t1", estado="BLOCKED-LIMIT", agente="claude-1", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="claude-1", tarefa_original=original,
        tarefas=[original], workers=[_worker("claude-1")],
    )
    assert resultado.retoma_tarefa_id == "t1"
    assert resultado.proxima_oferta is None
    print("OK  test_worker_retomando_tarefa_ainda_blocked_limit_recebe_a_mesma_tarefa")


def test_worker_retomando_tarefa_ja_concluida_recebe_proxima_da_fila_nunca_refaz() -> None:
    """Critério 4 da Issue #105: worker que retorna não refaz tarefa
    concluída por outro — recebe a próxima READY compatível."""
    concluida = _tarefa("t1", estado="DONE", agente="claude-3", area="materia")
    proxima = _tarefa("t2", estado="READY", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="claude-1", tarefa_original=concluida,
        tarefas=[concluida, proxima], workers=[_worker("claude-1")],
    )
    assert resultado.retoma_tarefa_id is None
    assert resultado.proxima_oferta is not None
    assert resultado.proxima_oferta.action == "OFFER"
    assert resultado.proxima_oferta.task_id == "t2"
    print("OK  test_worker_retomando_tarefa_ja_concluida_recebe_proxima_da_fila_nunca_refaz")


def test_worker_retomando_tarefa_ja_assumida_por_outro_nao_duplica() -> None:
    assumida_por_outro = _tarefa("t1", estado="BLOCKED-LIMIT", agente="claude-2", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="claude-1", tarefa_original=assumida_por_outro,
        tarefas=[assumida_por_outro], workers=[_worker("claude-1")],
    )
    assert resultado.retoma_tarefa_id is None
    assert "claude-2" in resultado.motivo
    print("OK  test_worker_retomando_tarefa_ja_assumida_por_outro_nao_duplica")


def test_worker_retomando_sem_tarefa_anterior_vai_direto_para_fila() -> None:
    proxima = _tarefa("t1", estado="READY", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="claude-4", tarefa_original=None,
        tarefas=[proxima], workers=[_worker("claude-4")],
    )
    assert resultado.retoma_tarefa_id is None
    assert resultado.proxima_oferta.task_id == "t1"
    print("OK  test_worker_retomando_sem_tarefa_anterior_vai_direto_para_fila")


def test_retorno_de_worker_com_pool_todo_limit_produz_pool_paused_via_fila() -> None:
    """Critério 6 da Issue #105: retorno reativa a fila — mas se o
    RESTANTE do pool ainda está todo LIMIT/OFFLINE (o worker que volta é
    'auditor'/não-executor, por exemplo), a fila reprocessada continua
    pausada, nunca oferece algo com um pool inconsistente."""
    proxima = _tarefa("t1", estado="READY", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="chatgpt-auditor", tarefa_original=None,
        tarefas=[proxima],
        workers=[_worker("chatgpt-auditor", type_="auditor", can_execute=False),
                 _worker("claude-1", status="LIMIT")],
    )
    assert resultado.proxima_oferta.action == "POOL_PAUSED"
    print("OK  test_retorno_de_worker_com_pool_todo_limit_produz_pool_paused_via_fila")


# ---------------------------------------------------------------------
# load_tasks_from_tasks_json — leitura real, nunca escrita
# ---------------------------------------------------------------------

def test_load_tasks_from_tasks_json_e_somente_leitura_e_nao_quebra() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "tasks.json")
        with open(caminho, "w", encoding="utf-8") as fh:
            json.dump(
                {"tarefas": [{"id": "a", "estado": "READY", "area": "materia",
                              "agente": None, "arquivos": ["x.html"], "dependencias": []}]},
                fh,
            )
        mtime_antes = os.path.getmtime(caminho)
        tarefas = load_tasks_from_tasks_json(caminho)
        mtime_depois = os.path.getmtime(caminho)
    assert mtime_antes == mtime_depois, "load_tasks_from_tasks_json nunca deve escrever no arquivo"
    assert tarefas[0].id == "a"
    assert tarefas[0].priority == Priority.P1
    print("OK  test_load_tasks_from_tasks_json_e_somente_leitura_e_nao_quebra")


def test_real_repo_tasks_json_carrega_e_produz_fila_sem_quebrar() -> None:
    """Prova de integração: o coordination/tasks.json de VERDADE deste
    repositório carrega sem erro nesta camada nova, e a fila produzida
    nunca inclui uma tarefa cujo estado não seja READY."""
    caminho_real = os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")
    tarefas = load_tasks_from_tasks_json(caminho_real)
    assert tarefas, "coordination/tasks.json real não pode ficar vazio"
    fila = proxima_tarefa_pronta(tarefas)
    assert all(t.estado == "READY" for t in fila)
    print("OK  test_real_repo_tasks_json_carrega_e_produz_fila_sem_quebrar")


def main() -> int:
    testes = [
        test_priority_derived_from_area_matches_classify_defaults,
        test_prioridade_declarada_vence_o_mapeamento_padrao,
        test_tarefa_com_dependencia_nao_concluida_fica_fora_da_fila,
        test_tarefa_libera_quando_dependencia_termina,
        test_tarefa_com_dependencia_inexistente_nunca_e_oferecida,
        test_colisao_de_arquivo_com_tarefa_ativa_bloqueia_a_fila,
        test_colisao_so_conta_para_tarefas_ativas_nao_para_needs_audit,
        test_fila_ordenada_por_prioridade_depois_por_id,
        test_fila_e_deterministica_independente_da_ordem_de_entrada,
        test_sem_tarefa_pronta_devolve_wait,
        test_sem_worker_disponivel_devolve_wait_com_tarefa_identificada,
        test_oferece_tarefa_de_maior_prioridade_ao_worker_disponivel,
        test_especializacao_desempata_entre_workers_disponiveis,
        test_worker_com_status_available_mas_current_task_preenchido_nunca_e_candidato,
        test_worker_busy_nunca_e_ofertado,
        test_auditor_nunca_e_candidato_a_executar_tarefa,
        test_todos_limit_ou_offline_produz_pool_paused_sem_olhar_a_fila,
        test_pool_nao_pausa_se_pelo_menos_um_executor_disponivel,
        test_chamada_repetida_com_mesmo_snapshot_e_deterministica,
        test_dois_workers_disponiveis_para_mesma_tarefa_so_um_e_ofertado,
        test_handoff_p1_com_checkpoint_seguro_e_worker_disponivel_recomenda_handoff,
        test_handoff_p3_prefere_esperar_mesmo_com_worker_disponivel,
        test_handoff_sem_checkpoint_seguro_nunca_transfere,
        test_handoff_commit_inexistente_e_responsabilidade_de_quem_monta_checkpoint_seguro,
        test_worker_retomando_tarefa_ainda_blocked_limit_recebe_a_mesma_tarefa,
        test_worker_retomando_tarefa_ja_concluida_recebe_proxima_da_fila_nunca_refaz,
        test_worker_retomando_tarefa_ja_assumida_por_outro_nao_duplica,
        test_worker_retomando_sem_tarefa_anterior_vai_direto_para_fila,
        test_retorno_de_worker_com_pool_todo_limit_produz_pool_paused_via_fila,
        test_load_tasks_from_tasks_json_e_somente_leitura_e_nao_quebra,
        test_real_repo_tasks_json_carrega_e_produz_fila_sem_quebrar,
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
