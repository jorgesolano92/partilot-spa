export function mediaUrl(path?: string | null): string {
  if (!path) return ''
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:')
  ) {
    return path
  }
  const api = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  const origin = api.replace(/\/api\/?$/, '')
  if (path.startsWith('/')) return origin + path
  return `${origin}/uploads/${path.replace(/^storage\/?/, '')}`
}

export function money(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
