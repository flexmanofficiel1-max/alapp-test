-- 002 : messagerie privée (bucket "prive") : fichiers jusqu'à 50 Mo, types utiles uniquement
-- Pas de programmes (.exe, .apk). Peut être relancé sans risque.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/*','video/*','audio/*','application/pdf','text/plain','text/csv',
      'application/zip','application/x-zip-compressed','application/msword',
      'application/vnd.ms-excel','application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
where id = 'prive';
