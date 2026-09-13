/* Rollback de 20260913_05. Os órfãos voltam a depender de limpeza manual. */
drop policy if exists aportes_delete_huerfano on storage.objects;
