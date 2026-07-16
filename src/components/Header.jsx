export default function Header({
  operatorName,
  connectionStatus,
  onRefresh,
  onLogout,
  onChangeName,
}) {
  return (
    <header className="header-v1">
      <div className="header-left">
        <small>AIRSIDE OPERATIONS</small>
        <h1>Vliegbasis Eindhoven</h1>
      </div>

      <div className="header-right">

        <div className={`status-pill ${connectionStatus}`}>
          <span />
          {connectionStatus === "live"
            ? "LIVE"
            : "VERBINDEN"}
        </div>

        <div className="operator-card">
          <div>
            <small>Operator</small>
            <strong>{operatorName}</strong>
          </div>

          <button onClick={onChangeName}>
            Naam wijzigen
          </button>
        </div>

        <button
          className="header-button"
          onClick={onRefresh}
        >
          ↻
        </button>

        <button
          className="header-button danger"
          onClick={onLogout}
        >
          Afmelden
        </button>

      </div>
    </header>
  )
}