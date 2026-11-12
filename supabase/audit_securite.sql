-- AUDIT DE SÉCURITÉ (lecture seule : ne modifie rien). À lancer une requête à la fois.

-- A. Vue d'ensemble : tables sans RLS, règles ouvertes, buckets, fonctions, vues
select '1 TABLE SANS RLS' as controle, tablename::text as nom,
  'RLS désactivé : accessible à tous avec la clé anon' as detail
from pg_tables where schemaname='public' and not rowsecurity
union all
select '2 RLS SANS REGLE', c.relname::text, 'tout est bloqué (vérifier que c''est voulu)'
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
union all
select '3 REGLE TROP OUVERTE', tablename::text||' / '||policyname::text,
  cmd||' roles='||roles::text||' using='||coalesce(qual,'-')||' check='||coalesce(with_check,'-')
from pg_policies where schemaname='public' and (qual='true' or with_check='true')
union all
select '4 BUCKET', id::text, 'public='||public::text||' limite='||coalesce(file_size_limit::text,'aucune')
from storage.buckets
order by 1,2;

-- B. Fonctions SECURITY DEFINER appelables par un visiteur (résultat attendu : 3 fonctions)
select count(*) as nb_fonctions_ouvertes_aux_visiteurs,
  string_agg(p.proname, ', ' order by p.proname)
    filter (where pg_get_functiondef(p.oid) not ilike '%auth.uid()%') as sans_verification_utilisateur,
  string_agg(p.proname, ', ' order by p.proname)
    filter (where p.proconfig is null) as sans_search_path_fixe
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute');

-- C. Vues : un visiteur ne doit pas pouvoir les lire, et elles doivent filtrer sur l'utilisateur connecté
select c.relname as vue,
  has_table_privilege('anon', c.oid, 'select') as visiteur_peut_lire,
  has_table_privilege('authenticated', c.oid, 'select') as connecte_peut_lire,
  pg_get_viewdef(c.oid) ilike '%auth.uid()%' as filtre_utilisateur
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v'
order by 1;
