import { useEffect } from 'react'

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `Socion™ — ${title}` : 'Socion™'
    return () => { document.title = 'Socion™' }
  }, [title])

  useEffect(() => {
    if (!description) return
    let tag = document.querySelector('meta[name="description"]')
    const prev = tag?.getAttribute('content') ?? null
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', description)
    return () => {
      if (prev !== null) tag.setAttribute('content', prev)
    }
  }, [description])
}
