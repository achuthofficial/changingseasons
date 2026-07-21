export function formatINR(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}
