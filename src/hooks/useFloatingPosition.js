import { useLayoutEffect, useState } from 'react'

// Computes a viewport-clamped `{ top, right }` position (for `position: fixed`)
// anchored under a trigger element, for portal-rendered dropdowns/panels that
// must never be clipped by a scrolling ancestor. Flips above the trigger when
// there isn't room below, and keeps clear of the left/right screen edges.
export function useFloatingPosition(open, triggerRef, { width = 190, height = 200, gap = 6 } = {}) {
  const [coords, setCoords] = useState(null)

  useLayoutEffect(() => {
    if (!open) return
    function update() {
      const rect = triggerRef.current.getBoundingClientRect()
      const margin = 8

      const naturalRight = window.innerWidth - rect.right
      const maxRight = window.innerWidth - width - margin
      const right = Math.max(Math.min(naturalRight, maxRight), margin)

      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < height + gap && rect.top > height + gap
      const top = openUpward
        ? Math.max(rect.top - height - gap, margin)
        : Math.min(rect.bottom + gap, window.innerHeight - margin)

      setCoords({ top, right })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, triggerRef, width, height, gap])

  return coords
}
