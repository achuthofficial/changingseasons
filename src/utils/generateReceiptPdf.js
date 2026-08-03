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

function drawShopHeader(doc, { margin, y, order }) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Changing Seasons', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  y += 16
  doc.text('By Sandhya Reddy — Road No. 10, Banjara Hills, SB Khan building, Hyderabad', margin, y)
  y += 12
  doc.text('9705700027 / 8008077077', margin, y)

  const pageWidth = doc.internal.pageSize.getWidth()
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
  return y + 26
}

// Builds and downloads the customer-facing invoice for the whole order: an
// itemized garment/price breakdown and the payment summary. Deliberately
// doesn't include measurements, design photos, or designer instructions —
// those are tailor working documents, not something the customer needs (see
// generateTailorReceiptPdfs below).
export async function generateCustomerReceiptPdf({ order, customer, items = [] }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const qtyX = margin + 260
  const priceX = margin + 350
  const totalX = pageWidth - margin

  function ensurePageSpace(currentY, minRemaining) {
    if (currentY + minRemaining > pageHeight - margin) {
      doc.addPage()
      return 50
    }
    return currentY
  }

  let y = drawShopHeader(doc, { margin, y: 50, order })

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
      y = ensurePageSpace(y, 15)
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

  // Pricing summary — right-aligned like the header block, with Balance due
  // given the most prominent treatment since it's the number that matters
  // most at pickup.
  y = ensurePageSpace(y, 58)
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
    y = ensurePageSpace(y, 15)
    doc.text(`${label}:`, margin, y)
    doc.text(String(value), margin + 130, y)
    y += 15
  }

  doc.save(`receipt-ORD-${order.id}.pdf`)
}

// Builds and downloads one separate PDF per item — a tailor's working job
// card for that specific garment: who it's for (name/phone, so the tailor
// knows whose order this is), the due date, the shop's general instructions
// for the order, and that item's own measurements and design reference
// photo. Each item can have completely different measurements/design from
// the others in the same order, so each gets its own document rather than
// one shared sheet.
export async function generateTailorReceiptPdfs({ order, customer, items = [] }) {
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40

    function ensurePageSpace(currentY, minRemaining) {
      if (currentY + minRemaining > pageHeight - margin) {
        doc.addPage()
        return 50
      }
      return currentY
    }

    let y = drawShopHeader(doc, { margin, y: 50, order })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(`Tailor Job Card — Item ${index + 1} of ${items.length}`, margin, y)
    y += 18
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`${garmentLabel(item)}${item.quantity > 1 ? `  x ${item.quantity}` : ''}`, margin, y)
    y += 24

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Customer', margin, y)
    y += 16
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`${customer?.name ?? 'Unknown'}  (ID ${customer ? formatCustomerId(customer.id) : '-'})`, margin, y)
    y += 14
    doc.text(`Phone: ${customer?.phone ?? '-'}`, margin, y)
    if (customer?.alternate_phone) {
      y += 14
      doc.text(`Alternate phone: ${customer.alternate_phone}`, margin, y)
    }
    y += 14
    doc.text(`Due date: ${order.due_date ?? '-'}`, margin, y)

    if (order.designer_instructions) {
      y += 20
      const lines = doc.splitTextToSize(order.designer_instructions, pageWidth - margin * 2)
      y = ensurePageSpace(y, 14 + lines.length * 12)
      doc.setFont('helvetica', 'bold')
      doc.text('Designer Instructions', margin, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(lines, margin, y)
      y += lines.length * 12
    }

    y = ensurePageSpace(y, 36)
    y += 16
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Measurements', margin, y)
    y += 16
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    const measurements = item.measurements ?? {}
    const filled = measurementFields.filter((f) => measurements[f.key])
    if (filled.length === 0) {
      doc.text('No measurements recorded.', margin, y)
      y += 14
    } else {
      const colWidth = (pageWidth - margin * 2) / 2
      filled.forEach((f, i) => {
        const col = i % 2
        if (col === 0) y = ensurePageSpace(y, 14)
        doc.text(`${f.label}: ${measurements[f.key]}`, margin + col * colWidth, y)
        if (col === 1) y += 14
      })
      if (filled.length % 2 === 1) y += 14
    }

    if (item.design_image_url) {
      try {
        const dataUrl = await imageUrlToDataUrl(item.design_image_url)
        const format = dataUrl.match(/data:image\/(\w+);/)?.[1]?.toUpperCase() ?? 'JPEG'
        const { width, height } = await loadImageDimensions(dataUrl)
        const maxW = 220
        const maxH = 220
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
        console.warn('[generateTailorReceiptPdfs] could not embed design image:', err)
      }
    }

    doc.save(`receipt-tailor-ORD-${order.id}-item-${index + 1}.pdf`)
  }
}
