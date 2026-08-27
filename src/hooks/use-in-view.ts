import { useEffect, useRef, useState } from 'react'

/** Start the work a little before the card is actually on screen. */
const ROOT_MARGIN = '200px'

/**
 * Reports when an element first scrolls into view, so cards can defer work
 * (README fetches) until the user can actually see them.
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || inView) return
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { rootMargin: ROOT_MARGIN },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [inView])

  return { ref, inView }
}
