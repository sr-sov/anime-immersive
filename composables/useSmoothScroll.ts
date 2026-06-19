import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useEnvFlags } from '~/composables/useReducedMotion'
import { loadGsap, type GsapBundle } from '~/composables/useGsap'

/**
 * Smooth scroll, wired to GSAP's single ticker.
 *
 * Lenis runs on *native* scroll (so sticky/pin, hash links, and Cmd+F keep
 * working) and we hand its rAF to `gsap.ticker` so scroll, ScrollTrigger, and
 * every tween render in the same frame — the canonical Awwwards wiring.
 *
 * Both GSAP and Lenis are imported lazily (after first paint) so they never sit
 * in the critical entry bundle. Reduced motion is honored as a first-class
 * path: when the user prefers reduced motion we never load or instantiate Lenis
 * at all, leaving plain native scrolling. The watcher tears Lenis down if the
 * preference flips on.
 */
export function useSmoothScroll() {
  const { reducedMotion } = useEnvFlags()
  // Lenis is typed loosely here to avoid pulling its types into the entry.
  let lenis: { raf: (t: number) => void; on: (e: string, cb: () => void) => void; scrollTo: (t: unknown, o?: unknown) => void; destroy: () => void } | null = null
  let bundle: GsapBundle | null = null
  let tickerFn: ((time: number) => void) | null = null
  let disposed = false

  async function start() {
    if (lenis || reducedMotion.value) return
    const [{ default: Lenis }, gsapBundle] = await Promise.all([
      import('lenis'),
      loadGsap(),
    ])
    // The preference may have flipped (or the component unmounted) while the
    // chunk was loading — bail rather than start an orphaned loop.
    if (disposed || reducedMotion.value || lenis) return
    bundle = gsapBundle
    lenis = new Lenis({
      // lerp 0.1 is the standard "smooth"; 0.09 adds a touch more weight.
      lerp: 0.09,
      wheelMultiplier: 1,
      smoothWheel: true,
    }) as unknown as typeof lenis

    lenis!.on('scroll', bundle.ScrollTrigger.update)

    tickerFn = (time: number) => {
      // gsap.ticker passes seconds; Lenis.raf wants milliseconds.
      lenis?.raf(time * 1000)
    }
    bundle.gsap.ticker.add(tickerFn)
    bundle.gsap.ticker.lagSmoothing(0)
  }

  function stop() {
    if (tickerFn && bundle) {
      bundle.gsap.ticker.remove(tickerFn)
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

  onBeforeUnmount(() => {
    disposed = true
    stop()
  })

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
