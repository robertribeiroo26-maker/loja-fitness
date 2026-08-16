import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { produtoDerivado } from '../lib/calc'
import ProdutoForm from './ProdutoForm'

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [vendidoPorProduto, setVendidoPorProduto] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState(null) // { mode, produto }

  async function load() {
    setLoading(true)
    setError(null)
    const [produtosRes, vendasRes] = await Promise.all([
      supabase.from('produtos').select('*').order('criado_em', { ascending: false }),
      supabase.from('vendas').select('produto_id, quantidade, tipo_movimento'),
    ])

    if (produtosRes.error) {
      setError(produtosRes.error.message)
      setLoading(false)
      return
    }

    const vendidoMap = {}
    for (const v of vendasRes.data || []) {
      const sinal = v.tipo_movimento === 'Devolução' ? -1 : 1
      vendidoMap[v.produto_id] = (vendidoMap[v.produto_id] || 0) + v.quantidade * sinal
    }

    setProdutos(produtosRes.data || [])
    setVendidoPorProduto(vendidoMap)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function closeForm(refresh) {
    setFormState(null)
    if (refresh) load()
  }

  return (
    <div>
      <div className="screen-header">
        <h2>Produtos</h2>
        <button className="btn btn-primary" onClick={() => setFormState({ mode: 'novo' })}>
          + Novo produto
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && <div className="empty-state">Carregando...</div>}

      {!loading && produtos.length === 0 && (
        <div className="empty-state">Nenhum produto cadastrado ainda.</div>
      )}

      {!loading &&
        produtos.map((p) => {
          const derived = produtoDerivado(p, vendidoPorProduto[p.id] || 0)
          return (
            <div className="list-item" key={p.id}>
              <div className="list-item-main">
                <div className="list-item-title">{p.nome}</div>
                <div className="list-item-sub">
                  {p.sku} · estoque: {derived.estoqueAtual}
                </div>
              </div>
              <span className={`badge ${derived.estoqueBaixo ? 'badge-baixo' : 'badge-ok'}`}>
                {derived.estoqueBaixo ? 'BAIXO' : 'OK'}
              </span>
              <div className="list-item-actions">
                <button className="btn btn-sm" onClick={() => setFormState({ mode: 'editar', produto: p })}>
                  Editar
                </button>
                <button className="btn btn-sm" onClick={() => setFormState({ mode: 'duplicar', produto: p })}>
                  Duplicar
                </button>
              </div>
            </div>
          )
        })}

      {formState && (
        <ProdutoForm
          mode={formState.mode}
          produto={formState.produto}
          onClose={() => closeForm(false)}
          onSaved={() => closeForm(true)}
        />
      )}
    </div>
  )
}
