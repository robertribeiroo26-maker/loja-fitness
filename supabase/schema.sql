-- Schema para o app de gestão de loja de roupas fitness
-- Rode este arquivo no SQL Editor do seu projeto Supabase.
--
-- Sem autenticação nesta v1 (uso single-user, sem tela de login — risco aceito).
-- As policies abaixo liberam leitura/escrita para a chave anon.

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nome text not null,
  categoria text not null,
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
  criado_em timestamptz not null default now()
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

create index if not exists vendas_produto_id_idx on vendas(produto_id);
create index if not exists vendas_data_idx on vendas(data);
create index if not exists despesas_data_idx on despesas(data);

alter table produtos enable row level security;
alter table vendas enable row level security;
alter table despesas enable row level security;

create policy "anon full access produtos" on produtos
  for all using (true) with check (true);

create policy "anon full access vendas" on vendas
  for all using (true) with check (true);

create policy "anon full access despesas" on despesas
  for all using (true) with check (true);
