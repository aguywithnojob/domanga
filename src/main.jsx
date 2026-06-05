import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Service workers don't work (and crash) inside Capacitor native apps — skip entirely
const isNative = !!window.Capacitor?.isNativePlatform?.()

if (!isNative) {
  registerSW({ immediate: true })
}

// Capture install prompt as early as possible — before React mounts
window.__installPrompt = null
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  window.__installPrompt = e
  console.log('[PWA] beforeinstallprompt captured')
})
window.addEventListener('appinstalled', () => {
  window.__installPrompt = null
  console.log('[PWA] appinstalled fired')
})

// Force SW update check every time the user comes back to the app
// Only in browser — not in native Capacitor app
if (!isNative && 'serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {})
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
