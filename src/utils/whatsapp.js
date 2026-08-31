import { parsePhone } from '../data/countries.js'
import { shop } from '../data/shop.js'
import { formatINR } from './format.js'
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

// The full "your order is ready" message, in English and then Telugu: what's
// ready, the itemised garments, what's already been paid and what's still
// owed at pickup, where to collect it, and who to call.
//
// Both languages are always included — the shop's customers are mixed, and
// picking one per customer would need a language field on `users` that
// doesn't exist. The two blocks are kept whole and separated rather than
// interleaved line by line, which is far easier to read in a chat.
//
// Everything is optional: an order with no items, no price, or no name on
// file just drops that part of both blocks rather than printing an empty
// heading or "₹0".
export function orderReadyMessage({ customerName, orderId, items = [], order = {} }) {
  const name = String(customerName ?? '').trim()

  // Garment names are the shop's own catalogue terms and are stored in
  // English, so the item list itself is identical in both blocks — only the
  // heading above it changes.
  const itemLines = (items ?? [])
    .map((item) => {
      const label = garmentLabel(item)
      if (!label) return null
      const quantity = Number(item.quantity) || 1
      return `• ${label}${quantity > 1 ? ` × ${quantity}` : ''}`
    })
    .filter(Boolean)

  const total = Number(order?.quoted_amount) || 0
  const paid = Number(order?.advance_paid) || 0
  const balance = total - paid

  const english = [`Hi ${name || 'there'},`, '']
  english.push(`Your order ORD-${orderId} is ready for pickup at ${shop.name}.`)
  if (itemLines.length > 0) english.push('', 'Your items:', ...itemLines)
  if (total > 0) {
    english.push('', `Total: ${formatINR(total)}`)
    if (paid > 0) english.push(`Advance paid: ${formatINR(paid)}`)
    // A balance of 0 (or negative, if they somehow overpaid) should read as
    // settled rather than printing "Balance due: ₹0".
    english.push(
      balance > 0
        ? `Balance due at pickup: ${formatINR(balance)}`
        : 'Fully paid — nothing due at pickup.',
    )
  }
  english.push('', 'Pickup address:', shop.address)
  english.push('', `Any questions, please call us on ${shop.phone}.`)
  english.push('', `Thank you for choosing ${shop.name}!`)

  // "గారు" is the respectful suffix that goes after a customer's name; with
  // no name on file the greeting stands on its own instead. The address
  // stays in English — that's how it's written on the street and how a
  // delivery app or maps search expects it.
  const telugu = [name ? `నమస్కారం ${name} గారు,` : 'నమస్కారం,', '']
  telugu.push(`మీ ఆర్డర్ ORD-${orderId} సిద్ధంగా ఉంది — ${shop.name} నుండి తీసుకోవచ్చు.`)
  if (itemLines.length > 0) telugu.push('', 'మీ వస్తువులు:', ...itemLines)
  if (total > 0) {
    telugu.push('', `మొత్తం: ${formatINR(total)}`)
    if (paid > 0) telugu.push(`అడ్వాన్స్ చెల్లించినది: ${formatINR(paid)}`)
    telugu.push(
      balance > 0
        ? `తీసుకునేటప్పుడు చెల్లించవలసినది: ${formatINR(balance)}`
        : 'పూర్తిగా చెల్లించారు — ఇంకా చెల్లించవలసినది ఏమీ లేదు.',
    )
  }
  telugu.push('', 'చిరునామా:', shop.address)
  telugu.push('', `ఏవైనా సందేహాలు ఉంటే ${shop.phone} కి కాల్ చేయండి.`)
  telugu.push('', `${shop.name} ని ఎంచుకున్నందుకు ధన్యవాదాలు!`)

  return [...english, '', '— — — — —', '', ...telugu].join('\n')
}
