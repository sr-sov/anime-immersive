# Sakura Noir

An immersive, scroll-driven anime index. A pinned WebGL gallery crossfades the
most acclaimed titles with a displacement + chromatic shader as you scroll, a
framerate-independent magnetic cursor tracks the pointer, and SplitText reveals
choreograph the type. The loud direction of a three-site set — but disciplined:
every effect is transform/opacity, held to 60fps, and `prefers-reduced-motion`
gets a real static experience, not a shortened one.

**Live:** https://sr-sov.github.io/anime-immersive/

[![CI](https://github.com/sr-sov/anime-immersive/actions/workflows/ci.yml/badge.svg)](https://github.com/sr-sov/anime-immersive/actions/workflows/ci.yml)

> One of three production directions built on a shared typed data layer.
> Editorial / cinematic and product / command-palette are the siblings; this is
> **immersive / motion**.

## The experience

- **Cinematic hero** — a full-bleed featured cover with a slow zoom intro, a
  scroll parallax, and a SplitText character reveal of the wordmark.
- **The signature: a pinned, scroll-orchestrated WebGL gallery.** A single OGL
  plane crossfades between the top covers with a displacement + chromatic
  aberration shader keyed to scroll progress. The atmospheric layer is WebGL;
  all readable content (rank, title, score, synopsis, the "Enter" link) lives in
  the DOM on top, so it stays accessible and degrades to a CSS crossfade — and
  to a clean static card stack under reduced motion.
- **A magnetic, framerate-independent cursor.** A damped follower ring eases
  toward the pointer with `target + (pos − target)·dampingᵈᵗ` (Rory Driscoll /
  Freya Holmér), so the feel is identical at 60 and 120 Hz. It snaps onto
  `[data-magnetic]` controls and squashes with velocity. Rendered only on
  fine-pointer, no-reduced-motion devices; the native cursor is the fallback.
- **Velocity-reactive motion** — a marquee band that speeds and reverses with
  scroll direction, and a scroll-velocity skew on the cover rails.
- **A detail experience that keeps the motion language** — a cover hero with a
  SplitText title, a typeset stat sidebar, the synopsis as a feature column, a
  character rail, and a "go deeper" recommendations rail. No jarring context
  switch from the index.

## Stack

- **Nuxt 3** (Vue 3, `<script setup>`), **TypeScript** in `strict` mode
- **TailwindCSS** — a "Sakura Noir" palette (deep near-black, neon magenta-rose
  primary, cold cyan secondary), in OKLCH-derived tokens
- **GSAP 3.13** — ScrollTrigger + SplitText (both free in 3.13+), one shared
  registration, the house ticker driving every per-frame loop
- **Lenis** — smooth scroll wired to the GSAP ticker (native scroll preserved)
- **OGL** — a ~10 kB WebGL layer for the gallery shader
- **Jikan API v4** — no key, fetched client-side; deploys fully static

## How the motion holds 60fps

- **One ticker.** Lenis, the cursor lerp, the WebGL render, and the marquee all
  ride `gsap.ticker` — never a second `requestAnimationFrame` loop.
- **Transform/opacity only.** No animated layout properties; `will-change` is
  scoped to actively-animating nodes. The WebGL DPR is capped at 2.
- **ScrollTrigger `scrub`** ties the gallery playhead to the scrollbar; no
  per-frame state recompute. Rects are read on load/resize, never in the loop.
- **`gsap.matchMedia()`** gates every timeline. The reduced-motion branch sets
  final state with zero animation and auto-reverts the motion branch — the two
  never leak into each other. A CSS backstop (`[data-reveal]`, `[data-split]`)
  guarantees content is visible even if JS is slow.

The framerate-independence claim is **unit-tested**: `test/motion.test.ts`
simulates one second of easing at 60 and 120 fps and asserts they converge to
the same point (a naive per-frame lerp would not).

## Data layer (shared, typed, tested)

`composables/useJikan.ts` is a typed client over the Jikan v4 endpoints used
here — top anime, current season, full detail, characters, recommendations,
genres — with an in-memory cache and a serialized client-side request-rate guard
(Jikan allows ~3 req/s). `types/jikan.ts` models only the consumed fields, with
honest `null`/optional shapes. `composables/useFormat.ts` and `utils/motion.ts`
hold the pure presentation + motion math, kept pure precisely so they're
testable in isolation.

## Project structure

```
types/jikan.ts                 Typed Jikan v4 interfaces (+ characters, recs)
types/nuxt.d.ts                $gsap / $ScrollTrigger / $SplitText injections
utils/motion.ts                Pure motion math (damp, lerp, clamp, mapRange)
composables/
  useJikan.ts                  Typed fetchers + cache + rate guard
  useFormat.ts                 Score / year / synopsis / cover helpers (pure)
  useReducedMotion.ts          Reactive reduced-motion + fine-pointer flags
  useSmoothScroll.ts           Lenis ↔ GSAP ticker wiring
  useGalleryGL.ts              OGL crossfade gallery (displacement + chroma)
  useDebounce.ts               Debounced ref
plugins/gsap.client.ts         Registers ScrollTrigger + SplitText, once
components/
  ImmersiveHero.vue            Cinematic hero (parallax + SplitText)
  ScrollGallery.vue            The pinned WebGL scroll gallery (+ static fallback)
  MagneticCursor.vue           Framerate-independent magnetic cursor
  SplitReveal.vue · Reveal.vue Scroll-reveal primitives (matchMedia-gated)
  Marquee.vue                  Velocity-reactive marquee
  AnimeRail.vue · AnimeCard.vue Cover rails with velocity skew
  AppHeader.vue · AppFooter.vue
  states/{LoadingGrid,EmptyState,ErrorState}.vue
pages/
  index.vue                    Hero → marquee → gallery → now-airing rail
  anime/[id].vue               Cinematic detail spread
app.vue · error.vue            Shell (mounts scroll + cursor) + error boundary
test/                          Vitest: motion math, formatters, cache key, debounce
```

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm test             # vitest run (25 tests)
npm run typecheck    # nuxt typecheck (strict)
npm run generate     # static build -> .output/public
```

## Testing & CI

[Vitest](https://vitest.dev) covers the pure logic where bugs hide:

- `test/motion.test.ts` — `damp` framerate independence (the load-bearing cursor
  property), `lerp`/`clamp`/`mapRange`.
- `test/useFormat.test.ts` — score / year / count / episode formatting, plus
  `synopsisLead` truncation, `rankLabel`, and `coverImage` source selection.
- `test/cache-key.test.ts` — `buildCacheKey` (stable param sorting, empty drops).
- `test/useDebounce.test.ts` — debounce timing under fake timers.

GitHub Actions (`.github/workflows/ci.yml`) runs the strict typecheck and the
unit tests on every push and PR.

## Accessibility

Full keyboard operation, a visible high-contrast focus ring, a skip link, `alt`
text on every cover, `aria-hidden` on the decorative cursor and WebGL canvas,
and a genuine reduced-motion path: no pin, no WebGL animation, no custom cursor —
a legible static index instead. The WebGL `<img>` content is never the only copy
of any information.

## Deploy (GitHub Pages)

Configured as a GitHub Pages **project page**: `app.baseURL` is
`/anime-immersive/` and Nitro uses the `github-pages` preset (emits `.nojekyll`
and a `404.html` SPA fallback). `npm run generate` produces a publishable
`.output/public`.

---

Data and imagery © MyAnimeList, served via Jikan. A portfolio work sample, not
affiliated with either.
