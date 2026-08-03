// WhatsApp's "click to chat" link — free, no API/account needed, but it can
// only pre-fill a chat with a draft message. WhatsApp itself doesn't allow
// any link to auto-send; whoever clicks it still has to tap Send inside
// WhatsApp. True zero-touch sending needs the paid Business Cloud API.
export function buildWhatsAppLink(phone, message) {
  const digits = (phone ?? '').replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function orderReadyMessage({ customerName, orderId, itemsSummary }) {
  const garment = itemsSummary ? ` (${itemsSummary})` : ''
  return `Hi ${customerName}, your order ORD-${orderId}${garment} is ready for pickup at Changing Seasons. Thank you!`
}
