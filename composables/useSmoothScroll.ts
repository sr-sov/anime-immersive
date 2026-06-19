import Lenis from 'lenis'
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'

/**
 * Smooth scroll, wired to GSAP's single ticker.
 *
 * Lenis runs on *native* scroll (so sticky/pin, hash links, and Cmd+F keep
 * working) and we hand its rAF to `gsap.ticker` so scroll, ScrollTrigger, and
 * every tween render in the same frame — the canonical Awwwards wiring.
 *
 * Reduced motion is honored as a first-class path: when the user prefers
 * reduced motion we never instantiate Lenis at all, leaving plain native
 * scrolling. The watcher also tears Lenis down if the preference flips on.
 */
export function useSmoothScroll() {
  const { reducedMotion } = useEnvFlags()
  const { $gsap, $ScrollTrigger } = useNuxtApp()
  let lenis: Lenis | null = null
  let tickerFn: ((time: number) => void) | null = null

  function start() {
    if (lenis || reducedMotion.value) return
    lenis = new Lenis({
      // lerp 0.1 is the standard "smooth"; 0.08 adds a touch more weight.
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
    })

    lenis.on('scroll', $ScrollTrigger.update)

    tickerFn = (time: number) => {
      // gsap.ticker passes seconds; Lenis.raf wants milliseconds.
      lenis?.raf(time * 1000)
    }
    $gsap.ticker.add(tickerFn)
    $gsap.ticker.lagSmoothing(0)
  }

  function stop() {
    if (tickerFn) {
      $gsap.ticker.remove(tickerFn)
      tickerFn = null
    }
    lenis?.destroy()
    lenis = null
  }

  onMounted(() => {
    start()
    // React to a live change in the reduced-motion preference.
    watch(reducedMotion, (reduced) => {
      if (reduced) stop()
      else start()
    })
  })

  onBeforeUnmount(stop)

  return {
    /** Programmatic scroll (used by the scroll-cue and any in-page anchors). */
    scrollTo(target: number | string | HTMLElement, opts?: object) {
      if (lenis) lenis.scrollTo(target, opts)
      else if (typeof target !== 'number' && typeof target !== 'string') {
        target.scrollIntoView({ behavior: 'auto', block: 'start' })
      }
    },
  }
}
