-- Migração incremental: categorias gerenciáveis + foto do produto.
-- Rode este arquivo no SQL Editor do Supabase se você já rodou o schema.sql original antes.
-- Seguro rodar mais de uma vez.

alter table produtos add column if not exists foto_url text;

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  markup_padrao numeric not null default 1.0,
  criado_em timestamptz not null default now()
);

alter table categorias enable row level security;

drop policy if exists "anon full access categorias" on categorias;
create policy "anon full access categorias" on categorias
  for all using (true) with check (true);

insert into categorias (nome, markup_padrao) values
  ('Legging', 1.00),
  ('Top', 1.20),
  ('Shorts', 1.00),
  ('Camiseta/Regata', 1.10),
  ('Conjunto', 0.90),
  ('Jaqueta/Casaco', 0.80),
  ('Outro', 1.00)
on conflict (nome) do nothing;

-- Storage: bucket público para fotos de produtos
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

drop policy if exists "anon read produtos bucket" on storage.objects;
create policy "anon read produtos bucket" on storage.objects
  for select using (bucket_id = 'produtos');

drop policy if exists "anon insert produtos bucket" on storage.objects;
create policy "anon insert produtos bucket" on storage.objects
  for insert with check (bucket_id = 'produtos');

drop policy if exists "anon update produtos bucket" on storage.objects;
create policy "anon update produtos bucket" on storage.objects
  for update using (bucket_id = 'produtos');

drop policy if exists "anon delete produtos bucket" on storage.objects;
create policy "anon delete produtos bucket" on storage.objects
  for delete using (bucket_id = 'produtos');
