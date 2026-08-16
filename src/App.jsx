import { useState } from 'react'
import Produtos from './screens/Produtos'
import Vender from './screens/Vender'
import Dashboard from './screens/Dashboard'
import './App.css'

const TABS = [
  { id: 'vender', label: 'Vender', icon: '💰' },
  { id: 'produtos', label: 'Produtos', icon: '👕' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
]

function App() {
  const [tab, setTab] = useState('vender')

  return (
    <div className="app">
      <header className="app-header">
        <h1>Loja Fitness</h1>
      </header>

      <main className="app-main">
        {tab === 'produtos' && <Produtos />}
        {tab === 'vender' && <Vender />}
        {tab === 'dashboard' && <Dashboard />}
      </main>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
