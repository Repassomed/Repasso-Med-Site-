"""Regressão do no-op legítimo: questão canônica já presente no HEAD."""
from __future__ import annotations
import json
import sys
from types import SimpleNamespace
from unittest.mock import patch

from coordinator import agent_v2


def test_noop_sem_evidencia_nao_e_aceito() -> None:
    kid={"id":"q08-11","arquivos":["neurologia.html"],"objetivo":"Q8 a Q11"}
    assert agent_v2.review_existing_work(".",kid,SimpleNamespace(source_pack_path=None),
        "a"*40,"o modelo não produziu nenhuma alteração; sem IDs",None,None,"k") is None


def test_noop_entrega_questao_e_espelho_reais_ao_revisor() -> None:
    kid={"id":"q08-11","arquivos":["neurologia.html"],"objetivo":"Q8"}
    html='<div class="quiz-item" id="q-neu099"><p>Cátedra</p><div class="answer">Resposta</div></div><div class="quiz-item" id="bq-neu099"><p>Cátedra</p><div class="answer">Resposta</div></div>'
    seen=[]
    def fake_ask(cfg,ledger,key,system,prompt,**kwargs):
        data=json.loads(prompt[prompt.index('\n{"task":')+1:])
        seen.append(data)
        assert kwargs["max_output_tokens"]==agent_v2.NOOP_MAX_OUT
        return {"decision":"ACCEPT_WITH_DEFERRED","reason":"canônica presente","deferred":[]}
    with patch.object(agent_v2.subprocess,"run",return_value=SimpleNamespace(returncode=0,stdout=html)), \
         patch.object(agent_v2,"ask_openai",side_effect=fake_ask):
        review=agent_v2.review_existing_work(".",kid,SimpleNamespace(source_pack_path=None),
            "a"*40,"o modelo não produziu nenhuma alteração; q-neu099",None,None,"k")
    assert review["decision"]=="ACCEPT_WITH_DEFERRED"
    assert seen[0]["existing_question_html"][0]["bank_mirror_id"]=="bq-neu099"
    assert seen[0]["existing_question_html"][0]["bank_mirror_exactly_equal"] is True
    assert seen[0]["verified_head"]=="a"*40


def test_recupera_apenas_ultimo_noop_do_mesmo_foco() -> None:
    import hashlib
    task_id="agent-v2-q08-11-"+hashlib.sha256(("q08-11:2:"+"a"*40).encode()).hexdigest()[:12]
    results=[{"task_id":task_id,"status":"BLOCKED","reason":agent_v2.NO_CHANGE_REASON+"; q-neu099"},
             {"task_id":"agent-v2-q12-14-b","status":"BLOCKED","reason":agent_v2.NO_CHANGE_REASON+"; q-neu200"},
             {"task_id":task_id,"status":"BLOCKED","reason":agent_v2.NO_CHANGE_REASON+"; q-neu100"}]
    assert agent_v2.latest_noop_reason(results,"q08-11",2,"a"*40)==results[-1]["reason"]
    assert agent_v2.latest_noop_reason(results,"q08-11",2,"b"*40) is None


def main() -> int:
    test_noop_sem_evidencia_nao_e_aceito()
    test_noop_entrega_questao_e_espelho_reais_ao_revisor()
    test_recupera_apenas_ultimo_noop_do_mesmo_foco()
    print("3/3 testes passaram.")
    return 0


if __name__=="__main__":sys.exit(main())
