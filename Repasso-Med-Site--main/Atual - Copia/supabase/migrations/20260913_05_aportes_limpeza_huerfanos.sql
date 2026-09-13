/* =====================================================================
   REPASSO MED · LIMPEZA DE ARQUIVOS ÓRFÃOS NO BUCKET «aportes»
   20260913_05_aportes_limpeza_huerfanos.sql

   O BURACO
   -----------------------------------------------------------------
   O envio tem duas etapas: primeiro os bytes vão para o Storage,
   depois a linha de metadados entra no Postgres. Se a segunda falhar
   — rede caiu, o anti-spam recusou, o navegador fechou — os objetos
   ficam lá sem nenhuma linha que os explique. Ninguém os vê, ninguém
   os apaga, e eles contam no plano.

   POR QUE NÃO BASTAVA DEIXAR O ALUNO APAGAR
   -----------------------------------------------------------------
   As policies da migration 03 deixam o aluno ESCREVER e LER dentro de
   `<uid>/<id-do-envio>/`, mas só o admin apaga. Abrir o DELETE para o
   dono resolveria o órfão — e criaria um problema pior: ele poderia
   apagar o material de um envio JÁ FEITO, antes de o espelhamento
   rodar, e o painel ficaria com uma linha apontando para o nada.

   A SOLUÇÃO
   -----------------------------------------------------------------
   O DELETE do dono vale SÓ enquanto o arquivo for órfão de verdade:

       não existe linha em external_contributions com aquele id

   O segundo segmento do caminho é o id do envio. Existindo a linha, a
   policy deixa de casar e o aluno não apaga mais nada — nem por engano,
   nem de propósito. É a janela exata do problema, sem um milímetro a
   mais, sem RPC nova e sem `security definer`.

   O QUE ISTO NÃO RESOLVE — e está documentado de propósito
   -----------------------------------------------------------------
   Se o navegador fechar ENTRE o upload e o INSERT, não há mais quem
   chame a limpeza. Esse órfão fica até alguém apagá-lo. Não vale um
   job agendado nem uma função com chave de serviço rodando sozinha
   sobre material de aluno: o custo de um engano é apagar coisa boa.
   Ver CONTRIBUICOES-MATERIAL-EXTERNO.md §4.

   IDEMPOTENTE. Rollback: 20260913_05_..._rollback.sql
   ===================================================================== */

drop policy if exists aportes_delete_huerfano on storage.objects;
create policy aportes_delete_huerfano
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'aportes'
    /* é da pasta do próprio aluno */
    and (storage.foldername(name))[1] = auth.uid()::text
    /* e o envio não existe: órfão */
    and not exists (
      select 1
        from public.external_contributions c
       where c.id::text = (storage.foldername(name))[2]
    )
  );

comment on policy aportes_delete_huerfano on storage.objects is
  'O dono apaga o proprio arquivo SO enquanto nao existir a linha do aporte. Depois do INSERT a policy deixa de casar: material enviado nao se apaga pelo navegador.';
