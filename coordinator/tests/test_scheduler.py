"""Scheduler determinístico / fila lógica — Issue #105, Fase A.

Cobre os critérios de aceitação 2-7 e 10 da Issue #105 em fixture (sem
execução real — isso é Fase D/E, fora desta rodada), os casos extras
pedidos no design DESIGN-READY publicado na própria Issue #105, e as
correções B1-B5 da 1ª auditoria independente do PR #108 (HEAD 17eb734):
capabilities reais (B2), decisão inteligente de handoff considerando
progresso/custo/risco/orçamento (B3), exclusão do próprio dono da lista
de candidatos a handoff (B4) e desempate determinístico independente da
ordem da lista de workers (B5). B1 (autoria) é corrigido em
coordination/tasks.json e no corpo do PR, não neste módulo.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

from . import _pathsetup  # noqa: F401
from coordinator.classify import Priority
from coordinator.scheduler import (
    HandoffContext,
    QueueDecision,
    TaskRecord,
    avaliar_handoff_de_tarefa,
    escolher_proxima_atribuicao,
    load_tasks_from_tasks_json,
    proxima_tarefa_pronta,
    reprocessar_retorno,
)
from coordinator.worker_ops import WorkerRecord, default_seed_workers

# As mesmas capabilities REAIS que default_seed_workers() usa para os
# workers humanos — nunca capability artificial igual ao nome da área
# (era exatamente o bug do B2 da auditoria do PR #108).
_CAP_HUMANO = ("conteudo", "codigo")


def _worker(worker_id: str, *, display_name: str | None = None, status: str = "AVAILABLE",
            capabilities=(), current_task=None, type_: str = "human_session",
            can_execute: bool = True) -> WorkerRecord:
    nome = display_name if display_name is not None else worker_id.replace("-", " ").title()
    return WorkerRecord(
        worker_id=worker_id, display_name=nome, type=type_, status=status,
        capabilities=tuple(capabilities), current_task=current_task, can_execute=can_execute,
    )


def _tarefa(id_: str, *, estado: str = "READY", area: str | None = "materia",
            agente: str | None = None, arquivos=(), dependencias=(),
            prioridade_declarada: Priority | None = None,
            capabilities_required=()) -> TaskRecord:
    return TaskRecord(
        id=id_, estado=estado, area=area, agente=agente,
        arquivos=tuple(arquivos), dependencias=tuple(dependencias),
        prioridade_declarada=prioridade_declarada,
        capabilities_required=tuple(capabilities_required),
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
    t = _tarefa("urgente", area="materia", prioridade_declarada=Priority.P0)
    assert t.priority == Priority.P0
    print("OK  test_prioridade_declarada_vence_o_mapeamento_padrao")


# ---------------------------------------------------------------------
# capacidades_necessarias (B2)
# ---------------------------------------------------------------------

def test_capacidade_necessaria_derivada_da_area_real() -> None:
    assert _tarefa("t1", area="materia").capacidades_necessarias == frozenset({"conteudo"})
    assert _tarefa("t2", area="assets").capacidades_necessarias == frozenset({"conteudo"})
    assert _tarefa("t3", area="documentacao").capacidades_necessarias == frozenset({"conteudo"})
    assert _tarefa("t4", area="infraestrutura").capacidades_necessarias == frozenset({"codigo"})
    assert _tarefa("t5", area="ferramentas").capacidades_necessarias == frozenset({"codigo"})
    print("OK  test_capacidade_necessaria_derivada_da_area_real")


def test_area_desconhecida_nao_exige_capability_nenhuma() -> None:
    assert _tarefa("t1", area=None).capacidades_necessarias == frozenset()
    assert _tarefa("t2", area="area-nova-nao-mapeada").capacidades_necessarias == frozenset()
    print("OK  test_area_desconhecida_nao_exige_capability_nenhuma")


def test_capabilities_required_explicito_vence_o_mapeamento_de_area() -> None:
    t = _tarefa("t1", area="materia", capabilities_required=("auditoria",))
    assert t.capacidades_necessarias == frozenset({"auditoria"})
    print("OK  test_capabilities_required_explicito_vence_o_mapeamento_de_area")


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
    tarefas = [
        _tarefa("ativa", estado="IN-PROGRESS", arquivos=["materias/x.html"]),
        _tarefa("colide", estado="READY", arquivos=["materias/x.html"]),
        _tarefa("livre", estado="READY", arquivos=["materias/y.html"]),
    ]
    prontas = proxima_tarefa_pronta(tarefas)
    assert [t.id for t in prontas] == ["livre"]
    print("OK  test_colisao_de_arquivo_com_tarefa_ativa_bloqueia_a_fila")


def test_colisao_so_conta_para_tarefas_ativas_nao_para_needs_audit() -> None:
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
# escolher_proxima_atribuicao — critérios 2, 6, 7, 10 e B2/B5 da Issue #105
# ---------------------------------------------------------------------

def test_sem_tarefa_pronta_devolve_wait() -> None:
    decisao = escolher_proxima_atribuicao([], [_worker("claude-4", capabilities=_CAP_HUMANO)])
    assert decisao.action == "WAIT"
    assert decisao.task_id is None
    print("OK  test_sem_tarefa_pronta_devolve_wait")


def test_sem_worker_disponivel_devolve_wait_com_tarefa_identificada() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    decisao = escolher_proxima_atribuicao(tarefas, [_worker("claude-1", status="BUSY", capabilities=_CAP_HUMANO)])
    assert decisao.action == "WAIT"
    assert decisao.task_id == "t1"
    assert decisao.worker_id is None
    print("OK  test_sem_worker_disponivel_devolve_wait_com_tarefa_identificada")


def test_oferece_tarefa_de_maior_prioridade_ao_worker_disponivel() -> None:
    tarefas = [_tarefa("baixa", area="ferramentas"), _tarefa("alta", area="materia")]
    decisao = escolher_proxima_atribuicao(tarefas, [_worker("claude-1", capabilities=_CAP_HUMANO)])
    assert decisao.action == "OFFER"
    assert decisao.task_id == "alta"
    assert decisao.worker_id == "claude-1"
    print("OK  test_oferece_tarefa_de_maior_prioridade_ao_worker_disponivel")


def test_worker_sem_capability_compativel_nunca_recebe_a_oferta() -> None:
    """B2: compatibilidade agora é REQUISITO, não só desempate — um worker
    AVAILABLE sem a capability necessária nunca é candidato."""
    tarefas = [_tarefa("t1", area="materia")]  # exige "conteudo"
    sem_capability = _worker("claude-1", capabilities=("codigo",))  # só "codigo"
    decisao = escolher_proxima_atribuicao(tarefas, [sem_capability])
    assert decisao.action == "WAIT"
    assert decisao.task_id == "t1"
    assert decisao.worker_id is None
    print("OK  test_worker_sem_capability_compativel_nunca_recebe_a_oferta")


def test_worker_humano_real_serve_tanto_materia_quanto_infraestrutura() -> None:
    """Prova positiva do B2 com as capabilities REAIS dos seeds: um
    worker humano típico ("conteudo", "codigo") é compatível com AMBAS as
    famílias de área, ao contrário do bug antigo (tarefa.area in
    w.capabilities), que nunca batia."""
    humano = _worker("claude-1", capabilities=_CAP_HUMANO)
    materia = escolher_proxima_atribuicao([_tarefa("m", area="materia")], [humano])
    infra = escolher_proxima_atribuicao([_tarefa("i", area="infraestrutura")], [humano])
    assert materia.action == "OFFER" and materia.worker_id == "claude-1"
    assert infra.action == "OFFER" and infra.worker_id == "claude-1"
    print("OK  test_worker_humano_real_serve_tanto_materia_quanto_infraestrutura")


def test_area_desconhecida_nao_bloqueia_por_capability() -> None:
    tarefas = [_tarefa("t1", area=None)]
    sem_nenhuma_capability = _worker("claude-1", capabilities=())
    decisao = escolher_proxima_atribuicao(tarefas, [sem_nenhuma_capability])
    assert decisao.action == "OFFER"
    print("OK  test_area_desconhecida_nao_bloqueia_por_capability")


def test_especializacao_extra_desempata_entre_workers_compativeis() -> None:
    """B5: os dois já são compatíveis (têm 'codigo'); o desempate agora é
    a ordenação determinística — worker com a área declarada também como
    capability extra vence."""
    tarefas = [_tarefa("t1", area="ferramentas")]
    generico = _worker("claude-1", capabilities=("codigo",))
    especialista = _worker("claude-2", capabilities=("codigo", "ferramentas"))
    decisao = escolher_proxima_atribuicao(tarefas, [generico, especialista])
    assert decisao.worker_id == "claude-2"
    print("OK  test_especializacao_extra_desempata_entre_workers_compativeis")


def test_desempate_e_independente_da_ordem_da_lista_de_workers() -> None:
    """B5: a auditoria pediu explicitamente este teste — mesmo conjunto de
    workers, ordens diferentes na lista de entrada, mesma decisão."""
    tarefas = [_tarefa("t1", area="materia")]
    a = _worker("claude-1", capabilities=_CAP_HUMANO)
    b = _worker("claude-2", capabilities=_CAP_HUMANO)
    c = _worker("claude-3", capabilities=_CAP_HUMANO)
    d1 = escolher_proxima_atribuicao(tarefas, [a, b, c])
    d2 = escolher_proxima_atribuicao(tarefas, [c, a, b])
    d3 = escolher_proxima_atribuicao(tarefas, [b, c, a])
    assert d1.worker_id == d2.worker_id == d3.worker_id == "claude-1", (d1.worker_id, d2.worker_id, d3.worker_id)
    print("OK  test_desempate_e_independente_da_ordem_da_lista_de_workers")


def test_worker_com_status_available_mas_current_task_preenchido_nunca_e_candidato() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    inconsistente = _worker("claude-1", current_task="outra-tarefa", capabilities=_CAP_HUMANO)
    decisao = escolher_proxima_atribuicao(tarefas, [inconsistente])
    assert decisao.action == "WAIT"
    assert decisao.worker_id is None
    print("OK  test_worker_com_status_available_mas_current_task_preenchido_nunca_e_candidato")


def test_worker_busy_nunca_e_ofertado() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    decisao = escolher_proxima_atribuicao(tarefas, [_worker("claude-1", status="BUSY", capabilities=_CAP_HUMANO)])
    assert decisao.action == "WAIT"
    print("OK  test_worker_busy_nunca_e_ofertado")


def test_auditor_nunca_e_candidato_a_executar_tarefa() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    auditor = _worker("chatgpt-auditor", type_="auditor", can_execute=False, capabilities=("auditoria",))
    decisao = escolher_proxima_atribuicao(tarefas, [auditor])
    assert decisao.action == "WAIT"
    assert decisao.worker_id is None
    print("OK  test_auditor_nunca_e_candidato_a_executar_tarefa")


def test_todos_limit_ou_offline_produz_pool_paused_sem_olhar_a_fila() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1", status="LIMIT"), _worker("claude-2", status="OFFLINE")]
    decisao = escolher_proxima_atribuicao(tarefas, workers)
    assert decisao.action == "POOL_PAUSED"
    print("OK  test_todos_limit_ou_offline_produz_pool_paused_sem_olhar_a_fila")


def test_pool_nao_pausa_se_pelo_menos_um_executor_disponivel() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1", status="LIMIT"), _worker("claude-2", status="AVAILABLE", capabilities=_CAP_HUMANO)]
    decisao = escolher_proxima_atribuicao(tarefas, workers)
    assert decisao.action == "OFFER"
    assert decisao.worker_id == "claude-2"
    print("OK  test_pool_nao_pausa_se_pelo_menos_um_executor_disponivel")


def test_chamada_repetida_com_mesmo_snapshot_e_deterministica() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1", capabilities=_CAP_HUMANO), _worker("claude-2", capabilities=_CAP_HUMANO)]
    d1 = escolher_proxima_atribuicao(tarefas, workers)
    d2 = escolher_proxima_atribuicao(tarefas, workers)
    assert d1.to_dict() == d2.to_dict()
    print("OK  test_chamada_repetida_com_mesmo_snapshot_e_deterministica")


def test_dois_workers_disponiveis_para_mesma_tarefa_so_um_e_ofertado() -> None:
    tarefas = [_tarefa("t1", area="materia")]
    workers = [_worker("claude-1", capabilities=_CAP_HUMANO), _worker("claude-2", capabilities=_CAP_HUMANO)]
    decisao = escolher_proxima_atribuicao(tarefas, workers)
    assert decisao.action == "OFFER"
    assert decisao.worker_id in ("claude-1", "claude-2")
    assert isinstance(decisao.worker_id, str)
    print("OK  test_dois_workers_disponiveis_para_mesma_tarefa_so_um_e_ofertado")


# ---------------------------------------------------------------------
# avaliar_handoff_de_tarefa — casca sobre handoff.decidir_handoff, com
# B2 (capability), B3 (contexto inteligente) e B4 (nunca o próprio dono)
# ---------------------------------------------------------------------

def test_handoff_p1_com_checkpoint_seguro_e_worker_disponivel_recomenda_handoff() -> None:
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")  # P1
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
    )
    assert decisao.action == "HANDOFF"
    assert decisao.novo_worker == "claude-2"
    print("OK  test_handoff_p1_com_checkpoint_seguro_e_worker_disponivel_recomenda_handoff")


def test_handoff_p3_prefere_esperar_mesmo_com_worker_disponivel() -> None:
    tarefa = _tarefa("t1", area="ferramentas", agente="Claude 1")  # P3
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_p3_prefere_esperar_mesmo_com_worker_disponivel")


def test_handoff_sem_checkpoint_seguro_nunca_transfere() -> None:
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")  # P1
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=False, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_sem_checkpoint_seguro_nunca_transfere")


def test_handoff_commit_inexistente_e_responsabilidade_de_quem_monta_checkpoint_seguro() -> None:
    tarefa = _tarefa("t1", area="materia")
    decisao = avaliar_handoff_de_tarefa(tarefa, checkpoint_seguro=False, workers=[])
    assert decisao.action == "WAIT"
    print("OK  test_handoff_commit_inexistente_e_responsabilidade_de_quem_monta_checkpoint_seguro")


def test_handoff_exige_capability_compativel() -> None:
    """B2 aplicado ao handoff: worker AVAILABLE, não-dono, mas sem a
    capability necessária -> nunca é candidato a HANDOFF."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")  # exige "conteudo"
    sem_capability = _worker("claude-2", capabilities=("codigo",))
    decisao = avaliar_handoff_de_tarefa(tarefa, checkpoint_seguro=True, workers=[sem_capability])
    assert decisao.action == "WAIT"
    print("OK  test_handoff_exige_capability_compativel")


def test_handoff_nunca_seleciona_o_proprio_dono_por_display_name() -> None:
    """B4: o próprio dono da tarefa nunca é candidato a handoff, mesmo que
    o registro (inconsistente/atrasado) o mostre AVAILABLE."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    dono_available = _worker("claude-1", display_name="Claude 1", capabilities=_CAP_HUMANO)
    decisao = avaliar_handoff_de_tarefa(tarefa, checkpoint_seguro=True, workers=[dono_available])
    assert decisao.action == "WAIT"
    print("OK  test_handoff_nunca_seleciona_o_proprio_dono_por_display_name")


def test_handoff_nunca_seleciona_o_proprio_dono_mesmo_com_outro_candidato() -> None:
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    dono = _worker("claude-1", display_name="Claude 1", capabilities=_CAP_HUMANO)
    outro = _worker("claude-2", display_name="Claude 2", capabilities=_CAP_HUMANO)
    decisao = avaliar_handoff_de_tarefa(tarefa, checkpoint_seguro=True, workers=[dono, outro])
    assert decisao.action == "HANDOFF"
    assert decisao.novo_worker == "claude-2"
    print("OK  test_handoff_nunca_seleciona_o_proprio_dono_mesmo_com_outro_candidato")


def test_handoff_p1_limit_progresso_baixo_favorece_handoff_com_contexto() -> None:
    """B3, caso obrigatório 1: P1 + LIMIT + progresso baixo/médio +
    checkpoint seguro + compatível disponível -> HANDOFF."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="LIMIT", progress_percent=20, handoff_cost="ALTO")
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "HANDOFF"
    print("OK  test_handoff_p1_limit_progresso_baixo_favorece_handoff_com_contexto")


def test_handoff_p1_limit_progresso_medio_favorece_handoff_com_contexto() -> None:
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="LIMIT", progress_percent=55, handoff_cost="MEDIO")
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "HANDOFF"
    print("OK  test_handoff_p1_limit_progresso_medio_favorece_handoff_com_contexto")


def test_handoff_p1_near_limit_progresso_alto_custo_alto_prefere_esperar() -> None:
    """B3, caso obrigatório 2: P1 + NEAR_LIMIT + ~70-95% + alto custo de
    transferência -> WAIT."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="NEAR_LIMIT", progress_percent=85, handoff_cost="ALTO")
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_p1_near_limit_progresso_alto_custo_alto_prefere_esperar")


def test_handoff_near_limit_progresso_alto_mas_custo_baixo_ainda_recomenda_handoff() -> None:
    """O rebaixamento só se aplica quando o CUSTO de transferir também é
    alto — progresso alto com custo baixo não é motivo para esperar."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="NEAR_LIMIT", progress_percent=85, handoff_cost="BAIXO")
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "HANDOFF"
    print("OK  test_handoff_near_limit_progresso_alto_mas_custo_baixo_ainda_recomenda_handoff")


def test_handoff_remaining_work_bucket_qualitativo_funciona_sem_percentual() -> None:
    """'Não precisa inventar precisão onde não existe' — heartbeat de
    sessão humana pode só dar um bucket qualitativo, sem percentual."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="NEAR_LIMIT", remaining_work_bucket="ALTO", handoff_cost="ALTO")
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_remaining_work_bucket_qualitativo_funciona_sem_percentual")


def test_handoff_sem_dado_de_progresso_nao_forca_wait_nem_promove_handoff_alem_do_basico() -> None:
    """Ausência de sinal de progresso nunca é tratada como 'alto' nem
    'baixo' por suposição — o resultado cai no que os gates básicos
    (prioridade/checkpoint/compatibilidade) já decidiam."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="NEAR_LIMIT", handoff_cost="ALTO")  # sem progress_percent nem bucket
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "HANDOFF"
    print("OK  test_handoff_sem_dado_de_progresso_nao_forca_wait_nem_promove_handoff_alem_do_basico")


def test_handoff_budget_nao_permite_forca_wait_mesmo_tudo_mais_favoravel() -> None:
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="LIMIT", progress_percent=10, budget_allows=False)
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "WAIT"
    assert "rçamento" in decisao.reason or "budget" in decisao.reason.lower()
    print("OK  test_handoff_budget_nao_permite_forca_wait_mesmo_tudo_mais_favoravel")


def test_handoff_risco_alto_nao_favorece_handoff_sem_checkpoint() -> None:
    """'Risco médico alto não pode favorecer handoff sem checkpoint/
    compatibilidade' — risk_level nunca compensa checkpoint_seguro=False."""
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="LIMIT", progress_percent=10, risk_level="ALTO")
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=False, workers=[_worker("claude-2", capabilities=_CAP_HUMANO)],
        contexto=contexto,
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_risco_alto_nao_favorece_handoff_sem_checkpoint")


def test_handoff_risco_alto_nao_favorece_handoff_sem_compatibilidade() -> None:
    tarefa = _tarefa("t1", area="materia", agente="Claude 1")
    contexto = HandoffContext(worker_status="LIMIT", progress_percent=10, risk_level="ALTO")
    sem_capability = _worker("claude-2", capabilities=("codigo",))
    decisao = avaliar_handoff_de_tarefa(
        tarefa, checkpoint_seguro=True, workers=[sem_capability], contexto=contexto,
    )
    assert decisao.action == "WAIT"
    print("OK  test_handoff_risco_alto_nao_favorece_handoff_sem_compatibilidade")


def test_handoff_context_valida_worker_status() -> None:
    try:
        HandoffContext(worker_status="AVAILABLE")
    except ValueError:
        print("OK  test_handoff_context_valida_worker_status")
        return
    raise AssertionError("HandoffContext deveria rejeitar worker_status fora de LIMIT/NEAR_LIMIT")


def test_handoff_context_valida_progress_percent_fora_do_intervalo() -> None:
    try:
        HandoffContext(worker_status="LIMIT", progress_percent=150)
    except ValueError:
        print("OK  test_handoff_context_valida_progress_percent_fora_do_intervalo")
        return
    raise AssertionError("HandoffContext deveria rejeitar progress_percent fora de 0-100")


# ---------------------------------------------------------------------
# reprocessar_retorno — critérios 4 e 6 da Issue #105
# ---------------------------------------------------------------------

def test_worker_retomando_tarefa_ainda_blocked_limit_recebe_a_mesma_tarefa() -> None:
    original = _tarefa("t1", estado="BLOCKED-LIMIT", agente="claude-1", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="claude-1", tarefa_original=original,
        tarefas=[original], workers=[_worker("claude-1", capabilities=_CAP_HUMANO)],
    )
    assert resultado.retoma_tarefa_id == "t1"
    assert resultado.proxima_oferta is None
    print("OK  test_worker_retomando_tarefa_ainda_blocked_limit_recebe_a_mesma_tarefa")


def test_worker_retomando_tarefa_ja_concluida_recebe_proxima_da_fila_nunca_refaz() -> None:
    concluida = _tarefa("t1", estado="DONE", agente="claude-3", area="materia")
    proxima = _tarefa("t2", estado="READY", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="claude-1", tarefa_original=concluida,
        tarefas=[concluida, proxima], workers=[_worker("claude-1", capabilities=_CAP_HUMANO)],
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
        tarefas=[assumida_por_outro], workers=[_worker("claude-1", capabilities=_CAP_HUMANO)],
    )
    assert resultado.retoma_tarefa_id is None
    assert "claude-2" in resultado.motivo
    print("OK  test_worker_retomando_tarefa_ja_assumida_por_outro_nao_duplica")


def test_worker_retomando_sem_tarefa_anterior_vai_direto_para_fila() -> None:
    proxima = _tarefa("t1", estado="READY", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="claude-4", tarefa_original=None,
        tarefas=[proxima], workers=[_worker("claude-4", capabilities=_CAP_HUMANO)],
    )
    assert resultado.retoma_tarefa_id is None
    assert resultado.proxima_oferta.task_id == "t1"
    print("OK  test_worker_retomando_sem_tarefa_anterior_vai_direto_para_fila")


def test_retorno_de_worker_com_pool_todo_limit_produz_pool_paused_via_fila() -> None:
    proxima = _tarefa("t1", estado="READY", area="materia")
    resultado = reprocessar_retorno(
        worker_que_volta="chatgpt-auditor", tarefa_original=None,
        tarefas=[proxima],
        workers=[_worker("chatgpt-auditor", type_="auditor", can_execute=False, capabilities=("auditoria",)),
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
    assert tarefas[0].capacidades_necessarias == frozenset({"conteudo"})
    print("OK  test_load_tasks_from_tasks_json_e_somente_leitura_e_nao_quebra")


def test_load_tasks_from_tasks_json_le_capabilities_required_quando_presente() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "tasks.json")
        with open(caminho, "w", encoding="utf-8") as fh:
            json.dump(
                {"tarefas": [{"id": "a", "estado": "READY", "area": "materia",
                              "capabilities_required": ["Auditoria", " codigo "]}]},
                fh,
            )
        tarefas = load_tasks_from_tasks_json(caminho)
    assert tarefas[0].capacidades_necessarias == frozenset({"auditoria", "codigo"})
    print("OK  test_load_tasks_from_tasks_json_le_capabilities_required_quando_presente")


def test_real_repo_tasks_json_carrega_e_produz_fila_sem_quebrar() -> None:
    caminho_real = os.path.join(_pathsetup.REPO_ROOT, "coordination", "tasks.json")
    tarefas = load_tasks_from_tasks_json(caminho_real)
    assert tarefas, "coordination/tasks.json real não pode ficar vazio"
    fila = proxima_tarefa_pronta(tarefas)
    assert all(t.estado == "READY" for t in fila)
    # capacidades_necessarias nunca deve quebrar para nenhuma tarefa real,
    # inclusive as com area=None.
    for t in tarefas:
        t.capacidades_necessarias
    print("OK  test_real_repo_tasks_json_carrega_e_produz_fila_sem_quebrar")


def test_default_seed_workers_sao_compativeis_com_ambas_familias_de_area() -> None:
    """Prova de integração final do B2: os workers humanos DE VERDADE do
    Worker Registry operacional (worker_ops.default_seed_workers) — não
    um fixture inventado — servem tarefas de qualquer área conhecida
    (uma vez que status/can_execute permitam)."""
    seeds = [w for w in default_seed_workers() if w.type == "human_session"]
    assert seeds, "default_seed_workers() precisa continuar tendo workers humanos"
    for area in ("materia", "assets", "documentacao", "infraestrutura", "ferramentas"):
        tarefa = _tarefa("t", area=area)
        necessarias = tarefa.capacidades_necessarias
        assert any(necessarias & set(w.capabilities) for w in seeds), (
            f"nenhum worker humano seed é compatível com a área {area!r}"
        )
    print("OK  test_default_seed_workers_sao_compativeis_com_ambas_familias_de_area")


def main() -> int:
    testes = [
        test_priority_derived_from_area_matches_classify_defaults,
        test_prioridade_declarada_vence_o_mapeamento_padrao,
        test_capacidade_necessaria_derivada_da_area_real,
        test_area_desconhecida_nao_exige_capability_nenhuma,
        test_capabilities_required_explicito_vence_o_mapeamento_de_area,
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
        test_worker_sem_capability_compativel_nunca_recebe_a_oferta,
        test_worker_humano_real_serve_tanto_materia_quanto_infraestrutura,
        test_area_desconhecida_nao_bloqueia_por_capability,
        test_especializacao_extra_desempata_entre_workers_compativeis,
        test_desempate_e_independente_da_ordem_da_lista_de_workers,
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
        test_handoff_exige_capability_compativel,
        test_handoff_nunca_seleciona_o_proprio_dono_por_display_name,
        test_handoff_nunca_seleciona_o_proprio_dono_mesmo_com_outro_candidato,
        test_handoff_p1_limit_progresso_baixo_favorece_handoff_com_contexto,
        test_handoff_p1_limit_progresso_medio_favorece_handoff_com_contexto,
        test_handoff_p1_near_limit_progresso_alto_custo_alto_prefere_esperar,
        test_handoff_near_limit_progresso_alto_mas_custo_baixo_ainda_recomenda_handoff,
        test_handoff_remaining_work_bucket_qualitativo_funciona_sem_percentual,
        test_handoff_sem_dado_de_progresso_nao_forca_wait_nem_promove_handoff_alem_do_basico,
        test_handoff_budget_nao_permite_forca_wait_mesmo_tudo_mais_favoravel,
        test_handoff_risco_alto_nao_favorece_handoff_sem_checkpoint,
        test_handoff_risco_alto_nao_favorece_handoff_sem_compatibilidade,
        test_handoff_context_valida_worker_status,
        test_handoff_context_valida_progress_percent_fora_do_intervalo,
        test_worker_retomando_tarefa_ainda_blocked_limit_recebe_a_mesma_tarefa,
        test_worker_retomando_tarefa_ja_concluida_recebe_proxima_da_fila_nunca_refaz,
        test_worker_retomando_tarefa_ja_assumida_por_outro_nao_duplica,
        test_worker_retomando_sem_tarefa_anterior_vai_direto_para_fila,
        test_retorno_de_worker_com_pool_todo_limit_produz_pool_paused_via_fila,
        test_load_tasks_from_tasks_json_e_somente_leitura_e_nao_quebra,
        test_load_tasks_from_tasks_json_le_capabilities_required_quando_presente,
        test_real_repo_tasks_json_carrega_e_produz_fila_sem_quebrar,
        test_default_seed_workers_sao_compativeis_com_ambas_familias_de_area,
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
