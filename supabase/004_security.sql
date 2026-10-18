-- Migration 004 : sécurité. À exécuter APRÈS schema.sql, 002 et 003 (SQL Editor > Run).
--
-- ⚠ Change le format d'envoi des caméras : rtmp://serveur/live/<ID_CAMERA>?key=<CLE>
--   Les anciennes clés restent valables (seul leur hash est conservé), mais il faut
--   mettre à jour l'URL dans OBS / la caméra (le Studio affiche la nouvelle forme).
--
-- Contenu : rôles, caméras coupées par un admin, clés hashées, journal admin,
-- limitation de débit côté serveur, droits par colonne.

create extension if not exists pgcrypto with schema extensions;

-- ===========================================================================
-- 1. Rôles (remplace is_admin)
-- ===========================================================================
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'moderator', 'admin'));

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
    update public.profiles set role = 'admin' where is_admin;
  end if;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = auth.uid()), false);
$$;

alter table public.profiles drop column if exists is_admin;

-- Seule la bio est modifiable par l'utilisateur (rôle et bannissement : serveur uniquement).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (bio) on public.profiles to authenticated;

-- ===========================================================================
-- 2. Caméras : coupure par un admin + droits par colonne
-- ===========================================================================
alter table public.streams add column if not exists disabled boolean not null default false;

revoke insert, update on public.streams from anon, authenticated;
grant insert (title, description, category, city, lat, lng, scheduled_at, event_id) on public.streams to authenticated;
grant update (title, description, category, city, lat, lng, scheduled_at, event_id) on public.streams to authenticated;

-- ===========================================================================
-- 3. Clés de stream hashées (SHA-256). La clé en clair n'est jamais stockée.
-- ===========================================================================
alter table public.stream_keys add column if not exists key_hash text;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'stream_keys' and column_name = 'key') then
    update public.stream_keys
      set key_hash = encode(extensions.digest(key, 'sha256'), 'hex')
      where key_hash is null;
  end if;
end $$;

alter table public.stream_keys alter column key_hash set not null;
alter table public.stream_keys drop column if exists key;

-- Plus aucun accès direct : lecture et régénération passent par le serveur (service_role).
drop policy if exists "lire sa clé" on public.stream_keys;
drop policy if exists "changer sa clé" on public.stream_keys;
revoke all on public.stream_keys from anon, authenticated;

-- À la création d'une caméra : hash d'une valeur aléatoire inconnue (inutilisable).
-- Le serveur génère aussitôt la vraie clé et l'affiche une seule fois au streamer.
create or replace function public.create_stream_key() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stream_keys (stream_id, key_hash)
  values (new.id, encode(extensions.digest(gen_random_uuid()::text || gen_random_uuid()::text, 'sha256'), 'hex'));
  return new;
end $$;

-- L'historique des clés n'est plus utile : les enregistrements sont rangés par id de caméra.
drop trigger if exists on_stream_key_changed on public.stream_keys;
drop function if exists public.archive_stream_key();
drop table if exists public.stream_key_history;

-- ===========================================================================
-- 4. Journal des actions admin (service_role uniquement)
-- ===========================================================================
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  admin_username text not null default '',
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security; -- aucune policy : service_role uniquement
revoke all on public.admin_audit from anon, authenticated;

-- ===========================================================================
-- 5. Limitation de débit générique (connexion, inscription, signalements…)
-- ===========================================================================
create table if not exists public.rate_limit_hits (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists rate_limit_hits_key_idx on public.rate_limit_hits (key, at desc);
alter table public.rate_limit_hits enable row level security; -- service_role uniquement
revoke all on public.rate_limit_hits from anon, authenticated;

-- true = autorisé (et compté), false = limite atteinte.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if random() < 0.01 then
    delete from public.rate_limit_hits where at < now() - interval '1 day';
  end if;
  if (select count(*) from public.rate_limit_hits
      where key = p_key and at > now() - make_interval(secs => p_window_seconds)) >= p_max then
    return false;
  end if;
  insert into public.rate_limit_hits (key) values (p_key);
  return true;
end $$;

revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- ===========================================================================
-- 6. Signalements : 10 maximum par tranche de 10 minutes
-- ===========================================================================
create or replace function public.fill_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports r
      where r.reporter_id = new.reporter_id and r.created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'rate_limit: trop de signalements, patiente un peu.';
  end if;
  select c.stream_id, c.user_id, c.username, c.content
    into new.stream_id, new.reported_user_id, new.reported_username, new.content
    from public.comments c where c.id = new.comment_id;
  if not found then
    raise exception 'commentaire introuvable';
  end if;
  new.created_at := now();
  return new;
end $$;

create policy "signaler si non banni" on public.reports as restrictive for insert
  with check (not public.is_globally_banned());

-- ===========================================================================
-- 7. Messages privés : plus diffusés en temps réel (relève par le serveur)
-- ===========================================================================
do $$
begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime drop table public.messages;
  end if;
end $$;

-- ===========================================================================
-- 8. Statistiques d'audience : appelées par le serveur uniquement
-- ===========================================================================
revoke execute on function public.report_viewers(uuid, int) from public, anon, authenticated;
grant execute on function public.report_viewers(uuid, int) to service_role;
