/* Rollback de 20260913_04. Perde a curadoria já registrada. */
drop index if exists public.external_contributions_review_idx;
alter table public.external_contributions
  drop constraint if exists external_contributions_review_valid;
alter table public.external_contributions
  drop column if exists review_status;
