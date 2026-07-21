export function garmentLabel(item) {
  return item.garment_type === 'Other' ? (item.garment_type_other || 'Other') : item.garment_type
}

export function itemsSummary(items) {
  return (items ?? [])
    .map((i) => `${garmentLabel(i)}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`)
    .join(', ')
}
