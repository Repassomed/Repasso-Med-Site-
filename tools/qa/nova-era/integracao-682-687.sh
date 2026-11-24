#!/bin/sh
# NEUROLOGÍA · ENSAIO REPETÍVEL DA INTEGRAÇÃO #682 (infográficos) × #687 (questões do Claude 1) — NÃO publica, NÃO dá merge, NÃO altera as duas branches.
# Cria um checkout DESCARTÁVEL (git worktree em <pasta>), parte da cabeça ATUAL da #687, junta a cabeça ATUAL da #682 e a main, aplica as resoluções já conhecidas
# (neu-questoes: lado #687; neu-glosario: união; inventário: regenerado) e roda os testes estáticos de Neurologia. Pára com mensagem se aparecer conflito DESCONHECIDO.
# Use de novo sempre que o Claude 1 empurrar mais commits na #687 (a nova rodada de questões): a integração só vale para a cabeça que ela testou.
# Uso: NODE_PATH=$(npm root -g) sh tools/qa/nova-era/integracao-682-687.sh <pasta-vazia-para-o-worktree> [--browser]
set -u
DIR="${1:?uso: integracao-682-687.sh <pasta-vazia> [--browser]}"; BROWSER="${2:-}"
R687=origin/claude/neuro-8a1b-1911; R682=origin/claude/neurologia-infograficos-b20-b27
git fetch -q origin main claude/neuro-8a1b-1911 claude/neurologia-infograficos-b20-b27 || exit 2
H687=$(git rev-parse --short "$R687"); H682=$(git rev-parse --short "$R682"); HM=$(git rev-parse --short origin/main)
echo "cabeças: #687=$H687 · #682=$H682 · main=$HM"
git worktree add -q --detach "$DIR" "$R687" || exit 2
cd "$DIR" || exit 2
git merge --no-commit --no-ff "$R682" >/dev/null 2>&1
CONF=$(git diff --name-only --diff-filter=U | sort | tr '\n' ' ')
echo "conflitos #687+#682: ${CONF:-nenhum}"
CONHECIDOS="docs/layout-ensaio/inventario.json tools/qa/neu-glosario/neu-glosario.test.cjs tools/qa/neu-questoes-1811/neu-questoes.test.cjs "
for f in $CONF; do case "$CONHECIDOS" in *"$f "*) ;; *) echo "CONFLITO DESCONHECIDO em $f — pare e resolva à mão (a integração NÃO está pronta)"; exit 3;; esac; done
python3 - <<'EOF'
import re,os
def res(p, fn):
    if not os.path.exists(p): return
    s=open(p).read()
    if '<<<<<<<' in s: open(p,'w').write(fn(s))
res('tools/qa/neu-questoes-1811/neu-questoes.test.cjs', lambda s: re.sub(r"<<<<<<< HEAD\n(.*?)=======\n.*?>>>>>>> [^\n]*\n", r"\1", s, flags=re.S))   # lado #687
res('tools/qa/neu-glosario/neu-glosario.test.cjs', lambda s: re.sub(r"<<<<<<< HEAD\n.*?\n=======\n(.*?)\n>>>>>>> [^\n]*\n", r"\1\n", s, flags=re.S).replace("  T(sem === N(oe.replace(", "  historico(sem === N(oe.replace("))   # união (lado #682 já usa .replace(GL))
EOF
git checkout -q --theirs docs/layout-ensaio/inventario.json 2>/dev/null
if grep -l '<<<<<<<' tools/qa/neu-glosario/neu-glosario.test.cjs tools/qa/neu-questoes-1811/neu-questoes.test.cjs >/dev/null 2>&1; then echo "marcadores de conflito restantes — resolver à mão"; exit 3; fi
# inventário da matéria integrada: regenerado pela ferramenta (nunca à mão)
node tools/qa/ensaio-layout/inventario.cjs neurologia >/dev/null 2>&1 || { echo "falha ao regenerar o inventário (NODE_PATH com playwright?)"; exit 4; }
python3 - <<'EOF2'
import json
P='docs/layout-ensaio/inventario.json'; par=open('docs/layout-ensaio/inventario.parcial.json').read().split('\n')
row=[l for l in par if l.startswith('{"slug":"neurologia"')][0].rstrip(',')
L=open(P).read().split('\n'); i=[k for k,l in enumerate(L) if l.startswith('{"slug":"neurologia"')][0]
L[i]=row+(',' if L[i].endswith(',') else ''); open(P,'w').write('\n'.join(L)); json.loads(open(P).read())
EOF2
rm -f docs/layout-ensaio/inventario.parcial.json
git add -A && git -c user.email=ensaio@local -c user.name=ensaio commit -q -m "ensaio: #682 sobre #687"
git merge --no-commit --no-ff origin/main >/dev/null 2>&1
CONF2=$(git diff --name-only --diff-filter=U | sort | tr '\n' ' '); echo "conflitos com a main: ${CONF2:-nenhum}"
for f in $CONF2; do [ "$f" = docs/layout-ensaio/inventario.json ] || { echo "CONFLITO DESCONHECIDO com a main em $f"; exit 3; }; done
# inventário: linha da main para as demais matérias, linha regenerada para neurologia
python3 - <<'EOF'
import re,subprocess
p='docs/layout-ensaio/inventario.json'; s=open(p).read()
m=re.search(r"<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]*\n",s,flags=re.S)
if m:
    a=m.group(1).split('\n'); b=m.group(2).split('\n'); out=[]
    byslug=lambda L:{re.match(r'\{"slug":"([^"]+)"',l).group(1):l for l in L if l.startswith('{"slug":"')}
    A,B=byslug(a),byslug(b)
    for l in b:
        sl=re.match(r'\{"slug":"([^"]+)"',l).group(1)
        out.append(A[sl].rstrip(',')+(',' if l.endswith(',') else '') if sl=='neurologia' else l)
    s=s[:m.start()]+'\n'.join(out)+'\n'+s[m.end():]
    open(p,'w').write(s)
EOF
git add -A && git -c user.email=ensaio@local -c user.name=ensaio commit -q -m "ensaio: main"
echo "== testes estáticos de Neurologia (cabeça integrada)"
for f in neu-8a1b/neu-8a1b neu-cierre/neu-cierre neu-glosario/neu-glosario neu-negrito/neu-negrito neu-questoes-1811/neu-questoes neu-vf/neu-vf neuro-667/neuro-667; do
  [ -f tools/qa/$f.test.cjs ] && echo "$f: $(timeout 600 node tools/qa/$f.test.cjs 2>&1 | tail -2 | tr '\n' ' ' | cut -c1-150)"
done
if [ "$BROWSER" = "--browser" ]; then echo "== navegador (rode com a máquina livre)"; for f in neu-8a1b/neu-8a1b neu-glosario/neu-glosario neu-infograficos/neu-infograficos neu-negrito/neu-negrito neu-questoes-1811/neu-questoes neu-vf/neu-vf neuro-667/neuro-667; do [ -f tools/qa/$f-browser.cjs ] && echo "$f-browser: $(timeout 900 node tools/qa/$f-browser.cjs 2>&1 | tail -2 | tr '\n' ' ' | cut -c1-150)"; done; fi
echo "worktree de ensaio em $DIR (remova com: git worktree remove --force $DIR). Cabeças testadas: #687=$H687 #682=$H682 main=$HM"
