export default function Header({ operatorName, connectionStatus, onRefresh, onLogout, onChangeName }) {
  return <header className="app-header">
    <div><small>Airside Operations</small><h1>Vliegbasis Eindhoven</h1></div>
    <div className="header-tools">
      <div className={`live-status ${connectionStatus}`}><span />{connectionStatus === 'live' ? 'Live' : 'Verbinden'}</div>
      <div className="operator-menu"><strong>👤 {operatorName}</strong><button onClick={onChangeName}>Naam wijzigen</button><button onClick={onLogout}>Afmelden</button></div>
      <button className="refresh-button" onClick={onRefresh}>↻ Verversen</button>
    </div>
  </header>
}
