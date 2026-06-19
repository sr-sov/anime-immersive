import type {
  Anime,
  AnimeCharacter,
  AnimeQuery,
  AnimeRecommendation,
  Genre,
  JikanListResponse,
  JikanSingleResponse,
} from '~/types/jikan'

/**
 * useJikan — a thin, typed client for the Jikan v4 API.
 *
 * Responsibilities:
 *  - typed fetchers for the four endpoints this app uses,
 *  - a tiny in-memory response cache (per session) to avoid refetching,
 *  - a client-side request-rate guard so we never burst past Jikan's
 *    documented limits (~3 req/s, 60/min). Debouncing of user input is
 *    handled separately (see `useDebounce`) — this guard is the backstop.
 *
 * All requests run with `$fetch` so the app works as a static SPA: the data
 * is fetched in the browser at runtime, no Nitro server route involved.
 */

// ---- Module-level singletons (shared across all callers in a session) ----

const cache = new Map<string, unknown>()

/**
 * Build a stable cache key from a path plus sorted, cleaned query params.
 * Pure and exported so the keying logic can be unit-tested in isolation.
 */
export function buildCacheKey(
  path: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return path
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
  const qs = entries.map(([k, v]) => `${k}=${String(v)}`).join('&')
  return qs ? `${path}?${qs}` : path
}

/**
 * Minimum spacing between outbound requests. Jikan documents ~3 req/s but
 * rate-limits bursts from a single IP aggressively, so during a static build
 * (many sequential prerenders) we space requests out much further. In the
 * browser the user makes a handful of requests, so the tighter spacing holds.
 */
const isServer = typeof window === 'undefined'
const MIN_REQUEST_SPACING_MS = isServer ? 1100 : 360
let lastRequestAt = 0
let queueTail: Promise<void> = Promise.resolve()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Serialize outbound requests and space them out. Each call chains onto the
 * previous one, so concurrent callers are throttled rather than dropped.
 */
function scheduleSlot(): Promise<void> {
  const run = queueTail.then(async () => {
    const now = Date.now()
    const wait = Math.max(0, lastRequestAt + MIN_REQUEST_SPACING_MS - now)
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
  })
  // Keep the chain alive even if a slot rejects (it won't, but be safe).
  queueTail = run.catch(() => undefined)
  return run
}

export function useJikan() {
  const base = useRuntimeConfig().public.jikanBase as string

  /**
   * Core request: rate-guarded, cached, typed. Throws on non-2xx so callers
   * (and useAsyncData) can render an error state.
   */
  async function request<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const key = buildCacheKey(path, params)
    if (cache.has(key)) {
      return cache.get(key) as T
    }

    // Retry on the two flaky outcomes (HTTP 429 rate-limit, network timeout)
    // with a widening backoff. On the server this keeps the static build alive
    // through Jikan's aggressive per-IP throttling; in the browser it smooths a
    // transient blip. The caller still gets a throw if every attempt fails.
    const attempts = isServer ? 4 : 2
    let lastErr: unknown
    for (let attempt = 0; attempt < attempts; attempt++) {
      await scheduleSlot()
      try {
        const result = await $fetch<T>(`${base}${path}`, {
          // $fetch serializes params and drops undefined values for us.
          query: params,
          retry: 0,
          timeout: 12_000,
        })
        cache.set(key, result)
        return result
      } catch (err) {
        lastErr = err
        const status = (err as { status?: number; statusCode?: number })?.status
          ?? (err as { statusCode?: number })?.statusCode
        const retryable = status === 429 || status === undefined || status >= 500
        if (attempt < attempts - 1 && retryable) {
          await sleep(700 * (attempt + 1) + (isServer ? 600 : 0))
          continue
        }
        throw err
      }
    }
    throw lastErr
  }

  // ---------------------------------------------------------------------
  // Public fetchers
  // ---------------------------------------------------------------------

  /**
   * Popular anime feed: GET /top/anime?page=N
   * `type` narrows by media type (tv, movie, ova…); `limit` lets the immersive
   * hero pull a tight, curated set of the very top titles.
   */
  function getTopAnime(
    page = 1,
    opts: { type?: string; limit?: number } = {},
  ): Promise<JikanListResponse<Anime>> {
    return request<JikanListResponse<Anime>>('/top/anime', {
      page,
      limit: opts.limit ?? 24,
      type: opts.type,
      sfw: true,
    })
  }

  /** Current-season feed: GET /seasons/now — the "airing now" rail. */
  function getSeasonNow(
    page = 1,
    limit = 24,
  ): Promise<JikanListResponse<Anime>> {
    return request<JikanListResponse<Anime>>('/seasons/now', {
      page,
      limit,
      sfw: true,
    })
  }

  /** Cast for the detail experience: GET /anime/{id}/characters */
  function getCharacters(
    id: number | string,
  ): Promise<JikanListResponse<AnimeCharacter>> {
    return request<JikanListResponse<AnimeCharacter>>(
      `/anime/${id}/characters`,
    )
  }

  /** "If you liked this" rail: GET /anime/{id}/recommendations */
  function getRecommendations(
    id: number | string,
  ): Promise<JikanListResponse<AnimeRecommendation>> {
    return request<JikanListResponse<AnimeRecommendation>>(
      `/anime/${id}/recommendations`,
    )
  }

  /**
   * Search / filtered listing: GET /anime?q=&page=&genres=
   * Used for both the search box and the genre filter (Jikan supports both
   * on the same endpoint), so the discovery page has one code path.
   */
  function searchAnime(
    query: AnimeQuery,
  ): Promise<JikanListResponse<Anime>> {
    const params: Record<string, unknown> = {
      page: query.page ?? 1,
      limit: query.limit ?? 24,
      sfw: query.sfw ?? true,
    }
    if (query.q) params.q = query.q
    if (query.genres) params.genres = query.genres
    if (query.order_by) params.order_by = query.order_by
    if (query.sort) params.sort = query.sort
    return request<JikanListResponse<Anime>>('/anime', params)
  }

  /** Full detail: GET /anime/{id}/full */
  function getAnimeById(id: number | string): Promise<JikanSingleResponse<Anime>> {
    return request<JikanSingleResponse<Anime>>(`/anime/${id}/full`)
  }

  /** Genre list for the filter: GET /genres/anime */
  function getGenres(): Promise<JikanListResponse<Genre>> {
    return request<JikanListResponse<Genre>>('/genres/anime')
  }

  return {
    getTopAnime,
    getSeasonNow,
    searchAnime,
    getAnimeById,
    getGenres,
    getCharacters,
    getRecommendations,
  }
}
