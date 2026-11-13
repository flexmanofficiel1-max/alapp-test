-- 004 : les messages acceptent maintenant 4 types de média : image, video, audio, fichier
-- (messages privés et messages de groupe). Les anciens messages ne sont pas touchés.
do $$
declare r record; t text;
begin
  for t in select distinct data_type from information_schema.columns
           where table_schema='public' and table_name in ('messages','groupe_messages') and column_name='media_type'
  loop
    if t not in ('text','character varying') then
      raise exception 'media_type n''est pas un champ texte (%). Envoie-moi ce message.', t;
    end if;
  end loop;

  for r in
    select conrelid::regclass::text as tbl, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.messages'::regclass, 'public.groupe_messages'::regclass)
      and pg_get_constraintdef(oid) ilike '%media_type%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;

  alter table public.messages
    add constraint messages_media_type_check
    check (media_type is null or media_type in ('image','video','audio','fichier')) not valid;
  alter table public.groupe_messages
    add constraint groupe_messages_media_type_check
    check (media_type is null or media_type in ('image','video','audio','fichier')) not valid;
end $$;
