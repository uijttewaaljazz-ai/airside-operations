export const CENTER = [51.4501, 5.3745]
export const RUNWAY = [[51.461175, 5.386892], [51.439083, 5.362136]]
export const COLORS = {
  schade: '#d45a4f',
  afsluiting: '#e6a23c',
  werkzaamheden: '#4d9bd3',
  overig: '#35a59c',
}

export function normalizePhotos(point) {
  if (Array.isArray(point?.photo_urls)) return point.photo_urls.filter(Boolean)
  return point?.photo_url ? [point.photo_url] : []
}

export function statusLabel(point) {
  if (point.status === 'verwijderd') return 'Verwijderd'
  if (point.status === 'in_behandeling') return 'In behandeling'
  return 'Open'
}

export function markerColor(point) {
  if (point.status === 'verwijderd') return '#77808d'
  if (point.urgent === 'ja') return '#e2554f'
  return COLORS[point.category] || COLORS.overig
}
