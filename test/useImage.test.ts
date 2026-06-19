import { describe, it, expect } from 'vitest'
import { coverSrcSet, RAIL_SIZES, GALLERY_SIZES } from '~/composables/useImage'
import type { JikanImages } from '~/types/jikan'

const full: JikanImages = {
  jpg: {
    image_url: 'https://cdn/x.jpg',
    small_image_url: 'https://cdn/xs.jpg',
    large_image_url: 'https://cdn/xl.jpg',
  },
  webp: {
    image_url: 'https://cdn/x.webp',
    small_image_url: 'https://cdn/xs.webp',
    large_image_url: 'https://cdn/xl.webp',
  },
}

describe('coverSrcSet', () => {
  it('prefers webp and emits all three width descriptors', () => {
    const out = coverSrcSet(full)
    expect(out).toContain('https://cdn/xs.webp 225w')
    expect(out).toContain('https://cdn/x.webp 350w')
    expect(out).toContain('https://cdn/xl.webp 425w')
    // No jpg candidates when webp is present.
    expect(out).not.toContain('.jpg')
  })

  it('falls back to jpg when webp is absent', () => {
    const out = coverSrcSet({ jpg: full.jpg })
    expect(out).toContain('https://cdn/x.jpg 350w')
    expect(out).toContain('https://cdn/xl.jpg 425w')
  })

  it('dedupes when sizes share a url and skips missing ones', () => {
    const out = coverSrcSet({
      jpg: { image_url: 'https://cdn/only.jpg', small_image_url: null, large_image_url: null },
    })
    // Only one candidate, no duplicate width descriptors.
    expect(out).toBe('https://cdn/only.jpg 350w')
  })

  it('returns an empty string for unusable input', () => {
    expect(coverSrcSet(null)).toBe('')
    expect(coverSrcSet(undefined)).toBe('')
    expect(coverSrcSet({ jpg: { image_url: null } })).toBe('')
  })
})

describe('sizes constants', () => {
  it('are breakpoint-ordered (largest min-width first)', () => {
    expect(RAIL_SIZES.startsWith('(min-width: 1280px)')).toBe(true)
    expect(GALLERY_SIZES).toContain('100vw')
  })
})
