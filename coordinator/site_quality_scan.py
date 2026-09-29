from __future__ import annotations
import argparse, hashlib, html, json, os, re
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

def quality_output(root, raw):
    base=(root/QUALITY_DIR).resolve()
    target=(root/Path(raw)).resolve()
    if base not in target.parents:
        raise SystemExit('Saída do quality scan deve ficar em coordination/quality/')
    return target

CLAUDE_SYS='''Você é o caça-erros READ-ONLY do Repasso Med. Detecte problemas; nunca corrija nem devolva patch. Use SOMENTE o trecho fornecido. Procure evidência concreta de: erro/contradição científica; conflito cátedra×literatura não rotulado; resumo que não ensina o que a questão cobra; gabarito/explicação incoerente; pista visual de resposta; duplicação; G0/ALMA genérica; densidade excessiva; castelhano confuso; metatexto de como estudar/usar; post-it mal localizado; risco de annotation-safety; HTML suspeito; inconsistência texto/tabela/flashcard/questão. Não invente erro e ignore gosto estilístico. Cátedra é base; literatura corrige/complementa com divergência explícita. RESUMO ENSINA→QUESTÃO COBRA→EXPLICAÇÃO REFORÇA. Preserve IDs/anchors/highlights/ink/notes. Questão de prova exige proveniência real. Responda SOMENTE JSON válido: {"findings":[{"severity":"P0|P1|P2|P3","category":"science|questions|didactics|alma|density|annotations|postits|html|consistency|other","title":"...","location":"...","evidence":"...","why":"...","confidence":"high|medium"}]}. Máximo 18.'''
OPENAI_SYS='''Você é o segundo revisor independente. Não crie novos achados e não corrija arquivos. Receberá candidatos de outro modelo. Para cada id classifique KEEP, UNCERTAIN ou DROP usando apenas a evidência. KEEP=problema concreto; UNCERTAIN=plausível mas falta contexto; DROP=não demonstrado/gosto estilístico. Responda SOMENTE JSON válido: {"decisions":[{"id":"...","decision":"KEEP|UNCERTAIN|DROP","reason":"..."}]}'''

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
    s=path.stem; out=[]; visible=re.sub(r'<!--[\\s\\S]*?-->','',text)
    ids=re.findall(r'\bid=["\']([^"\']+)["\']',visible,re.I)
    dup=[x for x,n in Counter(ids).items() if n>1]
    if dup: out.append(('P0','html','IDs HTML duplicados',','.join(dup[:12]),'Pode quebrar âncoras/navegação/annotation-safety.'))
    for tag in ('section','div','table','tr'):
        a=len(re.findall(fr'<{tag}\b',text,re.I)); f=len(re.findall(fr'</{tag}>',text,re.I))
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

def claude(subject,chs):
    tr=AnthropicTransport(timeout=180,max_retries=0); found=[]; usage=[]
    for i,(a,b,txt) in enumerate(chs,1):
        req=anthropic_client.Request(model_id=os.getenv('REPASSO_QUALITY_CLAUDE_MODEL',MODEL_IDS[ModelTier.FAST]),tier='FAST',max_output_tokens=3500,system=CLAUDE_SYS,prompt=f'MATÉRIA:{subject}\nFAIXA:{a}:{b}\nHTML:\n{txt}')
        r=tr.send(req); usage.append({'provider':'anthropic','input_tokens':r.input_tokens,'output_tokens':r.output_tokens,'chunk':i})
        try: items=parse(r.text).get('findings',[])
        except Exception as exc: raise RuntimeError(f'Claude retornou JSON inválido no chunk {i}') from exc
        for x in items[:18]:
            if not isinstance(x,dict) or not x.get('title') or not x.get('evidence'):continue
            loc=str(x.get('location') or f'{a}:{b}'); z={'subject':subject,'severity':str(x.get('severity','P2')).upper(),'category':str(x.get('category','other')),'title':str(x['title'])[:180],'location':loc[:220],'evidence':str(x['evidence'])[:500],'why':str(x.get('why',''))[:700],'confidence':str(x.get('confidence','medium')),'found_by':'claude'}; z['id']=fid(subject,z['category'],z['title'],z['location'],z['evidence'][:200]); found.append(z)
    return list({x['id']:x for x in found}.values()),usage

def validate(cands):
    if not cands:return {},[]
    compact=[{k:v for k,v in x.items() if k in {'id','subject','severity','category','title','location','evidence','why','confidence'}} for x in cands]
    req=openai_client.Request(model_id=os.getenv('REPASSO_QUALITY_OPENAI_MODEL','gpt-5.6-terra'),tier='TERRA',max_output_tokens=3000,system=OPENAI_SYS,prompt=json.dumps({'candidates':compact},ensure_ascii=False))
    r=OpenAIResponsesTransport(timeout=120,max_retries=0).send(req)
    try: ds=parse(r.text).get('decisions',[])
    except Exception as exc: raise RuntimeError('OpenAI retornou JSON inválido') from exc
    out={}
    for d in ds:
        if isinstance(d,dict) and d.get('id'):
            v=str(d.get('decision','UNCERTAIN')).upper(); out[str(d['id'])]=v if v in {'KEEP','UNCERTAIN','DROP'} else 'UNCERTAIN'
    return out,[{'provider':'openai','input_tokens':r.input_tokens,'output_tokens':r.output_tokens}]

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

def markdown(report):
    active=[x for x in report.get('findings',[]) if x.get('status') in {'OPEN','REOPENED'}]; cnt={s:sum(x.get('severity')==s for x in active) for s in ('P0','P1','P2','P3')}
    L=['# Painel contínuo de erros globais — Repasso Med','', '> **READ-ONLY:** registra achados; não corrige matérias, não escreve Supabase e não faz merge.','',f"Atualizado: `{report.get('updated_at')}`  ",f"Abertos: **{len(active)}** · P0 **{cnt['P0']}** · P1 **{cnt['P1']}** · P2 **{cnt['P2']}** · P3 **{cnt['P3']}**",'','## Pendências abertas','']
    if not active:L.append('Nenhum achado aberto registrado até agora.')
    for sev in ('P0','P1','P2','P3'):
        g=[x for x in active if x.get('severity')==sev]
        if not g:continue
        L += [f'### {sev}','']
        for x in g:L += [f"- **[{x.get('subject')}] {x.get('title')}** — `{x.get('category')}` · validação `{x.get('openai_validation','deterministic')}`",f"  - Local: {x.get('location')}",f"  - Evidência: {x.get('evidence')}",f"  - Motivo: {x.get('why')}",f"  - ID: `{x.get('id')}`"]
        L.append('')
    L += ['## Regra de uso','','Achado aceito vira tarefa separada de correção. Nunca corrigir dentro desta PR de painel. Fechamento continua humano.','','## Últimas execuções','']
    for r in reversed(report.get('runs',[])[-12:]):L.append(f"- `{r.get('timestamp')}` · **{r.get('subject')}** · faixa `{r.get('ranges')}` · candidatos {r.get('candidates',0)} · mantidos {r.get('kept',0)} · incertos {r.get('uncertain',0)}")
    return '\n'.join(L)+'\n'

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--root',default='.'); ap.add_argument('--subject'); ap.add_argument('--report',default='coordination/quality/global-findings.json'); ap.add_argument('--markdown',default='coordination/quality/global-findings.md'); a=ap.parse_args(); root=Path(a.root).resolve(); rp=quality_output(root,a.report); report=load(rp); fs=files(root); ts=now()
    det=[]
    for p in fs:det += static(p,p.read_text('utf-8',errors='replace'))
    p=choose(fs,report,a.subject); text=p.read_text('utf-8',errors='replace'); chs,nxt=chunks(text,report.get('cursor',{}).get(p.stem,0)); cands=[]; usage=[]; err=None; claude_ok=False
    try:cands,u=claude(p.stem,chs);usage+=u;claude_ok=True
    except Exception as e:err=f'Anthropic:{type(e).__name__}:{e}'
    dec={}
    if cands:
        try:dec,u=validate(cands);usage+=u
        except Exception as e:err=(err+' | ' if err else '')+f'OpenAI:{type(e).__name__}:{e}'
    keep=[];unc=drop=0
    for x in cands:
        d=dec.get(x['id'],'UNCERTAIN' if dec else 'UNAVAILABLE');x['openai_validation']=d
        if d=='DROP':drop+=1;continue
        if d in {'UNCERTAIN','UNAVAILABLE'}:unc+=1
        keep.append(x)
    resolve_deterministic(report,det,ts);merge(report,det+keep,ts);report['updated_at']=ts;report.setdefault('cursor',{})[p.stem]=nxt if claude_ok else int(report.get('cursor',{}).get(p.stem,0) or 0);run={'timestamp':ts,'subject':p.stem,'ranges':[f'{a}:{b}' for a,b,_ in chs],'candidates':len(cands),'kept':len(keep)-unc,'uncertain':unc,'dropped':drop,'static_findings':len(det),'usage':usage,'api_error':err};report.setdefault('runs',[]).append(run);report['runs']=report['runs'][-40:]
    rp.parent.mkdir(parents=True,exist_ok=True);rp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8');mp=quality_output(root,a.markdown);mp.parent.mkdir(parents=True,exist_ok=True);mp.write_text(markdown(report),'utf-8');print(json.dumps(run,ensure_ascii=False))
if __name__=='__main__':main()
