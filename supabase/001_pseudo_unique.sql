-- 001 : un pseudo = un seul utilisateur (sans tenir compte des majuscules ni des espaces autour)
-- Si des doublons existent déjà, le script s'arrête et l'indique, sans rien modifier.
do $$
declare col text; dup int;
begin
  select column_name into col from information_schema.columns
  where table_schema='public' and table_name='profiles'
    and column_name in ('pseudo','username','nom_utilisateur')
  order by case column_name when 'pseudo' then 1 when 'username' then 2 else 3 end
  limit 1;
  if col is null then
    raise exception 'Colonne pseudo introuvable dans profiles';
  end if;
  execute format('select count(*) from (select 1 from public.profiles where %I is not null group by lower(btrim(%I)) having count(*)>1) d', col, col) into dup;
  if dup > 0 then
    raise exception '% pseudo(s) en double : à corriger avant', dup;
  end if;
  execute format('create unique index if not exists profiles_pseudo_unique on public.profiles (lower(btrim(%I)))', col);
end $$;
