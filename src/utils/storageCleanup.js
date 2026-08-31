import { supabase } from '../lib/supabaseClient.js'

export const ORDER_DESIGN_BUCKET = 'order-designs'
export const STAFF_PHOTO_BUCKET = 'staff-photos'

// A newly uploaded file is referenced by a row that's written a moment
// later. Sweeping on age alone would race that window and delete an image
// out from under an order still being saved, so anything recent is left
// alone no matter what.
const MIN_AGE_MS = 60 * 60 * 1000

// Upload keys used to be `${Date.now()}-${file.name}`, which collides when
// two files with the same name are uploaded in the same millisecond — the
// second silently overwrites the first, leaving one order pointing at
// another order's design. A random suffix removes the collision, and
// sanitising the name keeps non-ASCII filenames (common here) from
// producing storage keys Supabase rejects.
export function buildStoragePath(fileName) {
  const safe = String(fileName ?? 'file')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-80)
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${Date.now()}-${suffix}-${safe || 'file'}`
}

// Every image belonging to a record that is about to be permanently
// deleted, including the ones its cascade will take with it.
export async function collectRecordImages(table, id) {
  const images = []

  if (table === 'staff') {
    const { data } = await supabase.from('staff').select('photo_url').eq('id', id).maybeSingle()
    if (data?.photo_url) images.push({ url: data.photo_url, bucket: STAFF_PHOTO_BUCKET })
    return images
  }

  // A customer cascades to their orders, and each order to its items.
  let orderIds = []
  if (table === 'orders') {
    orderIds = [id]
  } else if (table === 'users') {
    const { data } = await supabase.from('orders').select('id').eq('customer_id', id)
    orderIds = (data ?? []).map((row) => row.id)
  }

  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('order_items')
      .select('design_image_url')
      .in('order_id', orderIds)
    for (const row of data ?? []) {
      if (row.design_image_url) {
        images.push({ url: row.design_image_url, bucket: ORDER_DESIGN_BUCKET })
      }
    }
  }

  return images
}

// Public URLs look like
//   {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
// and `path` is what the storage API wants back. Returns null for anything
// that isn't a URL into this bucket, so a stray value can never be turned
// into a delete against some other object.
export function storagePathFromUrl(publicUrl, bucket) {
  if (!publicUrl) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = String(publicUrl).indexOf(marker)
  if (index === -1) return null
  const path = String(publicUrl).slice(index + marker.length)
  if (!path) return null
  // Undo the encoding Supabase applies to the key when building the URL.
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

// Best-effort: a failed cleanup must never block or fail the user's actual
// action (saving an order, deleting a record). The worst case of a failure
// here is one unreferenced file, which the sweep below will catch later.
export async function removeStorageObject(publicUrl, bucket) {
  const path = storagePathFromUrl(publicUrl, bucket)
  if (!path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) console.warn(`[storageCleanup] could not remove ${bucket}/${path}:`, error.message)
}

async function listAllPaths(bucket) {
  const paths = []
  const pageSize = 100
  let offset = 0
  // list() pages; a boutique will never have many files, but looping means
  // the sweep stays correct rather than silently skipping past the first
  // hundred and "orphaning" everything after it.
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: pageSize, offset, sortBy: { column: 'created_at', order: 'asc' } })
    if (error) throw new Error(`${bucket}: ${error.message}`)
    const batch = data ?? []
    for (const entry of batch) {
      // Folder placeholders come back with no id; only real objects matter.
      if (!entry.id) continue
      paths.push({ name: entry.name, createdAt: entry.created_at })
    }
    if (batch.length < pageSize) break
    offset += pageSize
  }
  return paths
}

// Deletes files in both buckets that no row points at any more — what the
// 60-minute purge job leaves behind, since that runs inside Postgres and
// can't reach the storage API. Deliberately manual (Profile menu) rather
// than automatic on load: it deletes files, and that should be something
// someone chooses to do.
export async function sweepOrphanedImages() {
  const [{ data: items, error: itemsError }, { data: staff, error: staffError }] = await Promise.all([
    supabase.from('order_items').select('design_image_url'),
    supabase.from('staff').select('photo_url'),
  ])

  // Without a complete picture of what's referenced, deleting anything
  // risks destroying a live image — abort rather than guess.
  if (itemsError) throw new Error(`Could not read order items: ${itemsError.message}`)
  if (staffError) throw new Error(`Could not read staff: ${staffError.message}`)

  const referenced = {
    [ORDER_DESIGN_BUCKET]: new Set(
      (items ?? [])
        .map((row) => storagePathFromUrl(row.design_image_url, ORDER_DESIGN_BUCKET))
        .filter(Boolean),
    ),
    [STAFF_PHOTO_BUCKET]: new Set(
      (staff ?? [])
        .map((row) => storagePathFromUrl(row.photo_url, STAFF_PHOTO_BUCKET))
        .filter(Boolean),
    ),
  }

  const cutoff = Date.now() - MIN_AGE_MS
  let removed = 0
  let skippedRecent = 0
  const failures = []

  for (const bucket of [ORDER_DESIGN_BUCKET, STAFF_PHOTO_BUCKET]) {
    let objects
    try {
      objects = await listAllPaths(bucket)
    } catch (err) {
      failures.push(err.message)
      continue
    }

    const orphans = []
    for (const object of objects) {
      if (referenced[bucket].has(object.name)) continue
      const createdAt = object.createdAt ? new Date(object.createdAt).getTime() : 0
      // An unparseable timestamp is treated as recent — err towards keeping.
      if (!createdAt || createdAt > cutoff) {
        skippedRecent += 1
        continue
      }
      orphans.push(object.name)
    }

    if (orphans.length === 0) continue
    const { error } = await supabase.storage.from(bucket).remove(orphans)
    if (error) failures.push(`${bucket}: ${error.message}`)
    else removed += orphans.length
  }

  return { removed, skippedRecent, failures }
}
