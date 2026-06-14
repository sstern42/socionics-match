import { useEffect } from 'react'

function setMeta(selector, attr, value, prev) {
  let tag = document.querySelector(selector)
  const prevVal = tag?.getAttribute(attr) ?? null
  if (!tag) {
    const [attrName, attrVal] = selector.match(/\[([^=]+)="([^"]+)"\]/).slice(1)
    tag = document.createElement('meta')
    tag.setAttribute(attrName, attrVal)
    document.head.appendChild(tag)
  }
  tag.setAttribute(attr, value)
  return prevVal
}

export function usePageMeta(title, description) {
  useEffect(() => {
    const prev = document.title
    document.title = title ?? 'Socion™'
    return () => { document.title = prev }
  }, [title])

  useEffect(() => {
    if (!description && !title) return
    const url = window.location.href

    const prevs = {}
    if (title) {
      prevs.ogTitle    = setMeta('meta[property="og:title"]',       'content', title)
      prevs.twTitle    = setMeta('meta[name="twitter:title"]',      'content', title)
    }
    if (description) {
      prevs.desc       = setMeta('meta[name="description"]',        'content', description)
      prevs.ogDesc     = setMeta('meta[property="og:description"]', 'content', description)
      prevs.twDesc     = setMeta('meta[name="twitter:description"]','content', description)
    }
    prevs.ogUrl      = setMeta('meta[property="og:url"]',           'content', url)
    prevs.twUrl      = setMeta('meta[name="twitter:url"]',          'content', url)

    return () => {
      const restore = (sel, attr, val) => {
        if (val !== null) document.querySelector(sel)?.setAttribute(attr, val)
      }
      if (title) {
        restore('meta[property="og:title"]',        'content', prevs.ogTitle)
        restore('meta[name="twitter:title"]',       'content', prevs.twTitle)
      }
      if (description) {
        restore('meta[name="description"]',         'content', prevs.desc)
        restore('meta[property="og:description"]',  'content', prevs.ogDesc)
        restore('meta[name="twitter:description"]', 'content', prevs.twDesc)
      }
      restore('meta[property="og:url"]',            'content', prevs.ogUrl)
      restore('meta[name="twitter:url"]',           'content', prevs.twUrl)
    }
  }, [title, description])
}
