import { useState, useRef } from 'react'
import { searchMentionableUsers } from '../../lib/mentions'

const MENTION_PATTERN = /(?:^|\s)@(\w{1,30})$/

// Textarea with @mention autocomplete for Board post/comment composers (#829).
// `mentionedIds`/`onMentionsChange` track which users were actually picked
// from the dropdown — that id list, not a regex over the saved text, is what
// gets persisted and notified server-side, so it stays correct even if two
// members share a display name.
export default function MentionTextarea({
  value, onChange, mentionedIds, onMentionsChange,
  excludeUserId, placeholder, rows = 4, maxLength, disabled, style,
}) {
  const [suggestions, setSuggestions] = useState([])
  const textareaRef = useRef(null)
  const debounceRef = useRef(null)

  function handleChange(e) {
    const text = e.target.value
    onChange(text)

    const cursor = e.target.selectionStart
    const match = text.slice(0, cursor).match(MENTION_PATTERN)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!match) {
      setSuggestions([])
      return
    }
    const query = match[1]
    debounceRef.current = setTimeout(async () => {
      try {
        setSuggestions(await searchMentionableUsers(query, { excludeUserId }))
      } catch {
        setSuggestions([])
      }
    }, 200)
  }

  function selectMention(user) {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursor = textarea.selectionStart
    const upToCursor = value.slice(0, cursor)
    const match = upToCursor.match(MENTION_PATTERN)
    if (!match) { setSuggestions([]); return }

    const startOfAt = upToCursor.length - match[0].length + (match[0].startsWith(' ') ? 1 : 0)
    const before = value.slice(0, startOfAt)
    const after = value.slice(cursor)
    const insertion = `@${user.name} `
    onChange(before + insertion + after)
    onMentionsChange(mentionedIds.includes(user.id) ? mentionedIds : [...mentionedIds, user.id])
    setSuggestions([])

    requestAnimationFrame(() => {
      const pos = before.length + insertion.length
      textarea.focus()
      textarea.setSelectionRange(pos, pos)
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        className="input-standalone"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        style={style}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, zIndex: 20,
          background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
        }}>
          {suggestions.map(u => (
            <button
              key={u.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => selectMention(u)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                padding: '0.5rem 0.75rem', background: 'none', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {u.avatarUrl
                  ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{u.name[0]?.toUpperCase()}</span>}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{u.name}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: 'auto' }}>{u.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
