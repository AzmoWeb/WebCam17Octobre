-- Migration 002 : à exécuter APRÈS schema.sql (SQL Editor > Run).
-- Ajoute : description / catégorie / ville des caméras, bio des profils, favoris.

-- ---------------------------------------------------------------------------
-- Infos des caméras
-- ---------------------------------------------------------------------------
alter table public.streams
  add column if not exists description text not null default ''
    check (char_length(description) <= 1000),
  add column if not exists category text not null default 'autre'
    check (category in ('manifestation', 'evenement', 'ville', 'nature', 'sport', 'autre')),
  add column if not exists city text not null default ''
    check (char_length(city) <= 80);

-- ---------------------------------------------------------------------------
-- Bio des profils (seule colonne modifiable par l'utilisateur)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists bio text not null default ''
    check (char_length(bio) <= 300);

create policy "modifier son profil" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from anon, authenticated;
grant update (bio) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Favoris
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  stream_id uuid not null references public.streams on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stream_id)
);

create index if not exists favorites_stream_idx on public.favorites (stream_id);

alter table public.favorites enable row level security;
create policy "favoris lisibles par tous" on public.favorites for select using (true);
create policy "ajouter un favori" on public.favorites for insert with check (user_id = auth.uid());
create policy "retirer un favori" on public.favorites for delete using (user_id = auth.uid());
