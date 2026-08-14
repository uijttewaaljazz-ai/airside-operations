import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { CENTER, RUNWAY, markerColor, normalizePhotos, statusLabel } from '../utils/incident.js'


function afsluitingIcon(isSelected, isUrgent) {
  const width = 26
  const height = 22

  return divIcon({
    className: '',
    iconSize: [width, height],
    iconAnchor: [width / 2, height / 2],
    html: `
      <svg width="${width}" height="${height}" viewBox="0 0 26 22" aria-hidden="true">
        <defs>
          <pattern id="barrier-stripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="skewX(-25)">
            <rect width="4" height="8" fill="#ff2a00"/>
            <rect x="4" width="4" height="8" fill="#ffd400"/>
          </pattern>
        </defs>

        <circle cx="6.5" cy="2.2" r="2.1" fill="#e63720" stroke="#ffd400" stroke-width="1.1"/>
        <circle cx="19.5" cy="2.2" r="2.1" fill="#e63720" stroke="#ffd400" stroke-width="1.1"/>

        <rect x="2" y="4.8" width="22" height="5.4" rx="0.8" fill="url(#barrier-stripes)"/>
        <rect x="2" y="11.2" width="22" height="5.4" rx="0.8" fill="url(#barrier-stripes)"/>

        <rect x="6" y="16.4" width="2.6" height="4.3" rx="0.5" fill="#d9d9d9"/>
        <rect x="17.4" y="16.4" width="2.6" height="4.3" rx="0.5" fill="#d9d9d9"/>
      </svg>
    `,
  })
}


function urgentCircleIcon(point, isSelected) {
  const size = 24
  const border = isSelected ? 4 : 2
  const color = markerColor(point)

  return divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        background:${color};
        border:${border}px solid #fff;
        box-sizing:border-box;
        box-shadow:${isSelected ? '0 0 0 2px rgba(53,165,156,.45)' : '0 1px 4px rgba(0,0,0,.28)'};
        color:#000;
        font-family:Arial,sans-serif;
        font-size:16px;
        font-weight:900;
        line-height:1;
      ">!</div>
    `,
  })
}

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
      {points.map(point => {
        const isAfsluiting = point.category === 'afsluiting'
        const isSelected = focusPoint?.id === point.id

        return <g key={point.id}>
          <CircleMarker center={[Number(point.lat), Number(point.lng)]} radius={26} bubblingMouseEvents={false} pathOptions={{ color: 'transparent', fillColor: '#fff', fillOpacity: 0 }} eventHandlers={{ click: () => onOpenPoint(point) }} />

          {isAfsluiting ? (
            <Marker
              position={[Number(point.lat), Number(point.lng)]}
              icon={afsluitingIcon(isSelected, point.urgent === 'ja')}
              eventHandlers={{ click: () => onOpenPoint(point) }}
            >
              <Tooltip direction="top"><strong>{point.title}</strong><br />{statusLabel(point)} · {normalizePhotos(point).length} foto('s)</Tooltip>
            </Marker>
          ) : point.urgent === 'ja' ? (
            <Marker
              position={[Number(point.lat), Number(point.lng)]}
              icon={urgentCircleIcon(point, isSelected)}
              eventHandlers={{ click: () => onOpenPoint(point) }}
            >
              <Tooltip direction="top"><strong>{point.title}</strong><br />{statusLabel(point)} · {normalizePhotos(point).length} foto('s)</Tooltip>
            </Marker>
          ) : (
            <CircleMarker
              className={isSelected ? 'selected-marker' : ''}
              center={[Number(point.lat), Number(point.lng)]}
              radius={10}
              bubblingMouseEvents={false}
              pathOptions={{ color: '#fff', weight: isSelected ? 4 : 2, fillColor: markerColor(point), fillOpacity: .96 }}
              eventHandlers={{ click: () => onOpenPoint(point) }}
            >
              <Tooltip direction="top"><strong>{point.title}</strong><br />{statusLabel(point)} · {normalizePhotos(point).length} foto('s)</Tooltip>
            </CircleMarker>
          )}
        </g>
      })}
      {position && !editing && <CircleMarker center={[position.lat, position.lng]} radius={9} pathOptions={{ color: '#fff', fillColor: '#35a59c', fillOpacity: .8 }} />}
      <Clicker onClick={onCreatePoint} />
      <MapFocus target={focusPoint} />
    </MapContainer>
    <div className="map-hint">Tik op de kaart om een nieuwe melding toe te voegen</div>
  </main>
}
