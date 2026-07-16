import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import './App.css'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet'
import { supabase } from './services/supabase.js'

const APP_USERNAME = 'airside'
const APP_PASSWORD = 'Airside2026!'
const SESSION_KEY = 'airside_shared_session'
const OPERATOR_KEY = 'airside_operator_name'

const CENTER = [51.4501, 5.3745]
const RUNWAY = [
  [51.461175, 5.386892],
  [51.439083, 5.362136],
]
const COLORS = {
  schade: '#b5473f',
  afsluiting: '#c98a3e',
  werkzaamheden: '#3a7ca5',
  overig: '#2a7f7a',
}


function AccessScreen({ savedName, onAccess }) {
  const [step, setStep] = useState('login')
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  })
  const [name, setName] = useState(savedName || '')
  const [message, setMessage] = useState('')

  function login(event) {
    event.preventDefault()
    setMessage('')

    if (
      credentials.username.trim().toLowerCase() !== APP_USERNAME ||
      credentials.password !== APP_PASSWORD
    ) {
      setMessage('Gebruikersnaam of wachtwoord is niet juist.')
      return
    }

    if (savedName) {
      onAccess(savedName)
      return
    }

    setStep('name')
  }

  function saveName(event) {
    event.preventDefault()
    const cleanName = name.trim()
    if (cleanName.length < 2) {
      setMessage('Vul je eigen naam in.')
      return
    }
    onAccess(cleanName)
  }

  return (
    <main className="access-page">
      <section className="access-card">
        <div className="access-emblem">✈</div>
        <small>AIRSIDE OPERATIONS</small>
        <h1>Vliegbasis Eindhoven</h1>
        <p className="access-intro">
          Beveiligde toegang tot het operationele meldingssysteem.
        </p>

        {step === 'login' ? (
          <form onSubmit={login}>
            <label>
              Gebruikersnaam
              <input
                value={credentials.username}
                onChange={(event) =>
                  setCredentials({
                    ...credentials,
                    username: event.target.value,
                  })
                }
                autoComplete="username"
                autoFocus
              />
            </label>
            <label>
              Wachtwoord
              <input
                type="password"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials({
                    ...credentials,
                    password: event.target.value,
                  })
                }
                autoComplete="current-password"
              />
            </label>
            {savedName && (
              <p className="remembered-name">
                Dit toestel is ingesteld voor <strong>{savedName}</strong>.
              </p>
            )}
            {message && <p className="access-message">{message}</p>}
            <button className="access-primary" type="submit">
              Inloggen
            </button>
          </form>
        ) : (
          <form onSubmit={saveName}>
            <h2>Wie gebruikt dit toestel?</h2>
            <p className="access-intro">
              Deze naam wordt automatisch bij nieuwe meldingen opgeslagen.
            </p>
            <label>
              Jouw naam
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                autoFocus
              />
            </label>
            {message && <p className="access-message">{message}</p>}
            <button className="access-primary" type="submit">
              Naam opslaan en doorgaan
            </button>
          </form>
        )}

        <p className="access-footnote">
          Persoonlijke namen worden alleen op dit toestel bewaard.
        </p>
      </section>
    </main>
  )
}

function NameDialog({ currentName, onSave, onClose }) {
  const [name, setName] = useState(currentName)

  function submit(event) {
    event.preventDefault()
    const cleanName = name.trim()
    if (cleanName.length < 2) {
      window.alert('Vul een geldige naam in.')
      return
    }
    onSave(cleanName)
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form
        className="name-dialog"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>Naam op dit toestel wijzigen</h2>
        <p>Nieuwe meldingen worden voortaan onder deze naam opgeslagen.</p>
        <label>
          Naam
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </label>
        <div className="name-actions">
          <button type="button" onClick={onClose}>Annuleren</button>
          <button className="primary" type="submit">Opslaan</button>
        </div>
      </form>
    </div>
  )
}

function Clicker({ onClick }) {
  const map = useMapEvents({
    click(event) {
      if (map.distance(CENTER, event.latlng) > 3000) {
        window.alert(
          'Dit punt ligt buiten de toegestane zone van 3 kilometer.',
        )
        return
      }
      onClick(event.latlng)
    },
  })
  return null
}

function Modal({
  position,
  point,
  onClose,
  onSave,
  onArchive,
  onRestore,
  operatorName,
}) {
  const [form, setForm] = useState({
    title: '',
    category: 'schade',
    urgent: 'nee',
    status: 'open',
    notes: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [largePhoto, setLargePhoto] = useState('')

  useEffect(() => {
    setForm({
      title: point?.title || '',
      category: point?.category || 'schade',
      urgent: point?.urgent || 'nee',
      status:
        point?.status === 'verwijderd'
          ? 'open'
          : point?.status || 'open',
      notes: point?.notes || '',
    })
    setPhotoFile(null)
    setPhotoPreview(point?.photo_url || '')
  }, [point, position])

  if (!position) return null

  function change(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      window.alert('Kies een geldig afbeeldingsbestand.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      window.alert('De foto mag maximaal 10 MB groot zijn.')
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function uploadPhoto() {
    if (!photoFile) return point?.photo_url || null

    const extension =
      photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const unique =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const fileName = `${Date.now()}-${unique}.${extension}`

    const { error } = await supabase.storage
      .from('point-photos')
      .upload(fileName, photoFile, {
        cacheControl: '3600',
        contentType: photoFile.type,
        upsert: false,
      })

    if (error) throw error

    const { data } = supabase.storage
      .from('point-photos')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  async function submit(event) {
    event.preventDefault()

    if (!form.title.trim()) {
      window.alert('Vul een naam in.')
      return
    }

    try {
      setUploading(true)
      const photoUrl = await uploadPhoto()


      await onSave({
        ...form,
        title: form.title.trim(),
        notes: form.notes.trim(),
        photoUrl,
      })
    } catch (error) {
      window.alert(`Opslaan is mislukt: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const isArchived = point?.status === 'verwijderd'

  return (
    <>
    <div
      className="overlay"
      onMouseDown={uploading ? undefined : onClose}
    >
      <form
        className="modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span>
              {point
                ? isArchived
                  ? 'Verwijderd item'
                  : 'Melding bewerken'
                : 'Nieuwe melding'}
            </span>
            <h2>{point ? point.title : 'Punt toevoegen'}</h2>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>

        <p className="coords">
          {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>

        <label>
          Naam
          <input
            name="title"
            value={form.title}
            onChange={change}
            disabled={uploading || isArchived}
            autoFocus
          />
        </label>

        <div className="cols">
          <label>
            Categorie
            <select
              name="category"
              value={form.category}
              onChange={change}
              disabled={uploading || isArchived}
            >
              <option value="schade">Schade</option>
              <option value="afsluiting">Afsluiting</option>
              <option value="werkzaamheden">Werkzaamheden</option>
              <option value="overig">Overig</option>
            </select>
          </label>

          <label>
            Status
            <select
              name="status"
              value={form.status}
              onChange={change}
              disabled={uploading || isArchived}
            >
              <option value="open">Open</option>
              <option value="in_behandeling">
                In behandeling
              </option>
            </select>
          </label>
        </div>

        <div className="cols">
          <label>
            Spoed
            <select
              name="urgent"
              value={form.urgent}
              onChange={change}
              disabled={uploading || isArchived}
            >
              <option value="nee">Nee</option>
              <option value="ja">Ja</option>
            </select>
          </label>
        </div>

        <div className="operator-readonly">
          <span>Wordt opgeslagen door</span>
          <strong>👤 {operatorName}</strong>
        </div>

        <label>
          Omschrijving
          <textarea
            name="notes"
            rows="4"
            value={form.notes}
            onChange={change}
            disabled={uploading || isArchived}
          />
        </label>

        {!isArchived && (
          <label>
            Foto
            <input
              type="file"
              accept="image/*"
              onChange={choosePhoto}
              disabled={uploading}
            />
          </label>
        )}

        {photoPreview && (
          <button
            className="photo-button"
            type="button"
            onClick={() => setLargePhoto(photoPreview)}
          >
            <img
              className="photo-preview"
              src={photoPreview}
              alt="Foto bij de melding"
            />
            <span>Klik om de foto groot te openen</span>
          </button>
        )}

        <div className="actions">
          {point && !isArchived && (
            <button
              type="button"
              className="danger"
              onClick={onArchive}
            >
              Punt verwijderen
            </button>
          )}

          {point && isArchived && (
            <button
              type="button"
              className="restore"
              onClick={onRestore}
            >
              Punt herstellen
            </button>
          )}

          <span />

          <button type="button" onClick={onClose}>
            Sluiten
          </button>

          {!isArchived && (
            <button
              type="submit"
              className="primary"
              disabled={uploading}
            >
              {uploading ? 'Foto uploaden…' : 'Opslaan'}
            </button>
          )}
        </div>
      </form>
    </div>

    {largePhoto && (
      <div
        className="lightbox"
        onMouseDown={() => setLargePhoto('')}
      >
        <button
          type="button"
          className="lightbox-close"
          onClick={() => setLargePhoto('')}
        >
          ×
        </button>
        <img
          src={largePhoto}
          alt={point?.title || 'Foto bij melding'}
          onMouseDown={(event) => event.stopPropagation()}
        />
      </div>
    )}
  </>
  )
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(SESSION_KEY) === 'yes',
  )
  const [operatorName, setOperatorName] = useState(
    () => localStorage.getItem(OPERATOR_KEY) || '',
  )
  const [editingName, setEditingName] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('verbinden')
  const [points, setPoints] = useState([])
  const [position, setPosition] = useState(null)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    search: '',
    category: 'alle',
    status: 'actief',
    urgent: false,
  })

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('points')
      .select('*')
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
      return
    }

    setPoints(data || [])
    setError('')
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !operatorName) return undefined

    load()
    setConnectionStatus('verbinden')

    const channel = supabase
      .channel('airside-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points',
        },
        load,
      )
      .subscribe((status) => {
        setConnectionStatus(
          status === 'SUBSCRIBED' ? 'live' : 'verbinden',
        )
      })

    const interval = window.setInterval(load, 8000)

    return () => {
      window.clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [load, isAuthenticated, operatorName])

  const stats = useMemo(
    () => ({
      open: points.filter((p) => p.status === 'open').length,
      handling: points.filter(
        (p) => p.status === 'in_behandeling',
      ).length,
      urgent: points.filter(
        (p) =>
          p.urgent === 'ja' &&
          p.status !== 'verwijderd',
      ).length,
      archived: points.filter(
        (p) => p.status === 'verwijderd',
      ).length,
    }),
    [points],
  )

  const shown = useMemo(() => {
    const search = filters.search.toLowerCase().trim()

    return points.filter((point) => {
      const categoryOkay =
        filters.category === 'alle' ||
        point.category === filters.category

      const statusOkay =
        filters.status === 'alle' ||
        (filters.status === 'actief' &&
          point.status !== 'verwijderd') ||
        point.status === filters.status

      const urgencyOkay =
        !filters.urgent || point.urgent === 'ja'

      const searchOkay =
        !search ||
        `${point.title || ''} ${point.notes || ''} ${
          point.added_by || ''
        }`
          .toLowerCase()
          .includes(search)

      return (
        categoryOkay &&
        statusOkay &&
        urgencyOkay &&
        searchOkay
      )
    })
  }, [points, filters])

  async function save(form) {
    const payload = {
      title: form.title,
      category: form.category,
      urgent: form.urgent,
      status: form.status,
      notes: form.notes,
      added_by: operatorName || 'onbekend',
      lat: position.lat,
      lng: position.lng,
      photo_url:
        form.photoUrl || editing?.photo_url || null,
    }

    const query = editing
      ? supabase
          .from('points')
          .update(payload)
          .eq('id', editing.id)
      : supabase.from('points').insert(payload)

    const { error: saveError } = await query
    if (saveError) throw saveError

    closeModal()
    await load()
  }

  async function archivePoint() {
    if (!editing) return

    const confirmed = window.confirm(
      'Dit punt verplaatsen naar Verwijderde items?',
    )
    if (!confirmed) return

    const { error: archiveError } = await supabase
      .from('points')
      .update({ status: 'verwijderd' })
      .eq('id', editing.id)

    if (archiveError) {
      window.alert(
        `Verwijderen is mislukt: ${archiveError.message}`,
      )
      return
    }

    closeModal()
    await load()
  }

  async function restorePoint() {
    if (!editing) return

    const { error: restoreError } = await supabase
      .from('points')
      .update({ status: 'open' })
      .eq('id', editing.id)

    if (restoreError) {
      window.alert(
        `Herstellen is mislukt: ${restoreError.message}`,
      )
      return
    }

    closeModal()
    await load()
  }

  function grantAccess(name) {
    localStorage.setItem(SESSION_KEY, 'yes')
    localStorage.setItem(OPERATOR_KEY, name)
    setOperatorName(name)
    setIsAuthenticated(true)
  }

  function changeOperator(name) {
    localStorage.setItem(OPERATOR_KEY, name)
    setOperatorName(name)
    setEditingName(false)
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
    closeModal()
  }

  function closeModal() {
    setPosition(null)
    setEditing(null)
  }

  if (!isAuthenticated || !operatorName) {
    return (
      <AccessScreen
        savedName={operatorName}
        onAccess={grantAccess}
      />
    )
  }

  return (
    <div className="app">
      <header>
        <div>
          <small>Airside Operations</small>
          <h1>Vliegbasis Eindhoven</h1>
        </div>
        <div className="header-tools">
          <div className={`live-status ${connectionStatus}`}>
            <span />
            {connectionStatus === 'live' ? 'Live' : 'Verbinden'}
          </div>
          <div className="operator-menu">
            <strong>👤 {operatorName}</strong>
            <button type="button" onClick={() => setEditingName(true)}>
              Naam wijzigen
            </button>
            <button type="button" onClick={logout}>
              Afmelden
            </button>
          </div>
          <button className="refresh-button" onClick={load}>
            ↻ Verversen
          </button>
        </div>
      </header>

      {error && (
        <div className="error">
          Databasefout: {error}
        </div>
      )}

      <div className="layout">
        <aside>
          <h2>Dashboard</h2>

          {[
            ['Open', stats.open],
            ['In behandeling', stats.handling],
            ['Spoed', stats.urgent],
            ['Verwijderde items', stats.archived],
          ].map(([label, amount]) => (
            <button
              className="stat stat-button"
              key={label}
              onClick={() => {
                if (label === 'Verwijderde items') {
                  setFilters({
                    ...filters,
                    status: 'verwijderd',
                  })
                }
              }}
            >
              <span>{label}</span>
              <strong>{amount}</strong>
            </button>
          ))}

          <h3>Filters</h3>

          <label>
            Zoeken
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  search: event.target.value,
                })
              }
            />
          </label>

          <label>
            Categorie
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  category: event.target.value,
                })
              }
            >
              <option value="alle">Alle</option>
              <option value="schade">Schade</option>
              <option value="afsluiting">Afsluiting</option>
              <option value="werkzaamheden">
                Werkzaamheden
              </option>
              <option value="overig">Overig</option>
            </select>
          </label>

          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  status: event.target.value,
                })
              }
            >
              <option value="actief">
                Actieve punten
              </option>
              <option value="open">Open</option>
              <option value="in_behandeling">
                In behandeling
              </option>
              <option value="verwijderd">
                Verwijderde items
              </option>
              <option value="alle">Alles tonen</option>
            </select>
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={filters.urgent}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  urgent: event.target.checked,
                })
              }
            />
            Alleen spoed
          </label>
        </aside>

        <main>
          <MapContainer
            center={CENTER}
            zoom={14}
            className="map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap-bijdragers"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Circle
              center={CENTER}
              radius={3000}
              pathOptions={{
                color: '#2a7f7a',
                dashArray: '6 6',
                fillColor: '#2a7f7a',
                fillOpacity: 0.08,
              }}
            />

            <Polyline
              positions={RUNWAY}
              pathOptions={{
                color: '#3a3a3a',
                weight: 10,
              }}
            >
              <Tooltip sticky>
                Start- en landingsbaan 03/21
              </Tooltip>
            </Polyline>

            <Polyline
              positions={RUNWAY}
              pathOptions={{
                color: '#fff',
                weight: 2,
                dashArray: '12 10',
              }}
            />

            {shown.map((point) => (
              <CircleMarker
                key={point.id}
                center={[
                  Number(point.lat),
                  Number(point.lng),
                ]}
                radius={9}
                bubblingMouseEvents={false}
                pathOptions={{
                  color:
                    point.status === 'verwijderd'
                      ? '#6b7280'
                      : '#fff',
                  weight: 2,
                  fillColor:
                    point.status === 'verwijderd'
                      ? '#6b7280'
                      : COLORS[point.category] ||
                        COLORS.overig,
                  fillOpacity:
                    point.status === 'verwijderd'
                      ? 0.55
                      : 0.95,
                }}
                eventHandlers={{
                  click() {
                    setEditing(point)
                    setPosition({
                      lat: Number(point.lat),
                      lng: Number(point.lng),
                    })
                  },
                }}
              >
                <Tooltip direction="top">
                  <strong>{point.title}</strong>
                  <br />
                  {point.status === 'verwijderd'
                    ? 'Verwijderd item'
                    : point.status}
                  {point.urgent === 'ja'
                    ? ' · SPOED'
                    : ''}
                  {point.photo_url ? ' · FOTO' : ''}
                </Tooltip>
              </CircleMarker>
            ))}

            {position && !editing && (
              <CircleMarker
                center={[position.lat, position.lng]}
                radius={8}
                pathOptions={{
                  color: '#fff',
                  fillColor: '#2a7f7a',
                  fillOpacity: 0.7,
                }}
              />
            )}

            <Clicker
              onClick={(latlng) => {
                setEditing(null)
                setPosition({
                  lat: latlng.lat,
                  lng: latlng.lng,
                })
              }}
            />
          </MapContainer>
        </main>
      </div>

      <Modal
        position={position}
        point={editing}
        onClose={closeModal}
        onSave={save}
        onArchive={archivePoint}
        onRestore={restorePoint}
        operatorName={operatorName}
      />

      {editingName && (
        <NameDialog
          currentName={operatorName}
          onSave={changeOperator}
          onClose={() => setEditingName(false)}
        />
      )}
    </div>
  )
}
