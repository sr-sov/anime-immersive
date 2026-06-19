/**
 * Typed interfaces for the Jikan v4 API (https://docs.api.jikan.moe).
 *
 * Only the fields this app consumes are modelled. The API returns many more,
 * but a narrow, honest type surface is easier to reason about than a partial
 * mirror of the entire schema. Optional / nullable fields reflect real API
 * behaviour (e.g. an unaired anime has `score: null`).
 */

/** A single image in one format, in a few resolutions. */
export interface JikanImageSet {
  image_url: string | null
  small_image_url?: string | null
  large_image_url?: string | null
}

export interface JikanImages {
  jpg: JikanImageSet
  webp?: JikanImageSet
}

export interface JikanTrailer {
  youtube_id: string | null
  url: string | null
  embed_url: string | null
}

/** A named, MAL-linked entity (genre, studio, producer, etc.). */
export interface MalEntity {
  mal_id: number
  type?: string
  name: string
  url: string
}

/** Title with an explicit type, e.g. { type: 'English', title: '...' }. */
export interface JikanTitle {
  type: string
  title: string
}

export interface AiredProp {
  from: { day: number | null; month: number | null; year: number | null }
  to: { day: number | null; month: number | null; year: number | null }
}

export interface JikanAired {
  from: string | null
  to: string | null
  prop: AiredProp
  string: string | null
}

/**
 * The core Anime resource. `/top/anime` and `/anime?q=` return the base shape;
 * `/anime/{id}/full` returns the same fields plus a few relational extras.
 */
export interface Anime {
  mal_id: number
  url: string
  images: JikanImages
  trailer?: JikanTrailer
  approved?: boolean
  titles?: JikanTitle[]
  title: string
  title_english: string | null
  title_japanese: string | null
  type: string | null
  source: string | null
  episodes: number | null
  status: string | null
  airing: boolean
  aired: JikanAired
  duration: string | null
  rating: string | null
  score: number | null
  scored_by: number | null
  rank: number | null
  popularity: number | null
  members: number | null
  favorites: number | null
  synopsis: string | null
  background: string | null
  season: string | null
  year: number | null
  genres: MalEntity[]
  explicit_genres?: MalEntity[]
  themes?: MalEntity[]
  demographics?: MalEntity[]
  studios: MalEntity[]
  producers?: MalEntity[]
  licensors?: MalEntity[]
}

/** Genre entry from `/genres/anime`. */
export interface Genre {
  mal_id: number
  name: string
  url: string
  count: number
}

/** A character entry from `/anime/{id}/characters`. */
export interface CharacterRef {
  mal_id: number
  url: string
  images: JikanImages
  name: string
}

export interface AnimeCharacter {
  character: CharacterRef
  role: string
  favorites?: number
}

/** A recommendation entry from `/anime/{id}/recommendations`. */
export interface RecommendationEntry {
  mal_id: number
  url: string
  images: JikanImages
  title: string
}

export interface AnimeRecommendation {
  entry: RecommendationEntry
  votes?: number
}

/** Pagination block returned on list endpoints. */
export interface Pagination {
  last_visible_page: number
  has_next_page: boolean
  current_page: number
  items: {
    count: number
    total: number
    per_page: number
  }
}

/** Generic list response envelope (`data` + `pagination`). */
export interface JikanListResponse<T> {
  data: T[]
  pagination: Pagination
}

/** Generic single-resource response envelope (`data` only). */
export interface JikanSingleResponse<T> {
  data: T
}

/** Parameters accepted by the listing/search fetcher. */
export interface AnimeQuery {
  q?: string
  page?: number
  /** Comma-separated genre mal_ids, per Jikan's `genres` filter. */
  genres?: string
  /** Default ordering for the discovery feed. */
  order_by?: string
  sort?: 'asc' | 'desc'
  sfw?: boolean
  limit?: number
}
