import type { gsap as Gsap } from 'gsap'
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger'
import type { SplitText as STxt } from 'gsap/SplitText'

/**
 * Type the GSAP injections provided by plugins/gsap.client.ts so `$gsap`,
 * `$ScrollTrigger` and `$SplitText` are strongly typed in every component.
 */
declare module '#app' {
  interface NuxtApp {
    $gsap: typeof Gsap
    $ScrollTrigger: typeof ST
    $SplitText: typeof STxt
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $gsap: typeof Gsap
    $ScrollTrigger: typeof ST
    $SplitText: typeof STxt
  }
}

export {}
