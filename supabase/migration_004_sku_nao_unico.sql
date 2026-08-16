-- Migração incremental: SKU deixa de ser único sozinho — agora várias cores/tamanhos
-- do mesmo modelo podem usar o mesmo SKU. O que precisa ser único é a combinação
-- SKU + cor + tamanho (ou seja, não pode repetir a peça exatamente igual).
-- Rode este arquivo no SQL Editor do Supabase se você já rodou o schema.sql antes.
-- Seguro rodar mais de uma vez.

alter table produtos drop constraint if exists produtos_sku_key;
alter table produtos drop constraint if exists produtos_sku_cor_tamanho_key;
alter table produtos add constraint produtos_sku_cor_tamanho_key unique (sku, cor, tamanho);
