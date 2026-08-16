# Loja Fitness — app de gestão

App mínimo para cadastrar peças e registrar vendas de uma loja de roupas fitness, com dados sincronizados entre celular e PC via Supabase. Ver [`briefing-loja-app.md`] para as decisões de escopo.

## Telas

- **Vender** — busca produto, ajusta preço/quantidade, registra venda ou devolução.
- **Produtos** — lista com estoque e status, cadastro, edição e duplicação de SKU.
- **Dashboard** — faturamento/lucro/margem de hoje, semana e mês, estoque baixo, lançamento de despesas.

## Setup

### 1. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. Abra o **SQL Editor** e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) — isso cria as tabelas `produtos`, `vendas`, `despesas` e libera acesso para a chave anônima (não há tela de login nesta v1).
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `.env` com a URL e a anon key copiadas acima.

### 3. Rodar localmente

```bash
npm install
npm run dev
```

### 4. Deploy no Netlify

1. Suba o repositório no GitHub e conecte no Netlify (mesmo fluxo do IBOVESPA ANALYZER).
2. Build command: `npm run build` — Publish directory: `dist`.
3. Em **Site settings → Environment variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env`.

## Configurações fixas (v1)

Definidas em [`src/lib/config.js`](src/lib/config.js): margem mínima global (35%), markup padrão por categoria, estoque mínimo padrão (3 unidades) e formas de pagamento.
