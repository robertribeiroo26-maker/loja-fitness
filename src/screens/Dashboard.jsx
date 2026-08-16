import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { custoTotalProduto, produtoDerivado, vendaDerivada, fmtMoeda, fmtPercent } from '../lib/calc'

function toISODate(d) {
  return d.toISOString().slice(0, 10)
}

function diasAtras(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

function inicioDoMes() {
  const d = new Date()
  d.setDate(1)
  return toISODate(d)
}

export default function Dashboard() {
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [vendidoPorProduto, setVendidoPorProduto] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDespesaForm, setShowDespesaForm] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const [produtosRes, vendasRes, despesasRes] = await Promise.all([
      supabase.from('produtos').select('*'),
      supabase.from('vendas').select('*').order('data', { ascending: false }),
      supabase.from('despesas').select('*').order('data', { ascending: false }),
    ]);

    if (produtosRes.error || vendasRes.error || despesasRes.error) {
      setError((produtosRes.error || vendasRes.error || despesasRes.error).message);
      setLoading(false);
      return;
    }

    const vendidoMap = {};
    for (const v of vendasRes.data || []) {
      const sinal = v.tipo_movimento === 'Devolução' ? -1 : 1;
      vendidoMap[v.produto_id] = (vendidoMap[v.produto_id] || 0) + v.quantidade * sinal;
    }

    setProdutos(produtosRes.data || []);
    setVendas(vendasRes.data || []);
    setDespesas(despesasRes.data || []);
    setVendidoPorProduto(vendidoMap);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const produtoMap = Object.fromEntries(produtos.map((p) => [p.id, p]));

  function metricasPeriodo(desde) {
    const vendasPeriodo = vendas.filter((v) => v.data >= desde);
    let faturamento = 0;
    let lucro = 0;
    let pecas = 0;
    for (const v of vendasPeriodo) {
      const produto = produtoMap[v.produto_id];
      if (!produto) continue;
      const custoUnitario = custoTotalProduto(produto);
      const d = vendaDerivada(v, custoUnitario);
      faturamento += d.faturamento;
      lucro += d.lucro;
      pecas += v.quantidade * (v.tipo_movimento === 'Devolução' ? -1 : 1);
    }
    const margem = faturamento ? lucro / faturamento : 0;
    const despesasPeriodo = despesas
      .filter((d) => d.data >= desde)
      .reduce((acc, d) => acc + Number(d.valor || 0), 0);
    return { faturamento, lucro, pecas, margem, despesasPeriodo, lucroLiquido: lucro - despesasPeriodo };
  }

  const hoje = metricasPeriodo(toISODate(new Date()));
  const semana = metricasPeriodo(diasAtras(6));
  const mes = metricasPeriodo(inicioDoMes());

  const produtosBaixoEstoque = produtos
    .map((p) => ({ produto: p, derived: produtoDerivado(p, vendidoPorProduto[p.id] || 0) }))
    .filter((x) => x.derived.estoqueBaixo);

  async function lancarDespesa(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      data: form.data.value,
      categoria: form.categoria.value || null,
      descricao: form.descricao.value || null,
      valor: Number(form.valor.value) || 0,
    };
    const { error } = await supabase.from('despesas').insert(payload);
    if (error) {
      setError(error.message);
      return;
    }
    setShowDespesaForm(false);
    load();
  }

  if (loading) return <div className="empty-state">Carregando...</div>;

  return (
    <div>
      <div className="screen-header">
        <h2>Dashboard</h2>
        <button className="btn btn-sm" onClick={() => setShowDespesaForm(true)}>+ Lançar despesa</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-cards">
        <CardPeriodo titulo="Hoje" m={hoje} comLiquido={false} />
        <CardPeriodo titulo="Semana" m={semana} comLiquido={true} />
        <CardPeriodo titulo="Mês" m={mes} comLiquido={true} />
      </div>

      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Estoque baixo</h3>
      {produtosBaixoEstoque.length === 0 && (
        <div className="empty-state">Nenhum produto com estoque baixo.</div>
      )}
      {produtosBaixoEstoque.map(({ produto, derived }) => (
        <div className="list-item" key={produto.id}>
          <div className="list-item-main">
            <div className="list-item-title">{produto.nome}</div>
            <div className="list-item-sub">{produto.sku}</div>
          </div>
          <span className="badge badge-baixo">estoque: {derived.estoqueAtual}</span>
        </div>
      ))}

      {showDespesaForm && (
        <div className="modal-overlay" onClick={() => setShowDespesaForm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <h2>Lançar despesa</h2>
              <button className="btn btn-ghost" onClick={() => setShowDespesaForm(false)}>✕</button>
            </div>
            <form onSubmit={lancarDespesa}>
              <div className="field">
                <label>Data</label>
                <input name="data" type="date" defaultValue={toISODate(new Date())} required />
              </div>
              <div className="field">
                <label>Categoria</label>
                <input name="categoria" placeholder="Aluguel, embalagem, marketing..." />
              </div>
              <div className="field">
                <label>Descrição</label>
                <input name="descricao" />
              </div>
              <div className="field">
                <label>Valor</label>
                <input name="valor" type="number" step="0.01" min="0" required />
              </div>
              <button className="btn btn-primary btn-block" type="submit">Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CardPeriodo({ titulo, m, comLiquido }) {
  return (
    <div className="dashboard-card">
      <h3>{titulo}</h3>
      <div className="dashboard-metric"><span>Fatur.</span><strong>{fmtMoeda(m.faturamento)}</strong></div>
      <div className="dashboard-metric"><span>Peças</span><strong>{m.pecas}</strong></div>
      <div className="dashboard-metric"><span>Lucro bruto</span><strong>{fmtMoeda(m.lucro)}</strong></div>
      <div className="dashboard-metric"><span>Margem</span><strong>{fmtPercent(m.margem)}</strong></div>
      {comLiquido && (
        <div className="dashboard-metric"><span>Lucro líq.</span><strong>{fmtMoeda(m.lucroLiquido)}</strong></div>
      )}
    </div>
  );
}
