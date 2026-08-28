import { MARGEM_MINIMA_GLOBAL } from './config'

export function custoTotalProduto(produto) {
  const qtd = produto.qtd_comprada || 1
  return (
    Number(produto.custo_unitario || 0) +
    Number(produto.frete || 0) / qtd +
    Number(produto.outros_custos || 0) / qtd
  )
}

export function markupProduto(produto, markupPadraoPorCategoria = {}) {
  if (produto.markup_manual !== null && produto.markup_manual !== undefined) {
    return Number(produto.markup_manual)
  }
  return markupPadraoPorCategoria[produto.categoria] ?? 1.0
}

export function precoMinimo(custoTotal) {
  return custoTotal / (1 - MARGEM_MINIMA_GLOBAL)
}

export function precoRecomendado(custoTotal, markup) {
  return Math.max(custoTotal * (1 + markup), precoMinimo(custoTotal))
}

export function markupObtido(precoVenda, custoTotal) {
  if (!custoTotal) return 0
  return (precoVenda - custoTotal) / custoTotal
}

export function margemObtida(precoVenda, custoTotal) {
  if (!precoVenda) return 0
  return (precoVenda - custoTotal) / precoVenda
}

export function lucroUnitario(precoVenda, custoTotal) {
  return precoVenda - custoTotal
}

export function estoqueAtual(produto, qtdVendidaLiquida) {
  return (
    Number(produto.qtd_comprada || 0) -
    Number(qtdVendidaLiquida || 0) +
    Number(produto.ajuste_estoque || 0)
  )
}

export function produtoDerivado(produto, qtdVendidaLiquida = 0, markupPadraoPorCategoria = {}) {
  const custoTotal = custoTotalProduto(produto)
  const markup = markupProduto(produto, markupPadraoPorCategoria)
  const precoVenda = Number(produto.preco_venda || 0)
  const estoque = estoqueAtual(produto, qtdVendidaLiquida)
  return {
    custoTotal,
    markup,
    precoMinimo: precoMinimo(custoTotal),
    precoRecomendado: precoRecomendado(custoTotal, markup),
    markupObtido: markupObtido(precoVenda, custoTotal),
    margemObtida: margemObtida(precoVenda, custoTotal),
    lucroUnitario: lucroUnitario(precoVenda, custoTotal),
    estoqueAtual: estoque,
    estoqueBaixo: estoque <= Number(produto.estoque_minimo || 0),
  }
}

export function vendaDerivada(venda, custoUnitarioNaVenda) {
  const sinal = venda.tipo_movimento === 'Devolução' ? -1 : 1
  const faturamento = venda.quantidade * venda.preco_venda * sinal
  const custoTotal = venda.quantidade * custoUnitarioNaVenda * sinal
  const lucro = faturamento - custoTotal
  const margem = faturamento ? lucro / faturamento : 0
  return { faturamento, custoTotal, lucro, margem }
}

export function fmtMoeda(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function fmtPercent(valor) {
  return `${((Number(valor) || 0) * 100).toFixed(1)}%`
}
