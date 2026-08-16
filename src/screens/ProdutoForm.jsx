import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CATEGORIAS } from '../lib/config'
import { custoTotalProduto, markupProduto, precoMinimo, precoRecomendado, fmtMoeda } from '../lib/calc'

const BLANK = {
  sku: '',
  nome: '',
  categoria: CATEGORIAS[0],
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
          markup_manual: produto.markup_manual ?? '',
        }

  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const preview = (() => {
    const custoTotal = custoTotalProduto({
      custo_unitario: Number(form.custo_unitario) || 0,
      frete: Number(form.frete) || 0,
      outros_custos: Number(form.outros_custos) || 0,
      qtd_comprada: Number(form.qtd_comprada) || 1,
    })
    const markup = markupProduto({
      markup_manual: form.markup_manual === '' ? null : Number(form.markup_manual),
      categoria: form.categoria,
    })
    return {
      custoTotal,
      precoMinimo: precoMinimo(custoTotal),
      precoRecomendado: precoRecomendado(custoTotal, markup),
    }
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

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
      markup_manual: form.markup_manual === '' ? null : Number(form.markup_manual),
      preco_venda: Number(form.preco_venda) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 0,
      ajuste_estoque: Number(form.ajuste_estoque) || 0,
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
            <label>Nome</label>
            <input required value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label>SKU</label>
              <input required value={form.sku} onChange={(e) => set('sku', e.target.value)} autoFocus={mode === 'duplicar'} />
            </div>
            <div className="field">
              <label>Categoria</label>
              <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
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
              <label>Markup manual (opcional)</label>
              <input type="number" step="0.01" min="0" placeholder="usa o da categoria" value={form.markup_manual} onChange={(e) => set('markup_manual', e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="dashboard-metric"><span>Custo total</span><strong>{fmtMoeda(preview.custoTotal)}</strong></div>
            <div className="dashboard-metric"><span>Preço mínimo (margem 35%)</span><strong>{fmtMoeda(preview.precoMinimo)}</strong></div>
            <div className="dashboard-metric"><span>Preço recomendado</span><strong>{fmtMoeda(preview.precoRecomendado)}</strong></div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Preço de venda</label>
              <input required type="number" step="0.01" min="0" value={form.preco_venda} onChange={(e) => set('preco_venda', e.target.value)} />
            </div>
            <div className="field">
              <label>Estoque mínimo</label>
              <input type="number" min="0" value={form.estoque_minimo} onChange={(e) => set('estoque_minimo', e.target.value)} />
            </div>
          </div>

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
      </div>
    </div>
  )
}
