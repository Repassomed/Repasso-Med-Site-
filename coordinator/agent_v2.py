"""Coordinator V2: OpenAI coordena; Claude executa; José é o único merge."""
from __future__ import annotations
import argparse, hashlib, json, os, re, subprocess, sys
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
MAX_PROMPT=20000
MAX_DIFF=16000
MAX_CYCLES_PER_PROJECT=36
NO_CHANGE_REASON="o modelo não produziu nenhuma alteração"

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
    failures:dict[str,int]=field(default_factory=dict)
    @classmethod
    def load(cls,pid,raw):
        r=raw or {}
        return cls(pid,list(r.get("done") or []),list(r.get("deferred") or []),r.get("correction"),
                   int(r.get("cycles") or 0),r.get("head"),r.get("pr"),str(r.get("final") or "RUNNING"),
                   r.get("guard_head"),str(r.get("review") or ""),dict(r.get("failures") or {}))
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

def project(path,states=None):
    ts=raw_tasks(path); states=states or {}
    parents=[t for t in ts if t.get("agent_v2_enabled") is True and
             (states.get(str(t.get("id"))) or {}).get("final")!="COMPLETE" and
             (any(k.get("parent_task_id")==t.get("id") for k in ts) or t.get("estado")=="READY")]
    if not parents: return None
    parents.sort(key=lambda t:(str(t.get("prioridade_declarada") or "P4"),str(t.get("id"))))
    parent=parents[0]; pid=str(parent["id"]); kids=[t for t in ts if t.get("parent_task_id")==pid] or [parent]
    if not kids: raise RuntimeError("projeto V2 sem tarefas-filhas")
    branches={str(t.get("branch") or "").strip() for t in kids if str(t.get("branch") or "").strip()}
    if len(branches)!=1: raise RuntimeError(f"projeto V2 exige uma branch compartilhada; achei {branches}")
    return parent,kids,next(iter(branches))

def ask_openai(cfg,ledger,key,system,prompt):
    if len(system)>MAX_PROMPT or len(prompt)>MAX_PROMPT:
        raise ValueError("contexto excede limite da V2; nenhuma chamada parcial será paga")
    lim=OpenAICallLimiter(max_output_tokens=MAX_OUT)
    req=build_request(model_id=cfg.model,tier=TIER_NORMAL,system=system,prompt=prompt,limiter=lim)
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
        if (c.get("user") or {}).get("login")==worker_bridge.COORDINATOR_BOT_LOGIN and b.startswith(worker_bridge.COORDINATOR_COMMENT_MARKER) and worker_bridge.AUDIT_CARD_HEADER in b:
            return b
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
    # OpenAI não pode dar baixa em etapa por declaração.
    prefix=[]
    for tid in ids:
        if tid in st.done:prefix.append(tid)
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
    if not before:return None
    p=subprocess.run(["git","-C",repo,"diff","--no-ext-diff",f"{before}..{after}","--",*files],capture_output=True,text=True)
    if p.returncode or not p.stdout or len(p.stdout)>MAX_DIFF:return None
    return p.stdout

def review_prompt(kid,p,before,after,patch,report):
    data={"task_id":kid["id"],"title":kid.get("titulo"),"objective":str(kid.get("objetivo") or "")[:1200],
          "instruction":str(p.get("instructions") or "")[:800],"before":before,"after":after,
          "question_report":(report or "")[:1600],"diff":patch}
    schema='{"decision":"ACCEPT|ACCEPT_WITH_DEFERRED|FIX","correction_instructions":"...","deferred":[{"item":"...","reason":"..."}],"reason":"..."}'
    return LAWS+"\nRevise. FIX só se conteúdo publicado realmente precisar correção; pendência isolável deve ser diferida sem travar o todo. JSON: "+schema+"\n"+json.dumps(data,ensure_ascii=False)

def card_state(card,head):
    if not card or not head or f"**HEAD auditado:** `{head}`" not in card:return None
    if any(marker in card for marker in worker_bridge.AUDIT_TECHNICAL_FAILURE_MARKERS):return None
    if worker_bridge.AUDIT_NEEDS_FIX_LINE in card:return "NEEDS-FIX"
    if worker_bridge.AUDIT_MERGE_READY_LINE in card and "**AVAL FINAL INDEPENDENTE — ChatGPT/OpenAI Auditor (Issue #106):** ✅ MERGE-READY" in card:
        return "MERGE-READY"
    return None

def checkpoint_on_head(repo,checkpoint,head):
    if not checkpoint or not head:return False
    return subprocess.run(["git","-C",repo,"merge-base","--is-ancestor",checkpoint,head],
                          stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0

def review_existing_work(repo,kid,meta,head,reason,cfg,ledger,key):
    """Uma edição vazia só pode liberar a etapa após cotejo independente do HEAD."""
    if not head or NO_CHANGE_REASON not in reason:return None
    files=tuple(kid.get("arquivos") or ())
    if len(files)!=1:return None
    path=str(files[0]); ids=list(dict.fromkeys(re.findall(r"\bq-[a-z0-9-]+\b",reason.lower())))[:8]
    if not ids:return None
    shown=subprocess.run(["git","-C",repo,"show",f"{head}:{path}"],capture_output=True,text=True)
    if shown.returncode:return None
    excerpts=[]
    for qid in ids:
        match=re.search(r'id=["\']'+re.escape(qid)+r'["\']',shown.stdout,re.I)
        if not match:return None
        mirror="b"+qid
        mirror_match=re.search(r'id=["\']'+re.escape(mirror)+r'["\']',shown.stdout,re.I)
        excerpts.append({"id":qid,"html":shown.stdout[match.start():match.start()+2200],
                         "bank_mirror_id":mirror if mirror_match else None,
                         "bank_mirror_html":shown.stdout[mirror_match.start():mirror_match.start()+450] if mirror_match else None})
    source=""
    if meta.source_pack_path:
        with open(os.path.join(repo,meta.source_pack_path),encoding="utf-8") as f:source=f.read()
        source=source[source.find("## 2."):] if "## 2." in source else source
    data={"task":kid["id"],"objective":str(kid.get("objetivo") or "")[:1300],
          "source_pack":source[:5000],"claude_no_change_claim":reason[:1800],
          "verified_head":head,"existing_question_html":excerpts}
    prompt=LAWS+"\nConfira TODAS as partes da tarefa e o espelho do Banco General. Os IDs foram encontrados no HEAD real, mas existência por si só não prova equivalência. Aceite sem novo commit SOMENTE se o conteúdo mostrado ensina e cobra tudo o que a fonte pede, com proveniência correta. Se faltar evidência ou correção, escolha FIX. JSON: {\"decision\":\"ACCEPT_WITH_DEFERRED|FIX\",\"reason\":\"...\",\"correction_instructions\":\"...\",\"deferred\":[{\"item\":\"...\",\"reason\":\"...\"}]}\n"+json.dumps(data,ensure_ascii=False)
    answer=ask_openai(cfg,ledger,key,REVIEW_SYSTEM,prompt)
    if answer.get("decision") not in {"ACCEPT_WITH_DEFERRED","FIX"}:raise ValueError("revisão de no-op sem decisão válida")
    return answer

def accept_existing_work(st,focus,head,review,ss,api,base_branch):
    add_deferred(st,review.get("deferred"))
    add_deferred(st,[{"item":focus,"reason":"Conteúdo canônico já presente no HEAD; sem nova questão/commit. "+str(review.get("reason") or "")[:500]}])
    if focus not in st.done:st.done.append(focus)
    st.head=head;st.review=str(review.get("reason") or "")[:1800]
    st.correction=None;st.failures.pop(focus,None);st.final="RUNNING"
    ss.save(st,f"agent-v2: {focus} existente no HEAD revisado")
    try:api.despachar_worker_bridge(ref=base_branch);continuation="DISPATCHED"
    except Exception as exc:continuation=f"FAILED: {exc}"
    return {"action":"ACCEPT_WITH_DEFERRED","project":st.project_id,"task":focus,"head":head,
            "pr":st.pr,"done":st.done,"deferred":st.deferred,"continuation":continuation}

def run(a):
    ss=StateStore(GitJsonStore(a.state_git_remote,branch=STATE_BRANCH))
    proj=project(a.tasks_json,(ss.store.read().get("projects") or {}))
    if not proj:return {"action":"NO_PROJECT","reason":"nenhum agent_v2_enabled"}
    parent,kids,branch=proj; pid=str(parent["id"])
    bcfg=worker_bridge.WorkerBridgeConfig.from_env()
    if not bcfg.gate().open:raise RuntimeError(bcfg.gate().reason)
    api=bridge_pr.GitHubRestApi(owner=a.repo_owner,repo=a.repo_name)
    st=ss.get(pid)
    registry=OperationalWorkerRegistry(GitJsonStore(a.worker_state_git_remote,branch=WORKER_STATE_BRANCH))
    rt=TaskRuntimeStore(GitJsonStore(a.runtime_state_git_remote,branch=task_runtime.DEFAULT_TASK_RUNTIME_STATE_BRANCH))
    prs=api.prs_abertas_por_head(branch); pobj=prs[0] if prs else None; current=head_of(pobj)
    if pobj:st.pr=int(pobj.get("number") or st.pr or 0) or None; st.head=current or st.head
    # O runtime legado só é evidência quando o commit ainda pertence ao HEAD real da PR.
    if st.cycles==0 and not st.done and current:
        regs=rt.por_id()
        for kid in kids:
            reg=regs.get(str(kid["id"]))
            if reg and reg.status in {"DONE","NEEDS-AUDIT","MERGE-READY"} and reg.branch==branch and checkpoint_on_head(a.repo_dir,reg.checkpoint_commit,current):
                st.done.append(str(kid["id"]))
                report=(reg.question_report or "")
                marker="### Pendências diferidas"
                if marker in report:
                    section=report.split(marker,1)[1].split("**Notas de proveniência:**",1)[0].strip()
                    add_deferred(st,[{"item":str(kid["id"])+" · pendências legadas","reason":section[:700]}])
            else:break
        if st.done:ss.save(st,f"agent-v2: {pid} importa checkpoints legados")
    ledger=GitUsageLedger(GitJsonStore(a.state_git_remote,branch=OPENAI_USAGE_BRANCH))
    ocfg=OpenAIAuditorConfig.from_env()
    # OpenAI é o coordenador principal, mas indisponibilidade técnica/orçamento
    # cai no fallback declarativo seguro; nunca vira loop nem apaga as leis.
    card=latest_card(api,st.pr); cs=card_state(card,current)
    if st.final=="COMPLETE":
        if current!=st.head:raise RuntimeError("HEAD mudou depois da auditoria final; nova revisão necessária")
        return {"action":"COMPLETE","project":pid,"pr":st.pr,"head":current,"deferred":st.deferred}
    if st.final=="FINAL_AUDIT_PENDING" and cs=="MERGE-READY":
        st.final="COMPLETE"; st.review="Auditoria final MERGE-READY no HEAD exato."; ss.save(st,f"agent-v2: {pid} COMPLETE")
        return {"action":"COMPLETE","project":pid,"pr":st.pr,"head":current,"deferred":st.deferred,"message":"Aguardando somente merge manual de José."}
    if st.final=="FINAL_AUDIT_PENDING" and cs=="NEEDS-FIX":
        final_id=str(kids[-1]["id"]); st.final="RUNNING"; st.correction={"task_id":final_id,"instructions":"Corrija a auditoria final sem ampliar escopo:\n"+card[:3500]}
        if final_id in st.done:st.done.remove(final_id)
    elif st.final=="FINAL_AUDIT_PENDING":
        return {"action":"WAIT_AUDIT","project":pid,"pr":st.pr,"head":current,"reason":"aguardando cartão final confiável do HEAD; zero chamada paga"}
    if st.final=="BLOCKED_FIX" and NO_CHANGE_REASON in st.review and st.head==current:
        focus=next((str(t["id"]) for t in kids if str(t["id"]) not in st.done),None)
        if focus:
            kid=next(t for t in kids if str(t["id"])==focus)
            meta=worker_bridge.carregar_metadados_de_automacao(a.tasks_json).get(focus)
            try:
                rev=review_existing_work(a.repo_dir,kid,meta,current,st.review,ocfg,ledger,
                    f"agent-v2:{pid}:{st.cycles}:{current}:noop-review") if meta else None
            except Exception as exc:
                st.final="BLOCKED_GLOBAL";st.review="revisão de conteúdo existente indisponível: "+str(exc)[:700]
                ss.save(st,f"agent-v2: {focus} noop review blocked")
                return {"action":"WAIT","project":pid,"reason":st.review}
            if rev and rev["decision"]=="ACCEPT_WITH_DEFERRED":
                return accept_existing_work(st,focus,current,rev,ss,api,a.base_branch)
            if rev and rev["decision"]=="FIX":
                st.final="RUNNING";st.failures[focus]=1
                st.correction={"task_id":focus,"instructions":str(rev.get("correction_instructions") or rev.get("reason") or "Corrigir lacuna da revisão.")[:3000]}
                ss.save(st,f"agent-v2: {focus} noop precisa correção")
            else:
                st.final="BLOCKED_GLOBAL";st.review="sem evidência suficiente para aceitar trabalho existente no HEAD"
                ss.save(st,f"agent-v2: {focus} noop sem evidência")
                return {"action":"WAIT","project":pid,"reason":st.review}
    if st.final in {"BLOCKED_FIX","BLOCKED_GLOBAL"}:
        return {"action":"WAIT_BLOCKING_FIX","project":pid,"pr":st.pr,"head":current,"review":st.review}
    if st.cycles>=MAX_CYCLES_PER_PROJECT and len(st.done)<len(kids):
        return {"action":"WAIT","project":pid,"reason":f"limite de {MAX_CYCLES_PER_PROJECT} ciclos atingido antes de nova chamada paga"}
    free=workers_free(registry)
    if not free and len(st.done)<len(kids):
        st.review="Nenhum Claude Worker livre agora; nenhuma chamada OpenAI/Anthropic foi feita."
        ss.save(st,f"agent-v2: {pid} sem worker livre")
        return {"action":"WAIT","project":pid,"reason":st.review}
    if len(st.done)==len(kids):
        p={"action":"COMPLETE","deferred":[],"reason":"todos os checkpoints aceitos"}
    elif st.correction:
        ordered=[w for w in free if w!=st.correction.get("avoid_worker")]+[w for w in free if w==st.correction.get("avoid_worker")]
        p={"action":"EXECUTE","acknowledge_done":[],"focus_task_id":st.correction["task_id"],"worker_id":ordered[0] if ordered else None,
           "instructions":"Aplicar a correção e preservar todo o restante.","_correction":st.correction["instructions"],"deferred":[],"reason":"correção automática"}
    else:
        next_kid=next(t for t in kids if str(t["id"]) not in st.done)
        materialize(a.tasks_json,next_kid,{"instructions":"Preflight de escopo, fonte e política."},branch,current,st.cycles+1)
        try:
            p=ask_openai(ocfg,ledger,f"agent-v2:{pid}:{st.cycles}:{current}:plan",PLAN_SYSTEM,plan_prompt(parent,kids,st,free,runtime_context(rt,kids),card))
        except Exception as exc:
            # Fallback seguro: usa a próxima tarefa declarativa, como no fluxo manual antigo.
            ids_now=[str(t["id"]) for t in kids]
            next_id=next((x for x in ids_now if x not in st.done),None)
            if not next_id: p={"action":"COMPLETE","acknowledge_done":[],"deferred":[],"reason":"fallback sem tarefa restante"}
            else:
                kid_now=next(t for t in kids if str(t["id"])==next_id)
                p={"action":"EXECUTE","acknowledge_done":[],"focus_task_id":next_id,"worker_id":free[0],
                   "instructions":"Execute integralmente o objetivo declarativo desta unidade, seguindo todas as leis fixas.",
                   "deferred":[{"item":"Coordenação OpenAI","reason":"fallback técnico nesta rodada: "+str(exc)[:350]}],
                   "reason":"fallback declarativo seguro"}
    p=validate_plan(p,kids,st,free); add_deferred(st,p.get("deferred")); ids=[str(t["id"]) for t in kids]
    if p["action"]=="COMPLETE" and not all(x in st.done for x in ids):
        raise ValueError("OpenAI tentou concluir projeto com etapas ainda não aceitas pela V2")
    if all(x in st.done for x in ids):
        if not current or not st.pr:raise RuntimeError("concluído sem PR/HEAD final")
        if st.guard_head!=current:
            # Antes do Guard final, deixa na própria PR um resumo humano das pendências.
            prnow=api.pr_por_numero(st.pr)
            body=str(prnow.get("body") or "")
            marker="<!-- agent-v2-final -->"
            report=marker+"\n## Coordenação V2 — fechamento\n\n"
            report+="**Etapas aceitas:** "+str(len(st.done))+"/"+str(len(ids))+"\n\n"
            if st.deferred:
                report+="### Pendências diferidas\n"
                for item in st.deferred:
                    report+="- **"+str(item.get("item") or "item")+"** — "+str(item.get("reason") or "")+"\n"
            else:
                report+="**Pendências diferidas:** nenhuma.\n"
            report+="\n**Merge/publicação/deploy: exclusivamente José.**\n"
            body=body.split(marker,1)[0].rstrip()+"\n\n"+report
            api.atualizar_pr_corpo(st.pr,corpo=body)
            g=bridge_pr.disparar_guard(api,pr_number=st.pr,ref=a.base_branch)
            if g.action!="DISPATCHED":raise RuntimeError("Guard final: "+g.reason)
            st.guard_head=current
        st.final="FINAL_AUDIT_PENDING";st.head=current;ss.save(st,f"agent-v2: {pid} final audit")
        return {"action":"FINAL_AUDIT_PENDING","project":pid,"pr":st.pr,"head":current,"deferred":st.deferred}
    if p["action"]=="WAIT":
        st.review=str(p.get("reason") or "WAIT global/estrutural")[:1800]
        st.final="BLOCKED_GLOBAL";ss.save(st,f"agent-v2: {pid} WAIT global")
        return {"action":"WAIT","project":pid,"reason":st.review}
    if st.cycles>=MAX_CYCLES_PER_PROJECT:
        st.review=f"limite de segurança da V2 atingido ({MAX_CYCLES_PER_PROJECT} ciclos); nenhuma nova chamada paga foi feita."
        ss.save(st,f"agent-v2: {pid} cycle cap")
        return {"action":"WAIT","project":pid,"reason":st.review,"deferred":st.deferred}
    focus=str(p["focus_task_id"]);kid=next(t for t in kids if str(t["id"])==focus);wid=str(p["worker_id"])
    meta,rtask=materialize(a.tasks_json,kid,p,branch,current,st.cycles+1)
    if not registry.reservar_current_task_condicional(wid,canonical_task_id=focus,message=f"agent-v2: {wid}->{focus}"):raise RuntimeError("worker deixou de estar livre")
    st.cycles+=1
    rcfg=worker_bridge.construir_config_do_runner(bcfg,canonical_task_id=focus)
    gen=worker_bridge._closure_de_geracao(rtask,runner_config=rcfg,repo_dir=a.repo_dir,state_git_remote=a.state_git_remote,canonical_task_id=focus,transport=None,budget_usd=a.budget_usd)
    out=executar_tarefa(rtask,None,config=rcfg,repo_dir=a.repo_dir,state_git_remote=a.state_git_remote,
        validation_command_keys=tuple(k.strip() for k in a.validation_command_keys.split(",") if k.strip()),
        push_remote_name="origin",sucesso_status="DONE",worker_id=wid,worker_registry=registry,gerar_patch=gen,canonical_task_id=focus)
    result=out.result
    if not result or result.status!="DONE" or not result.checkpoint_commit:
        worker_bridge.liberar_worker_apos_resultado(registry,wid,canonical_task_id=focus,resultado_status=task_runtime.RUNTIME_BLOCKED)
        reason=result.reason if result else "Runner sem resultado";st.review=reason
        if current and NO_CHANGE_REASON in reason:
            try:
                rev=review_existing_work(a.repo_dir,kid,meta,current,reason,ocfg,ledger,
                    f"agent-v2:{pid}:{st.cycles}:{current}:noop-review")
            except Exception as exc:
                st.final="BLOCKED_GLOBAL";st.review="revisão de conteúdo existente indisponível: "+str(exc)[:700]
                ss.save(st,f"agent-v2: {focus} noop review blocked")
                return {"action":"WAIT","project":pid,"task":focus,"reason":st.review}
            if rev and rev["decision"]=="ACCEPT_WITH_DEFERRED":
                return accept_existing_work(st,focus,current,rev,ss,api,a.base_branch)
            if rev and rev["decision"]=="FIX":
                reason=str(rev.get("correction_instructions") or rev.get("reason") or reason)[:1800]
            else:
                st.final="BLOCKED_GLOBAL";st.review="sem evidência suficiente para aceitar trabalho existente no HEAD"
                ss.save(st,f"agent-v2: {focus} noop sem evidência")
                return {"action":"WAIT","project":pid,"task":focus,"reason":st.review}
        count=int(st.failures.get(focus) or 0)+1;st.failures[focus]=count
        if count>=2:
            add_deferred(st,[{"item":focus,"reason":"Etapa sem checkpoint após 2 tentativas; requer correção antes de avançar: "+reason[:550]}])
            st.correction=None
            st.final="BLOCKED_FIX"
            action="WAIT_BLOCKING_FIX"
        else:
            st.correction={"task_id":focus,"instructions":reason[:1800],"avoid_worker":wid}
            action="RUNNER_RETRY"
        ss.save(st,f"agent-v2: {focus} {action}")
        cont="STOPPED_FOR_SAFETY" if count>=2 else "FAILED"
        if count<2:
            try:api.despachar_worker_bridge(ref=a.base_branch);cont="DISPATCHED"
            except Exception as exc:cont=f"FAILED: {exc}"
        return {"action":action,"task":focus,"reason":reason,"attempt":count,"continuation":cont}
    newhead=result.checkpoint_commit
    worker_bridge.liberar_worker_apos_resultado(registry,wid,canonical_task_id=focus,resultado_status=task_runtime.RUNTIME_DONE)
    prout=bridge_pr.garantir_pr(api,task=rtask,canonical_task_id=focus,worker_id=wid,worker_display=bridge_workers.BRIDGE_DISPLAY_NAMES.get(wid,wid),
        checkpoint_commit=newhead,base_branch=a.base_branch,titulo_tarefa=str(parent.get("titulo") or pid),objetivo=str(parent.get("objetivo") or ""),
        area=str(kid.get("area") or "materia"),dependencias=tuple(kid.get("dependencias") or ()),source_pack_path=meta.source_pack_path,
        source_pack_sha256=meta.source_pack_sha256,question_report=out.question_report)
    if prout.action not in {"REUSED","CREATED"} or not prout.pr_number:
        st.head=newhead;st.final="BLOCKED_GLOBAL"
        st.review="checkpoint publicado, mas PR/relatório não sincronizados: "+prout.reason
        ss.save(st,f"agent-v2: {focus} PR sync blocked")
        return {"action":"WAIT","project":pid,"task":focus,"head":newhead,"reason":st.review}
    if prout.pr_number:st.pr=prout.pr_number
    patch=git_diff(a.repo_dir,current,newhead,tuple(rtask.allowed_files))
    try:
        prompt=review_prompt(kid,p,current,newhead,patch,out.question_report) if patch is not None else None
        if prompt is None or len(prompt)>MAX_PROMPT:
            raise ValueError("diff completo não cabe na revisão V2; reservado para auditoria final")
        rev=ask_openai(ocfg,ledger,f"agent-v2:{pid}:{st.cycles}:{newhead}:review",REVIEW_SYSTEM,prompt)
    except Exception as exc:
        # O trabalho fica na branch e seguirá para auditoria final; falha técnica do revisor não paralisa o projeto.
        rev={"decision":"ACCEPT_WITH_DEFERRED","correction_instructions":"",
             "deferred":[{"item":focus,"reason":"revisão OpenAI indisponível nesta rodada: "+str(exc)[:350]}],
             "reason":"aceito provisoriamente para continuidade; auditoria final continua obrigatória"}
    dec=str(rev.get("decision") or "").upper()
    if dec not in {"ACCEPT","ACCEPT_WITH_DEFERRED","FIX"}:
        rev={"decision":"ACCEPT_WITH_DEFERRED","deferred":[{"item":focus,"reason":"revisão OpenAI com decisão inválida; auditoria final obrigatória"}],"reason":"revisão técnica inconclusiva"}
        dec="ACCEPT_WITH_DEFERRED"
    add_deferred(st,rev.get("deferred"));st.head=newhead;st.review=str(rev.get("reason") or "")[:1800]
    review_cap=False
    if dec=="FIX":
        n=int(st.failures.get(focus) or 0)+1;st.failures[focus]=n
        st.correction={"task_id":focus,"instructions":str(rev.get("correction_instructions") or st.review or "Corrigir revisão.")[:3500]}
        if n>=3:
            review_cap=True
            st.final="BLOCKED_FIX"
            st.review="Correção substantiva permaneceu após 3 revisões; pausa sem nova chamada paga. "+st.review
    else:
        st.correction=None;st.failures.pop(focus,None)
        if focus not in st.done:st.done.append(focus)
    ss.save(st,f"agent-v2: ciclo {st.cycles} {focus}->{dec}")
    if review_cap:
        return {"action":"WAIT_BLOCKING_FIX","project":pid,"task":focus,"worker":wid,"head":newhead,"pr":st.pr,
                "done":st.done,"deferred":st.deferred,"review":st.review,"continuation":"STOPPED_FOR_SAFETY"}
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
