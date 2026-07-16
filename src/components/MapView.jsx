import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { CENTER, RUNWAY, markerColor, normalizePhotos, statusLabel } from '../utils/incident.js'

function Clicker({ onClick }) {
  const map = useMapEvents({ click(event) {
    if (map.distance(CENTER, event.latlng) > 3000) return alert('Dit punt ligt buiten de toegestane zone van 3 kilometer.')
    onClick(event.latlng)
  } })
  return null
}

function MapFocus({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([Number(target.lat), Number(target.lng)], Math.max(map.getZoom(), 17), { duration: .7 })
  }, [target, map])
  return null
}

export default function MapView({ points, position, editing, focusPoint, onOpenPoint, onCreatePoint }) {
  return <main className="map-shell">
    <MapContainer center={CENTER} zoom={14} className="map">
      <TileLayer attribution="&copy; OpenStreetMap-bijdragers" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Circle center={CENTER} radius={3000} pathOptions={{ color: '#35a59c', dashArray: '6 6', fillOpacity: .06 }} />
      <Polyline positions={RUNWAY} pathOptions={{ color: '#3a3a3a', weight: 10 }}><Tooltip sticky>Start- en landingsbaan 03/21</Tooltip></Polyline>
      <Polyline positions={RUNWAY} pathOptions={{ color: '#fff', weight: 2, dashArray: '12 10' }} />
      {points.map(point => <g key={point.id}>
        <CircleMarker center={[Number(point.lat), Number(point.lng)]} radius={26} bubblingMouseEvents={false} pathOptions={{ color: 'transparent', fillColor: '#fff', fillOpacity: 0 }} eventHandlers={{ click: () => onOpenPoint(point) }} />
        <CircleMarker className={focusPoint?.id === point.id ? 'selected-marker' : ''} center={[Number(point.lat), Number(point.lng)]} radius={point.urgent === 'ja' ? 12 : 10} bubblingMouseEvents={false} pathOptions={{ color: '#fff', weight: focusPoint?.id === point.id ? 4 : 2, fillColor: markerColor(point), fillOpacity: .96 }} eventHandlers={{ click: () => onOpenPoint(point) }}>
          <Tooltip direction="top"><strong>{point.title}</strong><br />{statusLabel(point)} · {normalizePhotos(point).length} foto('s)</Tooltip>
        </CircleMarker>
      </g>)}
      {position && !editing && <CircleMarker center={[position.lat, position.lng]} radius={9} pathOptions={{ color: '#fff', fillColor: '#35a59c', fillOpacity: .8 }} />}
      <Clicker onClick={onCreatePoint} />
      <MapFocus target={focusPoint} />
    </MapContainer>
    <div className="map-hint">Tik op de kaart om een nieuwe melding toe te voegen</div>
  </main>
}
