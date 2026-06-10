import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const MAX_CHARS = 1000

export default function FeedbackButton() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('feedback')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  const remaining = MAX_CHARS - message.length

  function handleOpen() {
    setOpen(true)
    setStatus('idle')
    setMessage('')
    setType('feedback')
  }

  function handleClose() {
    if (status === 'submitting') return
    setOpen(false)
  }

  async function handleSubmit() {
    if (!message.trim() || status === 'submitting') return
    setStatus('submitting')

    const { error } = await supabase.from('feedback').insert({
      user_id: profile?.id ?? null,
      type,
      message: message.trim(),
      page_url: window.location.pathname,
      user_type: profile?.type ?? null,
    })

    if (error) {
      console.error('Feedback submission error:', error)
      setStatus('error')
    } else {
      setStatus('success')
      fetch(import.meta.env.VITE_DISCORD_FEEDBACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `**new ${type}** from ${profile?.type ?? 'anon'} on \`${window.location.pathname}\`\n> ${message.trim()}`,
        }),
      }).catch(() => {})
    }

  return (
    <>
      {/* Fixed side tab */}
      <button
        onClick={handleOpen}
        aria-label="Share feedback"
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%) rotate(180deg)',
          writingMode: 'vertical-rl',
          zIndex: 1000,
          padding: '12px 8px',
          background: 'var(--color-primary, #2E8FBE)',
          color: '#fff',
          border: 'none',
          borderRadius: '0 6px 6px 0',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          opacity: 0.85,
          transition: 'opacity 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
      >
        feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          {/* Modal */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-surface, #fff)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {status === 'success' ? (
              <SuccessState onClose={handleClose} type={type} />
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text, #111)' }}>
                    {type === 'bug' ? 'report a bug' : 'share feedback'}
                  </h2>
                  <button
                    onClick={handleClose}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      lineHeight: 1,
                      color: 'var(--color-text-muted, #888)',
                      padding: '2px 6px',
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Type toggle */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['feedback', 'bug'].map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: `2px solid ${type === t ? 'var(--color-primary, #2E8FBE)' : 'var(--color-border, #ddd)'}`,
                        borderRadius: '8px',
                        background: type === t ? 'var(--color-primary-light, #e8f4fb)' : 'transparent',
                        color: type === t ? 'var(--color-primary, #2E8FBE)' : 'var(--color-text-muted, #888)',
                        fontWeight: type === t ? 700 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t === 'feedback' ? '💬 general feedback' : '🐛 report a bug'}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                    placeholder={
                      type === 'bug'
                        ? 'what happened, and what did you expect to happen?'
                        : 'what\'s on your mind...'
                    }
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--color-border, #ddd)',
                      background: 'var(--color-input-bg, #fafafa)',
                      color: 'var(--color-text, #111)',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary, #2E8FBE)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border, #ddd)')}
                    disabled={status === 'submitting'}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '10px',
                      fontSize: '11px',
                      color: remaining < 100 ? 'var(--color-warning, #e09000)' : 'var(--color-text-muted, #aaa)',
                    }}
                  >
                    {remaining}
                  </span>
                </div>

                {/* Error */}
                {status === 'error' && (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-error, #c0392b)' }}>
                    something went wrong — please try again.
                  </p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    onClick={handleClose}
                    disabled={status === 'submitting'}
                    style={{
                      padding: '9px 18px',
                      border: '1.5px solid var(--color-border, #ddd)',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: 'var(--color-text-muted, #888)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || status === 'submitting'}
                    style={{
                      padding: '9px 18px',
                      border: 'none',
                      borderRadius: '8px',
                      background: !message.trim() || status === 'submitting'
                        ? 'var(--color-border, #ddd)'
                        : 'var(--color-primary, #2E8FBE)',
                      color: !message.trim() || status === 'submitting' ? 'var(--color-text-muted, #888)' : '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: !message.trim() || status === 'submitting' ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                      minWidth: '80px',
                    }}
                  >
                    {status === 'submitting' ? 'sending...' : 'send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function SuccessState({ onClose, type }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div style={{ fontSize: '36px' }}>{type === 'bug' ? '🐛' : '✦'}</div>
      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text, #111)' }}>
        {type === 'bug' ? 'bug reported' : 'thanks for the feedback'}
      </h2>
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-muted, #888)', maxWidth: '280px' }}>
        {type === 'bug'
          ? "we'll look into it."
          : "every note helps build a better socion."}
      </p>
      <button
        onClick={onClose}
        style={{
          marginTop: '8px',
          padding: '9px 24px',
          border: 'none',
          borderRadius: '8px',
          background: 'var(--color-primary, #2E8FBE)',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        close
      </button>
    </div>
  )
}
