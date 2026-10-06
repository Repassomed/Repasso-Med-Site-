# Piloto Semiología II — os 4 .m4a como estão, upload pelo painel do Supabase

**Decisão fechada:** usar os quatro `.m4a` já comprimidos do ZIP do Drive **sem converter**, subir pelo **painel do Supabase** (projeto Facilitamed, `ltizbamvskcgigmqobfo`), plano **Free** (nada pago), bucket **privado** `audiobooks`, URLs assinadas de 10 min e autorização no servidor **só para o UID do José**. Do lado do José: **sem Git, Python, Node** e **sem enviar áudio nem chave ao Claude**.
Este documento não contém segredo algum (o UID e a URL do projeto já são públicos no repositório).

## Os quatro arquivos e os nomes finais

| Nome no Drive / ZIP | Tamanho (Drive) | Bloco | Nome FINAL (renomear antes do upload) | Caminho no bucket |
|---|---|---|---|---|
| `Semio_-_Motivo_de_Consulta (1).m4a` | 36.758.530 B | **`s2-b01` respiratório OU `s2-b06` cardíaco — o José decide ouvindo** | `s2-b01-motivo-consulta.m4a` **ou** `s2-b06-motivo-consulta.m4a` | `semiologia-ii/<nome final>` |
| `Semio_EPOC (1).m4a` | 33.468.886 B | `s2-b03` Síndrome Obstructivo (Asma y EPOC) — *candidato, a confirmar* | `s2-b03-epoc.m4a` | `semiologia-ii/s2-b03-epoc.m4a` |
| `Semio - 3 Sindrome Parenquimatoso (1).m4a` | 15.722.673 B | `s2-b04` Síndrome Parenquimatoso — *candidato, a confirmar* | `s2-b04-parenquimatoso.m4a` | `semiologia-ii/s2-b04-parenquimatoso.m4a` |
| `Semio_-_4_sindrome_pleual (1).m4a` | 22.662.090 B | `s2-b05` Síndromes Pleurales — *candidato, a confirmar* | `s2-b05-pleural.m4a` | `semiologia-ii/s2-b05-pleural.m4a` |

Por que renomear: o caminho no bucket só aceita letras, números, `.`, `_`, `-` e `/` (sem espaço nem parênteses). O nome do arquivo **nunca** decide o bloco: quem decide é a escuta do José.
O manifesto completo (`RM_AUDIO_MANIFEST`) é gerado por `tools/audio/manifesto_piloto.py` **pelo Claude**, com a duração de cada arquivo e o bloco confirmado; ele **não** é gravado no repositório (a pasta publicada é a raiz) — vai direto ao Netlify.

## Ações do José, na ordem exata (uma por vez; cada uma só depois do resultado da anterior)

1. **Limite do bucket (Supabase ▸ SQL Editor).** Rodar `…\supabase\migrations\20261006_01_audiobooks_limite_40mib.sql` (muda **só** o limite do `audiobooks`: 30 → 40 MiB). Conferir: `select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='audiobooks';` ⇒ `false | 41943040 | {audio/mp4,audio/x-m4a}`.
   Conferir também **Storage ▸ Settings ▸ Upload file size limit**: precisa ser ≥ 50 MB (padrão do Free). Rollback: `…_rollback.sql`.
2. **Extrair o ZIP** (Explorador do Windows ▸ botão direito ▸ *Extrair tudo*) e, na pasta, **Exibir ▸ Detalhes**, clicar com o botão direito no cabeçalho das colunas ▸ marcar **Duração** e **Taxa de bits**. Anotar, para cada arquivo, **tamanho, duração e taxa de bits**.
3. **Confirmar nomes e blocos:** ouvir o começo de cada arquivo (qualquer tocador) e dizer ao Claude **só em texto**: a duração de cada um, e se «Motivo de Consulta» fala de sintomas **respiratórios** (tosse, disnea, hemoptisis → `s2-b01`) ou **cardíacos** (dolor torácico, palpitaciones, síncope → `s2-b06`); e se EPOC, Parenquimatoso e Pleural batem com `s2-b03`, `s2-b04`, `s2-b05`. O Claude devolve o manifesto e os 4 nomes finais.
4. **Renomear e selecionar os quatro no painel:** renomear os 4 arquivos (tecla F2) para os nomes finais; **Supabase ▸ Storage ▸ `audiobooks` ▸ Create folder `semiologia-ii` ▸ abrir a pasta ▸ Upload files ▸ selecionar os 4** ▸ esperar terminar. Conferir que aparecem os 4 com os tamanhos da tabela.
5. **Variáveis do Netlify (site ▸ Site configuration ▸ Environment variables):** criar `RM_AUDIO_MANIFEST` (o JSON que o Claude entregou, colado numa linha) e `RM_PILOT_AUDIO_UIDS` = `d4d215d3-36dd-4efb-8869-bdea5376c648` (**só o UID do José**). Conferir que `SUPABASE_URL` = `https://ltizbamvskcgigmqobfo.supabase.co`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` existem (não colar valores no chat). Depois **Deploys ▸ Trigger deploy ▸ Deploy site** e esperar terminar (a variável só vale no próximo build).
   **Desligar a qualquer momento:** esvaziar `RM_PILOT_AUDIO_UIDS` (ou `RM_AUDIO_MANIFEST`) e novo deploy.
6. **Testar (roteiro abaixo).**

## Roteiro de teste do José (depois do deploy)

1. Logado como você, abrir **Semiología II**: um cartão «Audiobook · …» sob o título de cada bloco confirmado (b01/b06, b03, b04, b05).
2. **Tocar**; **pausar**; **±15 s**; arrastar a barra até o meio e soltar (deve continuar do ponto); **velocidades** 1,25× · 1,5× · 2× · 2,5× (o tom da voz não muda); recarregar a página (retoma o ponto).
3. **Celular** (iPhone/Safari e/ou Android/Chrome): repetir 2; bloquear a tela e voltar.
4. **Ausculta:** com o audiobook tocando, tocar um som de ausculta ⇒ o audiobook **pausa**; voltar ao audiobook ⇒ a ausculta **para**. Os sons de ausculta continuam iguais.
5. **Outra conta** (aluno ou janela anônima com outro login): **nenhum** cartão de audiobook.
6. **Acesso direto ao bucket recusado:** abrir `https://ltizbamvskcgigmqobfo.supabase.co/storage/v1/object/public/audiobooks/semiologia-ii/s2-b03-epoc.m4a` numa janela anônima ⇒ erro (nunca toca). O Claude também confere isto em leitura, com a chave pública, depois do upload.
7. Se **um** arquivo não tocar ou não deixar avançar (ver «Exceção» abaixo), avisar qual.

## Exceção de conversão (somente se um arquivo falhar)

Os 4 `.m4a` são subidos **como estão**. Se um deles não tocar (p. ex., não for AAC) ou **não permitir avançar** (metadados no fim do arquivo, sem *faststart*), trata-se **só esse arquivo**: rodar `tools\audio\rodar_local.ps1 -Zip …` com a política `--original-aac` (`processar_masters.py --original-aac`: aceita AAC-LC como está, só move o índice para o início sem recodificar; reencoda apenas o que não for AAC-LC) e subir o derivado no lugar do original. É o único caso em que Python entra; os outros três ficam como estão.

## Custo do piloto e limite da solução (Free)

Leitura do painel *Usage* informado pelo José: **Storage 0,005 GB**, **Egress 0,739 GB**, **Cached Egress 1,608 GB** no ciclo atual (limites do Free, conforme meu conhecimento e a confirmar no painel: **1 GB** de Storage, **5 GB** de egress, **5 GB** de cached egress, 50 MB por arquivo).

| | Conta | Resultado |
|---|---|---|
| Storage do piloto | 108,6 MB (4 arquivos como estão) | ≈ **0,11 GB** (≈ 11 % do 1 GB) |
| Egress do piloto | 1 audição completa dos 4 ≈ 0,109 GB | 10 audições completas ≈ 1,1 GB ⇒ egress total ≈ 1,8 GB (≈ 37 % de 5 GB); ≈ 35 audições completas esgotariam os 5 GB |
| Custo | — | **zero** no Free; nenhum recurso pago é ativado por este trabalho |

**Para 27 matérias** (hipótese: 4 áudios por matéria, como o piloto):

- **Storage:** como estão (≈ 109 MB por matéria) o Free comporta **≈ 8 matérias** (0,87 GB); 27 matérias ≈ 2,9 GB **não cabem**. Convertendo para mono 48 kbps (≈ 21 MB/h; o ganho real depende do bitrate dos originais, que o Explorador mostra no passo 2) ≈ 0,4× o tamanho, 27 matérias ≈ 1,1 GB: no limite do Free; a 32 kbps ≈ 0,8 GB cabem.
- **Egress:** os 5 GB/mês são compartilhados com Auth/Banco e viram **horas ouvidas por mês**: ≈ 85 h a 128 kbps ou ≈ 230 h a 48 kbps para **todos** os alunos somados (p. ex. 100 alunos × 3 h/mês = 300 h já passa). É o limite real do Free.
- **Arquitetura (PR própria, não feita aqui):** o servidor hoje é fixo em `semiologia-ii` e nos UIDs piloto; o manifesto vive numa variável do Netlify (limite ≈ 4 KB ⇒ ≈ 14 itens; 27 × 4 = 108 itens não cabem): precisará de uma tabela/arquivo de manifesto e de autorização por matéria/aluno.
- **Plano Pro** (a confirmar: ≈ US$ 25/mês, ≈ 100 GB de Storage, ≈ 250 GB de egress) resolveria Storage e egress dos 27; **não é ativado** sem decisão do José.
