import { jsPDF } from 'jspdf'
import { measurementFields } from '../data/measurementFields.js'
import { formatCustomerId } from './format.js'
import { garmentLabel } from './orderItems.js'

// jsPDF's built-in standard fonts (Helvetica/Times/Courier) use an old
// PDF font encoding that doesn't include the ₹ glyph (U+20B9) — rendering
// it produces garbled/superscript characters instead of the symbol. "Rs."
// is a safe ASCII stand-in for the PDF only; formatINR (with the real ₹
// symbol) is still used everywhere in the web UI, where it renders fine.
function formatAmountForPdf(value) {
  return `Rs. ${Math.round(value).toLocaleString('en-IN')}`
}

function imageUrlToDataUrl(url) {
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`image fetch failed: ${res.status}`)
      return res.blob()
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        }),
    )
}

function loadImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

// Builds and downloads a one-page receipt PDF for a tailor: order + customer
// details, an itemized garment/price breakdown, measurements, and the
// design reference photo when available.
export async function generateReceiptPdf({ order, customer, items = [] }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const qtyX = margin + 260
  const priceX = margin + 350
  const totalX = pageWidth - margin
  let y = 50

  // Only the design-image placement had page-break protection before —
  // a long item list, designer instructions, or a fully-filled measurement
  // sheet could silently run off the bottom of the page. This guards any
  // section that's about to draw `minRemaining` more points of content.
  function ensurePageSpace(minRemaining) {
    if (y + minRemaining > pageHeight - margin) {
      doc.addPage()
      y = 50
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Changing Seasons', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  y += 16
  doc.text('By Sandhya Reddy — Road No. 10, Banjara Hills, SB Khan building, Hyderabad', margin, y)
  y += 12
  doc.text('9705700027 / 8008077077', margin, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Order #ORD-${order.id}`, pageWidth - margin, 50, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    order.created_at ? new Date(order.created_at).toLocaleDateString() : '',
    pageWidth - margin,
    64,
    { align: 'right' },
  )

  y += 20
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 26

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Customer', margin, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${customer?.name ?? 'Unknown'}  (ID ${customer ? formatCustomerId(customer.id) : '-'})`, margin, y)
  y += 14
  doc.text(`Phone: ${customer?.phone ?? '-'}`, margin, y)

  y += 26
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Order Details', margin, y)
  y += 18

  // Itemized garment / quantity / price breakdown.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Item', margin, y)
  doc.text('Qty', qtyX, y, { align: 'right' })
  doc.text('Unit Price', priceX, y, { align: 'right' })
  doc.text('Line Total', totalX, y, { align: 'right' })
  y += 6
  doc.setDrawColor(220)
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (items.length === 0) {
    doc.text('No items recorded.', margin, y)
    y += 15
  } else {
    for (const item of items) {
      ensurePageSpace(15)
      const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
      doc.text(garmentLabel(item), margin, y)
      doc.text(String(item.quantity), qtyX, y, { align: 'right' })
      doc.text(formatAmountForPdf(item.unit_price ?? 0), priceX, y, { align: 'right' })
      doc.text(formatAmountForPdf(lineTotal), totalX, y, { align: 'right' })
      y += 15
    }
  }

  y += 8
  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 20

  // Pricing summary — visually distinct from the plain detail rows below:
  // right-aligned like the header block, with Balance due given the most
  // prominent treatment since it's the number that matters most at pickup.
  ensurePageSpace(58)
  const balance = Number(order.quoted_amount ?? 0) - Number(order.advance_paid ?? 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Quoted amount', margin, y)
  doc.text(formatAmountForPdf(order.quoted_amount ?? 0), totalX, y, { align: 'right' })
  y += 16
  doc.text('Advance paid', margin, y)
  doc.text(formatAmountForPdf(order.advance_paid ?? 0), totalX, y, { align: 'right' })
  y += 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Balance due', margin, y)
  doc.text(formatAmountForPdf(balance), totalX, y, { align: 'right' })
  y += 22

  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 20

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const detailRows = [
    ['Due date', order.due_date ?? '-'],
    ['Status', order.order_status],
  ]
  for (const [label, value] of detailRows) {
    ensurePageSpace(15)
    doc.text(`${label}:`, margin, y)
    doc.text(String(value), margin + 130, y)
    y += 15
  }

  if (order.designer_instructions) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(order.designer_instructions, pageWidth - margin * 2)
    ensurePageSpace(8 + 14 + lines.length * 12)
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Designer Instructions', margin, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.text(lines, margin, y)
    y += lines.length * 12
  }

  ensurePageSpace(36)
  y += 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Measurements', margin, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const measurements = order.measurements ?? {}
  const filled = measurementFields.filter((f) => measurements[f.key])
  if (filled.length === 0) {
    doc.text('No measurements recorded.', margin, y)
    y += 14
  } else {
    const colWidth = (pageWidth - margin * 2) / 2
    filled.forEach((f, i) => {
      const col = i % 2
      if (col === 0) ensurePageSpace(14)
      doc.text(`${f.label}: ${measurements[f.key]}`, margin + col * colWidth, y)
      if (col === 1) y += 14
    })
    if (filled.length % 2 === 1) y += 14
  }

  if (order.design_image_url) {
    try {
      const dataUrl = await imageUrlToDataUrl(order.design_image_url)
      const format = dataUrl.match(/data:image\/(\w+);/)?.[1]?.toUpperCase() ?? 'JPEG'
      const { width, height } = await loadImageDimensions(dataUrl)
      const maxW = 200
      const maxH = 200
      const scale = Math.min(maxW / width, maxH / height, 1)
      const w = width * scale
      const h = height * scale

      y += 16
      if (y + h > pageHeight - 40) {
        doc.addPage()
        y = 50
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Design Reference', margin, y)
      y += 10
      doc.addImage(dataUrl, format, margin, y, w, h)
    } catch (err) {
      console.warn('[generateReceiptPdf] could not embed design image:', err)
    }
  }

  doc.save(`receipt-ORD-${order.id}.pdf`)
}
