import type { JikanImages, JikanImageSet } from '~/types/jikan'

/**
 * Responsive-image helpers for Jikan cover art (cross-cutting D).
 *
 * Jikan ships three widths per cover — small (~225px), default (~350px) and
 * large (~425px), in webp where available. `coverSrcSet` emits a `srcset` with
 * the real pixel widths so the browser can pick the right file per slot/DPR
 * instead of always pulling the largest. Pair it with a `sizes` matched to the
 * grid breakpoint the image renders in (the rails/gallery export their own).
 */

// Approximate intrinsic widths of Jikan's three cover sizes (MAL CDN).
const W_SMALL = 225
const W_MEDIUM = 350
const W_LARGE = 425

function pickSet(images: JikanImages | undefined | null): JikanImageSet | null {
  if (!images) return null
  // Prefer webp; fall back to jpg. Only return a set that has at least a url.
  if (images.webp && (images.webp.image_url || images.webp.large_image_url)) {
    return images.webp
  }
  return images.jpg ?? null
}

/**
 * Build a width-descriptor srcset from a Jikan image set, deduped by URL so a
 * missing size never emits a duplicate candidate. Returns '' when unusable, so
 * the bound attribute is simply absent (the `src` alone then applies).
 */
export function coverSrcSet(images: JikanImages | undefined | null): string {
  const set = pickSet(images)
  if (!set) return ''
  const seen = new Set<string>()
  const parts: string[] = []
  const add = (url: string | null | undefined, w: number) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    parts.push(`${url} ${w}w`)
  }
  add(set.small_image_url, W_SMALL)
  add(set.image_url, W_MEDIUM)
  add(set.large_image_url, W_LARGE)
  return parts.join(', ')
}

/**
 * `sizes` strings matched to where covers render, so the browser requests the
 * right candidate. Kept as named constants so the markup and the breakpoints
 * stay in sync in one place.
 */
// Rail cards: 44vw on phones, ~26vw at sm, ~18vw at lg, ~14vw at xl.
export const RAIL_SIZES =
  '(min-width: 1280px) 14vw, (min-width: 1024px) 18vw, (min-width: 640px) 26vw, 44vw'

// The reduced/static gallery cards sit one-per-row on phones, ~40vw on desktop.
export const GALLERY_SIZES = '(min-width: 768px) 40vw, 100vw'
