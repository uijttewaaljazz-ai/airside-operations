const CARDS = [
  {
    key: 'open',
    label: 'Open',
    icon: '●',
    className: 'open',
  },
  {
    key: 'in_behandeling',
    label: 'In behandeling',
    icon: '●',
    className: 'handling',
  },
  {
    key: 'urgent',
    label: 'Spoed',
    icon: '▲',
    className: 'urgent',
  },
  {
    key: 'verwijderd',
    label: 'Verwijderd',
    icon: '■',
    className: 'archived',
  },
  {
    key: 'alle',
    label: 'Alles',
    icon: '◆',
    className: 'all',
  },
]

export default function Dashboard({
  stats,
  activeView,
  filters,
  onViewChange,
  onFiltersChange,
}) {
  function updateFilter(name, value) {
    onFiltersChange({
      ...filters,
      [name]: value,
    })
  }

  return (
    <aside className="dashboard-panel">
      <div className="dashboard-heading">
        <small>Operationeel overzicht</small>
        <h2>Dashboard</h2>
      </div>

      <div className="dashboard-cards">
        {CARDS.map((card) => {
          const amount =
            card.key === 'in_behandeling'
              ? stats.handling
              : card.key === 'verwijderd'
                ? stats.archived
                : card.key === 'alle'
                  ? stats.total
                  : stats[card.key]

          return (
            <button
              type="button"
              key={card.key}
              className={[
                'dashboard-card',
                card.className,
                activeView === card.key ? 'active' : '',
              ].join(' ')}
              onClick={() => onViewChange(card.key)}
            >
              <span className="dashboard-card-icon">
                {card.icon}
              </span>

              <span className="dashboard-card-copy">
                <span>{card.label}</span>
                <strong>{amount}</strong>
              </span>
            </button>
          )
        })}
      </div>

      <div className="filters-heading">
        <h3>Filters</h3>

        <button
          type="button"
          className="reset-filters"
          onClick={() =>
            onFiltersChange({
              search: '',
              category: 'alle',
              status: 'actief',
              urgent: false,
            })
          }
        >
          Wissen
        </button>
      </div>

      <label className="filter-field">
        <span>Zoeken</span>
        <input
          type="search"
          value={filters.search}
          placeholder="Naam, omschrijving of operator"
          onChange={(event) =>
            updateFilter('search', event.target.value)
          }
        />
      </label>

      <label className="filter-field">
        <span>Categorie</span>
        <select
          value={filters.category}
          onChange={(event) =>
            updateFilter('category', event.target.value)
          }
        >
          <option value="alle">Alle categorieën</option>
          <option value="schade">Schade</option>
          <option value="afsluiting">Afsluiting</option>
          <option value="werkzaamheden">Werkzaamheden</option>
          <option value="overig">Overig</option>
        </select>
      </label>

      <label className="filter-field">
        <span>Status</span>
        <select
          value={filters.status}
          onChange={(event) =>
            updateFilter('status', event.target.value)
          }
        >
          <option value="actief">Actieve meldingen</option>
          <option value="open">Open</option>
          <option value="in_behandeling">
            In behandeling
          </option>
          <option value="verwijderd">Verwijderd</option>
          <option value="alle">Alles tonen</option>
        </select>
      </label>

      <label className="urgent-filter">
        <input
          type="checkbox"
          checked={filters.urgent}
          onChange={(event) =>
            updateFilter('urgent', event.target.checked)
          }
        />

        <span>
          <strong>Alleen spoed</strong>
          <small>Toon uitsluitend urgente meldingen</small>
        </span>
      </label>
    </aside>
  )
}