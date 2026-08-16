import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { XIcon } from '../lib/icons'

export default function TiposManager({ onClose, onChanged }) {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [saving, setSaving] = useState(false)
  const mudouRef = useRef(false)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('tipos').select('*').order('nome')
    if (error) setError(error.message)
    else setTipos(data || [])
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
    const { error } = await supabase.from('tipos').insert({ nome: novoNome.trim() })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    mudouRef.current = true
    setNovoNome('')
    load()
  }

  function iniciarEdicao(tipo) {
    setEditingId(tipo.id)
    setEditNome(tipo.nome)
  }

  async function salvarEdicao(tipo) {
    setSaving(true)
    setError(null)
    const nomeNovo = editNome.trim()

    if (nomeNovo !== tipo.nome) {
      const { error: cascadeError } = await supabase
        .from('produtos')
        .update({ tipo: nomeNovo })
        .eq('tipo', tipo.nome)
      if (cascadeError) {
        setSaving(false)
        setError(cascadeError.message)
        return
      }
    }

    const { error } = await supabase.from('tipos').update({ nome: nomeNovo }).eq('id', tipo.id)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    mudouRef.current = true
    setEditingId(null)
    load()
  }

  async function excluir(tipo) {
    const { count } = await supabase
      .from('produtos')
      .select('id', { count: 'exact', head: true })
      .eq('tipo', tipo.nome)

    const aviso =
      count > 0
        ? `"${tipo.nome}" está em uso em ${count} produto(s). Eles vão manter o nome, mas o tipo deixará de existir na lista. Excluir mesmo assim?`
        : `Excluir o tipo "${tipo.nome}"?`
    if (!window.confirm(aviso)) return

    setError(null)
    const { error } = await supabase.from('tipos').delete().eq('id', tipo.id)
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
          <h2>Tipos (comprimento)</h2>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            title="Fechar"
            style={{ padding: '5px 7px', display: 'flex', border: '1px solid var(--border)' }}
            onClick={fechar}
          >
            <XIcon />
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loading && <div className="empty-state">Carregando...</div>}

        {!loading && tipos.length === 0 && (
          <div className="empty-state">Nenhum tipo cadastrado ainda. Ex: curto, pedal, longo, médio.</div>
        )}

        {!loading &&
          tipos.map((tipo) => (
            <div className="list-item" key={tipo.id}>
              {editingId === tipo.id ? (
                <>
                  <div className="list-item-main">
                    <input value={editNome} onChange={(e) => setEditNome(e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div className="list-item-actions">
                    <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => salvarEdicao(tipo)}>
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
                    <div className="list-item-title">{tipo.nome}</div>
                  </div>
                  <div className="list-item-actions">
                    <button className="btn btn-sm" onClick={() => iniciarEdicao(tipo)}>
                      Editar
                    </button>
                    <button className="btn btn-sm" style={{ color: 'var(--danger)' }} onClick={() => excluir(tipo)}>
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

        <form onSubmit={adicionar} className="card" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Novo tipo</label>
            <input required value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="ex: Pedal" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            + Adicionar tipo
          </button>
        </form>
      </div>
    </div>
  )
}
