#!/usr/bin/env python3
"""Resolve por UNIÃO os conflitos mecânicos de lista (rm-pilot.js, index.html, nao-ativacao, auditoria) de um merge da main numa branch Nova Era.
uso: uniao.py <raiz-do-worktree>   (lê os blocos HEAD=branch / theirs=main; acrescenta à lista da main os slugs que só a branch tem; VER = max(ours, theirs) e, se não passar da main, main+1)"""
import re,sys,os
R=sys.argv[1]; A=os.path.join(R,"Repasso-Med-Site--main/Atual - Copia/")
pat=re.compile(r'<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n',re.S)
def slugs(t): return re.findall(r"'([a-z0-9-]+)'",t)
def merge_list_line(mine,theirs):
    # une listas [ 'a', 'b' ] linha a linha (por ordem da main + extras da branch)
    out=[]
    ml=mine.split("\n"); tl=theirs.split("\n")
    for t in tl:
        m=re.search(r"\[('semiologia-ii'[^\]]*|'medicina-familiar'[^\]]*)\]",t)
        if m:
            tset=slugs(m.group(1)); extras=[]
            for mm in ml:
                x=re.search(r"\[('semiologia-ii'[^\]]*|'medicina-familiar'[^\]]*)\]",mm)
                if x and (x.group(1).startswith("'semiologia-ii'")==m.group(1).startswith("'semiologia-ii'")):
                    for s in slugs(x.group(1)):
                        if s not in tset and s not in extras: extras.append(s)
            if extras: t=t.replace(m.group(0),"["+m.group(1)+", "+", ".join("'%s'"%e for e in extras)+"]")
        out.append(t)
    return "\n".join(out)
vers=[]
def rep_pilot(m):
    mine,theirs=m.group(1),m.group(2)
    v1=int(re.search(r"var VER\s*=\s*'(\d+)'",mine).group(1)); v2=int(re.search(r"var VER\s*=\s*'(\d+)'",theirs).group(1))
    v=max(v1,v2+1) if v1<=v2 else v1
    vers.append(v)
    t=merge_list_line(mine,theirs)
    return re.sub(r"(var VER\s*=\s*')\d+(')",r"\g<1>%d\2"%v,t)
p=A+"assets/rm-pilot.js"; s=open(p,encoding="utf8").read(); s=pat.sub(rep_pilot,s); open(p,"w",encoding="utf8").write(s)
ver=re.search(r"var VER\s*=\s*'(\d+)'",s).group(1)
p=A+"index.html"; s=open(p,encoding="utf8").read(); s=pat.sub(lambda m:re.sub(r"v=\d+","v="+ver,m.group(2)),s); open(p,"w",encoding="utf8").write(s)
for rel in ("tools/qa/pre-voo/auditoria-implantacao-publica.test.cjs","tools/qa/pre-voo/nao-ativacao.test.cjs"):
    p=os.path.join(R,rel); s=open(p,encoding="utf8").read()
    def res(m):
        mine,theirs=m.group(1),m.group(2)
        # B5 «vizinhas fora das CANDIDATAS»: vale a versão CALCULADA (VIZ_FORA, da #645) sobre qualquer lista literal de matéria
        if 'for (const v of' in mine or 'for (const v of' in theirs:
            return mine if 'VIZ_FORA' in mine else theirs
        return merge_list_line(mine,theirs)
    s=pat.sub(res,s); open(p,"w",encoding="utf8").write(s)
print("VER",ver)
