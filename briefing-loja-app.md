# Briefing técnico — App de gestão de loja de roupas fitness

## Contexto
Loja iniciante, ~13 peças cadastradas, único usuário (sem funcionário), uso via celular e PC. Prioridade absoluta: cadastrar peça e registrar venda com o mínimo de cliques possível.

## Decisões já fechadas (não reabrir sem motivo forte)
- **Stack:** React + Vite, deploy no Netlify (mesmo padrão do projeto IBOVESPA ANALYZER já existente).
- **Backend:** Supabase (Postgres gratuito) — necessário porque o site precisa sincronizar dados entre celular e PC. Sem Supabase, dado ficaria preso no navegador de cada aparelho (localStorage), o que não atende o requisito de uso em dois aparelhos.
- **Escopo:** versão mínima. Cortado desta v1: login/múltiplos usuários, cálculo automático de taxa de cartão, análise dedicada por tecido (vira filtro), visão quinzenal, ranking automático multi-critério (ordenação manual resolve por enquanto).
- **Variação de produto:** cada combinação tamanho/cor é um registro (SKU) próprio, não uma "grade". Ex.: Legging Preta P e Legging Preta M são duas linhas diferentes.
- **Preço manual x desconto:** são a mesma coisa. Ao vender, o usuário pode digitar um preço diferente do padrão — isso substitui a necessidade de um campo de desconto separado.
- **Troca de peça:** registrada como duas vendas — uma "Devolução" do item antigo + uma "Venda" do item novo.

## Telas (3, e só 3, para manter simples)

### 1. Produtos
- Lista de produtos cadastrados com: nome, SKU, estoque atual, status (OK/BAIXO).
- Botão "Novo produto" abre formulário de cadastro.
- Botão "Duplicar" em cada produto (copia tudo, só pede pra trocar tamanho/cor — evita redigitar custo/fornecedor a cada variação).
- Editar produto existente (inclui poder editar o preço de venda a qualquer momento).

### 2. Vender
- Campo de busca de produto (por nome ou SKU) com autocomplete.
- Ao selecionar: mostra preço padrão (editável), campo de quantidade, forma de pagamento (dropdown), tipo de movimento (Venda/Devolução).
- Botão "Registrar venda" — confirma e limpa o formulário pra próxima venda.
- Isso precisa ser rápido o bastante pra usar em pé, no balcão, no celular.

### 3. Dashboard
- Cards: Hoje / Semana / Mês, cada um com Faturamento, Peças vendidas, Lucro bruto, Margem média.
- Semana e Mês também mostram Lucro líquido (bruto − despesas do período).
- Lista simples de "produtos com estoque baixo".
- (Opcional v1.1, não bloquear o lançamento por isso: gráfico de faturamento por dia.)

*Não incluir tela de Despesas dedicada na v1 se isso atrasar o lançamento — pode ser um formulário simples dentro do próprio Dashboard ("+ Lançar despesa"). Se cortar Despesas inteiramente da v1, o Dashboard mostra só Lucro Bruto (sem Líquido) até a peça de Despesas ser adicionada.*

## Schema Supabase (tabelas)

### `produtos`
| campo | tipo | observação |
|---|---|---|
| id | uuid (PK) | gerado automático |
| sku | text | único |
| nome | text | |
| categoria | text | |
| tecido | text | |
| cor | text | |
| tamanho | text | |
| fornecedor | text | opcional |
| data_compra | date | |
| qtd_comprada | integer | |
| custo_unitario | numeric | |
| frete | numeric | default 0 |
| outros_custos | numeric | default 0 |
| markup_manual | numeric | nullable — se nulo, usa markup padrão da categoria |
| preco_venda | numeric | editável a qualquer momento |
| estoque_minimo | integer | default 3 |
| ajuste_estoque | integer | default 0 — soma manual (perda/erro de contagem) |
| criado_em | timestamp | default now() |

Campos **calculados no front-end** (não armazenar, calcular na hora de exibir):
```
custo_total   = custo_unitario + frete/qtd_comprada + outros_custos/qtd_comprada
markup        = markup_manual ?? markup_padrao_da_categoria
preco_minimo  = custo_total / (1 - margem_minima_global)      // margem_minima_global: constante, ex. 0.35
preco_recomendado = custo_total * (1 + markup)
markup_obtido = (preco_venda - custo_total) / custo_total
margem_obtida = (preco_venda - custo_total) / preco_venda
lucro_unitario = preco_venda - custo_total
estoque_atual = qtd_comprada - qtd_vendida_liquida + ajuste_estoque
```

### `vendas`
| campo | tipo | observação |
|---|---|---|
| id | uuid (PK) | |
| produto_id | uuid (FK → produtos.id) | |
| quantidade | integer | |
| preco_venda | numeric | pode divergir do preco_venda do produto (desconto/ajuste) |
| forma_pagamento | text | Dinheiro / PIX / Débito / Crédito / Outro |
| tipo_movimento | text | "Venda" ou "Devolução" |
| data | date | |
| criado_em | timestamp | default now() |

Campos calculados:
```
custo_unitario_na_venda = custo_total do produto no momento (buscar de produtos)
faturamento  = quantidade * preco_venda * (tipo_movimento == "Devolução" ? -1 : 1)
custo_total  = quantidade * custo_unitario_na_venda * (tipo_movimento == "Devolução" ? -1 : 1)
lucro        = faturamento - custo_total
margem       = lucro / faturamento
```

### `despesas` (se incluída na v1)
| campo | tipo |
|---|---|
| id | uuid (PK) |
| data | date |
| categoria | text |
| descricao | text |
| valor | numeric |

## Configurações (pode ser hardcoded no início, não precisa de tela própria em v1)
```
margem_minima_global = 0.35
markup_padrao_por_categoria = {
  "Legging": 1.00, "Top": 1.20, "Shorts": 1.00,
  "Camiseta/Regata": 1.10, "Conjunto": 0.90, "Jaqueta/Casaco": 0.80, "Outro": 1.00
}
estoque_minimo_padrao = 3
```

## Definição de pronto (v1)
- Cadastrar produto → aparece na lista com custo/preço calculados corretamente.
- Vender produto → estoque baixa, dashboard atualiza no mesmo dia.
- Abrir no celular e no PC → mesmos dados aparecem nos dois (prova de que o Supabase está sincronizando de verdade).
- Sem tela de login — acesso direto ao app (aceitar esse risco por enquanto, loja sem funcionário).
