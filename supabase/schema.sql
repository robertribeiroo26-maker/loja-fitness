-- Schema para o app de gestão de loja de roupas fitness
-- Rode este arquivo no SQL Editor do seu projeto Supabase (instalação nova).
-- Se você já rodou uma versão anterior deste arquivo, use migration_002_categorias_fotos.sql,
-- migration_003_tipos.sql e migration_004_sku_nao_unico.sql em vez deste.
--
-- Sem autenticação nesta v1 (uso single-user, sem tela de login — risco aceito).
-- As policies abaixo liberam leitura/escrita para a chave anon.

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  nome text not null,
  categoria text not null,
  tipo text,
  tecido text,
  cor text,
  tamanho text,
  fornecedor text,
  data_compra date,
  qtd_comprada integer not null default 0,
  custo_unitario numeric not null default 0,
  frete numeric not null default 0,
  outros_custos numeric not null default 0,
  markup_manual numeric,
  preco_venda numeric not null default 0,
  estoque_minimo integer not null default 3,
  ajuste_estoque integer not null default 0,
  foto_url text,
  criado_em timestamptz not null default now(),
  constraint produtos_sku_cor_tamanho_key unique (sku, cor, tamanho)
);

create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  quantidade integer not null,
  preco_venda numeric not null,
  forma_pagamento text not null,
  tipo_movimento text not null check (tipo_movimento in ('Venda', 'Devolução')),
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

create table if not exists despesas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  categoria text,
  descricao text,
  valor numeric not null,
  criado_em timestamptz not null default now()
);

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  markup_padrao numeric not null default 1.0,
  criado_em timestamptz not null default now()
);

create table if not exists tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

create index if not exists vendas_produto_id_idx on vendas(produto_id);
create index if not exists vendas_data_idx on vendas(data);
create index if not exists despesas_data_idx on despesas(data);

alter table produtos enable row level security;
alter table vendas enable row level security;
alter table despesas enable row level security;
alter table categorias enable row level security;
alter table tipos enable row level security;

drop policy if exists "anon full access produtos" on produtos;
create policy "anon full access produtos" on produtos
  for all using (true) with check (true);

drop policy if exists "anon full access vendas" on vendas;
create policy "anon full access vendas" on vendas
  for all using (true) with check (true);

drop policy if exists "anon full access despesas" on despesas;
create policy "anon full access despesas" on despesas
  for all using (true) with check (true);

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

drop policy if exists "anon full access tipos" on tipos;
create policy "anon full access tipos" on tipos
  for all using (true) with check (true);

insert into tipos (nome) values
  ('Curto'),
  ('Pedal'),
  ('Médio'),
  ('Longo')
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
