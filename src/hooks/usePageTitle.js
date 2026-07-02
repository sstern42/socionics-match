import { useEffect } from 'react'
import { setBaseTitle } from '../lib/pageTitle'

export function usePageTitle(title) {
  useEffect(() => {
    setBaseTitle(title ? `Socion™ — ${title}` : 'Socion™')
    return () => setBaseTitle('Socion™')
  }, [title])
}
