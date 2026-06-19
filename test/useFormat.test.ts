import { describe, it, expect } from 'vitest'
import {
  coverImage,
  rankLabel,
  synopsisLead,
  useFormat,
} from '~/composables/useFormat'

const { score, year, compact, episodes } = useFormat()

describe('useFormat', () => {
  it('formats scores to two decimals, em dash when missing', () => {
    expect(score(8.736)).toBe('8.74')
    expect(score(null)).toBe('—')
    expect(score(undefined)).toBe('—')
  })

  it('prefers the explicit year, falls back to aired, then to em dash', () => {
    expect(year({ year: 2011, aired: null } as never)).toBe('2011')
    expect(
      year({ year: null, aired: { prop: { from: { year: 2009 } } } } as never),
    ).toBe('2009')
    expect(
      year({ year: null, aired: { prop: { from: { year: null } } } } as never),
    ).toBe('—')
  })

  it('compacts large counts and handles missing values', () => {
    expect(compact(1_200_000)).toBe('1.2M')
    expect(compact(950)).toBe('950')
    expect(compact(null)).toBe('—')
  })

  it('pluralises episode counts', () => {
    expect(episodes(24)).toBe('24 eps')
    expect(episodes(1)).toBe('1 ep')
    expect(episodes(null)).toBe('? eps')
  })
})

describe('synopsisLead', () => {
  it('returns empty string for missing input', () => {
    expect(synopsisLead(null)).toBe('')
    expect(synopsisLead(undefined)).toBe('')
    expect(synopsisLead('')).toBe('')
  })

  it('strips MAL source/author footers and collapses whitespace', () => {
    const raw = 'A lone swordsman.  \n\n (Source: MAL News) [Written by MAL Rewrite]'
    expect(synopsisLead(raw)).toBe('A lone swordsman.')
  })

  it('keeps short synopses intact', () => {
    expect(synopsisLead('Short and sweet.')).toBe('Short and sweet.')
  })

  it('cuts on a sentence boundary inside the window', () => {
    const raw =
      'First sentence is here. Second sentence runs much longer and keeps going well past the limit so it should be dropped.'
    const out = synopsisLead(raw, 40)
    expect(out).toBe('First sentence is here.')
    expect(out.length).toBeLessThanOrEqual(40)
  })

  it('falls back to a word-boundary ellipsis when no sentence break fits', () => {
    const raw = 'Onelongword '.repeat(20).trim()
    const out = synopsisLead(raw, 30)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toContain('OnelongwordOne')
  })
})

describe('rankLabel', () => {
  it('zero-pads to two digits with a No. prefix', () => {
    expect(rankLabel(1)).toBe('No. 01')
    expect(rankLabel(12)).toBe('No. 12')
    expect(rankLabel(100)).toBe('No. 100')
  })
})

describe('coverImage', () => {
  it('prefers the largest webp, then jpg, then any url', () => {
    expect(
      coverImage({
        webp: { large_image_url: 'webp-lg', image_url: 'webp' },
        jpg: { large_image_url: 'jpg-lg', image_url: 'jpg' },
      }),
    ).toBe('webp-lg')
    expect(
      coverImage({ jpg: { large_image_url: 'jpg-lg', image_url: 'jpg' } }),
    ).toBe('jpg-lg')
    expect(coverImage({ jpg: { image_url: 'only-jpg' } })).toBe('only-jpg')
  })

  it('returns empty string when no image is present', () => {
    expect(coverImage(null)).toBe('')
    expect(coverImage(undefined)).toBe('')
    expect(coverImage({ jpg: { image_url: null } })).toBe('')
  })
})
