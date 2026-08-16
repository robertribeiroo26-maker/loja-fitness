-- Migração incremental: campo "Tipo" (comprimento da peça) gerenciável.
-- Rode este arquivo no SQL Editor do Supabase se você já rodou o schema.sql/migration_002 antes.
-- Seguro rodar mais de uma vez.

alter table produtos add column if not exists tipo text;

create table if not exists tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

alter table tipos enable row level security;

drop policy if exists "anon full access tipos" on tipos;
create policy "anon full access tipos" on tipos
  for all using (true) with check (true);

insert into tipos (nome) values
  ('Curto'),
  ('Pedal'),
  ('Médio'),
  ('Longo')
on conflict (nome) do nothing;
