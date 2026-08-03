import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { countries, flagEmoji, parsePhone } from '../data/countries.js'
import { useFloatingPosition } from '../hooks/useFloatingPosition.js'
import { IconChevronDown } from './Icons.jsx'
import './PhoneInput.css'

// A phone field with a country picker (flag + dial code) in front of it, so
// a customer's number can be tagged with the country it's actually from —
// this boutique doesn't only serve India-based customers. `value`/`onChange`
// carry the full string (e.g. "+91 98765 43210"); country + local number are
// only split apart internally for editing.
export default function PhoneInput({ value, onChange, autoFocus = false }) {
  const [country, setCountry] = useState(() => parsePhone(value).country)
  const [number, setNumber] = useState(() => parsePhone(value).number)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const coords = useFloatingPosition(open, buttonRef, { width: 280, height: 320 })

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e) {
      if (
        buttonRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return
      }
      setOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  function toggleOpen() {
    setOpen((current) => {
      const next = !current
      if (next) setQuery('')
      return next
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return countries
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.dial.includes(q))
  }, [query])

  function selectCountry(c) {
    setCountry(c)
    setOpen(false)
    onChange(`${c.dial} ${number}`.trim())
  }

  function handleNumberChange(e) {
    const next = e.target.value
    setNumber(next)
    onChange(`${country.dial} ${next}`.trim())
  }

  return (
    <div className="phone-input">
      <button
        type="button"
        ref={buttonRef}
        className="phone-input-country"
        onClick={toggleOpen}
        aria-label={`Country: ${country.name}`}
      >
        <span className="phone-input-flag">{flagEmoji(country.code)}</span>
        <span>{country.dial}</span>
        <IconChevronDown size={13} />
      </button>
      <input
        type="tel"
        placeholder="98765 43210"
        value={number}
        onChange={handleNumberChange}
        autoFocus={autoFocus}
      />

      {open && coords &&
        createPortal(
          <div className="phone-country-panel" ref={panelRef} style={{ top: coords.top, right: coords.right }}>
            <input
              ref={searchRef}
              type="text"
              className="phone-country-search"
              placeholder="Search country or code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="phone-country-list">
              {filtered.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  className={`phone-country-item ${c.code === country.code ? 'is-active' : ''}`}
                  onClick={() => selectCountry(c)}
                >
                  <span className="phone-input-flag">{flagEmoji(c.code)}</span>
                  <span className="phone-country-name">{c.name}</span>
                  <span className="phone-country-dial">{c.dial}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="empty-row">No matches.</p>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
