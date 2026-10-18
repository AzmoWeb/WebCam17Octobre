-- Migration 003 : à exécuter APRÈS schema.sql et 002_features.sql (SQL Editor > Run).
-- Ajoute : admin et bannissement global, anti-spam, connexion Google/GitHub,
-- événements (+ chat), carte (lat/lng), directs programmés, abonnements,
-- messages privés, sessions de diffusion (stats + replays), clips.
--
-- Pour te nommer administrateur ensuite :
--   update public.profiles set is_admin = true where username = 'TON_PSEUDO';

-- ===========================================================================
-- Admin et bannissement global
-- ===========================================================================
alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_banned boolean not null default false;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.is_globally_banned() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_banned from public.profiles p where p.id = auth.uid()), false);
$$;

-- ===========================================================================
-- Pseudo automatique pour Google / GitHub (pas de champ « pseudo » à l'inscription)
-- ===========================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  tries int := 0;
begin
  base := coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(coalesce(new.email, ''), '@', 1)
  );
  base := left(regexp_replace(coalesce(base, ''), '[^A-Za-z0-9_]', '', 'g'), 24);
  if char_length(base) < 3 then base := 'user' || base; end if;

  candidate := base;
  while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate)) loop
    tries := tries + 1;
    candidate := left(base, 24) || floor(random() * 100000)::int;
    if tries > 20 then candidate := 'user' || floor(random() * 1000000000)::bigint; end if;
  end loop;

  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end $$;

-- ===========================================================================
-- Événements
-- ===========================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  city text not null default '' check (char_length(city) <= 80),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists events_starts_idx on public.events (starts_at desc);

alter table public.events enable row level security;
create policy "événements lisibles par tous" on public.events for select using (true);
create policy "créer un événement" on public.events for insert
  with check (owner_id = auth.uid() and not public.is_globally_banned());
create policy "modifier son événement" on public.events for update
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "supprimer son événement" on public.events for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- Caméras : position, programmation, événement, droits admin
-- ===========================================================================
alter table public.streams
  add column if not exists lat double precision check (lat between -90 and 90),
  add column if not exists lng double precision check (lng between -180 and 180),
  add column if not exists scheduled_at timestamptz,
  add column if not exists event_id uuid references public.events on delete set null;

drop policy if exists "créer ses caméras" on public.streams;
create policy "créer ses caméras" on public.streams for insert
  with check (owner_id = auth.uid() and not public.is_globally_banned());
create policy "admin supprime les caméras" on public.streams for delete using (public.is_admin());

-- Ancienne clé conservée à chaque régénération (pour retrouver les enregistrements).
create table if not exists public.stream_key_history (
  stream_id uuid not null references public.streams on delete cascade,
  key text not null,
  replaced_at timestamptz not null default now(),
  primary key (stream_id, key)
);
alter table public.stream_key_history enable row level security; -- service_role uniquement

create or replace function public.archive_stream_key() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.key <> new.key then
    insert into public.stream_key_history (stream_id, key) values (old.stream_id, old.key)
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_stream_key_changed on public.stream_keys;
create trigger on_stream_key_changed
  after update of key on public.stream_keys
  for each row execute function public.archive_stream_key();

-- ===========================================================================
-- Commentaires : anti-spam, ban global, droits admin
-- ===========================================================================
create index if not exists comments_user_created_idx on public.comments (user_id, created_at desc);

create or replace function public.fill_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.comments c
      where c.user_id = new.user_id and c.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'rate_limit: trop de messages, patiente un peu.';
  end if;
  if exists (select 1 from public.comments c
             where c.user_id = new.user_id and c.content = new.content
               and c.created_at > now() - interval '30 seconds') then
    raise exception 'duplicate: message identique déjà envoyé.';
  end if;
  new.username := (select p.username from public.profiles p where p.id = new.user_id);
  new.created_at := now();
  return new;
end $$;

drop policy if exists "commenter si non banni" on public.comments;
create policy "commenter si non banni" on public.comments for insert with check (
  user_id = auth.uid()
  and not public.is_globally_banned()
  and not exists (
    select 1 from public.stream_bans b
    where b.stream_id = comments.stream_id and b.user_id = auth.uid()
  )
);
create policy "admin supprime les commentaires" on public.comments for delete using (public.is_admin());

create policy "admin voit les signalements" on public.reports for select using (public.is_admin());
create policy "admin traite les signalements" on public.reports for delete using (public.is_admin());

-- ===========================================================================
-- Chat des événements
-- ===========================================================================
create table if not exists public.event_comments (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  username text not null default '',
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists event_comments_event_idx on public.event_comments (event_id, created_at desc);
create index if not exists event_comments_user_idx on public.event_comments (user_id, created_at desc);

create or replace function public.fill_event_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.event_comments c
      where c.user_id = new.user_id and c.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'rate_limit: trop de messages, patiente un peu.';
  end if;
  new.username := (select p.username from public.profiles p where p.id = new.user_id);
  new.created_at := now();
  return new;
end $$;

drop trigger if exists before_event_comment_insert on public.event_comments;
create trigger before_event_comment_insert
  before insert on public.event_comments
  for each row execute function public.fill_event_comment();

alter table public.event_comments enable row level security;
create policy "chat événement lisible" on public.event_comments for select using (true);
create policy "écrire dans un événement" on public.event_comments for insert
  with check (user_id = auth.uid() and not public.is_globally_banned());
create policy "supprimer un message d'événement" on public.event_comments for delete using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

alter publication supabase_realtime add table public.event_comments;

-- ===========================================================================
-- Abonnements (suivre un streamer)
-- ===========================================================================
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists follows_followed_idx on public.follows (followed_id);

alter table public.follows enable row level security;
create policy "abonnements lisibles" on public.follows for select using (true);
create policy "s'abonner" on public.follows for insert with check (follower_id = auth.uid());
create policy "se désabonner" on public.follows for delete using (follower_id = auth.uid());

-- ===========================================================================
-- Messages privés
-- ===========================================================================
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);

create or replace function public.fill_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages m
      where m.sender_id = new.sender_id and m.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limit: trop de messages, patiente un peu.';
  end if;
  new.created_at := now();
  new.read_at := null;
  return new;
end $$;

drop trigger if exists before_message_insert on public.messages;
create trigger before_message_insert
  before insert on public.messages
  for each row execute function public.fill_message();

alter table public.messages enable row level security;
create policy "lire ses conversations" on public.messages for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "envoyer un message" on public.messages for insert
  with check (sender_id = auth.uid() and not public.is_globally_banned());
create policy "marquer comme lu" on public.messages for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

alter publication supabase_realtime add table public.messages;

-- ===========================================================================
-- Sessions de diffusion (statistiques + replays)
-- Créées par le hook MediaMTX via la clé service_role.
-- ===========================================================================
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.streams on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  peak_viewers int not null default 0
);

create index if not exists broadcasts_stream_idx on public.broadcasts (stream_id, started_at desc);

alter table public.broadcasts enable row level security;
create policy "diffusions lisibles" on public.broadcasts for select using (true);
create policy "supprimer un replay" on public.broadcasts for delete
  using (public.is_stream_owner(stream_id) or public.is_admin());

create table if not exists public.viewer_samples (
  broadcast_id uuid not null references public.broadcasts on delete cascade,
  at timestamptz not null default now(),
  viewers int not null check (viewers >= 0),
  primary key (broadcast_id, at)
);

alter table public.viewer_samples enable row level security;
create policy "stats visibles par le propriétaire" on public.viewer_samples for select using (
  public.is_admin()
  or exists (select 1 from public.broadcasts b where b.id = broadcast_id and public.is_stream_owner(b.stream_id))
);

-- Appelée par les pages caméra : met à jour le pic et enregistre un point par minute.
create or replace function public.report_viewers(p_stream uuid, p_viewers int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  bid uuid;
begin
  select b.id into bid from public.broadcasts b
  where b.stream_id = p_stream and b.ended_at is null
  order by b.started_at desc limit 1;
  if bid is null then return; end if;

  p_viewers := least(greatest(coalesce(p_viewers, 0), 0), 100000);
  update public.broadcasts set peak_viewers = greatest(peak_viewers, p_viewers) where id = bid;

  if not exists (select 1 from public.viewer_samples s
                 where s.broadcast_id = bid and s.at > now() - interval '55 seconds') then
    insert into public.viewer_samples (broadcast_id, at, viewers) values (bid, now(), p_viewers);
  end if;
end $$;

grant execute on function public.report_viewers(uuid, int) to anon, authenticated;

-- ===========================================================================
-- Clips
-- ===========================================================================
create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.streams on delete cascade,
  creator_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  start_at timestamptz not null,
  duration int not null check (duration between 5 and 60),
  created_at timestamptz not null default now()
);

create index if not exists clips_stream_idx on public.clips (stream_id, created_at desc);
create index if not exists clips_creator_idx on public.clips (creator_id, created_at desc);

create or replace function public.fill_clip() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.clips c
      where c.creator_id = new.creator_id and c.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limit: 5 clips maximum toutes les 10 minutes.';
  end if;
  new.start_at := least(new.start_at, now() - make_interval(secs => new.duration));
  new.created_at := now();
  return new;
end $$;

drop trigger if exists before_clip_insert on public.clips;
create trigger before_clip_insert
  before insert on public.clips
  for each row execute function public.fill_clip();

alter table public.clips enable row level security;
create policy "clips lisibles" on public.clips for select using (true);
create policy "créer un clip" on public.clips for insert
  with check (creator_id = auth.uid() and not public.is_globally_banned());
create policy "supprimer un clip" on public.clips for delete
  using (creator_id = auth.uid() or public.is_stream_owner(stream_id) or public.is_admin());
