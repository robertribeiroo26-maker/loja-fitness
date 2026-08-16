import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { produtoDerivado, fmtMoeda, fmtPercent } from '../lib/calc'
import { PencilIcon, XIcon } from '../lib/icons'
import ProdutoForm from './ProdutoForm'
import Lightbox from '../components/Lightbox'

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [vendidoPorProduto, setVendidoPorProduto] = useState({})
  const [markupPadraoPorCategoria, setMarkupPadraoPorCategoria] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formState, setFormState] = useState(null) // { mode, produto }
  const [fotoAmpliada, setFotoAmpliada] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState(null)
  const [categoriasNomes, setCategoriasNomes] = useState([])

  async function load() {
    setLoading(true)
    setError(null)
    const [produtosRes, vendasRes, categoriasRes] = await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('vendas').select('produto_id, quantidade, tipo_movimento'),
      supabase.from('categorias').select('nome, markup_padrao'),
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
    setMarkupPadraoPorCategoria(
      Object.fromEntries((categoriasRes.data || []).map((c) => [c.nome, c.markup_padrao]))
    )
    setCategoriasNomes((categoriasRes.data || []).map((c) => c.nome))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function closeForm(refresh) {
    setFormState(null)
    if (refresh) load()
  }

  async function excluirProduto(produto) {
    const confirmado = window.confirm(
      `Excluir "${produto.nome}" (${produto.sku})? As vendas registradas desse produto também serão apagadas. Essa ação não pode ser desfeita.`
    )
    if (!confirmado) return

    setError(null)
    const { error: vendasError } = await supabase.from('vendas').delete().eq('produto_id', produto.id)
    if (vendasError) {
      setError(vendasError.message)
      return
    }
    const { error: produtoError } = await supabase.from('produtos').delete().eq('id', produto.id)
    if (produtoError) {
      setError(produtoError.message)
      return
    }
    load()
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

      {!loading && produtos.length > 0 && categoriasNomes.length > 0 && (
        <div className="field" style={{ maxWidth: 220, marginBottom: 12 }}>
          <label>Filtrar por categoria</label>
          <select value={filtroCategoria || ''} onChange={(e) => setFiltroCategoria(e.target.value || null)}>
            <option value="">Todas</option>
            {categoriasNomes.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
      )}

      {loading && <div className="empty-state">Carregando...</div>}

      {!loading && produtos.length === 0 && (
        <div className="empty-state">Nenhum produto cadastrado ainda.</div>
      )}

      {!loading &&
        produtos
          .filter((p) => !filtroCategoria || p.categoria === filtroCategoria)
          .map((p) => {
          const derived = produtoDerivado(p, vendidoPorProduto[p.id] || 0, markupPadraoPorCategoria)
          return (
            <div className="card" key={p.id}>
              <div className="list-item" style={{ border: 'none', margin: 0, padding: 0 }}>
                {p.foto_url ? (
                  <img
                    src={p.foto_url}
                    alt={p.nome}
                    onClick={() => setFotoAmpliada(p.foto_url)}
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius)', flexShrink: 0, cursor: 'pointer' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 20,
                    }}
                  >
                    👕
                  </div>
                )}
                <div className="list-item-main">
                  <div className="list-item-title">{p.nome}</div>
                  <div className="list-item-sub">
                    {p.sku} · estoque: {derived.estoqueAtual}
                  </div>
                  {(p.cor || p.tamanho || p.tipo) && (
                    <div className="list-item-sub">
                      {[p.cor, p.tamanho, p.tipo].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <span className={`badge ${derived.estoqueBaixo ? 'badge-baixo' : 'badge-ok'}`}>
                  {derived.estoqueBaixo ? 'BAIXO' : 'OK'}
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  title="Editar"
                  style={{ flexShrink: 0, padding: '5px 7px', display: 'flex', color: 'var(--text)', border: '1px solid var(--border)' }}
                  onClick={() => setFormState({ mode: 'editar', produto: p })}
                >
                  <PencilIcon />
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  title="Excluir"
                  style={{ flexShrink: 0, padding: '5px 7px', display: 'flex', color: 'var(--danger)', border: '1px solid var(--border)' }}
                  onClick={() => excluirProduto(p)}
                >
                  <XIcon />
                </button>
              </div>

              <div className="dashboard-metric" style={{ marginTop: 10 }}>
                <span>Lucro unitário</span>
                <strong>{fmtMoeda(derived.lucroUnitario)}</strong>
              </div>
              <div className="dashboard-metric">
                <span>Markup obtido</span>
                <strong>{fmtPercent(derived.markupObtido)}</strong>
              </div>
              <div className="dashboard-metric">
                <span>Margem obtida</span>
                <strong>{fmtPercent(derived.margemObtida)}</strong>
              </div>

              <div className="list-item-actions" style={{ marginTop: 10 }}>
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

      <Lightbox src={fotoAmpliada} alt="Foto do produto" onClose={() => setFotoAmpliada(null)} />
    </div>
  )
}
