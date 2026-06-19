import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

/**
 * Register GSAP plugins once, client-side only. ScrollTrigger and SplitText
 * both ship in the free `gsap` package (3.13+), so there is no Club
 * dependency. We expose the configured `gsap` instance through Nuxt's provide
 * mechanism so components share one registration rather than re-registering.
 */
export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger, SplitText)

  // Mobile browsers fire resize on URL-bar show/hide; ignoring it stops
  // ScrollTrigger from thrashing pins on every scroll on phones.
  ScrollTrigger.config({ ignoreMobileResize: true })

  return {
    provide: {
      gsap,
      ScrollTrigger,
      SplitText,
    },
  }
})
