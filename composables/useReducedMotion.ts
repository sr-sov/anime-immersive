import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Reactive environment flags that the whole motion layer gates on.
 *
 *  - `reducedMotion` mirrors `(prefers-reduced-motion: reduce)`, live.
 *  - `finePointer` mirrors `(pointer: fine)` so we never render the custom
 *    cursor or hover-only affordances on touch devices.
 *
 * Both default to the *safe* value during SSR/first paint (reduced = true,
 * fine = false) so nothing motion-heavy ever runs before we've confirmed the
 * user actually wants it. They flip on mount once `matchMedia` is available.
 */
export function useEnvFlags() {
  const reducedMotion = ref(true)
  const finePointer = ref(false)

  let rmQuery: MediaQueryList | null = null
  let ptrQuery: MediaQueryList | null = null

  const syncRm = () => {
    if (rmQuery) reducedMotion.value = rmQuery.matches
  }
  const syncPtr = () => {
    if (ptrQuery) finePointer.value = ptrQuery.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    ptrQuery = window.matchMedia('(pointer: fine)')
    syncRm()
    syncPtr()
    rmQuery.addEventListener('change', syncRm)
    ptrQuery.addEventListener('change', syncPtr)
  })

  onBeforeUnmount(() => {
    rmQuery?.removeEventListener('change', syncRm)
    ptrQuery?.removeEventListener('change', syncPtr)
  })

  return { reducedMotion, finePointer }
}
