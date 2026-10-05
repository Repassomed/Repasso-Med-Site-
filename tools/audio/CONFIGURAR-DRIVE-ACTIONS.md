# Configurar o botão «Processar audiobooks» (Drive privado → GitHub Actions)

**Estado: implementado, aguardando configuração.** Nada foi baixado do Drive real ainda. O bloqueio de tamanho **só será dado como resolvido** depois que a execução abaixo baixar os 4 M4A reais
(inclusive os maiores que 30 MB) e o relatório mostrar «PROVADO». Os áudios continuam **privados**: nenhuma permissão pública é criada; só uma conta de serviço dedicada, como **Leitora** da pasta.

Por quê assim: o repositório é **público** (logs e artefatos são públicos), então os áudios nunca saem do runner; a autenticação usa **Workload Identity Federation** (o GitHub prova quem é por OIDC, o Google
entrega um token de 30 min — **sem chave guardada em lugar nenhum, sem senha, sem token do Claude**).

Tudo abaixo é feito **uma vez**, por você, logado na conta Google dona da pasta. Não envie nenhum valor ao chat; os dois valores secretos vão só no GitHub (passo C).
Nomes já decididos (copie exatamente): projeto `repasso-audiobooks` · conta de serviço `audiobooks-leitor` · pool `github-repasso` · provedor `github` · ambiente GitHub `audiobooks-drive`.

## A. Google Cloud — <https://console.cloud.google.com> (não exige cartão para estes passos)

1. Seletor de projetos (topo) ▸ **Novo projeto** ▸ *Nome do projeto:* `repasso-audiobooks` ▸ **Criar**. Em **Início ▸ Informações do projeto**, anote o **Número do projeto** (só dígitos) e o **ID do projeto**.
2. **APIs e serviços ▸ Biblioteca**: pesquise e clique **Ativar** em cada uma: `Google Drive API` · `IAM Service Account Credentials API` · `Security Token Service API`.
3. **IAM e administrador ▸ Contas de serviço ▸ Criar conta de serviço** ▸ *Nome:* `audiobooks-leitor` ▸ **Criar e continuar** ▸ **não conceda nenhum papel** ▸ **Concluir**. Anote o e-mail:
   `audiobooks-leitor@<ID-DO-PROJETO>.iam.gserviceaccount.com`.
4. **IAM e administrador ▸ Federação de identidade da carga de trabalho ▸ Criar pool** ▸ *Nome:* `github-repasso` (o ID sai igual) ▸ **Continuar**. Em *Adicionar um provedor*:
   - *Tipo de provedor:* **OpenID Connect (OIDC)** · *Nome:* `github` (ID `github`)
   - *URL do emissor (Issuer):* `https://token.actions.githubusercontent.com` · *Públicos-alvo:* deixe **Padrão**
   - *Mapeamento de atributos:* `google.subject` = `assertion.sub` · adicione `attribute.repository` = `assertion.repository`
   - *Condição de atributo (CEL):* cole exatamente
     `assertion.repository == "Repassomed/Repasso-Med-Site-" && assertion.ref == "refs/heads/main" && assertion.environment == "audiobooks-drive"`
   - **Salvar**.
5. Na página do pool ▸ **Conceder acesso** ▸ *Selecione uma conta de serviço:* `audiobooks-leitor` ▸ *Somente identidades que correspondem ao filtro:* atributo `repository` = `Repassomed/Repasso-Med-Site-` ▸ **Salvar**.
6. Anote o **nome do recurso do provedor** (formato fixo; troque só o número):
   `projects/<NÚMERO-DO-PROJETO>/locations/global/workloadIdentityPools/github-repasso/providers/github`

## B. Google Drive — compartilhar a pasta (somente leitura)

7. Abra a pasta **Audiobooks** (<https://drive.google.com/drive/folders/1APjpeMTDGrBzytbZSKcsxi704PniIEmT>) ▸ **Compartilhar** ▸ cole o e-mail `audiobooks-leitor@<ID-DO-PROJETO>.iam.gserviceaccount.com`
   ▸ papel **Leitor** ▸ desmarque *Notificar pessoas* ▸ **Compartilhar**. **Não** altere o *Acesso geral* (deve continuar **Restrito**).

## C. GitHub — repositório `Repassomed/Repasso-Med-Site-`

8. **Settings ▸ Environments ▸ New environment** ▸ *Name:* exatamente **`audiobooks-drive`** ▸ **Configure environment**.
9. Em *Deployment branches and tags* ▸ **Selected branches and tags** ▸ **Add deployment branch or tag rule** ▸ `main` ▸ **Add rule**. (Isso impede que qualquer outra branch use o acesso ao Drive.)
10. Em *Environment secrets* ▸ **Add environment secret** (duas vezes):
    - *Name:* `GDRIVE_WIF_PROVIDER` · *Value:* o nome do recurso do provedor do passo 6
    - *Name:* `GDRIVE_SERVICE_ACCOUNT` · *Value:* o e-mail da conta de serviço do passo 3
11. **Merge desta PR** (decisão sua; o botão só existe na `main`). Depois: **Actions ▸ Processar audiobooks ▸ Run workflow** ▸ *Branch:* `main` · *modo:* `provar-download` · *quantidade_esperada:* `4` ▸ **Run workflow**.
12. Avise o Claude «rodei» (sem colar nada além do link da execução, se quiser). Ele lê o resultado nos logs públicos e confere: 4 arquivos, tamanhos e checksums, e se os maiores que 30 MB vieram completos.

Se algo faltar, a execução termina em vermelho com a frase exata do que falta (`AGUARDANDO CONFIGURAÇÃO`, «pasta não visível para a conta de serviço», «o Google recusou a troca do token…»). Corrija e rode de novo; é seguro repetir.

## O que o botão faz nesta etapa (e o que não faz)

Lista os `.m4a` da pasta (e subpastas), baixa **todos completos na mesma execução** pela API oficial do Drive (`alt=media`, com retomada), confere **tamanho + SHA-256/SHA-1/MD5 fornecidos pelo Drive**, registra
sucesso/falha **por arquivo** e publica só o **relatório** (nomes, tamanhos, checksums; 7 dias). **Não converte, não transcreve, não publica, não toca Storage/Supabase/alunos.** Os áudios ficam em diretório
temporário do runner (fora do checkout) e são apagados no fim.

## Se o Google Cloud não permitir (alternativa mínima)

Se a criação do pool/projeto estiver bloqueada na sua conta: usar uma **chave JSON da conta de serviço** como secret `GDRIVE_SA_KEY` do mesmo ambiente. É menos seguro (chave de longa duração) e **ainda não está implementado**;
só implemento se o caminho acima for impossível — avise.

## Consumo do GitHub Actions (estimativa, não promessa)

Lote de 4 arquivos ≈ 108,6 MB (36,76 + 33,47 + 15,72 + 22,66). Estimativa: poucos minutos por execução (checkout parcial + download), limite do job 30 min; confirmarei o tempo real na primeira execução.
O repositório é público; segundo a documentação do GitHub os runners padrão costumam não consumir minutos cobrados em repositório público, mas **confirme em Settings ▸ Billing** — não afirmo gratuidade.
A etapa seguinte (conversão + transcrição whisper-small na CPU) é bem mais pesada (horas de CPU para o conjunto, modelo de ≈ 640 MB por execução, com cache); será estimada com os números reais **antes** de rodar o lote completo.

## Etapa 2 (só depois do «PROVADO»)

Reaproveita o pipeline da PR #436 (inspeção, derivados respeitando o limite de 30 MiB do bucket, transcrição, relatório por áudio, amostras; `escuta_humana_ok=false`), identificando cada arquivo por **ID do Drive + versão/checksum**,
sem reprocessar idênticos já concluídos e permitindo repetir só os que falharam. Como o repositório é público, **amostras e transcrições não podem ir em artefato público**: a saída privada será decidida e configurada com você nessa etapa
(proposta: pasta de resultados no próprio Drive; contas de serviço não têm cota própria em «Meu Drive», então pode exigir um Drive compartilhado — verifico antes de implementar).
