-- Are 70.3 – skjema med bruker-ID og Row Level Security.
-- Kjør i Supabase → SQL Editor.

create table if not exists public.logg (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  type text not null,
  km numeric not null default 0,
  minutter numeric not null default 0,
  navn text not null default '',
  kilde text not null default 'Manuelt',
  strava_id text,
  opprettet timestamptz not null default now(),
  unique (user_id, strava_id)
);
create index if not exists logg_user_dato on public.logg (user_id, dato desc);

create table if not exists public.avhuking (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato date not null,
  morgen boolean not null default false,
  kveld boolean not null default false,
  primary key (user_id, dato)
);

create table if not exists public.tester (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  uke int not null,
  dato date,
  css_sek numeric,
  ftp numeric,
  kg numeric,
  k5_sek numeric,
  hm_sek numeric,
  kommentar text,
  primary key (user_id, uke)
);

create table if not exists public.strava_tokens (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  athlete_id text,
  access text not null,
  refresh text not null,
  expires bigint not null
);

create table if not exists public.styrke_vekt (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ovelse text not null,
  vekt text,
  oppdatert timestamptz not null default now(),
  primary key (user_id, ovelse)
);

-- Row Level Security: hver bruker ser og endrer bare egne rader.
alter table public.logg enable row level security;
alter table public.avhuking enable row level security;
alter table public.tester enable row level security;
alter table public.strava_tokens enable row level security;
alter table public.styrke_vekt enable row level security;

do $$
declare t text;
begin
  foreach t in array array['logg','avhuking','tester','strava_tokens','styrke_vekt'] loop
    execute format('drop policy if exists "egne rader" on public.%I', t);
    execute format(
      'create policy "egne rader" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
