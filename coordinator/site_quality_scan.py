from __future__ import annotations
import argparse, hashlib, html, json, os, re, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from coordinator import anthropic_client, openai_client
from coordinator.anthropic_transport import AnthropicTransport
from coordinator.models import MODEL_IDS, ModelTier
from coordinator.openai_transport import OpenAIResponsesTransport

MATTER_DIR=Path('Repasso-Med-Site--main/Atual - Copia/netlify/functions/materias-privadas')
EXCLUDED={'bioestadistica.html','imagenologia.html','anatomiapatologica-ii.html'}
CHUNK=140000
QUALITY_DIR=Path('coordination/quality')
# Matérias DEFERIDAS por José: nunca auditadas, nunca geram achado/tarefa.
DEFERRED={'imagenologia','bioestadistica'}
# Estratégia de custo (Claude com saldo mínimo): OpenAI = analisador principal;
# Claude Haiku = segundo revisor SÓ dos achados incertos, no máximo 1 chamada.
OPENAI_MAX_OUT=6000
CLAUDE_MAX_OUT=1000
CLAUDE_MAX_ITEMS=12
WORK_DIR=Path('/tmp/repasso-quality-scan')

def quality_output(root, raw):
    base=(root/QUALITY_DIR).resolve()
    target=(root/Path(raw)).resolve()
    if base not in target.parents:
        raise SystemExit('Saída do quality scan deve ficar em coordination/quality/')
    return target

OPENAI_SYS='''Você é o caça-erros READ-ONLY PRINCIPAL do Repasso Med. Detecte problemas; nunca corrija nem devolva patch. Use SOMENTE o trecho fornecido. Procure evidência concreta de: erro/contradição científica; conflito cátedra×literatura não rotulado; resumo que não ensina o que a questão cobra; gabarito/explicação incoerente; pista visual de resposta; duplicação; G0/ALMA genérica; densidade excessiva; castelhano confuso; metatexto de como estudar/usar; post-it mal localizado; risco de annotation-safety; HTML suspeito; inconsistência texto/tabela/flashcard/questão. Distinga PROBLEMA CONCRETO de preferência estética: NÃO reporte gosto, estilo ou "poderia ficar melhor". Não invente erro. Cátedra é base; literatura corrige/complementa com divergência explícita. RESUMO ENSINA→QUESTÃO COBRA→EXPLICAÇÃO REFORÇA. Preserve IDs/anchors/highlights/ink/notes. Questão de prova exige proveniência real. Para cada achado indique certainty: CONFIRMED = evidência concreta e suficiente dentro do trecho; NEEDS_SECOND_OPINION = plausível mas ambíguo ou dependente de contexto fora do trecho. Inclua context = trecho literal curto (até 300 caracteres) que sustenta o achado. Responda SOMENTE JSON válido: {"findings":[{"severity":"P0|P1|P2|P3","category":"science|questions|didactics|alma|density|annotations|postits|html|consistency|other","title":"...","location":"...","evidence":"...","why":"...","confidence":"high|medium","certainty":"CONFIRMED|NEEDS_SECOND_OPINION","context":"..."}]}. Máximo 18.'''
CLAUDE_SYS='''Você é o segundo revisor econômico READ-ONLY do Repasso Med. Receberá SOMENTE achados que outro modelo marcou como incertos, cada um com evidência e contexto mínimo. Não procure achados novos, não corrija arquivos e não peça mais contexto. Para cada id responda KEEP (evidência demonstra problema concreto), UNCERTAIN (continua ambíguo) ou DROP (não demonstrado/preferência estética). reason com no máximo 120 caracteres. Responda SOMENTE JSON válido: {"decisions":[{"id":"...","decision":"KEEP|UNCERTAIN|DROP","reason":"..."}]}'''


def now(): return datetime.now(timezone.utc).isoformat()
def fid(*xs): return hashlib.sha256('\x1f'.join(x.strip().lower() for x in xs).encode()).hexdigest()[:16]
def load(p):
    if not p.exists(): return {'version':1,'cursor':{},'findings':[],'runs':[]}
    try: d=json.loads(p.read_text('utf-8'))
    except Exception: d={}
    d.setdefault('version',1); d.setdefault('cursor',{}); d.setdefault('findings',[]); d.setdefault('runs',[]); return d

def files(root):
    b=root/MATTER_DIR
    return [p for p in sorted(b.glob('*.html')) if p.name not in EXCLUDED and 'copia' not in p.name.lower()]

def static(path,text):
    s=path.stem; out=[]; visible=re.sub(r'<!--[\s\S]*?-->','',text)
    ids=re.findall(r'\bid=["\']([^"\']+)["\']',visible,re.I)
    dup=[x for x,n in Counter(ids).items() if n>1]
    if dup: out.append(('P0','html','IDs HTML duplicados',','.join(dup[:12]),'Pode quebrar âncoras/navegação/annotation-safety.'))
    for tag in ('section','div','table','tr'):
        a=len(re.findall(fr'<{tag}\b',visible,re.I)); f=len(re.findall(fr'</{tag}>',visible,re.I))
        if a!=f: out.append(('P0','html',f'HTML possivelmente desbalanceado: <{tag}>',f'aberturas={a}, fechamentos={f}','Pode quebrar layout/componentes.'))
    if re.search(r'c[oó]mo estudiar|como estudar|c[oó]mo usar (?:esta|la) (?:materia|p[aá]gina)|cómo usar el banco',visible,re.I):
        out.append(('P2','alma','Metatexto de estudo/interface ainda presente','Padrão Cómo estudiar/usar encontrado','A regra global #147 manda ir direto ao conteúdo real.'))
    for m in re.finditer(r'<ul[^>]*class=["\'][^"\']*options[^"\']*["\'][^>]*>(.*?)</ul>',visible,re.I|re.S):
        items=re.findall(r'<li\b[^>]*>(.*?)</li>',m.group(1),re.I|re.S); marked=[x for x in items if re.search(r'<(?:strong|b|mark)\b',x,re.I)]
        if len(items)>=2 and len(marked)==1:
            e=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',marked[0]))).strip()[:180]
            out.append(('P1','questions','Uma única alternativa tem destaque visual',e,'Pode denunciar o gabarito antes da interação.'))
            if sum(x[2]=='Uma única alternativa tem destaque visual' for x in out)>=5: break
    return [{'id':fid(s,c,t,e[:200]),'subject':s,'severity':v,'category':c,'title':t,'location':s,'evidence':e,'why':w,'confidence':'high','found_by':'deterministic','openai_validation':'deterministic'} for v,c,t,e,w in out]

def choose(fs,report,requested):
    if requested:
        q=requested.lower().removesuffix('.html')
        for p in fs:
            if p.stem.lower()==q:return p
        raise SystemExit('Matéria não encontrada/permitida: '+requested)
    cur=report.get('cursor',{}); ip=[p for p in fs if int(cur.get(p.stem,0) or 0)>0]
    if ip:return sorted(ip,key=lambda p:p.stem)[0]
    last={}
    for r in report.get('runs',[]):
        if r.get('subject'):last[r['subject']]=r.get('timestamp','')
    return min(fs,key=lambda p:(last.get(p.stem,''),p.stem))

def chunks(text,cursor):
    if not text:return [],0
    pos=max(0,min(int(cursor or 0),len(text)-1)); out=[]
    for _ in range(2):
        end=min(len(text),pos+CHUNK); cut=text.rfind('</section>',pos,end)
        if cut>pos+CHUNK//3:end=cut+10
        out.append((pos,end,text[pos:end])); pos=end
        if pos>=len(text):pos=0;break
    return out,pos

def parse(raw):
    raw=(raw or '').strip(); raw=re.sub(r'^```(?:json)?\s*|\s*```$','',raw); return json.loads(raw)

def work_path(work,name):
    base=Path(work).resolve(); t=(base/name).resolve()
    if base not in t.parents: raise SystemExit('Estado intermediário do quality scan deve ficar no diretório de trabalho')
    return t

def work_save(work,name,data):
    t=work_path(work,name); t.parent.mkdir(parents=True,exist_ok=True); t.write_bytes((json.dumps(data,ensure_ascii=False)+'\n').encode('utf-8'))

def work_load(work,name):
    t=work_path(work,name); return json.loads(t.read_text('utf-8')) if t.exists() else None

def set_output(name,value):
    path=os.environ.get('GITHUB_OUTPUT')
    if path:
        with open(path,'a',encoding='utf-8') as fh: fh.write(f'{name}={value}\n')

def openai_scan(subject,chs):
    """Analisador PRINCIPAL. Falha (JSON inválido, erro de API) LEVANTA: o scan falha fechado, sem inventar achados."""
    tr=OpenAIResponsesTransport(timeout=180,max_retries=0); found=[]; usage=[]
    model=os.getenv('REPASSO_QUALITY_OPENAI_MODEL','gpt-5.6-terra')
    for i,(a,b,txt) in enumerate(chs,1):
        req=openai_client.Request(model_id=model,tier='TERRA',max_output_tokens=OPENAI_MAX_OUT,system=OPENAI_SYS,prompt=f'MATÉRIA:{subject}\nFAIXA:{a}:{b}\nHTML:\n{txt}')
        r=tr.send(req); usage.append({'provider':'openai','input_tokens':r.input_tokens,'output_tokens':r.output_tokens,'chunk':i})
        try:
            items=parse(r.text).get('findings',[])
            if not isinstance(items,list): raise ValueError('findings não é lista')
        except Exception as exc: raise RuntimeError(f'OpenAI retornou JSON inválido no chunk {i}') from exc
        for x in items[:18]:
            if not isinstance(x,dict) or not x.get('title') or not x.get('evidence'):continue
            cert=str(x.get('certainty','')).upper(); cert=cert if cert in {'CONFIRMED','NEEDS_SECOND_OPINION'} else 'NEEDS_SECOND_OPINION'
            loc=str(x.get('location') or f'{a}:{b}'); z={'subject':subject,'severity':str(x.get('severity','P2')).upper(),'category':str(x.get('category','other')),'title':str(x['title'])[:180],'location':loc[:220],'evidence':str(x['evidence'])[:500],'why':str(x.get('why',''))[:700],'confidence':str(x.get('confidence','medium')),'certainty':cert,'context':str(x.get('context') or '')[:300],'found_by':'openai'}; z['id']=fid(subject,z['category'],z['title'],z['location'],z['evidence'][:200]); found.append(z)
    return list({x['id']:x for x in found}.values()),usage

def claude_second_opinion(cands):
    """Segundo revisor ECONÔMICO: no máximo UMA chamada Haiku (FAST), sem retry, só com os incertos e contexto mínimo."""
    items=[{k:x.get(k) for k in ('id','severity','category','title','location','evidence','why','context')} for x in cands[:CLAUDE_MAX_ITEMS]]
    req=anthropic_client.Request(model_id=os.getenv('REPASSO_QUALITY_CLAUDE_MODEL',MODEL_IDS[ModelTier.FAST]),tier='FAST',max_output_tokens=CLAUDE_MAX_OUT,system=CLAUDE_SYS,prompt=json.dumps({'items':items},ensure_ascii=False))
    r=AnthropicTransport(timeout=120,max_retries=0).send(req)
    usage=[{'provider':'anthropic','input_tokens':r.input_tokens,'output_tokens':r.output_tokens}]
    ds=parse(r.text).get('decisions',[]); out={}
    for d in ds:
        if isinstance(d,dict) and d.get('id'):
            v=str(d.get('decision','UNCERTAIN')).upper(); out[str(d['id'])]=v if v in {'KEEP','UNCERTAIN','DROP'} else 'UNCERTAIN'
    return out,usage,[x['id'] for x in items]

def cost_summary(usage,needs_claude,claude_error,attempted=0):
    o=[u for u in usage if u.get('provider')=='openai']; c=[u for u in usage if u.get('provider')=='anthropic']
    spared=not c and not attempted
    reason='OpenAI não marcou nenhum achado incerto' if (spared and not needs_claude) else ('Claude tentado (1x, sem retry) mas não concluiu: '+str(claude_error) if (attempted and not c) else '')
    return {'openai_calls':len(o),'openai_input_tokens':sum(int(u.get('input_tokens') or 0) for u in o),'openai_output_tokens':sum(int(u.get('output_tokens') or 0) for u in o),'claude_calls':len(c),'claude_attempts':max(len(c),int(attempted)),'claude_input_tokens':sum(int(u.get('input_tokens') or 0) for u in c),'claude_output_tokens':sum(int(u.get('output_tokens') or 0) for u in c),'claude_spared':spared,'claude_spared_reason':reason}

def resolve_deterministic(report,current,ts):
    current_ids={x['id'] for x in current if isinstance(x,dict) and x.get('id')}
    for x in report.get('findings',[]):
        if not isinstance(x,dict):continue
        if x.get('found_by')!='deterministic':continue
        if x.get('status') not in {'OPEN','REOPENED'}:continue
        if x.get('id') in current_ids:continue
        x['status']='RESOLVED';x['resolved_at']=ts
        x['resolution']='Não reproduzido pelo scanner determinístico na main desta execução.'

def merge(report,new,ts):
    old={x['id']:x for x in report.get('findings',[]) if isinstance(x,dict) and x.get('id')}
    for x in new:
        prev=old.get(x['id']); x['first_seen']=(prev or {}).get('first_seen') or ts; x['last_seen']=ts; x['status']='REOPENED' if prev and prev.get('status') in {'RESOLVED','DISMISSED'} else (prev or {}).get('status','OPEN'); old[x['id']]=x
    report['findings']=sorted(old.values(),key=lambda x:(x.get('status') not in {'OPEN','REOPENED'},x.get('severity','P9'),x.get('subject',''),x.get('title','')))

def _cost_line(c):
    tail=' · Claude poupado' if c.get('claude_spared') else ''
    return f" · OpenAI {c.get('openai_calls',0)} chamada(s) {c.get('openai_input_tokens',0)}+{c.get('openai_output_tokens',0)} tok · Claude {c.get('claude_calls',0)} chamada(s) {c.get('claude_input_tokens',0)}+{c.get('claude_output_tokens',0)} tok{tail}"

def markdown(report):
    active=[x for x in report.get('findings',[]) if x.get('status') in {'OPEN','REOPENED'}]; cnt={s:sum(x.get('severity')==s for x in active) for s in ('P0','P1','P2','P3')}
    L=['# Painel contínuo de erros globais — Repasso Med','', '> **READ-ONLY:** registra achados; não corrige matérias, não escreve Supabase e não faz merge.','','Fluxo: OpenAI (principal) → Claude Haiku somente nos achados incertos.','',f"Atualizado: `{report.get('updated_at')}`  ",f"Abertos: **{len(active)}** · P0 **{cnt['P0']}** · P1 **{cnt['P1']}** · P2 **{cnt['P2']}** · P3 **{cnt['P3']}**",'','## Pendências abertas','']
    if not active:L.append('Nenhum achado aberto registrado até agora.')
    for sev in ('P0','P1','P2','P3'):
        g=[x for x in active if x.get('severity')==sev]
        if not g:continue
        L += [f'### {sev}','']
        for x in g:L += [f"- **[{x.get('subject')}] {x.get('title')}** — `{x.get('category')}` · validação `{x.get('second_opinion') or x.get('openai_validation','deterministic')}`",f"  - Local: {x.get('location')}",f"  - Evidência: {x.get('evidence')}",f"  - Motivo: {x.get('why')}",f"  - ID: `{x.get('id')}`"]
        L.append('')
    L += ['## Regra de uso','','Achado aceito vira tarefa separada de correção. Nunca corrigir dentro desta PR de painel. Fechamento continua humano.','','## Últimas execuções','']
    for r in reversed(report.get('runs',[])[-12:]):L.append(f"- `{r.get('timestamp')}` · **{r.get('subject')}** · faixa `{r.get('ranges')}` · candidatos {r.get('candidates',0)} · mantidos {r.get('kept',0)} · incertos {r.get('uncertain',0)}"+(_cost_line(r['cost']) if isinstance(r.get('cost'),dict) else ''))
    return '\n'.join(L)+'\n'

def stage_openai(root,a,work):
    """Etapas A+B: scans estáticos (zero API) + OpenAI principal. Só OPENAI_API_KEY é necessária."""
    fs=files(root); report=load(quality_output(root,a.report)); ts=now()
    if a.subject and a.subject.lower().removesuffix('.html') in DEFERRED:
        raise SystemExit('Matéria deferida por José (Imagenología/Bioestadística): não auditar agora.')
    det=[]
    for p in fs:det += static(p,p.read_text('utf-8',errors='replace'))
    p=choose(fs,report,a.subject); text=p.read_text('utf-8',errors='replace'); chs,nxt=chunks(text,report.get('cursor',{}).get(p.stem,0))
    try: cands,usage=openai_scan(p.stem,chs)
    except Exception as e:
        print(f'FALHA FECHADA: OpenAI {type(e).__name__}: {e}',file=sys.stderr); raise SystemExit(1)
    unc=[x for x in cands if x['certainty']=='NEEDS_SECOND_OPINION']
    work_save(work,'stage1.json',{'subject':p.stem,'ts':ts,'ranges':[f'{x}:{y}' for x,y,_ in chs],'nxt':nxt,'det':det,'cands':cands,'usage':usage})
    set_output('needs_claude','true' if unc else 'false')
    print(json.dumps({'stage':'openai','subject':p.stem,'candidates':len(cands),'needs_second_opinion':len(unc),'usage':usage},ensure_ascii=False))

def stage_claude(work):
    """Etapa C: Claude Haiku SÓ com os incertos (0 ou 1 chamada). Só ANTHROPIC_API_KEY é necessária. Falha não derruba o relatório da OpenAI."""
    st=work_load(work,'stage1.json')
    if st is None: raise SystemExit('stage1.json ausente: rode --stage openai antes')
    unc=[x for x in st['cands'] if x['certainty']=='NEEDS_SECOND_OPINION']
    if not unc:
        work_save(work,'stage2.json',{'skipped':True,'decisions':{},'usage':[],'error':None,'reviewed':[]}); print('ZERO chamada Claude: nenhum achado incerto.'); return
    dec={};usage=[];rev=[];err=None
    try: dec,usage,rev=claude_second_opinion(unc)
    except Exception as e: err=f'Anthropic:{type(e).__name__}:{e}'
    work_save(work,'stage2.json',{'skipped':False,'attempted':1,'decisions':dec,'usage':usage,'error':err,'reviewed':rev})
    print(json.dumps({'stage':'claude','items':len(rev),'usage':usage,'error':err},ensure_ascii=False))

def stage_finalize(root,a,work):
    """Consolida e escreve SOMENTE coordination/quality/. Nenhuma chave de API é necessária."""
    st=work_load(work,'stage1.json')
    if st is None: raise SystemExit('stage1.json ausente: rode --stage openai antes')
    s2=work_load(work,'stage2.json') or {'skipped':True,'decisions':{},'usage':[],'error':None,'reviewed':[]}
    report=load(quality_output(root,a.report)); ts=st['ts']; det=st['det']; cands=st['cands']; usage=list(st['usage'])+list(s2.get('usage') or [])
    dec=s2.get('decisions') or {}; reviewed=set(s2.get('reviewed') or []); needs=any(x['certainty']=='NEEDS_SECOND_OPINION' for x in cands)
    keep=[];unc=drop=0
    for x in cands:
        if x['certainty']=='CONFIRMED': x['second_opinion']='not_needed'; keep.append(x); continue
        d=dec.get(x['id']) if x['id'] in reviewed else None
        x['second_opinion']=d or 'UNAVAILABLE'
        if d=='DROP':drop+=1;continue
        if d!='KEEP':unc+=1
        keep.append(x)
    resolve_deterministic(report,det,ts);merge(report,det+keep,ts);report['updated_at']=ts;report.setdefault('cursor',{})[st['subject']]=st['nxt']
    run={'timestamp':ts,'subject':st['subject'],'ranges':st['ranges'],'candidates':len(cands),'kept':len(keep)-unc,'uncertain':unc,'dropped':drop,'static_findings':len(det),'usage':usage,'api_error':s2.get('error'),'cost':cost_summary(usage,needs,s2.get('error'),s2.get('attempted',0))};report.setdefault('runs',[]).append(run);report['runs']=report['runs'][-40:]
    rp=quality_output(root,a.report);rp.parent.mkdir(parents=True,exist_ok=True);rp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8');mp=quality_output(root,a.markdown);mp.parent.mkdir(parents=True,exist_ok=True);mp.write_text(markdown(report),'utf-8');print(json.dumps(run,ensure_ascii=False))

def main(argv=None):
    ap=argparse.ArgumentParser(); ap.add_argument('--root',default='.'); ap.add_argument('--subject'); ap.add_argument('--report',default='coordination/quality/global-findings.json'); ap.add_argument('--markdown',default='coordination/quality/global-findings.md')
    ap.add_argument('--stage',choices=['all','openai','claude','finalize'],default='all'); ap.add_argument('--work',default=str(WORK_DIR)); a=ap.parse_args(argv); root=Path(a.root).resolve(); work=a.work
    if a.stage in {'all','openai'}: stage_openai(root,a,work)
    if a.stage in {'all','claude'}: stage_claude(work)
    if a.stage in {'all','finalize'}: stage_finalize(root,a,work)
if __name__=='__main__':main()
