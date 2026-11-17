#!/usr/bin/env python3
"""Ferramenta de integração Nova Era (11–14/11): resolve por UNIÃO os conflitos mecânicos ao atualizar uma branch Nova Era sobre a main.
uso (dentro de um merge em andamento):  python3 tools/qa/nova-era/uniao-nova-era.py <raiz-do-worktree>
  1) listas (CANDIDATAS, nao-ativacao, auditoria) = união; VER = maior (e > main) = tag do index.html; B5 «vizinhas» = versão calculada (VIZ_FORA)
  2) rm-materia-sistema.js/.css: mantém OS DOIS temas (classificador + entrada de TEMAS + CSS).
Depois: node -e "new Function(fs.readFileSync(...rm-materia-sistema.js))" e os testes nao-ativacao / auditoria / real-<matéria>."""
import subprocess,sys,os
H=os.path.dirname(os.path.abspath(__file__))
R=sys.argv[1]
for part in ("_uniao_listas.py","_dobra_temas.py"):
    subprocess.check_call([sys.executable,os.path.join(H,part),R])
