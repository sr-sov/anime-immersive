import type { gsap as GsapType } from 'gsap'
import type { ScrollTrigger as STType } from 'gsap/ScrollTrigger'
import type { SplitText as SplitTextType } from 'gsap/SplitText'

/**
 * Lazy GSAP loader — the perf spine of the immersive layer.
 *
 * GSAP + ScrollTrigger + SplitText + Lenis are ~90kB of parse/exec that the
 * page does NOT need for first paint (the LCP is server-painted now). Bundling
 * them in the entry meant ~7s of main-thread exec on mobile before the page was
 * interactive. Instead we `import()` them in a single cached chunk that the
 * browser fetches AFTER first paint, the first time any motion component mounts.
 *
 * `loadGsap()` returns the same promise to every caller (one chunk, one
 * registration). Components call it inside onMounted and set up their timelines
 * once it resolves. On the server it is never called (all callers are in
 * onMounted / client-only), so SSR never touches GSAP.
 */

export interface GsapBundle {
  gsap: typeof GsapType
  ScrollTrigger: typeof STType
  SplitText: typeof SplitTextType
}

/** The object returned by `gsap.matchMedia()` (has `.add()` and `.revert()`). */
export type GsapMatchMedia = ReturnType<typeof GsapType.matchMedia>

let bundlePromise: Promise<GsapBundle> | null = null

export function loadGsap(): Promise<GsapBundle> {
  if (bundlePromise) return bundlePromise
  bundlePromise = (async () => {
    const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('gsap/SplitText'),
    ])
    gsap.registerPlugin(ScrollTrigger, SplitText)
    // Mobile browsers fire resize on URL-bar show/hide; ignoring it stops
    // ScrollTrigger from thrashing pins on every scroll on phones.
    ScrollTrigger.config({ ignoreMobileResize: true })
    return { gsap, ScrollTrigger, SplitText }
  })()
  return bundlePromise
}
