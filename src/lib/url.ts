/**
 * Resolves a public asset path against Vite's configured base URL, so
 * static assets keep working when the built app is served from a
 * sub-path (not the domain root) — e.g. a hosted preview link.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '')
}
