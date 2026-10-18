-- Schéma CamManif : à coller dans Supabase > SQL Editor, puis "Run".
-- Tables : profiles, streams, stream_keys (privée), comments, stream_bans, reports.

-- ---------------------------------------------------------------------------
-- Profils (créés automatiquement à l'inscription)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique
    check (char_length(username) between 3 and 30 and username ~ '^[A-Za-z0-9_]+$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profils lisibles par tous" on public.profiles for select using (true);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Caméras (publiques)
-- ---------------------------------------------------------------------------
create table public.streams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.streams enable row level security;
create policy "caméras lisibles par tous" on public.streams for select using (true);
create policy "créer ses caméras" on public.streams for insert with check (owner_id = auth.uid());
create policy "modifier ses caméras" on public.streams for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "supprimer ses caméras" on public.streams for delete using (owner_id = auth.uid());

create function public.is_stream_owner(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.streams s where s.id = sid and s.owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Clés de stream (séparées : seul le propriétaire peut les lire)
-- ---------------------------------------------------------------------------
create table public.stream_keys (
  stream_id uuid primary key references public.streams on delete cascade,
  key text not null unique,
  updated_at timestamptz not null default now()
);

alter table public.stream_keys enable row level security;
create policy "lire sa clé" on public.stream_keys for select using (public.is_stream_owner(stream_id));
create policy "changer sa clé" on public.stream_keys for update
  using (public.is_stream_owner(stream_id)) with check (public.is_stream_owner(stream_id));

create function public.create_stream_key() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stream_keys (stream_id, key)
  values (new.id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
  return new;
end $$;

create trigger on_stream_created
  after insert on public.streams
  for each row execute function public.create_stream_key();

-- ---------------------------------------------------------------------------
-- Bannissements (par caméra, décidés par son propriétaire)
-- ---------------------------------------------------------------------------
create table public.stream_bans (
  stream_id uuid not null references public.streams on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);

alter table public.stream_bans enable row level security;
create policy "voir les bans" on public.stream_bans for select
  using (public.is_stream_owner(stream_id) or user_id = auth.uid());
create policy "bannir" on public.stream_bans for insert with check (public.is_stream_owner(stream_id));
create policy "débannir" on public.stream_bans for delete using (public.is_stream_owner(stream_id));

-- ---------------------------------------------------------------------------
-- Commentaires (temps réel)
-- ---------------------------------------------------------------------------
create table public.comments (
  id bigint generated always as identity primary key,
  stream_id uuid not null references public.streams on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  username text not null default '',
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index comments_stream_created_idx on public.comments (stream_id, created_at desc);

-- Le pseudo et la date sont imposés côté serveur (impossible à falsifier).
create function public.fill_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.username := (select p.username from public.profiles p where p.id = new.user_id);
  new.created_at := now();
  return new;
end $$;

create trigger before_comment_insert
  before insert on public.comments
  for each row execute function public.fill_comment();

alter table public.comments enable row level security;
create policy "commentaires lisibles par tous" on public.comments for select using (true);
create policy "commenter si non banni" on public.comments for insert with check (
  user_id = auth.uid()
  and not exists (
    select 1 from public.stream_bans b
    where b.stream_id = comments.stream_id and b.user_id = auth.uid()
  )
);
create policy "supprimer : auteur ou propriétaire" on public.comments for delete
  using (user_id = auth.uid() or public.is_stream_owner(stream_id));

alter publication supabase_realtime add table public.comments;

-- ---------------------------------------------------------------------------
-- Signalements (copie du commentaire conservée même s'il est supprimé)
-- ---------------------------------------------------------------------------
create table public.reports (
  id bigint generated always as identity primary key,
  stream_id uuid not null references public.streams on delete cascade,
  comment_id bigint references public.comments on delete set null,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reported_username text,
  content text,
  reason text check (char_length(reason) <= 200),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create function public.fill_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select c.stream_id, c.user_id, c.username, c.content
    into new.stream_id, new.reported_user_id, new.reported_username, new.content
    from public.comments c where c.id = new.comment_id;
  if not found then
    raise exception 'commentaire introuvable';
  end if;
  new.created_at := now();
  return new;
end $$;

create trigger before_report_insert
  before insert on public.reports
  for each row execute function public.fill_report();

alter table public.reports enable row level security;
create policy "signaler" on public.reports for insert with check (reporter_id = auth.uid());
create policy "voir les signalements de ses caméras" on public.reports for select
  using (public.is_stream_owner(stream_id));
create policy "traiter les signalements" on public.reports for delete
  using (public.is_stream_owner(stream_id));
