import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { custoTotalProduto, markupProduto, precoMinimo, precoRecomendado, fmtMoeda } from '../lib/calc'
import CategoriasManager from './CategoriasManager'

const BLANK = {
  sku: '',
  nome: '',
  categoria: '',
  tecido: '',
  cor: '',
  tamanho: '',
  fornecedor: '',
  data_compra: new Date().toISOString().slice(0, 10),
  qtd_comprada: 1,
  custo_unitario: '',
  frete: 0,
  outros_custos: 0,
  markup_manual: '',
  preco_venda: '',
  estoque_minimo: 3,
  ajuste_estoque: 0,
}

// mode: 'novo' | 'editar' | 'duplicar'
export default function ProdutoForm({ mode, produto, onClose, onSaved }) {
  const initial =
    mode === 'novo'
      ? BLANK
      : {
          ...BLANK,
          ...produto,
          id: mode === 'editar' ? produto.id : undefined,
          sku: mode === 'duplicar' ? '' : produto.sku,
          markup_manual: produto.markup_manual != null ? produto.markup_manual * 100 : '',
        }

  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [precoVendaTouched, setPrecoVendaTouched] = useState(mode !== 'novo')
  const [categorias, setCategorias] = useState([])
  const [showCategoriasManager, setShowCategoriasManager] = useState(false)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(mode === 'duplicar' ? null : produto?.foto_url || null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const arquivoInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  async function loadCategorias() {
    const { data, error } = await supabase.from('categorias').select('*').order('nome')
    if (error) {
      setError(error.message)
      return
    }
    setCategorias(data || [])
    if (mode === 'novo' && !form.categoria && data?.length) {
      set('categoria', data[0].nome)
    }
  }

  useEffect(() => {
    loadCategorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function onFotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setRemoverFoto(false)
    setFotoPreview(URL.createObjectURL(file))
  }

  function onRemoverFoto() {
    setFotoFile(null)
    setFotoPreview(null)
    setRemoverFoto(true)
  }

  const markupPadraoPorCategoria = Object.fromEntries(categorias.map((c) => [c.nome, c.markup_padrao]))

  const preview = (() => {
    const custoTotal = custoTotalProduto({
      custo_unitario: Number(form.custo_unitario) || 0,
      frete: Number(form.frete) || 0,
      outros_custos: Number(form.outros_custos) || 0,
      qtd_comprada: Number(form.qtd_comprada) || 1,
    })
    const markup = markupProduto(
      {
        markup_manual: form.markup_manual === '' ? null : Number(form.markup_manual) / 100,
        categoria: form.categoria,
      },
      markupPadraoPorCategoria
    )
    return {
      custoTotal,
      precoMinimo: precoMinimo(custoTotal),
      precoRecomendado: precoRecomendado(custoTotal, markup),
    }
  })()

  useEffect(() => {
    if (precoVendaTouched) return
    setForm((f) => ({ ...f, preco_venda: preview.precoRecomendado.toFixed(2) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.precoRecomendado, precoVendaTouched])

  function usarPrecoRecomendado() {
    setPrecoVendaTouched(false)
    set('preco_venda', preview.precoRecomendado.toFixed(2))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    let fotoUrl = mode === 'duplicar' ? null : produto?.foto_url || null
    if (removerFoto) fotoUrl = null

    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('produtos').upload(path, fotoFile)
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
      fotoUrl = supabase.storage.from('produtos').getPublicUrl(path).data.publicUrl
    }

    const payload = {
      sku: form.sku.trim(),
      nome: form.nome.trim(),
      categoria: form.categoria,
      tecido: form.tecido || null,
      cor: form.cor || null,
      tamanho: form.tamanho || null,
      fornecedor: form.fornecedor || null,
      data_compra: form.data_compra || null,
      qtd_comprada: Number(form.qtd_comprada) || 0,
      custo_unitario: Number(form.custo_unitario) || 0,
      frete: Number(form.frete) || 0,
      outros_custos: Number(form.outros_custos) || 0,
      markup_manual: form.markup_manual === '' ? null : Number(form.markup_manual) / 100,
      preco_venda: Number(form.preco_venda) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 0,
      ajuste_estoque: Number(form.ajuste_estoque) || 0,
      foto_url: fotoUrl,
    }

    let result
    if (mode === 'editar') {
      result = await supabase.from('produtos').update(payload).eq('id', form.id)
    } else {
      result = await supabase.from('produtos').insert(payload)
    }

    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    onSaved()
  }

  const title = mode === 'novo' ? 'Novo produto' : mode === 'duplicar' ? 'Duplicar produto' : 'Editar produto'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {mode === 'duplicar' && (
          <div className="hint">Confira o tamanho/cor e o SKU — o resto foi copiado do produto original.</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Foto (opcional)</label>
            {fotoPreview && (
              <img
                src={fotoPreview}
                alt="Prévia do produto"
                style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: 8, border: '1px solid var(--border)' }}
              />
            )}
            <input
              ref={arquivoInputRef}
              type="file"
              accept="image/*"
              onChange={onFotoChange}
              style={{ display: 'none' }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFotoChange}
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm" onClick={() => cameraInputRef.current?.click()}>
                📷 Tirar foto
              </button>
              <button type="button" className="btn btn-sm" onClick={() => arquivoInputRef.current?.click()}>
                📁 Escolher arquivo
              </button>
              {fotoPreview && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={onRemoverFoto}>
                  Remover
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label>Nome</label>
            <input required value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>SKU</label>
              <input required value={form.sku} onChange={(e) => set('sku', e.target.value)} autoFocus={mode === 'duplicar'} />
            </div>
            <div className="field">
              <label>
                Categoria{' '}
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 4px' }} onClick={() => setShowCategoriasManager(true)}>
                  gerenciar
                </button>
              </label>
              <select required value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                {form.categoria === '' && <option value="">Selecione...</option>}
                {categorias.map((c) => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Cor</label>
              <input value={form.cor} onChange={(e) => set('cor', e.target.value)} />
            </div>
            <div className="field">
              <label>Tamanho</label>
              <input value={form.tamanho} onChange={(e) => set('tamanho', e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Tecido</label>
            <input value={form.tecido} onChange={(e) => set('tecido', e.target.value)} />
          </div>

          <div className="field">
            <label>Fornecedor (opcional)</label>
            <input value={form.fornecedor} onChange={(e) => set('fornecedor', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Data da compra</label>
              <input type="date" value={form.data_compra || ''} onChange={(e) => set('data_compra', e.target.value)} />
            </div>
            <div className="field">
              <label>Qtd. comprada</label>
              <input type="number" min="0" value={form.qtd_comprada} onChange={(e) => set('qtd_comprada', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Custo unitário</label>
              <input type="number" step="0.01" min="0" value={form.custo_unitario} onChange={(e) => set('custo_unitario', e.target.value)} />
            </div>
            <div className="field">
              <label>Frete (total)</label>
              <input type="number" step="0.01" min="0" value={form.frete} onChange={(e) => set('frete', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Outros custos (total)</label>
              <input type="number" step="0.01" min="0" value={form.outros_custos} onChange={(e) => set('outros_custos', e.target.value)} />
            </div>
            <div className="field">
              <label>Markup manual % (opcional)</label>
              <input type="number" step="1" min="0" placeholder="usa o da categoria" value={form.markup_manual} onChange={(e) => set('markup_manual', e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="dashboard-metric"><span>Custo total</span><strong>{fmtMoeda(preview.custoTotal)}</strong></div>
            <div className="dashboard-metric"><span>Preço mínimo (margem 35%)</span><strong>{fmtMoeda(preview.precoMinimo)}</strong></div>
            <div className="dashboard-metric"><span>Preço recomendado</span><strong>{fmtMoeda(preview.precoRecomendado)}</strong></div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>
                Preço de venda{' '}
                {precoVendaTouched && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 4px' }} onClick={usarPrecoRecomendado}>
                    usar recomendado
                  </button>
                )}
              </label>
              <input required type="number" step="0.01" min="0" value={form.preco_venda} onChange={(e) => { setPrecoVendaTouched(true); set('preco_venda', e.target.value) }} />
            </div>
            <div className="field">
              <label>Estoque mínimo</label>
              <input type="number" min="0" value={form.estoque_minimo} onChange={(e) => set('estoque_minimo', e.target.value)} />
            </div>
          </div>
          {!precoVendaTouched && (
            <div className="hint" style={{ marginTop: -8 }}>Calculado automaticamente a partir do custo + markup.</div>
          )}

          {mode === 'editar' && (
            <div className="field">
              <label>Ajuste de estoque (perda/erro de contagem)</label>
              <input type="number" value={form.ajuste_estoque} onChange={(e) => set('ajuste_estoque', e.target.value)} />
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>

        {showCategoriasManager && (
          <CategoriasManager onClose={() => setShowCategoriasManager(false)} onChanged={loadCategorias} />
        )}
      </div>
    </div>
  )
}
