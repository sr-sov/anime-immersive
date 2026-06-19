import { describe, it, expect } from 'vitest'
import { buildCacheKey } from '~/composables/useJikan'

describe('buildCacheKey', () => {
  it('returns the bare path when there are no params', () => {
    expect(buildCacheKey('/genres/anime')).toBe('/genres/anime')
    expect(buildCacheKey('/top/anime', {})).toBe('/top/anime')
  })

  it('sorts params so the key is stable regardless of insertion order', () => {
    const a = buildCacheKey('/anime', { page: 1, q: 'naruto' })
    const b = buildCacheKey('/anime', { q: 'naruto', page: 1 })
    expect(a).toBe(b)
    expect(a).toBe('/anime?page=1&q=naruto')
  })

  it('drops undefined, null, and empty-string params', () => {
    expect(
      buildCacheKey('/anime', { q: 'x', genres: undefined, page: null, sort: '' }),
    ).toBe('/anime?q=x')
  })
})
