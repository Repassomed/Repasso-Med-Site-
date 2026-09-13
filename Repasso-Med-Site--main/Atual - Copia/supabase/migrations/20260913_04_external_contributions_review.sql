/* =====================================================================
   REPASSO MED · CURADORIA DOS APORTES
   20260913_04_external_contributions_review.sql

   Acrescenta UMA coluna à tabela criada na migration 03 — que é nova e
   é só desta funcionalidade. Nenhuma tabela antiga é tocada.

   POR QUE UMA COLUNA NOVA E NÃO `leido_en`
   -----------------------------------------------------------------
   `leido_en` responde «o painel já viu isto?». Não responde «isto foi
   aproveitado ou descartado?», que é a pergunta que a equipe faz depois
   de olhar o material. Empilhar os dois sentidos num timestamp só daria
   um campo que mente em metade dos casos.

     nueva        chegou, ninguém abriu        (padrão)
     vista        alguém do painel já olhou
     aprovechada  virou conteúdo no site
     descartada   não serve — fica registrado, não some

   O estado do DRIVE continua em `drive_status` e é outra coisa:
   `pendiente | enviado | error` é máquina, `review_status` é gente.

   IDEMPOTENTE. Rollback: 20260913_04_..._rollback.sql
   ===================================================================== */

alter table public.external_contributions
  add column if not exists review_status text not null default 'nueva';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'external_contributions_review_valid') then
    alter table public.external_contributions
      add constraint external_contributions_review_valid
      check (review_status in ('nueva', 'vista', 'aprovechada', 'descartada'));
  end if;
end $$;

comment on column public.external_contributions.review_status is
  'Curadoria humana: nueva | vista | aprovechada | descartada. Nao confundir com drive_status, que e o estado tecnico do espelhamento.';

create index if not exists external_contributions_review_idx
  on public.external_contributions (review_status, created_at desc);

/* As policies da migration 03 continuam valendo e já cobrem a coluna
   nova: o aluno não tem policy de UPDATE, então não pode se marcar como
   «aprovechada»; o admin tem `for all`. Nada a mudar aqui. */
