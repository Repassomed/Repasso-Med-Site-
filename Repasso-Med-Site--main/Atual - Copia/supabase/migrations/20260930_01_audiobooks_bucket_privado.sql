-- =====================================================================
-- Audiobooks · bucket PRIVADO `audiobooks`  (NÃO APLICADO — só por ordem do José)
--
-- O que faz: cria UM bucket privado para as aulas narradas. Nada mais.
--
-- Por que sem políticas: storage.objects tem RLS ligada. Sem nenhuma política
-- para `anon`/`authenticated`, NINGUÉM lê ou grava por Storage API com a chave
-- pública — o navegador nunca acessa o bucket diretamente. Quem cria URL
-- assinada é a função Netlify `get-audio-url`, com a service_role (que só
-- existe no servidor) e só depois de checar o UID autenticado + o manifesto.
-- Por isso esta migration NÃO cria policy alguma (e um teste do repo garante).
--
-- Limites de segurança/custo: 30 MB por objeto, só M4A. Os masters
-- (~181 MB no total) NÃO entram aqui: sobem as cópias AAC-LC já tratadas.
--
-- Reversível: ver 20260930_01_audiobooks_bucket_privado_rollback.sql.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audiobooks', 'audiobooks', false, 31457280, array['audio/mp4', 'audio/x-m4a'])
on conflict (id) do nothing;
