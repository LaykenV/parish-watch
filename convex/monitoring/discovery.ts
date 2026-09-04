/** Only an explicit year in a URL can exclude an archive before retrieval. */
export function isBeforeSourceWindow(raw: string, startsAt: number): boolean {
  let path: string
  try { path = new URL(raw).pathname } catch { return true }
  const years = [...path.matchAll(/(?:^|[/_-])(20\d{2})(?=[/_.-]|$)/g)].map(match => Number(match[1]))
  return years.length > 0 && Math.max(...years) < new Date(startsAt).getUTCFullYear()
}
export function isDocumentUrl(url: string): boolean {
  return /(?:\.pdf(?:\?|$)|ViewFile|munidocDownload|\/Document\/|adaHtmlDocument)/i.test(url)
}
