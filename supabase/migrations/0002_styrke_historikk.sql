-- Historikk for styrkevekter: én rad hver gang en vekt lagres i appen.
-- Kjør i Supabase → SQL Editor (etter 0001_init.sql).

create table if not exists public.styrke_historikk (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ovelse text not null,
  vekt text,
  dato date not null default current_date
);
create index if not exists styrke_historikk_user_ovelse on public.styrke_historikk (user_id, ovelse, dato desc);

alter table public.styrke_historikk enable row level security;
drop policy if exists "egne rader" on public.styrke_historikk;
create policy "egne rader" on public.styrke_historikk
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
