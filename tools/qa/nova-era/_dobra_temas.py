#!/usr/bin/env python3
"""Resolve os conflitos de rm-materia-sistema.js/.css de dois temas Nova Era mantendo OS DOIS (classificador + entrada de TEMAS + CSS).
uso: dobra.py <raiz-worktree>"""
import re,sys,os
R=sys.argv[1]; A=os.path.join(R,"Repasso-Med-Site--main/Atual - Copia/assets/")
def hunks(L):
    out=[];i=0
    while i<len(L):
        if L[i].startswith('<<<<<<<'):
            a=i; b=next(j for j in range(i,len(L)) if L[j].startswith('=======')); c=next(j for j in range(b,len(L)) if L[j].startswith('>>>>>>>'))
            out.append((a,b,c)); i=c+1
        else: i+=1
    return out
# CSS: mantém os dois
p=A+"rm-materia-sistema.css"; s=open(p,encoding="utf8").read()
s=re.sub(r'<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n',lambda m:m.group(1).rstrip("\n")+"\n\n"+m.group(2),s,flags=re.S); open(p,"w",encoding="utf8").write(s)
# JS
p=A+"rm-materia-sistema.js"; L=open(p,encoding="utf8").read().split("\n")
H=hunks(L); res=[]; pos=0; k=0
while k<len(H):
    a,b,c=H[k]; ours=L[a+1:b]; theirs=L[b+1:c]
    res+=L[pos:a]
    head=ours[0].lstrip()
    if head.startswith('/*'):   # classificador: cauda comum = 2 linhas (return otro + fecho da função)
        tail=L[c+1:c+3]; assert 'otro' in tail[0] and tail[1].strip()=="}", tail
        res+=ours+tail+[""]+theirs; pos=c+1; k+=1
    elif head.startswith("'") and ours[-1].strip().startswith('clasificar:'):   # entrada de TEMAS completa em cada lado; o fecho `    },` é comum e vem depois
        res+=ours+["    },"]+theirs; pos=c+1; k+=1
    elif head.startswith("'"):  # entrada de TEMAS: [A1, C2, A2] ... [B1, C2, B2]
        a2,b2,c2=H[k+1]; C2=L[c+1:a2]; ours2=L[a2+1:b2]; theirs2=L[b2+1:c2]
        res+=ours+C2+ours2+["    },"]+theirs+C2+theirs2; pos=c2+1; k+=2
    else: raise SystemExit("padrão inesperado: "+head[:60])
res+=L[pos:]
open(p,"w",encoding="utf8").write("\n".join(res))
print("ok",len(H),"hunks")
