import { createContext, useContext, useEffect, useState } from 'react'

// Three states: 'system' | 'light' | 'dark'
// 'system' follows prefers-color-scheme; the other two are explicit overrides.

const STORAGE_KEY = 'socion_theme'
const ThemeContext = createContext(null)

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveIsDark(preference) {
  if (preference === 'dark')   return true
  if (preference === 'light')  return false
  return getSystemDark()
}

function applyTheme(isDark) {
  document.documentElement.classList.toggle('dark', isDark)
  // Update the PWA theme-color meta tag to match
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = isDark ? '#13120e' : '#9a6f38'
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) ?? 'system'
  })

  // Apply on mount and whenever preference changes
  useEffect(() => {
    applyTheme(resolveIsDark(preference))
  }, [preference])

  // When preference is 'system', follow OS changes live
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => applyTheme(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  function setTheme(value) {
    localStorage.setItem(STORAGE_KEY, value)
    setPreference(value)
  }

  const isDark = resolveIsDark(preference)

  return (
    <ThemeContext.Provider value={{ preference, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
