import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

function getDeviceHint() {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/macintosh/i.test(ua)) return 'mac'
  if (/windows/i.test(ua)) return 'windows'
  return 'other'
}

async function getAuthUid() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

export function usePushNotifications(userId) {
  const supported =
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  const [permission, setPermission] = useState(() =>
    supported ? Notification.permission : 'unsupported'
  )
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!supported || !userId) return
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    )
  }, [userId, supported])

  async function subscribe() {
    if (!supported || !userId || !VAPID_PUBLIC_KEY) return

    const reg = await navigator.serviceWorker.ready
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return

    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const authUid = await getAuthUid()
      if (!authUid) throw new Error('No auth session')

      // Upsert by endpoint — one row per device
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: authUid,
            subscription: sub.toJSON(),
            device_hint: getDeviceHint(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        )

      if (error) throw error
      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe failed:', err)
    }
  }

  async function unsubscribe() {
    if (!supported) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      // Delete only this device's row by endpoint
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
    }
    setSubscribed(false)
  }

  return { supported, permission, subscribed, subscribe, unsubscribe }
}
