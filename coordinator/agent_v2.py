"""Coordinator V2: OpenAI coordena; Claude executa; José é o único merge."""
from __future__ import annotations
import argparse, hashlib, json, os, subprocess, sys
from dataclasses import dataclass, field, replace
from . import bridge_pr, bridge_workers, scheduler, task_runtime, worker_bridge
from .git_state import GitJsonStore, GitUsageLedger
from .openai_budget import OpenAICallLimiter, TIER_NORMAL
from .openai_client import build_request, call
from .openai_config import OpenAIAuditorConfig
from .openai_transport import OpenAIResponsesTransport
from .runner_dispatch import executar_tarefa
from .task_runtime import TaskRuntimeStore
from .worker_ops import DEFAULT_STATE_BRANCH as WORKER_STATE_BRANCH, OperationalWorkerRegistry

STATE_BRANCH="coordinator-state-agent-v2"
OPENAI_USAGE_BRANCH="coordinator-state-usage-openai"
MAX_OUT=1400
MAX_PROMPT=7600
MAX_DIFF=12000

LAWS="""LEIS OBRIGATÓRIAS — REPASSO MED
1) Cátedra é a base; literatura só corrige/complementa e divergência deve ser rotulada.
2) Bloco: conceito -> características -> classificação -> mecanismo -> manifestações -> diagnóstico/localização -> diferenças -> tratamento/conduta -> armadilhas -> questões, quando aplicável.
3) Questões: correção científica + cátedra + estilo da prova + profundidade; deduplicar; corpo e Banco General sincronizados.
4) Prova real = Basada en preguntas de examen; questão criada = Pregunta complementaria; nunca inventar texto/gabarito/origem ilegível.
5) Incerteza isolada: deferir ou converter em complementar se o conceito for seguro; NÃO bloquear o projeto inteiro.
6) RESUMO ENSINA -> QUESTÃO COBRA -> EXPLICAÇÃO REFORÇA; sem entregar resposta por estilo/ordem.
7) Preservar block_id, ids, anchors, highlights e post-its; nunca mutar banco de alunos.
8) QA final: 390/768/1024/1440, HTML/IDs/anchors/assets/contadores e antirregressão.
9) Nunca merge/deploy/publicação automática; somente José.
10) Nunca ampliar allowed_files nem apagar conteúdo correto para facilitar.
"""
PLAN_SYSTEM="Você é o coordenador do Repasso Med. Substitua o fluxo manual José -> ChatGPT -> Claude. Decida só o próximo passo, escolha um Claude disponível, não edite arquivos e não relaxe as leis. Responda SOMENTE JSON válido."
REVIEW_SYSTEM="Você é o revisor-coordenador do Repasso Med. Revise como no fluxo manual. Use FIX só se algo realmente precisa de correção; pendência isolável pode ser ACCEPT_WITH_DEFERRED. Responda SOMENTE JSON válido."

@dataclass
class State:
    project_id:str
    done:list[str]=field(default_factory=list)
    deferred:list[dict]=field(default_factory=list)
    correction:dict|None=None
    cycles:int=0
    head:str|None=None
    pr:int|None=None
    final:str="RUNNING"
    guard_head:str|None=None
    review:str=""
    @classmethod
    def load(cls,pid,raw):
        r=raw or {}
        return cls(pid,list(r.get("done") or []),list(r.get("deferred") or []),r.get("correction"),
                   int(r.get("cycles") or 0),r.get("head"),r.get("pr"),str(r.get("final") or "RUNNING"),
                   r.get("guard_head"),str(r.get("review") or ""))
    def dump(self): return self.__dict__

class StateStore:
    def __init__(self,store): self.store=store
    def get(self,pid): return State.load(pid,(self.store.read().get("projects") or {}).get(pid))
    def save(self,state,message):
        def mutate(raw):
            p=dict(raw.get("projects") or {}); p[state.project_id]=state.dump(); return {"projects":p}
        self.store.update(mutate,message=message)

def raw_tasks(path):
    with open(path,encoding="utf-8") as f: return list(json.load(f).get("tarefas") or [])

def project(path):
    ts=raw_tasks(path); parents=[t for t in ts if t.get("agent_v2_enabled") is True]
    if not parents: return None
    parents.sort(key=lambda t:(str(t.get("prioridade_declarada") or "P4"),str(t.get("id"))))
    parent=parents[0]; pid=str(parent["id"]); kids=[t for t in ts if t.get("parent_task_id")==pid]
    if not kids: raise RuntimeError("projeto V2 sem tarefas-filhas")
    branches={str(t.get("branch") or "").strip() for t in kids if str(t.get("branch") or "").strip()}
    if len(branches)!=1: raise RuntimeError(f"projeto V2 exige uma branch compartilhada; achei {branches}")
    return parent,kids,next(iter(branches))

def ask_openai(cfg,ledger,key,system,prompt):
    lim=OpenAICallLimiter(max_output_tokens=MAX_OUT)
    req=build_request(model_id=cfg.model,tier=TIER_NORMAL,system=system[:MAX_PROMPT],prompt=prompt[:MAX_PROMPT],limiter=lim)
    res=call(cfg,req,transport=OpenAIResponsesTransport(timeout=120,max_retries=0),limiter=lim,ledger=ledger,event_key=key)
    if res.status!="ok": raise RuntimeError(f"OpenAI coordenador falhou/bloqueou: {res.reason}")
    obj=json.loads((res.text or "").strip())
    if not isinstance(obj,dict): raise ValueError("OpenAI não devolveu objeto JSON")
    return obj

def workers_free(registry):
    return [w.worker_id for w in bridge_workers.workers_programaticos(registry.list_workers())
            if w.status=="AVAILABLE" and w.can_execute and w.current_task is None]

def latest_card(api,pr):
    if not pr:return ""
    try: comments=api.comentarios_da_pr(pr)
    except Exception:return ""
    for c in reversed(comments):
        b=str(c.get("body") or "")
        if "CARTÃO DE MERGE" in b:return b[:2600]
    return ""

def head_of(pr):
    if not pr:return None
    s=str((pr.get("head") or {}).get("sha") or "").lower()
    return s if len(s)==40 else None

def runtime_context(store,kids):
    regs=store.por_id(); out=[]
    for t in kids:
        r=regs.get(str(t["id"]))
        out.append({"id":t["id"],"title":t.get("titulo"),"status":r.status if r else None,
                    "checkpoint":r.checkpoint_commit if r else None,
                    "reason":(r.reason or "")[:260] if r else "",
                    "report":(r.question_report or "")[:360] if r else ""})
    return out

def add_deferred(st,items):
    for x in items or []:
        if not isinstance(x,dict):continue
        item,reason=str(x.get("item") or "").strip(),str(x.get("reason") or "").strip()
        if item and reason:
            v={"item":item[:300],"reason":reason[:700]}
            if v not in st.deferred:st.deferred.append(v)

def plan_prompt(parent,kids,st,free,runtime,card):
    data={"project":{"id":st.project_id,"title":parent.get("titulo")},"completed_v2":st.done,
          "deferred":st.deferred[-10:],"pending_correction":st.correction,"available_workers":free,
          "tasks_in_required_order":[{"id":t["id"],"title":t.get("titulo"),"objective":str(t.get("objetivo") or "")[:560]} for t in kids],
          "legacy_runtime_context":runtime,"latest_audit_card_if_any":card}
    schema='{"action":"EXECUTE|COMPLETE|WAIT","acknowledge_done":["id"],"focus_task_id":"id|null","worker_id":"worker|null","instructions":"...","deferred":[{"item":"...","reason":"..."}],"reason":"..."}'
    return LAWS+"\nEscolha só um próximo trabalho. Runtime antigo é contexto, não gate. Pode reconhecer etapa já materialmente incorporada ao HEAD, inclusive com pendência isolada diferida. Não pule conteúdo substantivo. JSON: "+schema+"\n"+json.dumps(data,ensure_ascii=False)

def validate_plan(p,kids,st,free):
    ids=[str(t["id"]) for t in kids]; action=str(p.get("action") or "").upper()
    if action not in {"EXECUTE","COMPLETE","WAIT"}:raise ValueError("ação OpenAI inválida")
    ack={x for x in p.get("acknowledge_done") or [] if x in ids}|set(st.done); prefix=[]
    for tid in ids:
        if tid in ack:prefix.append(tid)
        else:break
    st.done[:]=prefix
    if action=="EXECUTE":
        focus=str(p.get("focus_task_id") or "")
        if focus not in ids:raise ValueError("focus_task_id fora do projeto")
        expected=st.correction.get("task_id") if st.correction else next((x for x in ids if x not in st.done),None)
        if expected and focus!=expected:raise ValueError(f"não pode pular ordem/correção: esperado {expected}")
        if not str(p.get("instructions") or "").strip():raise ValueError("EXECUTE sem instructions")
        wanted=str(p.get("worker_id") or ""); p["worker_id"]=wanted if wanted in free else (free[0] if free else None)
        if not p["worker_id"]:raise RuntimeError("nenhum Claude Worker livre")
    p["action"]=action; return p

def materialize(tasks_path,kid,p,branch,checkpoint,cycle):
    declarative={t.id:t for t in scheduler.load_tasks_from_tasks_json(tasks_path)}
    metadata=worker_bridge.carregar_metadados_de_automacao(tasks_path)
    tid=str(kid["id"]); t,meta=declarative.get(tid),metadata.get(tid)
    if not t or not meta:raise RuntimeError(f"tarefa/metadados ausentes: {tid}")
    pol=worker_bridge.avaliar_politica(meta,task_id=tid)
    if not pol.permitido:raise RuntimeError(pol.reason)
    m=worker_bridge.materializar_runner_task(t,meta)
    if not m.ok or not m.task:raise RuntimeError(m.reason)
    corr=("\n\nCORREÇÃO DO COORDENADOR:\n"+str(p["_correction"])) if p.get("_correction") else ""
    ins=m.task.instructions.rstrip()+"\n\nCOORDENAÇÃO V2 — FOCO:\n"+str(p["instructions"]).strip()+corr+"\n\n"+LAWS
    dig=hashlib.sha256(f"{tid}:{cycle}:{checkpoint}".encode()).hexdigest()[:12]
    return meta,replace(m.task,task_id=f"agent-v2-{tid}-{dig}",branch=branch,checkpoint_commit=checkpoint,instructions=ins)

def git_diff(repo,before,after,files):
    if not before:return "Primeiro checkpoint V2; sem diff incremental anterior."
    p=subprocess.run(["git","-C",repo,"diff","--no-ext-diff",f"{before}..{after}","--",*files],capture_output=True,text=True)
    if p.returncode:return "diff indisponível: "+p.stderr[:400]
    return p.stdout[:MAX_DIFF]+("\n...[truncado só para revisão V2]" if len(p.stdout)>MAX_DIFF else "")

def review_prompt(kid,p,before,after,patch,report):
    data={"task_id":kid["id"],"title":kid.get("titulo"),"objective":str(kid.get("objetivo") or "")[:1200],
          "instruction":str(p.get("instructions") or "")[:800],"before":before,"after":after,
          "question_report":(report or "")[:1600],"diff":patch}
    schema='{"decision":"ACCEPT|ACCEPT_WITH_DEFERRED|FIX","correction_instructions":"...","deferred":[{"item":"...","reason":"..."}],"reason":"..."}'
    return LAWS+"\nRevise. FIX só se conteúdo publicado realmente precisar correção; pendência isolável deve ser diferida sem travar o todo. JSON: "+schema+"\n"+json.dumps(data,ensure_ascii=False)

def card_state(card,head):
    if not card or not head or head not in card:return None
    if "MERGE-READY" in card:return "MERGE-READY"
    if "NEEDS-FIX" in card:return "NEEDS-FIX"
    return None

def run(a):
    proj=project(a.tasks_json)
    if not proj:return {"action":"NO_PROJECT","reason":"nenhum agent_v2_enabled"}
    parent,kids,branch=proj; pid=str(parent["id"])
    bcfg=worker_bridge.WorkerBridgeConfig.from_env()
    if not bcfg.gate().open:raise RuntimeError(bcfg.gate().reason)
    api=bridge_pr.GitHubRestApi(owner=a.repo_owner,repo=a.repo_name)
    ss=StateStore(GitJsonStore(a.state_git_remote,branch=STATE_BRANCH)); st=ss.get(pid)
    registry=OperationalWorkerRegistry(GitJsonStore(a.worker_state_git_remote,branch=WORKER_STATE_BRANCH))
    rt=TaskRuntimeStore(GitJsonStore(a.runtime_state_git_remote,branch=task_runtime.DEFAULT_TASK_RUNTIME_STATE_BRANCH))
    ledger=GitUsageLedger(GitJsonStore(a.state_git_remote,branch=OPENAI_USAGE_BRANCH))
    ocfg=OpenAIAuditorConfig.from_env()
    if not ocfg.gate().open:raise RuntimeError("OpenAI coordenador: "+ocfg.gate().reason)
    prs=api.prs_abertas_por_head(branch); pobj=prs[0] if prs else None; current=head_of(pobj)
    if pobj:st.pr=int(pobj.get("number") or st.pr or 0) or None; st.head=current or st.head
    card=latest_card(api,st.pr); cs=card_state(card,current)
    if st.final=="FINAL_AUDIT_PENDING" and cs=="MERGE-READY":
        st.final="COMPLETE"; st.review="Auditoria final MERGE-READY no HEAD exato."; ss.save(st,f"agent-v2: {pid} COMPLETE")
        return {"action":"COMPLETE","project":pid,"pr":st.pr,"head":current,"deferred":st.deferred,"message":"Aguardando somente merge manual de José."}
    if st.final=="FINAL_AUDIT_PENDING" and cs=="NEEDS-FIX":
        final_id=str(kids[-1]["id"]); st.final="RUNNING"; st.correction={"task_id":final_id,"instructions":"Corrija a auditoria final sem ampliar escopo:\n"+card[:3500]}
        if final_id in st.done:st.done.remove(final_id)
    free=workers_free(registry)
    if st.correction:
        p={"action":"EXECUTE","acknowledge_done":[],"focus_task_id":st.correction["task_id"],"worker_id":free[0] if free else None,
           "instructions":"Aplicar a correção e preservar todo o restante.","_correction":st.correction["instructions"],"deferred":[],"reason":"correção automática"}
    else:
        p=ask_openai(ocfg,ledger,f"agent-v2:{pid}:{st.cycles}:{current}:plan",PLAN_SYSTEM,plan_prompt(parent,kids,st,free,runtime_context(rt,kids),card))
    p=validate_plan(p,kids,st,free); add_deferred(st,p.get("deferred")); ids=[str(t["id"]) for t in kids]
    if p["action"]=="COMPLETE" or all(x in st.done for x in ids):
        if not current or not st.pr:raise RuntimeError("concluído sem PR/HEAD final")
        if st.guard_head!=current:
            g=bridge_pr.disparar_guard(api,pr_number=st.pr,ref=a.base_branch)
            if g.action!="DISPATCHED":raise RuntimeError("Guard final: "+g.reason)
            st.guard_head=current
        st.final="FINAL_AUDIT_PENDING";st.head=current;ss.save(st,f"agent-v2: {pid} final audit")
        return {"action":"FINAL_AUDIT_PENDING","project":pid,"pr":st.pr,"head":current,"deferred":st.deferred}
    if p["action"]=="WAIT":
        st.review=str(p.get("reason") or "WAIT");ss.save(st,f"agent-v2: {pid} WAIT");return {"action":"WAIT","project":pid,"reason":st.review}
    focus=str(p["focus_task_id"]);kid=next(t for t in kids if str(t["id"])==focus);wid=str(p["worker_id"])
    if not registry.reservar_current_task_condicional(wid,canonical_task_id=focus,message=f"agent-v2: {wid}->{focus}"):raise RuntimeError("worker deixou de estar livre")
    st.cycles+=1;meta,rtask=materialize(a.tasks_json,kid,p,branch,current,st.cycles)
    rcfg=worker_bridge.construir_config_do_runner(bcfg,canonical_task_id=focus)
    gen=worker_bridge._closure_de_geracao(rtask,runner_config=rcfg,repo_dir=a.repo_dir,state_git_remote=a.state_git_remote,canonical_task_id=focus,transport=None,budget_usd=a.budget_usd)
    out=executar_tarefa(rtask,None,config=rcfg,repo_dir=a.repo_dir,state_git_remote=a.state_git_remote,
        validation_command_keys=tuple(k.strip() for k in a.validation_command_keys.split(",") if k.strip()),
        push_remote_name="origin",sucesso_status="DONE",worker_id=wid,worker_registry=registry,gerar_patch=gen,canonical_task_id=focus)
    result=out.result
    if not result or result.status!="DONE" or not result.checkpoint_commit:
        worker_bridge.liberar_worker_apos_resultado(registry,wid,canonical_task_id=focus,resultado_status=task_runtime.RUNTIME_BLOCKED)
        reason=result.reason if result else "Runner sem resultado";st.correction={"task_id":focus,"instructions":reason[:1800]};st.review=reason
        ss.save(st,f"agent-v2: {focus} blocked");return {"action":"RUNNER_BLOCKED","task":focus,"reason":reason}
    newhead=result.checkpoint_commit
    worker_bridge.liberar_worker_apos_resultado(registry,wid,canonical_task_id=focus,resultado_status=task_runtime.RUNTIME_DONE)
    prout=bridge_pr.garantir_pr(api,task=rtask,canonical_task_id=focus,worker_id=wid,worker_display=bridge_workers.BRIDGE_DISPLAY_NAMES.get(wid,wid),
        checkpoint_commit=newhead,base_branch=a.base_branch,titulo_tarefa=str(parent.get("titulo") or pid),objetivo=str(parent.get("objetivo") or ""),
        area=str(kid.get("area") or "materia"),dependencias=tuple(kid.get("dependencias") or ()),source_pack_path=meta.source_pack_path,
        source_pack_sha256=meta.source_pack_sha256,question_report=out.question_report)
    if prout.pr_number:st.pr=prout.pr_number
    patch=git_diff(a.repo_dir,current,newhead,tuple(rtask.allowed_files))
    rev=ask_openai(ocfg,ledger,f"agent-v2:{pid}:{st.cycles}:{newhead}:review",REVIEW_SYSTEM,review_prompt(kid,p,current,newhead,patch,out.question_report))
    dec=str(rev.get("decision") or "").upper()
    if dec not in {"ACCEPT","ACCEPT_WITH_DEFERRED","FIX"}:raise ValueError("review decision inválida")
    add_deferred(st,rev.get("deferred"));st.head=newhead;st.review=str(rev.get("reason") or "")[:1800]
    if dec=="FIX":st.correction={"task_id":focus,"instructions":str(rev.get("correction_instructions") or st.review or "Corrigir revisão.")[:3500]}
    else:
        st.correction=None
        if focus not in st.done:st.done.append(focus)
    ss.save(st,f"agent-v2: ciclo {st.cycles} {focus}->{dec}")
    try:api.despachar_worker_bridge(ref=a.base_branch);cont="DISPATCHED"
    except Exception as exc:cont=f"FAILED: {exc}"
    return {"action":dec,"project":pid,"task":focus,"worker":wid,"head":newhead,"pr":st.pr,"done":st.done,"deferred":st.deferred,"review":st.review,"continuation":cont}

def parser():
    p=argparse.ArgumentParser(description="Repasso Coordinator V2")
    p.add_argument("--tasks-json",default="coordination/tasks.json");p.add_argument("--repo-dir",default=".")
    p.add_argument("--state-git-remote",required=True);p.add_argument("--worker-state-git-remote",required=True);p.add_argument("--runtime-state-git-remote",required=True)
    p.add_argument("--base-branch",required=True);p.add_argument("--repo-owner",required=True);p.add_argument("--repo-name",required=True)
    p.add_argument("--validation-command-keys",default=",".join(worker_bridge.BRIDGE_VALIDATION_COMMAND_KEYS));p.add_argument("--budget-usd",type=float,default=None);p.add_argument("--out",default=None)
    return p

def main(argv=None):
    a=parser().parse_args(argv)
    try:r=run(a)
    except Exception as exc:print(f"ERRO fail-closed V2: {exc}");return 1
    txt=json.dumps(r,ensure_ascii=False,indent=2);print(txt)
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)) or ".",exist_ok=True)
        with open(a.out,"w",encoding="utf-8") as f:f.write(txt)
    return 0
if __name__=="__main__":sys.exit(main())
