# Auditoria independente da #622 (Nova Era) — arquivos de auditoria, fora da PR

Cada script recebe a RAIZ de uma árvore (worktree) do repositório já com `tools/qa/nova-era/` (a da #622).
- `servidor.audit.cjs <raiz-PR>`: função `get-pilot-flags.js` REAL, Supabase simulado; desligada → só José → alunos com acesso → volta; layout e caneta separados; Semiología II; valores estranhos; acesso expirado; variáveis legadas × estágio.
- `navegador.audit.cjs <raiz-assets> <raiz-PR> [pil|ciclo|troca|conta|aberta]`: ciclo completo da caneta do aluno em 1440/390 px; troca de matéria; troca de conta na mesma aba; sessão aberta; Semiología II (imprime `PIL-ESTADO` para diferença PR × main).
- `legado.audit.cjs <raiz-PR>`: aluno com a caneta só em Medicina Familiar abre OUTRA matéria depois (HTML real de Dermatología): marcador/goma antigos existem?
- `fidelidade.audit.cjs <raiz-PR>`: distância máxima do traço do aluno em MF sobre parágrafo, tabela e post-it.
Uso: `NODE_PATH=$(npm root -g) node tools/qa/nova-era-auditoria/<script> <args>`. Somente leitura; nenhum dado real.
- `ordem-real.audit.cjs <raiz-PR>`: ORDEM REAL de abertura, sem aba falsa: MF (caneta liberada ao aluno) → Dermatología (HTML real; fetch → appendChild → enhanceAll → switchTab, como `openTab` do index.html). Confere coluna antiga, marcador (UI + insert), borracha (UI + delete), ausência da V2; de volta a MF: caixa V2, caneta (1 insert), traços/nota preservados. Tem o CONTROLE «tudo off».
- `tardia.audit.cjs <raiz-PR>`: resposta ATRASADA de `hasStudyToolsV2Access` (linha em `study_tools_beta`, 2,5 s) com troca de conta durante a espera; com controle (A confirmada antes da troca ⇒ bloqueia e recarrega).
