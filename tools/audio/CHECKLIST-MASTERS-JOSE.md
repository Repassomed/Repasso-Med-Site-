# Checklist — processar os 4 áudios reais (Semiología II)

**O passo a passo atual e o comando único estão no [README](README.md) §1; o inventário dos 4 arquivos, no [RUNBOOK](RUNBOOK-ATIVACAO-AUDIOBOOKS.md) §1.** Este checklist só guarda as conferências finais.

1. Baixar a pasta **Audiobooks** do Drive em lote (zip; ZIP opcional para o script) para fora do repositório. Não editar nem renomear os originais. Nada fica público.
2. Rodar `tools\audio\rodar_local.ps1` (Windows) ou `rodar_local.sh` (Linux/macOS). Se falhar, o script diz o motivo; corrigir e rodar o mesmo comando.
3. Ler `RELATORIO-REAL.md`: derivado recomendado e motivo; **NÃO APROVADA** = nenhuma cópia passou os critérios (não aprovar sem ouvir); transcrição **amostrada** ≠ integral.
4. **Escuta humana** das amostras a 1×, 2× e 2,5× (inclui números, siglas, nomes de medicamentos/sinais). Confirmar o bloco de cada áudio **pelo conteúdo**; o nome do arquivo e o número não decidem.
5. Devolver o `*-retorno.zip` (sem áudio) e a decisão (bloco de cada áudio, bitrate escolhido). `escuta_humana_ok` só passa a `true` por decisão do José.

**Não fazer:** commitar masters ou cópias · usar este perfil nos sons de ausculta · enviar ao Supabase/Storage ou aplicar migration neste passo (ativação é outra etapa, com autorização separada) · tornar a pasta do Drive pública.
