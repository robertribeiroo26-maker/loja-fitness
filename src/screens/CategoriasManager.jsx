import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CategoriasManager({ onClose, onChanged }) {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [editMarkup, setEditMarkup] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoMarkup, setNovoMarkup] = useState('100')
  const [saving, setSaving] = useState(false)
  const mudouRef = useRef(false)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('categorias').select('*').order('nome')
    if (error) setError(error.message)
    else setCategorias(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function fechar() {
    onClose()
    if (mudouRef.current) onChanged()
  }

  async function adicionar(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('categorias').insert({
      nome: novoNome.trim(),
      markup_padrao: (Number(novoMarkup) || 0) / 100,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    mudouRef.current = true
    setNovoNome('')
    setNovoMarkup('100')
    load()
  }

  function iniciarEdicao(cat) {
    setEditingId(cat.id)
    setEditNome(cat.nome)
    setEditMarkup(String(cat.markup_padrao * 100))
  }

  async function salvarEdicao(cat) {
    setSaving(true)
    setError(null)
    const nomeNovo = editNome.trim()

    if (nomeNovo !== cat.nome) {
      const { error: cascadeError } = await supabase
        .from('produtos')
        .update({ categoria: nomeNovo })
        .eq('categoria', cat.nome)
      if (cascadeError) {
        setSaving(false)
        setError(cascadeError.message)
        return
      }
    }

    const { error } = await supabase
      .from('categorias')
      .update({ nome: nomeNovo, markup_padrao: (Number(editMarkup) || 0) / 100 })
      .eq('id', cat.id)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    mudouRef.current = true
    setEditingId(null)
    load()
  }

  async function excluir(cat) {
    const { count } = await supabase
      .from('produtos')
      .select('id', { count: 'exact', head: true })
      .eq('categoria', cat.nome)

    const aviso =
      count > 0
        ? `"${cat.nome}" está em uso em ${count} produto(s). Eles vão manter o nome da categoria, mas ela deixará de ter markup padrão. Excluir mesmo assim?`
        : `Excluir a categoria "${cat.nome}"?`
    if (!window.confirm(aviso)) return

    setError(null)
    const { error } = await supabase.from('categorias').delete().eq('id', cat.id)
    if (error) {
      setError(error.message)
      return
    }
    mudouRef.current = true
    load()
  }

  return (
    <div className="modal-overlay" onClick={fechar}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <h2>Categorias</h2>
          <button className="btn btn-ghost" onClick={fechar}>✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading && <div className="empty-state">Carregando...</div>}

        {!loading &&
          categorias.map((cat) => (
            <div className="list-item" key={cat.id}>
              {editingId === cat.id ? (
                <>
                  <div className="list-item-main">
                    <input value={editNome} onChange={(e) => setEditNome(e.target.value)} style={{ marginBottom: 6, width: '100%' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" step="1" min="0" value={editMarkup} onChange={(e) => setEditMarkup(e.target.value)} style={{ width: 70 }} />
                      <span className="hint" style={{ margin: 0 }}>% markup</span>
                    </div>
                  </div>
                  <div className="list-item-actions">
                    <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => salvarEdicao(cat)}>
                      Salvar
                    </button>
                    <button className="btn btn-sm" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="list-item-main">
                    <div className="list-item-title">{cat.nome}</div>
                    <div className="list-item-sub">markup padrão: {(cat.markup_padrao * 100).toFixed(0)}%</div>
                  </div>
                  <div className="list-item-actions">
                    <button className="btn btn-sm" onClick={() => iniciarEdicao(cat)}>
                      Editar
                    </button>
                    <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => excluir(cat)}>
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

        <form onSubmit={adicionar} className="card" style={{ marginTop: 12 }}>
          <div className="field-row">
            <div className="field">
              <label>Nova categoria</label>
              <input required value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="ex: Meia" />
            </div>
            <div className="field" style={{ maxWidth: 100 }}>
              <label>Markup %</label>
              <input type="number" step="1" min="0" required value={novoMarkup} onChange={(e) => setNovoMarkup(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            + Adicionar categoria
          </button>
        </form>
      </div>
    </div>
  )
}
