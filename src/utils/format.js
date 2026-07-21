export function formatINR(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

export function formatCustomerId(id) {
  return String(id).padStart(4, '0')
}
