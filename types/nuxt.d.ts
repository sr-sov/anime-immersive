/**
 * GSAP is no longer provided as a Nuxt plugin injection — it is lazy-loaded
 * after first paint via `composables/useGsap.ts` (`loadGsap()`), so it never
 * sits in the critical entry bundle. There are therefore no `$gsap` /
 * `$ScrollTrigger` / `$SplitText` injections to type here.
 *
 * This file is kept as the project's ambient type anchor; add module
 * augmentations here if future plugins introduce typed injections.
 */
export {}
