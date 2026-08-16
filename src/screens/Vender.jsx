import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FORMAS_PAGAMENTO } from '../lib/config'
import { fmtMoeda } from '../lib/calc'

export default function Vender() {
  const [produtos, setProdutos] = useState([])
  const [query, setQuery] = useState('')
  const [selecionado, setSelecionado] = useState(null)
  const [preco, setPreco] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [formaPagamento, setFormaPagamento] = useState(FORMAS_PAGAMENTO[0])
  const [tipoMovimento, setTipoMovimento] = useState('Venda')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  useEffect(() => {
    supabase
      .from('produtos')
      .select('id, sku, nome, preco_venda, foto_url')
      .order('nome')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setProdutos(data || [])
      })
  }, [])

  const sugestoes = useMemo(() => {
    if (!query || selecionado) return []
    const q = query.toLowerCase()
    return produtos
      .filter((p) => p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, produtos, selecionado])

  function selecionar(produto) {
    setSelecionado(produto)
    setQuery(`${produto.nome} (${produto.sku})`)
    setPreco(produto.preco_venda)
  }

  function limparFormulario() {
    setSelecionado(null)
    setQuery('')
    setPreco('')
    setQuantidade(1)
    setFormaPagamento(FORMAS_PAGAMENTO[0])
    setTipoMovimento('Venda')
  }

  async function registrarVenda(e) {
    e.preventDefault()
    if (!selecionado) {
      setError('Selecione um produto.')
      return
    }
    setSaving(true)
    setError(null)
    setSucesso(null)

    const { error } = await supabase.from('vendas').insert({
      produto_id: selecionado.id,
      quantidade: Number(quantidade),
      preco_venda: Number(preco),
      forma_pagamento: formaPagamento,
      tipo_movimento: tipoMovimento,
      data: new Date().toISOString().slice(0, 10),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSucesso(`${tipoMovimento === 'Devolução' ? 'Devolução' : 'Venda'} registrada: ${selecionado.nome}`)
    limparFormulario()
  }

  return (
    <div>
      <div className="screen-header">
        <h2>Vender</h2>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {sucesso && <div className="card" style={{ color: 'var(--success)' }}>{sucesso}</div>}

      <form onSubmit={registrarVenda}>
        <div className="field">
          <label>Produto (nome ou SKU)</label>
          <input
            value={query}
            placeholder="Buscar produto..."
            onChange={(e) => {
              setQuery(e.target.value)
              setSelecionado(null)
            }}
          />
          {sugestoes.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              {sugestoes.map((p) => (
                <div
                  key={p.id}
                  className="list-item"
                  style={{ margin: 0, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer' }}
                  onClick={() => selecionar(p)}
                >
                  {p.foto_url && (
                    <img src={p.foto_url} alt={p.nome} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0 }} />
                  )}
                  <div className="list-item-main">
                    <div className="list-item-title">{p.nome}</div>
                    <div className="list-item-sub">{p.sku} · {fmtMoeda(p.preco_venda)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selecionado && (
          <>
            {selecionado.foto_url && (
              <img
                src={selecionado.foto_url}
                alt={selecionado.nome}
                style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 12 }}
              />
            )}
            <div className="field-row">
              <div className="field">
                <label>Preço</label>
                <input type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} />
              </div>
              <div className="field">
                <label>Quantidade</label>
                <input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Forma de pagamento</label>
                <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Movimento</label>
                <select value={tipoMovimento} onChange={(e) => setTipoMovimento(e.target.value)}>
                  <option value="Venda">Venda</option>
                  <option value="Devolução">Devolução</option>
                </select>
              </div>
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
              {saving ? 'Registrando...' : `Registrar ${tipoMovimento === 'Devolução' ? 'devolução' : 'venda'}`}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
