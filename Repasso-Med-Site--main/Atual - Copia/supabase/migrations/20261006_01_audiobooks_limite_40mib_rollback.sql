-- Rollback de 20261006_01_audiobooks_limite_40mib.sql: devolve SOMENTE o limite do bucket `audiobooks` a 31457280 (30 MiB).
-- Falha fechada: aborta (sem alterar nada) se o bucket não existir, se o limite atual não for 41943040 ou se já houver objeto
-- maior que 30 MiB no bucket (ficaria acima do limite: apague/substitua antes pelo painel).
do $rb$
declare
  b record;
  grandes bigint;
begin
  select * into b from storage.buckets where id = 'audiobooks';
  if not found then
    raise exception 'ROLLBACK ABORTADO: o bucket audiobooks não existe. Nada foi alterado.' using errcode = 'P0001';
  end if;
  if b.file_size_limit is distinct from 41943040 and b.file_size_limit is distinct from 31457280 then
    raise exception 'ROLLBACK ABORTADO: limite atual inesperado (%). Nada foi alterado.', b.file_size_limit using errcode = 'P0001';
  end if;
  select count(*) into grandes from storage.objects
   where bucket_id = 'audiobooks' and coalesce((metadata ->> 'size')::bigint, 0) > 31457280;
  if grandes > 0 then
    raise exception 'ROLLBACK ABORTADO: % objeto(s) do bucket têm mais de 30 MiB. Substitua-os por versões menores antes de reduzir o limite. Nada foi alterado.', grandes using errcode = 'P0001';
  end if;
  update storage.buckets set file_size_limit = 31457280 where id = 'audiobooks';
  if (select file_size_limit from storage.buckets where id = 'audiobooks') is distinct from 31457280 then
    raise exception 'ROLLBACK ABORTADO: o limite não ficou em 31457280.' using errcode = 'P0001';
  end if;
end
$rb$;
