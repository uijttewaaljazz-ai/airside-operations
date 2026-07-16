import { useMemo } from 'react'
import { markerColor, normalizePhotos, statusLabel } from '../utils/incident.js'

export default function Dashboard({ points, view, setView, filters, setFilters, onOpenPoint }) {
  const stats = useMemo(() => ({
    open: points.filter(p => p.status === 'open').length,
    handling: points.filter(p => p.status === 'in_behandeling').length,
    urgent: points.filter(p => p.urgent === 'ja' && p.status !== 'verwijderd').length,
    archived: points.filter(p => p.status === 'verwijderd').length,
    all: points.length,
  }), [points])

  const cards = [
    ['open', 'Open', stats.open],
    ['in_behandeling', 'In behandeling', stats.handling],
    ['urgent', 'Spoed', stats.urgent],
    ['verwijderd', 'Verwijderd', stats.archived],
    ['alle', 'Alles', stats.all],
  ]

  const list = points.filter(point => {
    if (view === 'open') return point.status === 'open'
    if (view === 'in_behandeling') return point.status === 'in_behandeling'
    if (view === 'urgent') return point.urgent === 'ja' && point.status !== 'verwijderd'
    if (view === 'verwijderd') return point.status === 'verwijderd'
    return true
  })

  return <aside className="dashboard-panel">
    <div className="dashboard-heading"><small>Operationeel overzicht</small><h2>Dashboard</h2></div>
    <div className="dashboard-cards">
      {cards.map(([key, label, amount]) => <button key={key} className={`dashboard-card ${key} ${view === key ? 'active' : ''}`} onClick={() => setView(key)}><span>{label}</span><strong>{amount}</strong></button>)}
    </div>

    <div className="incident-list-head"><h3>{cards.find(card => card[0] === view)?.[1]}</h3><span>{list.length} meldingen</span></div>
    <div className="incident-list">
      {list.length ? list.map(point => <button key={point.id} className="incident-row" onClick={() => onOpenPoint(point)}>
        <span className="incident-dot" style={{ background: markerColor(point) }} />
        <span className="incident-copy"><strong>{point.title}</strong><small>{statusLabel(point)} · {normalizePhotos(point).length} foto('s){point.added_by ? ` · ${point.added_by}` : ''}</small></span>
        <span className="row-arrow">›</span>
      </button>) : <p className="empty-list">Geen meldingen in dit overzicht.</p>}
    </div>

    <div className="filter-title"><h3>Filters</h3><button onClick={() => setFilters({ search: '', category: 'alle' })}>Wissen</button></div>
    <label>Zoeken<input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="Naam, omschrijving of operator" /></label>
    <label>Categorie<select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}><option value="alle">Alle</option><option value="schade">Schade</option><option value="afsluiting">Afsluiting</option><option value="werkzaamheden">Werkzaamheden</option><option value="overig">Overig</option></select></label>
  </aside>
}
