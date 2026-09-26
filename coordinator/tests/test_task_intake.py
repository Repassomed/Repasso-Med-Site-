"""Issue #160 — Intake da Inbox #88: pedido → proposta tipada → PR
administrativa de ``coordination/tasks.json`` → (merge do José) → Worker
Bridge enxerga a tarefa.

Causa raiz reproduzida: ``observe._tratar_inbox_comment`` só publicava
``✅ RECEBIDO``; nenhum pedido virava tarefa persistente, e "URGENTE" nunca
chegava como prioridade declarada (o payload da #88 não tinha
``prioridade_declarada`` — daí o P2 visto na #88).

Nenhuma chamada paga: tudo aqui é determinístico.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace

from . import _pathsetup
from coordinator import scheduler, task_intake as ti, worker_bridge
from coordinator.__main__ import _gravar_intake_out
from coordinator.budget import UsageLedger
from coordinator.config import ACTIVE_SUPERVISED_MODE, Config
from coordinator.dedup import Deduplicator, InMemoryStore
from coordinator.github_event import build_event_from_github_context
from coordinator.observe import observe
from coordinator.task_runtime import TaskRuntimeStore
from coordinator.worker_ops import InMemoryWorkerStateStore, OperationalWorkerRegistry

REPO = "Repassomed/Repasso-Med-Site-"
PASTA = "site/materias"
_WORKFLOWS = os.path.join(_pathsetup.REPO_ROOT, ".github", "workflows")
_NODE_TEST = os.path.join(_WORKFLOWS, "scripts", "intake_pr.test.mjs")
NEURO_DRIVE = "Neurologia — incorporar novas questões da pasta Questões no Drive. Urgente."
NEURO_FECHAMENTO = "Neurologia — fechamento urgente completo"


def _tarefa(tid, materia, estado, *, auto=None, pr=None):
    return {"id": tid, "titulo": tid, "area": "materia", "materia": materia,
            "arquivos": [f"{PASTA}/{materia}.html"], "objetivo": "x", "fonte": "teste", "agente": None,
            "estado": estado, "capabilities_required": ["conteudo"], "dependencias": [],
            "branch": f"runner/{tid}", "pr": pr, "commit": None, "issue": 1, "notas": "",
            "automation_enabled": auto, "bridge_enabled": True, "risk_level": "MEDIO",
            "policy_level": "C", "jose_authorized": True}


def _repo(tmp: str) -> str:
    for m in ("neurologia", "dermatologia", "histologia-i", "anatomia-patologica", "anatomia-patologica-ii"):
        os.makedirs(os.path.join(tmp, PASTA), exist_ok=True)
        with open(os.path.join(tmp, PASTA, f"{m}.html"), "w", encoding="utf-8") as fh:
            fh.write(f"<section id='{m}'>{m}</section>\n")
    dados = {
        "_": ["registro"], "versao": 1, "atualizado_em": "2026-09-26",
        "agentes_conhecidos": ["Claude 1", "humano"],
        "estados_validos": ["READY", "IN-PROGRESS", "BLOCKED", "BLOCKED-LIMIT", "NEEDS-AUDIT", "NEEDS-FIX",
                            "MERGE-READY", "DONE"],
        "areas_validas": ["materia", "infraestrutura", "assets", "documentacao", "ferramentas"],
        "tarefas": [
            _tarefa("cleanup-dermatologia", "dermatologia", "DONE", auto=True, pr=201),
            _tarefa("cleanup-histologia-i-r2", "histologia-i", "NEEDS-AUDIT", auto=True, pr=286),
            _tarefa("neurologia-cierre-layout", "neurologia", "NEEDS-AUDIT", auto=None),
        ],
    }
    os.makedirs(os.path.join(tmp, "coordination"), exist_ok=True)
    with open(os.path.join(tmp, "coordination", "tasks.json"), "w", encoding="utf-8") as fh:
        fh.write(json.dumps(dados, ensure_ascii=False, indent=2) + "\n")
    return tmp


def _tasks(tmp):
    with open(os.path.join(tmp, "coordination", "tasks.json"), encoding="utf-8") as fh:
        return json.load(fh)["tarefas"]


def _decidir(tmp, corpo, comment_id=500):
    return ti.interpretar_pedido(corpo, tarefas=_tasks(tmp), repo_dir=tmp, comment_id=comment_id)


def _observar(tmp, corpo, comment_id=500, dedup=None):
    payload = {"action": "created", "issue": {"number": 88},
               "comment": {"id": comment_id, "body": corpo, "user": {"login": "Repassomed"}}}
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    if ev is None:
        return None
    return observe(
        ev, config=Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE), dedup=dedup or Deduplicator(InMemoryStore()),
        ledger=UsageLedger(os.path.join(tmp, "usage.json")), workers=[], audit_mode=True,
        worker_registry=OperationalWorkerRegistry(InMemoryWorkerStateStore()),
        runner_tasks_json_path=os.path.join(tmp, "coordination", "tasks.json"), runner_repo_dir=tmp,
    )


def _merge_simulado(tmp, dados_observe) -> dict:
    """O que o workflow grava e o José mergearia: aplica a proposta no tasks.json."""
    saida = os.path.join(tmp, "intake.json")
    caminho = os.path.join(tmp, "coordination", "tasks.json")
    assert _gravar_intake_out(saida, dados_observe, caminho)
    with open(saida, encoding="utf-8") as fh:
        proposta = json.load(fh)
    with open(caminho, "w", encoding="utf-8") as fh:
        fh.write(proposta["content"])
    return proposta


# ---------------------------------------------------------------------------
# 1, 3, 8 — pedido claro, arquivo exato, prioridade declarada
# ---------------------------------------------------------------------------

def test_1_3_8_pedido_claro_vira_uma_proposta_com_arquivo_exato_e_p0() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        d = _decidir(tmp, NEURO_FECHAMENTO)
        assert d.acao == "PROPOSTA", d
        t = d.tarefa
        assert t["arquivos"] == [f"{PASTA}/neurologia.html"], "arquivo exato, nunca curinga"
        assert t["prioridade_declarada"] == "P0", "URGENTE → P0"
        assert t["estado"] == "READY" and t["automation_enabled"] is True and t["policy_level"] == "C"
        assert re.fullmatch(r"neurologia-intake-[0-9a-f]{6}", t["id"])
        assert [r["id"] for r in d.relacionadas] == ["neurologia-cierre-layout"], "relacionada listada, não duplicada"
    print("OK  test_1_3_8_pedido_claro_vira_uma_proposta_com_arquivo_exato_e_p0")


def test_8_urgente_nunca_vira_p2_na_classificacao_da_88() -> None:
    payload = {"action": "created", "issue": {"number": 88},
               "comment": {"id": 1, "body": NEURO_FECHAMENTO, "user": {"login": "Repassomed"}}}
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    assert ev.payload["prioridade_declarada"] == "P0"
    from coordinator.classify import classify
    assert classify(ev).priority.value == "P0", "antes: 'fechamento' sem palavra-chave caía em P2"
    for texto, esperado in (("P1 ALTA — ajuste", "P1"), ("prioridade: média", "P2"), ("prioridade baixa", "P3"),
                            ("novas questões do P2 Turma E.pdf", None)):
        assert ti.prioridade_declarada_do_texto(texto) == esperado, texto
    print("OK  test_8_urgente_nunca_vira_p2_na_classificacao_da_88")


# ---------------------------------------------------------------------------
# 2, 14 — dedup
# ---------------------------------------------------------------------------

def test_2_14_mesmo_pedido_ou_tarefa_existente_nunca_duplica() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        dedup = Deduplicator(InMemoryStore())
        r1 = _observar(tmp, NEURO_FECHAMENTO, comment_id=10, dedup=dedup)
        assert r1.intake_proposal is not None
        assert _observar(tmp, NEURO_FECHAMENTO, comment_id=10, dedup=dedup).status == "DUPLICATE"
        _merge_simulado(tmp, r1.to_dict())
        # Mesmo texto em OUTRO comentário, depois do merge: referência, zero proposta.
        r2 = _observar(tmp, NEURO_FECHAMENTO, comment_id=11)
        assert r2.intake_proposal is None and "JÁ NA FILA" in r2.merge_card
        assert r1.intake_proposal["task_id"] in r2.merge_card
        # O mesmo comentário reprocessado (dedup perdido): também referência.
        assert _decidir(tmp, "outro texto qualquer", comment_id=10).acao == "EXISTENTE"
        # Pedido que já é tarefa automatizada ativa: aponta id/estado/PR, zero proposta.
        d = _decidir(tmp, "Histología I: remover o bloco Cómo estudiar", comment_id=12)
        assert d.acao == "NEEDS_INPUT" and d.tarefa is None
        assert d.resumo_existentes() == ["cleanup-histologia-i-r2 (estado NEEDS-AUDIT, PR #286)"]
        assert _decidir(tmp, "Histología I: tarefa separada — revisar figuras", comment_id=13).acao == "PROPOSTA"
    print("OK  test_2_14_mesmo_pedido_ou_tarefa_existente_nunca_duplica")


# ---------------------------------------------------------------------------
# 4, 5, 6, 9
# ---------------------------------------------------------------------------

def test_4_pedido_ambiguo_needs_input_sem_tarefa() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        for corpo in ("corrige aquela matéria", "Neurologia e Dermatología: revisar tudo",
                      "A neurologia está boa?"):
            d = _decidir(tmp, corpo)
            assert d.acao == "NEEDS_INPUT" and d.tarefa is None, (corpo, d)
        r = _observar(tmp, "corrige aquela matéria")
        assert r.intake_proposal is None and "NEEDS-INPUT" in r.merge_card
    print("OK  test_4_pedido_ambiguo_needs_input_sem_tarefa")


def test_5_6_materia_nova_so_com_autorizacao_explicita() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        d = _decidir(tmp, "Matéria nova: Pediatría")
        assert d.acao == "BLOCKED_AUTORIZACAO" and d.tarefa is None
        d2 = _decidir(tmp, "Matéria nova: Pediatría — pode começar")
        assert d2.acao == "PROPOSTA"
        t = d2.tarefa
        assert t["arquivos"] == [f"{PASTA}/pediatria.html"]
        assert t["estado"] == "BLOCKED" and t["automation_enabled"] is False, "nunca executa sem escopo confirmado"
    print("OK  test_5_6_materia_nova_so_com_autorizacao_explicita")


def test_9_comentario_do_coordinator_e_relatorio_de_agente_ignorados() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        assert _observar(tmp, "<!-- repasso-coordinator -->\n📥 Intake #160: PR administrativa aberta") is None
        assert _decidir(tmp, "Claude 2 terminou Neurologia, PR #201").acao == "IGNORADO"
        r = _observar(tmp, "Claude 2 terminou Neurologia, PR #201")
        assert r.intake_proposal is None and "RECEBIDO" in r.merge_card
    print("OK  test_9_comentario_do_coordinator_e_relatorio_de_agente_ignorados")


# ---------------------------------------------------------------------------
# 7 — fonte externa (Drive) ausente
# ---------------------------------------------------------------------------

def test_7_fonte_drive_ausente_bloqueia_sem_worker_pago() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        r = _observar(tmp, NEURO_DRIVE, comment_id=20)
        t = r.intake_proposal["tarefa"]
        assert t["estado"] == "BLOCKED" and t["prioridade_declarada"] == "P0"
        assert t["source_pack_required"] is True
        assert t["source_pack_path"] == f"coordination/source-packs/{t['id']}-v1.md"
        assert t["question_report_required"] is True, "questões → Lei 8-A"
        assert "source pack" in r.merge_card
        _merge_simulado(tmp, r.to_dict())
        caminho = os.path.join(tmp, "coordination", "tasks.json")
        prontas = scheduler.proxima_tarefa_pronta(scheduler.load_tasks_from_tasks_json(caminho))
        assert t["id"] not in [x.id for x in prontas], "BLOCKED nunca é oferecida"
        meta = worker_bridge.carregar_metadados_de_automacao(caminho)[t["id"]]
        politica = worker_bridge.avaliar_politica(meta, task_id=t["id"])
        assert politica.permitido is False and "source pack" in politica.reason, \
            "mesmo se virar READY sem o pack, o Bridge bloqueia antes da chamada paga"
    print("OK  test_7_fonte_drive_ausente_bloqueia_sem_worker_pago")


# ---------------------------------------------------------------------------
# Ponta a ponta: nada antes do merge; depois do merge o Bridge enxerga
# ---------------------------------------------------------------------------

def test_nada_executa_antes_do_merge_e_bridge_enxerga_depois() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        caminho = os.path.join(tmp, "coordination", "tasks.json")
        with open(caminho, encoding="utf-8") as fh:
            antes = fh.read()
        r = _observar(tmp, NEURO_FECHAMENTO, comment_id=30)
        assert r.call_attempted is False, "Intake é custo zero"
        tid = r.intake_proposal["task_id"]
        with open(caminho, encoding="utf-8") as fh:
            assert fh.read() == antes, "o Intake nunca escreve no tasks.json"
        store = TaskRuntimeStore(InMemoryWorkerStateStore())
        tarefas, _m, _r = worker_bridge.visao_da_fila(tasks_json_path=caminho, runtime_store=store)
        assert tid not in [x.id for x in tarefas], "antes do merge o Bridge não vê nada"

        proposta = _merge_simulado(tmp, r.to_dict())
        assert proposta["branch"] == f"coordinator/intake-{tid}" and proposta["path"] == "coordination/tasks.json"
        novo, antigo = json.loads(proposta["content"]), json.loads(antes)
        assert novo["tarefas"][:-1] == antigo["tarefas"] and novo["tarefas"][-1]["id"] == tid
        assert {k: v for k, v in novo.items() if k != "tarefas"} == {k: v for k, v in antigo.items() if k != "tarefas"}

        from tools.qa.guard.checks import check_task_registry
        achados = check_task_registry(SimpleNamespace(tasks=novo))
        assert not [a for a in achados if a.severity == "HARD FAIL"], achados

        tarefas, metadados, _r = worker_bridge.visao_da_fila(tasks_json_path=caminho, runtime_store=store)
        assert tid in [x.id for x in scheduler.proxima_tarefa_pronta(tarefas)], "depois do merge: oferecível"
        assert worker_bridge.avaliar_politica(metadados[tid], task_id=tid).permitido
    print("OK  test_nada_executa_antes_do_merge_e_bridge_enxerga_depois")


def test_proposta_nao_e_gravada_se_a_base_mudou() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        r = _observar(tmp, NEURO_FECHAMENTO, comment_id=40)
        caminho = os.path.join(tmp, "coordination", "tasks.json")
        with open(caminho, "a", encoding="utf-8") as fh:
            fh.write(" ")
        assert _gravar_intake_out(os.path.join(tmp, "x.json"), r.to_dict(), caminho) is False
    print("OK  test_proposta_nao_e_gravada_se_a_base_mudou")


def test_sem_wiring_comportamento_antigo_intacto() -> None:
    payload = {"action": "created", "issue": {"number": 88},
               "comment": {"id": 50, "body": NEURO_FECHAMENTO, "user": {"login": "Repassomed"}}}
    ev = build_event_from_github_context("issue_comment", payload, REPO)
    with tempfile.TemporaryDirectory() as tmp:
        r = observe(ev, config=Config(enabled=True, mode=ACTIVE_SUPERVISED_MODE),
                    dedup=Deduplicator(InMemoryStore()), ledger=UsageLedger(os.path.join(tmp, "u.json")),
                    workers=[], audit_mode=True, worker_registry=OperationalWorkerRegistry(InMemoryWorkerStateStore()))
    assert r.intake_proposal is None and "RECEBIDO" in r.merge_card
    print("OK  test_sem_wiring_comportamento_antigo_intacto")


# ---------------------------------------------------------------------------
# 10, 11, 12, 13 — nada em main, nenhum merge/deploy, concorrência
# ---------------------------------------------------------------------------

def _passo_intake() -> str:
    with open(os.path.join(_WORKFLOWS, "coordinator-observe.yml"), encoding="utf-8") as fh:
        texto = fh.read()
    i = texto.index("- name: Abrir a PR administrativa do Intake (Issue #160)")
    trecho = texto[i:texto.index("- name: Falhar o job se o Coordinator terminou com erro", i)]
    # Só o CÓDIGO do passo: comentários YAML explicam o que ele nunca faz.
    return "\n".join(l for l in trecho.splitlines() if not l.lstrip().startswith("#"))


def test_10_11_12_workflow_nunca_escreve_em_main_nem_mergeia_nem_deploya() -> None:
    passo = _passo_intake()
    assert "github.event.issue.number == 88" in passo and "issue_comment" in passo
    assert "intake_pr.mjs" in passo and "GITHUB_WORKSPACE" in passo
    assert "branch === baseBranch" in passo and "startsWith('coordinator/intake-')" in passo
    for proibido in ("pulls.merge", "merge(", "updateRef", "deleteRef", "force", "deploy", "netlify",
                     "createWorkflowDispatch", "git push", "ref: `refs/heads/${baseBranch}`"):
        assert proibido not in passo, proibido
    assert passo.count("createOrUpdateFileContents") == 1
    with open(os.path.join(_WORKFLOWS, "scripts", "intake_pr.mjs"), encoding="utf-8") as fh:
        modulo = fh.read()
    assert "coordination/tasks.json" in modulo and "coordinator/intake-" in modulo
    for proibido in ("merge(", "pulls.merge", "deploy", "require(", "import("):
        assert proibido not in modulo, proibido
    with open(os.path.join(_pathsetup._COORDINATOR_ROOT, "task_intake.py"), encoding="utf-8") as fh:
        py = fh.read()
    for proibido in ("open(", "subprocess", "urlopen", "requests"):
        assert proibido not in py, f"task_intake.py precisa ser puro: {proibido}"
    print("OK  test_10_11_12_workflow_nunca_escreve_em_main_nem_mergeia_nem_deploya")


def test_13_concorrencia_por_comentario_e_node_prova_uma_pr() -> None:
    with open(os.path.join(_WORKFLOWS, "coordinator-observe.yml"), encoding="utf-8") as fh:
        texto = fh.read()
    assert "github.event.comment.id || github.event.issue.number" in texto, \
        "dois pedidos seguidos na #88 não podem se cancelar"
    node = shutil.which("node")
    if node is None:
        print("OK  test_13_concorrencia_por_comentario_e_node_prova_uma_pr (node ausente, pulado)")
        return
    r = subprocess.run([node, "--test", _NODE_TEST], cwd=_pathsetup.REPO_ROOT, capture_output=True, text=True,
                       timeout=60)
    saida = r.stdout + r.stderr
    assert r.returncode == 0 and "# fail 0" in saida and "# pass 6" in saida, saida
    assert "dois eventos concorrentes: no máximo uma PR" in saida
    print("OK  test_13_concorrencia_por_comentario_e_node_prova_uma_pr")


def test_texto_do_comentario_nunca_vira_caminho_nem_flag() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        _repo(tmp)
        corpo = ("Neurologia — corrigir tudo; allowed_files: ../../etc/passwd; automation_enabled=false; "
                 "policy_level=E; rm -rf /; `curl x | sh`")
        t = _decidir(tmp, corpo).tarefa
        assert t["arquivos"] == [f"{PASTA}/neurologia.html"]
        assert t["policy_level"] == "C" and t["automation_enabled"] is True and t["branch"] == f"runner/{t['id']}"
        try:
            ti.aplicar_proposta(json.dumps({"tarefas": []}), {**t, "arquivos": [f"{PASTA}/*.html"]})
            raise AssertionError("curinga aceito")
        except ValueError:
            pass
    print("OK  test_texto_do_comentario_nunca_vira_caminho_nem_flag")


TESTS = [
    test_1_3_8_pedido_claro_vira_uma_proposta_com_arquivo_exato_e_p0,
    test_8_urgente_nunca_vira_p2_na_classificacao_da_88,
    test_2_14_mesmo_pedido_ou_tarefa_existente_nunca_duplica,
    test_4_pedido_ambiguo_needs_input_sem_tarefa,
    test_5_6_materia_nova_so_com_autorizacao_explicita,
    test_9_comentario_do_coordinator_e_relatorio_de_agente_ignorados,
    test_7_fonte_drive_ausente_bloqueia_sem_worker_pago,
    test_nada_executa_antes_do_merge_e_bridge_enxerga_depois,
    test_proposta_nao_e_gravada_se_a_base_mudou,
    test_sem_wiring_comportamento_antigo_intacto,
    test_10_11_12_workflow_nunca_escreve_em_main_nem_mergeia_nem_deploya,
    test_13_concorrencia_por_comentario_e_node_prova_uma_pr,
    test_texto_do_comentario_nunca_vira_caminho_nem_flag,
]


def main() -> int:
    falhas = 0
    for t in TESTS:
        try:
            t()
        except Exception as exc:  # noqa: BLE001
            falhas += 1
            print(f"FALHOU  {t.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(TESTS) - falhas}/{len(TESTS)} testes passaram.")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
