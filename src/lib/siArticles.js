import { useQuery } from '@tanstack/react-query'

// Proxied to https://www.socionicsinsight.com/feed.xml by netlify.toml (and by
// vite.config.js in dev), so the request is same-origin and needs no CORS.
const FEED_URL = '/si-feed.xml'
const SUMMARY_MAX = 160

function text(el, ...names) {
  for (const name of names) {
    const node = el.getElementsByTagName(name)[0]
    if (node?.textContent?.trim()) return node.textContent.trim()
  }
  return ''
}

// Descriptions are usually HTML inside CDATA — parse rather than regex-strip so
// entities (&amp;, &#8217;) decode properly.
function plainText(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const clean = (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  return clean.length > SUMMARY_MAX ? clean.slice(0, SUMMARY_MAX).replace(/\s+\S*$/, '') + '…' : clean
}

function atomLink(entry) {
  const links = Array.from(entry.getElementsByTagName('link'))
  const alt = links.find(l => !l.getAttribute('rel') || l.getAttribute('rel') === 'alternate')
  return alt?.getAttribute('href') || ''
}

// Handles both RSS 2.0 (<item>) and Atom (<entry>).
export function parseFeed(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Invalid feed XML')

  const rssItems = Array.from(doc.getElementsByTagName('item'))
  const nodes = rssItems.length ? rssItems : Array.from(doc.getElementsByTagName('entry'))

  return nodes
    .map(el => {
      const isAtom = el.tagName === 'entry'
      const rawDate = text(el, 'pubDate', 'published', 'updated', 'dc:date')
      const date = rawDate ? new Date(rawDate) : null
      return {
        title: text(el, 'title'),
        link: isAtom ? atomLink(el) : text(el, 'link'),
        date: date && !isNaN(date) ? date : null,
        summary: plainText(text(el, 'description', 'summary', 'content')),
      }
    })
    .filter(a => a.title && /^https?:\/\//.test(a.link))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
}

export function formatArticleDate(date) {
  return date ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''
}

export function useSIArticles(limit = 5) {
  return useQuery({
    queryKey: ['si-articles'],
    queryFn: async () => {
      const res = await fetch(FEED_URL)
      if (!res.ok) throw new Error(`Feed request failed: ${res.status}`)
      return parseFeed(await res.text())
    },
    select: articles => articles.slice(0, limit),
    staleTime: 60 * 60_000,
    retry: 1,
  })
}
