-- Kjør i Supabase → SQL Editor. Enkelt oppsett for én bruker (anon-nøkkel, ingen RLS).
create table if not exists logg (
  id bigint generated always as identity primary key,
  dato date not null, type text not null, km numeric default 0, minutter numeric default 0,
  navn text default '', kilde text default 'Manuelt', strava_id text unique
);
create table if not exists avhuking (dato date primary key, morgen boolean default false, kveld boolean default false);
create table if not exists tester (
  uke int primary key, dato date, css_sek numeric, ftp numeric, kg numeric, k5_sek numeric, hm_sek numeric, kommentar text
);
create table if not exists tokens (id int primary key check (id = 1), access text, refresh text, expires bigint);
