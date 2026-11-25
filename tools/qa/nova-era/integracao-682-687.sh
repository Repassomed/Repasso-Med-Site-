#!/bin/sh
# NEUROLOGÍA · ENSAIO REPETÍVEL DA INTEGRAÇÃO #682 (infográficos) × #687 (questões do Claude 1) — NÃO publica, NÃO dá merge, NÃO altera as duas branches.
# Cria um checkout DESCARTÁVEL (git worktree em <pasta>), parte da cabeça ATUAL da #687, junta a cabeça ATUAL da #682 e a main, aplica as resoluções já conhecidas
# (neu-questoes: lado #687; neu-glosario: união; inventário: regenerado) e roda os testes estáticos de Neurologia. Pára com mensagem se aparecer conflito DESCONHECIDO.
# Use de novo sempre que o Claude 1 empurrar mais commits na #687 (a nova rodada de questões): a integração só vale para a cabeça que ela testou.
# Uso: NODE_PATH=$(npm root -g) sh tools/qa/nova-era/integracao-682-687.sh <pasta-vazia-para-o-worktree> [--browser] [--continuar] [--tolerar=<teste>]... [--injetar-falha]
# (fix #716-b) Os commits do ensaio usam --allow-empty: quando a main já está dentro da cabeça testada (ex.: PR empilhada que já mergeou a main) não há o que registrar e o script saía 4 sem motivo.
# CÓDIGO DE SAÍDA (fix #716): 0 = integração montada E todos os testes passaram; 1 = pelo menos um teste FALHOU (ou não existe, ou estourou o tempo); 2/3/4 = erro de montagem/conflito desconhecido.
#   Cada teste roda FORA de pipe e de echo (o status real é capturado), e conta como falha se: sair com código ≠ 0, OU imprimir «N FALHA(S)» / «FALHA:» / «✗», OU sair sem imprimir nada.
#   Por padrão pára no PRIMEIRO teste que falha (código 1). --continuar roda todos e só depois sai com 1. --tolerar=<teste> aceita UMA falha CONHECIDA, sempre impressa como TOLERADA (nunca silenciosa).
#   --reusar roda só os testes numa pasta JÁ montada por uma execução anterior (para repetir depois de um ajuste, ou para provar uma falha forçada).
#   --injetar-falha acrescenta um teste sintético que sempre falha: serve só para PROVAR que o script devolve erro.
set -u
DIR="${1:?uso: integracao-682-687.sh <pasta-vazia> [--browser] [--continuar] [--tolerar=<teste>] [--injetar-falha]}"; shift
BROWSER=""; CONTINUAR=0; INJETAR=0; REUSAR=0; TOLERAR=" "
for a in "$@"; do case "$a" in --browser) BROWSER=--browser;; --continuar) CONTINUAR=1;; --injetar-falha) INJETAR=1;; --reusar) REUSAR=1;; --tolerar=*) TOLERAR="$TOLERAR${a#--tolerar=} ";; *) echo "opção desconhecida: $a"; exit 2;; esac; done
R687=origin/claude/neuro-8a1b-1911; R682=origin/claude/neurologia-infograficos-b20-b27
if [ "$REUSAR" -eq 1 ]; then
  [ -d "$DIR" ] || { echo "--reusar: pasta $DIR não existe"; exit 2; }
  R687=origin/claude/neuro-8a1b-1911; R682=origin/claude/neurologia-infograficos-b20-b27
  H687=$(git rev-parse --short "$R687" 2>/dev/null || echo ?); H682=$(git rev-parse --short "$R682" 2>/dev/null || echo ?); HM=$(git rev-parse --short origin/main 2>/dev/null || echo ?)
  cd "$DIR" || exit 2
else
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
git add -A && git -c user.email=ensaio@local -c user.name=ensaio commit -q --allow-empty -m "ensaio: #682 sobre #687" || { echo "falha ao registrar o ensaio #682 sobre #687"; exit 4; }
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
git add -A && git -c user.email=ensaio@local -c user.name=ensaio commit -q --allow-empty -m "ensaio: main" || { echo "falha ao registrar o ensaio com a main"; exit 4; }
fi
# ---- execução dos testes: status real capturado (sem pipe, sem echo em volta do comando) ----
FALHAS=0; TOLERADAS=0; EXECUTADOS=0; RESUMO=""; OUT="$(mktemp)"
roda() { # $1=nome  $2=arquivo  $3=timeout
  nome="$1"; arq="$2"; tmo="$3"
  if [ ! -f "$arq" ]; then echo "$nome: FALHA — arquivo de teste ausente ($arq)"; RESUMO="$RESUMO $nome=AUSENTE"; return 1; fi
  timeout "$tmo" node "$arq" > "$OUT" 2>&1; rc=$?
  EXECUTADOS=$((EXECUTADOS+1))
  ult=$(tail -2 "$OUT" | tr '\n' ' ' | cut -c1-150)
  if [ "$rc" -ne 0 ]; then st="FALHA (código $rc)"
  elif [ ! -s "$OUT" ]; then st="FALHA (saiu 0 sem imprimir nada)"
  elif grep -Eq '[0-9]+ FALHAS?|FALHA:|✗' "$OUT"; then st="FALHA (saiu 0 mas imprimiu falha)"
  else st="OK"; fi
  echo "$nome: $st — $ult"
  if [ "$st" = "OK" ]; then RESUMO="$RESUMO $nome=OK"; return 0; fi
  case "$TOLERAR" in *" $nome "*) echo "  ⚠ TOLERADA por --tolerar (falha conhecida, NÃO é aprovação)"; TOLERADAS=$((TOLERADAS+1)); RESUMO="$RESUMO $nome=TOLERADA"; return 0;; esac
  RESUMO="$RESUMO $nome=FALHA"; return 1
}
roda_lista() { # $1=sufixo ("" ou "-browser")  $2=timeout  resto=nomes
  suf="$1"; tmo="$2"; shift 2
  for f in "$@"; do
    roda "$f$suf" "tools/qa/$f$suf.cjs" "$tmo" || { FALHAS=$((FALHAS+1)); [ "$CONTINUAR" -eq 1 ] || fim 1; }
  done
}
fim() { rm -f "$OUT"; echo "== RESUMO:$RESUMO"; echo "executados=$EXECUTADOS falhas=$FALHAS toleradas=$TOLERADAS"; echo "worktree de ensaio em $DIR (remova com: git worktree remove --force $DIR). Cabeças testadas: #687=$H687 #682=$H682 main=$HM"; if [ "$1" -ne 0 ] || [ "$FALHAS" -ne 0 ]; then echo "RESULTADO: FALHOU"; exit 1; fi; echo "RESULTADO: OK"; exit 0; }
echo "== testes estáticos de Neurologia (cabeça integrada)"
if [ "$INJETAR" -eq 1 ]; then printf 'console.log("falha injetada de propósito: 1 FALHAS");process.exit(1)\n' > tools/qa/neu-injetado.test.cjs; roda_lista ".test" 60 neu-injetado; rm -f tools/qa/neu-injetado.test.cjs; fi
roda_lista ".test" 600 neu-8a1b/neu-8a1b neu-cierre/neu-cierre neu-glosario/neu-glosario neu-negrito/neu-negrito neu-questoes-1811/neu-questoes neu-vf/neu-vf neuro-667/neuro-667
if [ "$BROWSER" = "--browser" ]; then echo "== navegador (rode com a máquina livre)"; roda_lista "-browser" 900 neu-8a1b/neu-8a1b neu-glosario/neu-glosario neu-infograficos/neu-infograficos neu-negrito/neu-negrito neu-questoes-1811/neu-questoes neu-vf/neu-vf neuro-667/neuro-667; fi
fim 0
