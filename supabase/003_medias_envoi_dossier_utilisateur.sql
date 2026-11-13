-- 003 : bucket "medias" : chacun n'envoie que dans son propre dossier (identifiant-utilisateur/...)
drop policy if exists "envoi medias" on storage.objects;
create policy "envoi medias" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'medias'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
