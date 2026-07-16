import { useMemo, useState } from 'react'
import './App.css'
import { supabase } from './services/supabase.js'
import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'
import MapView from './components/MapView.jsx'
import { useRealtimePoints } from './hooks/useRealtime.js'
import { normalizePhotos } from './utils/incident.js'

const APP_USERNAME = 'airside'
const APP_PASSWORD = 'Airside2026!'
const SESSION_KEY = 'airside_shared_session'
const OPERATOR_KEY = 'airside_operator_name'

function AccessScreen({ savedName, onAccess }) {
  const [step, setStep] = useState('login')
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [name, setName] = useState(savedName || '')
  const [message, setMessage] = useState('')

  function login(event) {
    event.preventDefault()
    setMessage('')
    if (credentials.username.trim().toLowerCase() !== APP_USERNAME || credentials.password !== APP_PASSWORD) {
      setMessage('Gebruikersnaam of wachtwoord is niet juist.')
      return
    }
    if (savedName) onAccess(savedName)
    else setStep('name')
  }

  function saveName(event) {
    event.preventDefault()
    const cleanName = name.trim()
    if (cleanName.length < 2) return setMessage('Vul je eigen naam in.')
    onAccess(cleanName)
  }

  return <main className="access-page"><section className="access-card">
    <div className="access-emblem">✈</div><small>AIRSIDE OPERATIONS</small><h1>Vliegbasis Eindhoven</h1>
    <p className="access-intro">Beveiligde toegang tot het operationele meldingssysteem.</p>
    {step === 'login' ? <form onSubmit={login}>
      <label>Gebruikersnaam<input value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} autoComplete="username" autoFocus /></label>
      <label>Wachtwoord<input type="password" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} autoComplete="current-password" /></label>
      {savedName && <p className="remembered-name">Dit toestel is ingesteld voor <strong>{savedName}</strong>.</p>}
      {message && <p className="access-message">{message}</p>}
      <button className="access-primary" type="submit">Inloggen</button>
    </form> : <form onSubmit={saveName}>
      <h2>Wie gebruikt dit toestel?</h2><p className="access-intro">Deze naam wordt automatisch bij nieuwe meldingen opgeslagen.</p>
      <label>Jouw naam<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" autoFocus /></label>
      {message && <p className="access-message">{message}</p>}
      <button className="access-primary" type="submit">Naam opslaan en doorgaan</button>
    </form>}
  </section></main>
}

function NameDialog({ currentName, onSave, onClose }) {
  const [name, setName] = useState(currentName)
  return <div className="overlay" onMouseDown={onClose}><form className="name-dialog" onSubmit={e => { e.preventDefault(); const n = name.trim(); if (n.length < 2) return alert('Vul een geldige naam in.'); onSave(n) }} onMouseDown={e => e.stopPropagation()}>
    <h2>Naam wijzigen</h2><p>Nieuwe meldingen worden voortaan onder deze naam opgeslagen.</p>
    <label>Naam<input value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
    <div className="name-actions"><button type="button" onClick={onClose}>Annuleren</button><button className="primary">Opslaan</button></div>
  </form></div>
}

function Lightbox({ photos, index, onIndex, onClose }) {
  if (!photos.length) return null
  return <div className="lightbox" onMouseDown={onClose}>
    <button className="lightbox-close" onClick={onClose}>×</button>
    {photos.length > 1 && <button className="lightbox-nav prev" onClick={e => { e.stopPropagation(); onIndex((index - 1 + photos.length) % photos.length) }}>‹</button>}
    <img src={photos[index]} alt={`Foto ${index + 1}`} onMouseDown={e => e.stopPropagation()} />
    {photos.length > 1 && <button className="lightbox-nav next" onClick={e => { e.stopPropagation(); onIndex((index + 1) % photos.length) }}>›</button>}
    <div className="lightbox-count">{index + 1} / {photos.length}</div>
  </div>
}

function IncidentModal({ position, point, operatorName, onClose, onSave, onArchive, onRestore }) {
  const [form, setForm] = useState({ title: '', category: 'schade', urgent: 'nee', status: 'open', notes: '' })
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    setForm({ title: point?.title || '', category: point?.category || 'schade', urgent: point?.urgent || 'nee', status: point?.status === 'verwijderd' ? 'open' : point?.status || 'open', notes: point?.notes || '' })
    setExistingPhotos(normalizePhotos(point)); setNewFiles([]); setPreviews([]); setLightboxIndex(null)
  }, [point, position])

  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews])
  if (!position) return null
  const archived = point?.status === 'verwijderd'
  const allPhotos = [...existingPhotos, ...previews]

  function choosePhotos(event) {
    const files = [...(event.target.files || [])]
    const valid = files.filter(file => {
      if (!file.type.startsWith('image/')) { alert(`${file.name} is geen afbeelding.`); return false }
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is groter dan 10 MB.`); return false }
      return true
    })
    setNewFiles(current => [...current, ...valid])
    setPreviews(current => [...current, ...valid.map(file => URL.createObjectURL(file))])
    event.target.value = ''
  }

  function removePhoto(index) {
    if (index < existingPhotos.length) setExistingPhotos(current => current.filter((_, i) => i !== index))
    else {
      const i = index - existingPhotos.length
      URL.revokeObjectURL(previews[i])
      setNewFiles(current => current.filter((_, x) => x !== i))
      setPreviews(current => current.filter((_, x) => x !== i))
    }
  }

  async function uploadPhotos() {
    const urls = []
    for (const file of newFiles) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const unique = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const fileName = `${Date.now()}-${unique}.${extension}`
      const { error } = await supabase.storage.from('point-photos').upload(fileName, file, { cacheControl: '3600', contentType: file.type, upsert: false })
      if (error) throw error
      urls.push(supabase.storage.from('point-photos').getPublicUrl(fileName).data.publicUrl)
    }
    return [...existingPhotos, ...urls]
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.title.trim()) return alert('Vul een naam in.')
    try {
      setUploading(true)
      const photoUrls = await uploadPhotos()
      await onSave({ ...form, title: form.title.trim(), notes: form.notes.trim(), photoUrls })
    } catch (error) { alert(`Opslaan is mislukt: ${error.message}`) }
    finally { setUploading(false) }
  }

  return <>
    <div className="overlay" onMouseDown={uploading ? undefined : onClose}><form className="modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <div className="modal-head"><div><span>{point ? archived ? 'Verwijderd item' : 'Melding bewerken' : 'Nieuwe melding'}</span><h2>{point?.title || 'Punt toevoegen'}</h2></div><button type="button" onClick={onClose}>×</button></div>
      <p className="coords">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>
      <label>Naam<input name="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} disabled={uploading || archived} autoFocus /></label>
      <div className="cols"><label>Categorie<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} disabled={uploading || archived}><option value="schade">Schade</option><option value="afsluiting">Afsluiting</option><option value="werkzaamheden">Werkzaamheden</option><option value="overig">Overig</option></select></label>
      <label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={uploading || archived}><option value="open">Open</option><option value="in_behandeling">In behandeling</option></select></label></div>
      <div className="cols"><label>Spoed<select value={form.urgent} onChange={e => setForm({ ...form, urgent: e.target.value })} disabled={uploading || archived}><option value="nee">Nee</option><option value="ja">Ja</option></select></label><div className="operator-readonly"><span>Operator</span><strong>👤 {operatorName}</strong></div></div>
      <label>Omschrijving<textarea rows="4" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} disabled={uploading || archived} /></label>
      {!archived && <label className="photo-upload">Foto's toevoegen<input type="file" accept="image/*" multiple onChange={choosePhotos} disabled={uploading} /><small>Je kunt meerdere foto's tegelijk kiezen. Maximaal 10 MB per foto.</small></label>}
      {allPhotos.length > 0 && <div className="photo-grid">{allPhotos.map((url, index) => <div className="photo-tile" key={`${url}-${index}`}><button type="button" className="photo-open" onClick={() => setLightboxIndex(index)}><img src={url} alt={`Foto ${index + 1}`} /></button>{!archived && <button type="button" className="photo-remove" onClick={() => removePhoto(index)} aria-label="Foto verwijderen">×</button>}</div>)}</div>}
      <div className="actions">{point && !archived && <button type="button" className="danger" onClick={onArchive}>Punt verwijderen</button>}{point && archived && <button type="button" className="restore" onClick={onRestore}>Punt herstellen</button>}<span /><button type="button" onClick={onClose}>Sluiten</button>{!archived && <button className="primary" disabled={uploading}>{uploading ? 'Foto’s uploaden…' : 'Opslaan'}</button>}</div>
    </form></div>
    {lightboxIndex !== null && <Lightbox photos={allPhotos} index={lightboxIndex} onIndex={setLightboxIndex} onClose={() => setLightboxIndex(null)} />}
  </>
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(SESSION_KEY) === 'yes')
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem(OPERATOR_KEY) || '')
  const [editingName, setEditingName] = useState(false)
  const [position, setPosition] = useState(null)
  const [editing, setEditing] = useState(null)
  const [focusPoint, setFocusPoint] = useState(null)
  const [view, setView] = useState('open')
  const [filters, setFilters] = useState({ search: '', category: 'alle' })
  const { points, connectionStatus, error, load } = useRealtimePoints(isAuthenticated && Boolean(operatorName))

  const shown = useMemo(() => {
    const search = filters.search.toLowerCase().trim()
    return points.filter(point => {
      const viewOkay = view === 'open' ? point.status === 'open' : view === 'in_behandeling' ? point.status === 'in_behandeling' : view === 'urgent' ? point.urgent === 'ja' && point.status !== 'verwijderd' : view === 'verwijderd' ? point.status === 'verwijderd' : true
      const categoryOkay = filters.category === 'alle' || point.category === filters.category
      const searchOkay = !search || `${point.title || ''} ${point.notes || ''} ${point.added_by || ''}`.toLowerCase().includes(search)
      return viewOkay && categoryOkay && searchOkay
    })
  }, [points, view, filters])

  function openPoint(point) {
    setEditing(point)
    setFocusPoint(point)
    setPosition({ lat: Number(point.lat), lng: Number(point.lng) })
  }

  function closeModal() {
    setPosition(null)
    setEditing(null)
  }

  async function save(form) {
    const payload = { title: form.title, category: form.category, urgent: form.urgent, status: form.status, notes: form.notes, added_by: operatorName || 'onbekend', lat: position.lat, lng: position.lng, photo_urls: form.photoUrls, photo_url: form.photoUrls[0] || null }
    const query = editing ? supabase.from('points').update(payload).eq('id', editing.id) : supabase.from('points').insert(payload)
    const { error: saveError } = await query
    if (saveError) throw saveError
    closeModal()
    await load()
  }

  async function archivePoint() {
    if (!editing || !confirm('Dit punt verplaatsen naar Verwijderde items?')) return
    const { error: archiveError } = await supabase.from('points').update({ status: 'verwijderd' }).eq('id', editing.id)
    if (archiveError) return alert(archiveError.message)
    closeModal()
    await load()
  }

  async function restorePoint() {
    if (!editing) return
    const { error: restoreError } = await supabase.from('points').update({ status: 'open' }).eq('id', editing.id)
    if (restoreError) return alert(restoreError.message)
    closeModal()
    setView('open')
    await load()
  }

  if (!isAuthenticated || !operatorName) return <AccessScreen savedName={operatorName} onAccess={name => { localStorage.setItem(SESSION_KEY, 'yes'); localStorage.setItem(OPERATOR_KEY, name); setOperatorName(name); setIsAuthenticated(true) }} />

  return <div className="app">
    <Header operatorName={operatorName} connectionStatus={connectionStatus} onRefresh={load} onChangeName={() => setEditingName(true)} onLogout={() => { localStorage.removeItem(SESSION_KEY); setIsAuthenticated(false); closeModal() }} />
    {error && <div className="error">Databasefout: {error}</div>}
    <div className="layout">
      <Dashboard points={points} view={view} setView={setView} filters={filters} setFilters={setFilters} onOpenPoint={openPoint} />
      <MapView points={shown} position={position} editing={editing} focusPoint={focusPoint} onOpenPoint={openPoint} onCreatePoint={latlng => { setEditing(null); setFocusPoint(null); setPosition({ lat: latlng.lat, lng: latlng.lng }) }} />
    </div>
    <IncidentModal position={position} point={editing} operatorName={operatorName} onClose={closeModal} onSave={save} onArchive={archivePoint} onRestore={restorePoint} />
    {editingName && <NameDialog currentName={operatorName} onClose={() => setEditingName(false)} onSave={name => { localStorage.setItem(OPERATOR_KEY, name); setOperatorName(name); setEditingName(false) }} />}
  </div>
}
