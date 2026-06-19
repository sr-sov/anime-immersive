import type { Anime, JikanImages } from '~/types/jikan'

/**
 * Trim a synopsis to a clean lead paragraph: strip the MAL "(Source: …)"
 * footer, collapse whitespace, and cut on a sentence boundary near `max`.
 * Pure and exported so the truncation rules can be unit-tested directly.
 */
export function synopsisLead(
  raw: string | null | undefined,
  max = 260,
): string {
  if (!raw) return ''
  const cleaned = raw
    .replace(/\s*\[Written by[^\]]*\]\s*/gi, ' ')
    .replace(/\s*\(Source:[^)]*\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length <= max) return cleaned
  const slice = cleaned.slice(0, max)
  // Prefer to end on the last sentence boundary inside the window.
  const lastStop = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  )
  if (lastStop > max * 0.5) return slice.slice(0, lastStop + 1)
  // Otherwise cut on the last word boundary and add an ellipsis.
  const lastSpace = slice.lastIndexOf(' ')
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trim()}…`
}

/** "No. 01" / "No. 12" — a zero-padded ordinal for the gallery index. */
export function rankLabel(n: number): string {
  return `No. ${String(n).padStart(2, '0')}`
}

/**
 * Pick the best available cover URL from a Jikan image set, preferring the
 * largest webp, falling back through jpg, then any url. Pure + exported.
 */
export function coverImage(images: JikanImages | undefined | null): string {
  if (!images) return ''
  const webp = images.webp
  const jpg = images.jpg
  return (
    webp?.large_image_url ||
    webp?.image_url ||
    jpg?.large_image_url ||
    jpg?.image_url ||
    webp?.small_image_url ||
    jpg?.small_image_url ||
    ''
  )
}

/**
 * Small presentation helpers shared by cards and the detail page. Kept as a
 * composable (rather than scattered inline) so formatting stays consistent.
 */
export function useFormat() {
  /** "8.74" or "—" when a score is missing (unaired / unrated). */
  function score(value: number | null | undefined): string {
    return typeof value === 'number' ? value.toFixed(2) : '—'
  }

  /** Prefer the explicit `year`, else fall back to the aired-from year. */
  function year(anime: Pick<Anime, 'year' | 'aired'>): string {
    if (anime.year) return String(anime.year)
    const from = anime.aired?.prop?.from?.year
    return from ? String(from) : '—'
  }

  /** Compact member/favorite counts, e.g. 1_200_000 -> "1.2M". */
  function compact(value: number | null | undefined): string {
    if (typeof value !== 'number') return '—'
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  /** "24 eps", "1 ep", or "? eps" when episode count is unknown. */
  function episodes(value: number | null | undefined): string {
    if (typeof value !== 'number') return '? eps'
    return `${value} ep${value === 1 ? '' : 's'}`
  }

  return {
    score,
    year,
    compact,
    episodes,
    synopsisLead,
    rankLabel,
    coverImage,
  }
}
