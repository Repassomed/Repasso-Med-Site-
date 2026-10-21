# Conexão MCP `supabase_leitura` (só leitura) — configuração, prova e teste

## O que esta configuração faz
- `.mcp.json` declara **um** servidor, `supabase_leitura` (HTTP), no projeto `ltizbamvskcgigmqobfo`, com `read_only=true` e `features=database` (só o grupo de banco de dados, em modo leitura no servidor do Supabase).
- `.claude/settings.json` libera **sem perguntar** exatamente duas ferramentas desse servidor:
  - `mcp__supabase_leitura__execute_sql`
  - `mcp__supabase_leitura__list_tables`
  e mantém `mcp__supabase_leitura__apply_migration` em **ask** (se a ferramenta existir, pede aprovação).
- **Não** libera o servidor inteiro, não usa curinga, não toca na conexão atual de escrita (`mcp__Supabase__*` do claude.ai continua exatamente como está e continua pedindo aprovação), não usa `service_role`, não põe token no arquivo e não usa modo irrestrito.
- Não usa `enableAllProjectMcpServers` nem `enabledMcpjsonServers`: a **aprovação humana do servidor do projeto continua obrigatória** (uma vez, por pessoa). Não foi contornada.

## Prova de que só lê
1. **Prova estática (roda sem rede):** `python3 tools/qa/check_mcp_leitura.py` confere `.mcp.json` e `.claude/settings.json`; `--self-test` mostra que o verificador **reprova** 8 configurações perigosas (servidor inteiro, curinga, escrita em allow, conexão de escrita em allow, `read_only=false`, modo irrestrito, pré-aprovação do servidor, token em header).
2. **Garantia real de leitura = `read_only=true` na URL**, aplicada pelo servidor do Supabase. A regra `allow` do Claude Code casa por **ferramenta**, não por instrução SQL: ela não impede, sozinha, um `UPDATE` dentro de `execute_sql`. Quem impede é o modo somente leitura do servidor. Por isso a recusa do servidor precisa ser comprovada (passo 3) antes de confiar — **somente em projeto Supabase descartável, nunca no de produção**.
3. **Limite deste ambiente:** a sessão em nuvem **não alcança `mcp.supabase.com`** (o proxy devolve 403) e o servidor aparece como "Pending approval"; portanto o passo 2 e o passo 3 abaixo **não foram executados aqui**. Não há resultado inventado.

## Teste que o José precisa fazer (uma vez)
1. Liberar o host: Network access do ambiente → adicionar `mcp.supabase.com` em Allowed domains. (Para uso local no computador isso não é necessário.)
2. Na pasta do projeto, rodar `claude`, aprovar o servidor `supabase_leitura` e fazer o login do Supabase (OAuth). Em `/mcp`, conferir os nomes das ferramentas: devem ser `execute_sql` e `list_tables` (os nomes batem com a conexão atual).
3. Testes:
   - **Leitura sem janela:** `SELECT COUNT(*) FROM public.user_highlights;` → retorna o número **sem pedir aprovação**.
   - **Escrita continua barrada (ferramenta):** pedir ao Claude para chamar `apply_migration` nessa conexão (ou outra ferramenta fora das duas liberadas) → **tem de pedir autorização**. Recusar a janela; não aprovar.
   - **Recusa de escrita pelo servidor — SÓ em projeto descartável:** **nenhuma tentativa de escrita (INSERT, UPDATE, DELETE, CREATE, DROP, migração) pode ser feita no projeto de produção (`ltizbamvskcgigmqobfo`), nem «inofensiva», nem temporária.** Para comprovar o `read_only=true`, criar um projeto Supabase novo e descartável (vazio, sem dados de alunos), trocar **só nesse teste** o `project_ref` da URL por o do descartável e rodar uma escrita trivial (`CREATE TABLE t_teste(x int);`) → o servidor deve **recusar**. Depois apagar o projeto descartável e **restaurar o `project_ref` de produção** (conferir com `python3 tools/qa/check_mcp_leitura.py`). Se a escrita for aceita, desligar a conexão e avisar: `read_only` não estaria sendo aplicado.
   - **Sem projeto descartável ou sem conexão real:** declarar **«não testado»**; a PR **permanece bloqueada** (não mesclar) até essa prova existir.
   - **Conexão de escrita intacta:** uma chamada a qualquer `mcp__Supabase__*` continua pedindo aprovação como antes.
4. Se a janela de aprovação **repetir** mesmo para as duas ferramentas liberadas: a causa é (a) o nome da ferramenta na regra não bate com o real em `/mcp` (corrigir o nome em `.claude/settings.json`), ou (b) uma regra gerenciada da organização exigindo aprovação (só o administrador vê; não dá para contornar). A tela de login/consentimento do Supabase é outra coisa e acontece só ao conectar.

## Reversão
Apagar `.mcp.json`, `.claude/settings.json`, `tools/qa/check_mcp_leitura.py` e este arquivo. Nada do site, do Supabase ou da conexão de escrita é tocado.
