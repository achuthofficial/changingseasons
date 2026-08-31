import { parsePhone } from '../data/countries.js'
import { shop } from '../data/shop.js'
import { garmentLabel } from './orderItems.js'

// WhatsApp's "click to chat" link — free, no API/account needed, but it can
// only pre-fill a chat with a draft message. WhatsApp itself doesn't allow
// any link to auto-send; whoever clicks it still has to tap Send inside
// WhatsApp. It also can't choose the sender: the message goes out from
// whichever account is signed in on the device that clicks, so the shop's
// phone (or WhatsApp Web) must be logged in as shop.phone.

// Every number stored without an explicit country code is treated as
// Indian — the same default the country picker in PhoneInput uses.
const DEFAULT_DIAL_CODE = '91'

// E.164 allows 15 digits max including the country code; the shortest real
// international numbers are around 7. Anything outside that can't be dialled.
const MIN_DIGITS = 7
const MAX_DIGITS = 15

// wa.me needs a bare international number: country code + subscriber
// number, digits only — no '+', spaces, dashes, or leading zeros. A number
// that doesn't normalise to that either 404s or, worse, opens a chat with
// whoever does own those digits, so normalise here rather than trusting
// however the number happened to get typed in.
// Returns null when the value can't make a dialable number, so callers can
// hide the button instead of offering a broken link.
function inE164Range(digits) {
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS
}

export function normalizeWhatsAppNumber(phone) {
  const raw = String(phone ?? '').trim()
  const digitsOnly = raw.replace(/\D/g, '')
  if (!digitsOnly) return null

  // Does this number carry its own country code? Either written with a
  // leading '+', or with '00', the international prefix used in its place.
  const explicit = raw.startsWith('+')
    ? `+${digitsOnly}`
    : digitsOnly.startsWith('00')
      ? `+${digitsOnly.slice(2)}`
      : null

  if (explicit) {
    // Reuses the same longest-code-first matching the phone input uses, so
    // '+1868' (Trinidad) resolves before the shorter '+1'.
    const { country, number } = parsePhone(explicit)
    // parsePhone falls back to India whenever it recognises no dial code.
    // That fallback must not be used to prefix an unrecognised '+' number,
    // or a '+999…' would come back with a bogus 91 stuck on the front —
    // trust the digits as already complete instead.
    if (!explicit.startsWith(country.dial)) {
      return inE164Range(digitsOnly) ? digitsOnly : null
    }
    // The country code is explicit, so whatever follows is a *national*
    // number: strip a trunk '0' ("+91 09876543210", "+44 07911 123456").
    // The trunk prefix is national-dialling notation and is never part of
    // the international form — leaving it in silently produces a number
    // one digit too long that belongs to nobody.
    const local = number.replace(/\D/g, '').replace(/^0+/, '')
    if (!local) return null
    const digits = country.dial.replace(/\D/g, '') + local
    return inE164Range(digits) ? digits : null
  }

  // No country code at all. Strip a trunk '0', then treat a bare 10-digit
  // number as an Indian mobile; anything longer is assumed to already carry
  // its own country code (a legacy "919876543210" row, say) rather than
  // being prefixed a second time.
  const local = digitsOnly.replace(/^0+/, '')
  if (!local) return null
  const digits = local.length === 10 ? DEFAULT_DIAL_CODE + local : local
  return inE164Range(digits) ? digits : null
}

// Returns null (not a broken URL) when the number is unusable — callers
// must handle that, which is the point.
export function buildWhatsAppLink(phone, message) {
  const number = normalizeWhatsAppNumber(phone)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

// The "your order is ready" message: a greeting, what's ready, and the
// itemised garments. Deliberately says nothing about money — the amounts
// belong on the receipt, not in a notification the customer may read in
// public or forward on.
//
// Everything except the order number is optional: an order with no items or
// no name on file drops that part rather than printing an empty heading.
export function orderReadyMessage({ customerName, orderId, items = [] }) {
  const name = String(customerName ?? '').trim()

  const itemLines = (items ?? [])
    .map((item) => {
      const label = garmentLabel(item)
      if (!label) return null
      const quantity = Number(item.quantity) || 1
      return `• ${label}${quantity > 1 ? ` × ${quantity}` : ''}`
    })
    .filter(Boolean)

  const lines = [`Hi ${name || 'there'},`, '']
  lines.push(`Your order ORD-${orderId} is ready for pickup at ${shop.name}.`)
  if (itemLines.length > 0) lines.push('', 'Your items:', ...itemLines)
  lines.push('', `Any questions, please call us on ${shop.phone}.`)
  lines.push('', `Thank you for choosing ${shop.name}!`)

  return lines.join('\n')
}
