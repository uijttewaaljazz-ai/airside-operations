import { useMemo } from 'react'
import { markerColor, normalizePhotos, statusLabel } from '../utils/incident.js'

export default function Dashboard({ points, view, setView, filters, setFilters, onOpenPoint }) {
  const stats = useMemo(() => ({
    open: points.filter(p => p.status === 'open').length,
    urgent: points.filter(p => p.urgent === 'ja' && p.status !== 'verwijderd').length,
    damage: points.filter(p => p.category === 'schade' && p.status !== 'verwijderd').length,
    closure: points.filter(p => p.category === 'afsluiting' && p.status !== 'verwijderd').length,
    handling: points.filter(p => p.status === 'in_behandeling').length,
    archived: points.filter(p => p.status === 'verwijderd').length,
    all: points.length,
  }), [points])

  const topCards = [
    ['open', 'Open', stats.open, 'alle'],
    ['urgent', 'Spoed', stats.urgent, 'alle'],
    ['schade', 'Schade', stats.damage, 'schade'],
    ['afsluiting', 'Afsluiting', stats.closure, 'afsluiting'],
  ]

  const bottomCards = [
    ['verwijderd', 'Verwijderd', stats.archived],
    ['alle', 'Alles', stats.all],
    ['in_behandeling', 'In behandeling', stats.handling],
  ]

  const list = points.filter(point => {
    const viewOkay =
      view === 'open' ? point.status === 'open' :
      view === 'in_behandeling' ? point.status === 'in_behandeling' :
      view === 'urgent' ? point.urgent === 'ja' && point.status !== 'verwijderd' :
      view === 'verwijderd' ? point.status === 'verwijderd' :
      view === 'alle' && (filters.category === 'schade' || filters.category === 'afsluiting')
        ? point.status !== 'verwijderd' :
      true

    const categoryOkay = filters.category === 'alle' || point.category === filters.category
    const search = filters.search.toLowerCase().trim()
    const searchOkay = !search || `${point.title || ''} ${point.notes || ''} ${point.added_by || ''}`.toLowerCase().includes(search)

    return viewOkay && categoryOkay && searchOkay
  })

  const activeTopCard = topCards.find(([key, , , category]) =>
    (key === 'schade' || key === 'afsluiting')
      ? view === 'alle' && filters.category === category
      : view === key && filters.category === 'alle'
  )

  const activeBottomCard = bottomCards.find(([key]) => view === key && filters.category === 'alle')
  const currentLabel = activeTopCard?.[1] || activeBottomCard?.[1] || 'Meldingen'

  function selectTopCard(key, category) {
    if (key === 'schade' || key === 'afsluiting') {
      setView('alle')
      setFilters({ ...filters, category })
      return
    }

    setView(key)
    setFilters({ ...filters, category: 'alle' })
  }

  function selectBottomCard(key) {
    setView(key)
    setFilters({ ...filters, category: 'alle' })
  }

  return <aside className="dashboard-panel">
    <div className="dashboard-heading"><small>Operationeel overzicht</small><h2>Dashboard</h2></div>

    <div className="dashboard-cards">
      {topCards.map(([key, label, amount, category]) => {
        const active = (key === 'schade' || key === 'afsluiting')
          ? view === 'alle' && filters.category === category
          : view === key && filters.category === 'alle'

        return <button key={key} className={`dashboard-card ${key} ${active ? 'active' : ''}`} onClick={() => selectTopCard(key, category)}><span>{label}</span><strong>{amount}</strong></button>
      })}
    </div>

    <div className="incident-list-head"><h3>{currentLabel}</h3><span>{list.length} meldingen</span></div>
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

    <div className="dashboard-cards dashboard-cards-secondary">
      {bottomCards.map(([key, label, amount]) => <button key={key} className={`dashboard-card ${key} ${view === key && filters.category === 'alle' ? 'active' : ''}`} onClick={() => selectBottomCard(key)}><span>{label}</span><strong>{amount}</strong></button>)}
    </div>
  </aside>
}
