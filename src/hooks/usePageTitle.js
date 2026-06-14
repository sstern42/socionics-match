import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `Socion™ — ${title}` : 'Socion™'
    return () => { document.title = 'Socion™' }
  }, [title])
}
