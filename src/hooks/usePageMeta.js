import { useEffect } from 'react'
import { setBaseTitle } from '../lib/pageTitle'

function getMeta(selector) {
  return document.querySelector(selector)
}

function setMeta(selector, value) {
  const tag = getMeta(selector)
  if (tag) tag.setAttribute('content', value)
}

export function usePageMeta(title, description) {
  useEffect(() => {
    const prevOgT    = getMeta('meta[property="og:title"]')?.getAttribute('content')
    const prevTwT    = getMeta('meta[name="twitter:title"]')?.getAttribute('content')
    setBaseTitle(title ?? 'Socion™')
    setMeta('meta[property="og:title"]',  title ?? 'Socion™')
    setMeta('meta[name="twitter:title"]', title ?? 'Socion™')
    return () => {
      setBaseTitle('Socion™')
      if (prevOgT !== undefined) setMeta('meta[property="og:title"]',  prevOgT)
      if (prevTwT !== undefined) setMeta('meta[name="twitter:title"]', prevTwT)
    }
  }, [title])

  useEffect(() => {
    const prevOgUrl = getMeta('meta[property="og:url"]')?.getAttribute('content')
    const prevTwUrl = getMeta('meta[name="twitter:url"]')?.getAttribute('content')
    const url = window.location.href
    setMeta('meta[property="og:url"]',  url)
    setMeta('meta[name="twitter:url"]', url)
    return () => {
      if (prevOgUrl !== undefined) setMeta('meta[property="og:url"]',  prevOgUrl)
      if (prevTwUrl !== undefined) setMeta('meta[name="twitter:url"]', prevTwUrl)
    }
  }, [])

  useEffect(() => {
    if (!description) return
    const prevDesc  = getMeta('meta[name="description"]')?.getAttribute('content')
    const prevOgD   = getMeta('meta[property="og:description"]')?.getAttribute('content')
    const prevTwD   = getMeta('meta[name="twitter:description"]')?.getAttribute('content')
    setMeta('meta[name="description"]',         description)
    setMeta('meta[property="og:description"]',  description)
    setMeta('meta[name="twitter:description"]', description)
    return () => {
      if (prevDesc !== undefined) setMeta('meta[name="description"]',         prevDesc)
      if (prevOgD  !== undefined) setMeta('meta[property="og:description"]',  prevOgD)
      if (prevTwD  !== undefined) setMeta('meta[name="twitter:description"]', prevTwD)
    }
  }, [description])
}
