# Uso: git show origin/main:<neurologia.html> > /tmp/neu_main.html ; git show <branch>:<neurologia.html> > /tmp/neu_687.html ; python3 comparar-com-main.py
import re,html,json,sys,difflib
def T(x): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',x))).strip()
def parse(path):
    s=open(path,encoding='utf-8').read()
    b=s.find('id="banconeu"')
    out={}
    for m in re.finditer(r'<div class="quiz-item" id="(q-neu[\w-]+)">',s[:b]):
        st=m.start(); en=s.find('<div class="quiz-item"',m.end()); en=en if en>0 else b
        blk=s[st:min(en,b)]
        stem=T(re.search(r'<p class="quiz-question">(.*?)</p>',blk,re.S).group(1))
        opts=[T(o) for o in re.findall(r'<li>([a-d]\) .*?)</li>',blk,re.S)]
        am=re.search(r'class="answer">\s*<p><strong>(.*?)</strong>',blk,re.S)
        ans=T(am.group(1)) if am else ''
        vf=re.search(r'checkTF\(this, (true|false)\)',blk)
        out[m.group(1)]=dict(stem=stem,opts=opts,ans=ans,vf=vf.group(1) if vf else None,bold=bool((lambda m: m and re.search(r'<(b|strong|em|i)>|style=|color',m.group(1)))(re.search(r'<ul class="options">(.*?)</ul>',blk,re.S))),raw=blk)
    return out
A=parse('/tmp/neu_main.html'); B=parse('/tmp/neu_687.html')
rows=[]
strip=lambda o:re.sub(r'^[a-d]\)\s*','',o)
for k,b in B.items():
    a=A.get(k)
    if a is None: rows.append((k,'NOVA',''));continue
    if a['vf'] is not None or b['vf'] is not None:
        if a['vf']!=b['vf']: rows.append((k,'VF_MUDOU',f"{a['vf']}->{b['vf']}"))
        elif a['stem']!=b['stem'] or a['ans']!=b['ans']: rows.append((k,'VF_TEXTO',''))
        else: rows.append((k,'IGUAL',''))
        continue
    ao=[strip(o) for o in a['opts']]; bo=[strip(o) for o in b['opts']]
    ca=None;cb=None
    ma=re.match(r'([a-d])\)',a['ans']); mb=re.match(r'([a-d])\)',b['ans'])
    if ma and ao: ca=ao['abcd'.index(ma.group(1))]
    if mb and bo: cb=bo['abcd'.index(mb.group(1))]
    if a['opts']==b['opts'] and a['ans']==b['ans'] and a['stem']==b['stem']: rows.append((k,'IGUAL',''))
    elif sorted(ao)==sorted(bo) and ca==cb and a['stem']==b['stem']: rows.append((k,'SO_REORDENADA',f"{ma.group(1) if ma else ''}->{mb.group(1) if mb else ''}"))
    elif ca==cb: rows.append((k,'MESMA_RESPOSTA_TEXTO_MUDOU',''))
    else:
        sim=difflib.SequenceMatcher(None,ca or '',cb or '').ratio()
        rows.append((k,'RESPOSTA_DIFERENTE',f"sim={sim:.2f} | {ca} || {cb}"))
removed=[k for k in A if k not in B]
import collections
print(collections.Counter(r[1] for r in rows), 'removidas:',removed)

for r in rows:
    if r[1] in('RESPOSTA_DIFERENTE','VF_MUDOU','VF_TEXTO'): print(r[0],r[1],r[2][:260])
print('bold nas alternativas (687):',[k for k,b in B.items() if b['bold']])
