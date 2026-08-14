import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const gestureRef = useRef({
    mode: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startDistance: 0,
    startScale: 1,
    moved: false,
  })

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [index])

  if (!photos.length) return null

  function previousPhoto() {
    onIndex((index - 1 + photos.length) % photos.length)
  }

  function nextPhoto() {
    onIndex((index + 1) % photos.length)
  }

  function distance(touchA, touchB) {
    return Math.hypot(
      touchA.clientX - touchB.clientX,
      touchA.clientY - touchB.clientY,
    )
  }

  function touchStart(event) {
    event.stopPropagation()
    const touches = event.touches

    if (touches.length === 2) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: 'pinch',
        startDistance: distance(touches[0], touches[1]),
        startScale: scale,
        moved: false,
      }
      return
    }

    if (touches.length === 1) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: scale > 1 ? 'pan' : 'swipe',
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
        moved: false,
      }
    }
  }

  function touchMove(event) {
    event.preventDefault()
    event.stopPropagation()
    const touches = event.touches
    const gesture = gestureRef.current

    if (gesture.mode === 'pinch' && touches.length === 2) {
      const nextScale = Math.min(
        4,
        Math.max(
          1,
          gesture.startScale *
            (distance(touches[0], touches[1]) / gesture.startDistance),
        ),
      )
      gesture.moved = true
      setScale(nextScale)
      if (nextScale === 1) setOffset({ x: 0, y: 0 })
      return
    }

    if (touches.length !== 1) return

    const deltaX = touches[0].clientX - gesture.startX
    const deltaY = touches[0].clientY - gesture.startY

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      gesture.moved = true
    }

    if (gesture.mode === 'pan') {
      setOffset({
        x: gesture.startOffsetX + deltaX,
        y: gesture.startOffsetY + deltaY,
      })
    }
  }

  function touchEnd(event) {
    event.stopPropagation()
    const gesture = gestureRef.current

    if (gesture.mode === 'swipe' && event.changedTouches.length === 1) {
      const deltaX = event.changedTouches[0].clientX - gesture.startX
      const deltaY = event.changedTouches[0].clientY - gesture.startY

      if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) nextPhoto()
        else previousPhoto()
      }
    }

    if (scale <= 1.02) {
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }

    gestureRef.current.mode = null
  }

  function resetZoom() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return <div className="lightbox" onMouseDown={onClose}>
    <button className="lightbox-close" onClick={onClose}>×</button>
    {photos.length > 1 && <button type="button" className="lightbox-nav prev" onMouseDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); previousPhoto() }}>‹</button>}
    <div
      onMouseDown={event => event.stopPropagation()}
      onTouchStart={touchStart}
      onTouchMove={touchMove}
      onTouchEnd={touchEnd}
      onTouchCancel={touchEnd}
      onDoubleClick={resetZoom}
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <img
        src={photos[index]}
        alt={`Foto ${index + 1}`}
        draggable="false"
        style={{
          maxWidth: '95vw',
          maxHeight: '88vh',
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transformOrigin: 'center center',
          transition: gestureRef.current.mode ? 'none' : 'transform 160ms ease',
          userSelect: 'none',
          WebkitUserDrag: 'none',
          cursor: scale > 1 ? 'grab' : 'default',
        }}
      />
    </div>
    {photos.length > 1 && <button type="button" className="lightbox-nav next" onMouseDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); nextPhoto() }}>›</button>}
    <div className="lightbox-count">{index + 1} / {photos.length}</div>
    {photos.length > 1 && (
      <div
        aria-label="Foto-overzicht"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '22px',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 3002,
        }}
      >
        {photos.map((_, photoIndex) => (
          <button
            key={photoIndex}
            type="button"
            aria-label={`Open foto ${photoIndex + 1}`}
            onClick={event => {
              event.stopPropagation()
              onIndex(photoIndex)
            }}
            style={{
              width: photoIndex === index ? '22px' : '9px',
              height: '9px',
              padding: 0,
              border: 0,
              borderRadius: '999px',
              background: photoIndex === index ? '#55b1a9' : 'rgba(255,255,255,.55)',
              cursor: 'pointer',
              transition: 'width 160ms ease, background 160ms ease',
            }}
          />
        ))}
      </div>
    )}
  </div>
}


function getDeletedItemInfo(deletedAt) {
  if (!deletedAt) return null

  const deletedDate = new Date(deletedAt)
  if (Number.isNaN(deletedDate.getTime())) return null

  const expiresAt = new Date(deletedDate)
  expiresAt.setDate(expiresAt.getDate() + 31)

  const millisecondsPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / millisecondsPerDay),
  )

  return {
    formattedDate: new Intl.DateTimeFormat('nl-NL', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(deletedDate),
    daysRemaining,
  }
}

function toDateTimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function IncidentModal({ position, point, operatorName, onClose, onSave, onArchive, onRestore }) {
  const [form, setForm] = useState({ title: '', category: 'schade', urgent: 'nee', status: 'open', notes: '', closure_until: '' })
  const [existingPhotos, setExistingPhotos] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    setForm({ title: point?.title || '', category: point?.category || 'schade', urgent: point?.urgent || 'nee', status: point?.status === 'verwijderd' ? 'open' : point?.status || 'open', notes: point?.notes || '', closure_until: toDateTimeLocalValue(point?.closure_until) })
    setExistingPhotos(normalizePhotos(point)); setNewFiles([]); setPreviews([]); setLightboxIndex(null)
  }, [point, position])

  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews])
  if (!position) return null
  const archived = point?.status === 'verwijderd'
  const deletedItemInfo = archived ? getDeletedItemInfo(point?.deleted_at) : null
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
      <div className="modal-head"><div><span>{point ? archived ? 'Verwijderde melding' : 'Melding bewerken' : 'Nieuwe melding'}</span><h2>{point?.title || 'Melding toevoegen'}</h2></div><button type="button" onClick={onClose}>×</button></div>
      {point?.created_at && <p style={{ margin: '4px 0 2px', color: '#6b7280', fontSize: '13px' }}>Geplaatst op: {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long' }).format(new Date(point.created_at))}</p>}
      {point?.category === 'afsluiting' && point?.closure_until && <p style={{ margin: '2px 0 2px', color: '#6b7280', fontSize: '13px' }}>Afsluiting tot: {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(point.closure_until))}</p>}
      <p className="coords">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>
      {archived && deletedItemInfo && <div style={{ margin: '0 0 16px', padding: '12px 14px', border: '1px solid #d7dee8', borderRadius: '9px', background: '#f7f9fc', color: '#374151' }}><strong style={{ display: 'block', marginBottom: '5px' }}>Verwijderd op</strong><span>{deletedItemInfo.formattedDate}</span><span style={{ display: 'block', marginTop: '8px', fontWeight: 700, color: '#9a4a32' }}>{deletedItemInfo.daysRemaining === 0 ? 'Wordt bij de volgende dagelijkse opruiming definitief verwijderd.' : `Nog ${deletedItemInfo.daysRemaining} ${deletedItemInfo.daysRemaining === 1 ? 'dag' : 'dagen'} tot definitieve verwijdering.`}</span></div>}
      <label>Naam<input name="title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} disabled={uploading || archived} autoFocus /></label>
      <div className="cols"><label>Categorie<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} disabled={uploading || archived}><option value="schade">Schade</option><option value="afsluiting">Afsluiting</option><option value="werkzaamheden">Werkzaamheden</option><option value="overig">Overig</option></select></label>
      <label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={uploading || archived}><option value="open">Open</option><option value="in_behandeling">In behandeling</option></select></label></div>
      {form.category === 'afsluiting' && <label>Afsluiting tot<input type="datetime-local" value={form.closure_until} onChange={e => setForm({ ...form, closure_until: e.target.value })} disabled={uploading || archived} required /></label>}
      <div className="cols"><label>Spoed<select value={form.urgent} onChange={e => setForm({ ...form, urgent: e.target.value })} disabled={uploading || archived}><option value="nee">Nee</option><option value="ja">Ja</option></select></label><div className="operator-readonly"><span>Operator</span><strong>👤 {operatorName}</strong></div></div>
      <label>Omschrijving<textarea rows="4" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} disabled={uploading || archived} /></label>
      {!archived && <label className="photo-upload">Foto's toevoegen<input type="file" accept="image/*" multiple onChange={choosePhotos} disabled={uploading} /><small>Je kunt meerdere foto's tegelijk kiezen. Maximaal 10 MB per foto.</small></label>}
      {allPhotos.length > 0 && <div className="photo-grid">{allPhotos.map((url, index) => <div className="photo-tile" key={`${url}-${index}`}><button type="button" className="photo-open" onClick={() => setLightboxIndex(index)}><img src={url} alt={`Foto ${index + 1}`} /></button>{!archived && <button type="button" className="photo-remove" onClick={() => removePhoto(index)} aria-label="Foto verwijderen">×</button>}</div>)}</div>}
      <div className="actions">{point && !archived && <button type="button" className="danger" onClick={onArchive}>Melding verwijderen</button>}{point && archived && <button type="button" className="restore" onClick={onRestore}>Melding herstellen</button>}<span /><button type="button" onClick={onClose}>Sluiten</button>{!archived && <button className="primary" disabled={uploading}>{uploading ? 'Foto’s uploaden…' : 'Opslaan'}</button>}</div>
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
      const viewOkay =
        view === 'open' ? point.status === 'open' :
        view === 'in_behandeling' ? point.status === 'in_behandeling' :
        view === 'urgent' ? point.urgent === 'ja' && point.status !== 'verwijderd' :
        view === 'verwijderd' ? point.status === 'verwijderd' :
        view === 'alle' && (filters.category === 'schade' || filters.category === 'afsluiting')
          ? point.status !== 'verwijderd' :
        true
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
    const payload = { title: form.title, category: form.category, urgent: form.urgent, status: form.status, notes: form.notes, closure_until: form.category === 'afsluiting' && form.closure_until ? new Date(form.closure_until).toISOString() : null, added_by: operatorName || 'onbekend', lat: position.lat, lng: position.lng, photo_urls: form.photoUrls, photo_url: form.photoUrls[0] || null }
    const query = editing ? supabase.from('points').update(payload).eq('id', editing.id) : supabase.from('points').insert(payload)
    const { error: saveError } = await query
    if (saveError) throw saveError
    closeModal()
    await load()
  }

  async function archivePoint() {
    if (!editing || !confirm('Deze melding verplaatsen naar Verwijderd?')) return
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
