import { useCallback, useEffect, useRef, useState } from 'react'
import { IconLeaf, IconAlert } from '../components/Icons.jsx'
import { probeConnection } from '../lib/connectionStatus.js'
import './ServerDown.css'

const RETRY_SECONDS = 10

// Shown in place of the whole app whenever Supabase can't be reached. It
// keeps retrying on its own — the admin shouldn't have to sit and refresh —
// and the moment a probe succeeds the connection state flips back and the
// app remounts where it was.
export default function ServerDown() {
  const [checking, setChecking] = useState(false)
  const [countdown, setCountdown] = useState(RETRY_SECONDS)
  // A ref, not the state, guards re-entry: the automatic timer and a manual
  // click can land together, and `checking` would still read false in the
  // click handler's closure.
  const checkingRef = useRef(false)

  const runProbe = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true
    setChecking(true)
    try {
      await probeConnection()
    } finally {
      checkingRef.current = false
      setChecking(false)
      // Resyncs the visible countdown with the probe that just ran, so a
      // manual retry doesn't leave the timer showing a stale number.
      setCountdown(RETRY_SECONDS)
    }
  }, [])

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((current) => (current <= 1 ? RETRY_SECONDS : current - 1))
    }, 1000)
    const retry = setInterval(runProbe, RETRY_SECONDS * 1000)
    return () => {
      clearInterval(tick)
      clearInterval(retry)
    }
  }, [runProbe])

  return (
    <div className="server-down-page">
      <div className="server-down-card">
        <div className="login-brand">
          <span className="brand-mark">
            <IconLeaf size={22} />
          </span>
          <div className="brand-text">
            <strong>Change Seasons</strong>
            <span>Boutique Admin</span>
          </div>
        </div>

        <span className="server-down-icon">
          <IconAlert size={26} />
        </span>

        <h1>Can&apos;t reach the server</h1>
        <p>
          The dashboard is up, but it can&apos;t connect to the database right now. This is usually
          a dropped internet connection at this end, or Supabase being briefly unavailable.
        </p>
        <p className="server-down-reassure">
          Nothing has been lost. Your data is safe and the dashboard will come straight back as soon
          as the connection returns.
        </p>

        <button className="btn btn-primary" onClick={runProbe} disabled={checking}>
          {checking ? 'Checking...' : 'Try again now'}
        </button>

        <p className="server-down-countdown">
          {checking ? 'Contacting the server...' : `Retrying automatically in ${countdown}s`}
        </p>
      </div>
    </div>
  )
}
