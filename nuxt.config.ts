// https://nuxt.com/docs/api/configuration/nuxt-config
import dns from 'node:dns'

// Prefer IPv4 at build: this VPS's IPv6 path to Jikan intermittently times out,
// which would otherwise fail the build-time route seed and SSR data fetches.
dns.setDefaultResultOrder('ipv4first')

const JIKAN_BASE = process.env.NUXT_PUBLIC_JIKAN_BASE || 'https://api.jikan.moe/v4'

/**
 * Seed the prerender list at build time.
 *
 * We SSG-prerender the homepage plus the top ~40 detail routes so deep links
 * return real 200s with a server-painted cover (fixes LCP, SEO, social cards,
 * and the hard-404-on-deep-link). The long tail stays SPA-fallback (404.html),
 * so the build never depends on Jikan having every id.
 *
 * Ids are fetched from /top/anime at build, spaced to respect Jikan's ~3 req/s
 * guard. If the API is unreachable at build time we fall back to a small static
 * seed so a deploy is never blocked by a transient rate limit.
 */
const FALLBACK_TOP_IDS = [
  52991, 5114, 9253, 28977, 38524, 11061, 9969, 15417, 4181, 41467, 918, 2904,
  820, 19, 35180, 43608, 51535, 39486, 1, 50709, 21, 32281, 199, 853, 12355,
  263, 16498, 30, 31964, 6547, 22319, 1535, 11757, 5081, 20583, 33352, 28851,
  47778, 40748, 44511,
]

async function seedTopIds(): Promise<number[]> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
  async function fetchPage(page: number): Promise<number[]> {
    // Retry through Jikan's flaky per-IP throttling so the seed is reliable.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(
          `${JIKAN_BASE}/top/anime?type=tv&sfw=true&limit=25&page=${page}`,
        )
        if (res.status === 429) throw new Error('429')
        if (!res.ok) throw new Error(`Jikan ${res.status}`)
        const json = (await res.json()) as { data: { mal_id: number }[] }
        return json.data.map((a) => a?.mal_id).filter(Boolean) as number[]
      } catch {
        await sleep(1200 * (attempt + 1))
      }
    }
    return []
  }

  const ids: number[] = []
  // Two pages of 25 give us 50 of the most acclaimed titles; we prerender 40.
  for (const page of [1, 2]) {
    ids.push(...(await fetchPage(page)))
    await sleep(1100)
  }
  if (!ids.length) {
    // eslint-disable-next-line no-console
    console.warn('[prerender-seed] Jikan unreachable at build, using static seed')
  }
  const merged = ids.length ? ids : FALLBACK_TOP_IDS
  return Array.from(new Set(merged)).slice(0, 40)
}

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  // Deployed as a GitHub Pages *project* page, served from a sub-path.
  // baseURL keeps generated asset/route URLs correct under /anime-immersive/.
  app: {
    baseURL: '/anime-immersive/',
    // Cinematic clip-fade between routes (motion language continues across
    // navigation, no jarring context switch). prefers-reduced-motion collapses
    // the duration via CSS (assets/css/main.css).
    pageTransition: { name: 'cine', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'en', class: 'dark' },
      title: 'SAKURA NOIR — an immersive anime index',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'A scroll-driven, WebGL-accented showcase of the most acclaimed anime — built with Nuxt, GSAP ScrollTrigger and OGL. A senior frontend motion study.',
        },
        { name: 'theme-color', content: '#0e0a10' },
        { property: 'og:title', content: 'SAKURA NOIR — an immersive anime index' },
        {
          property: 'og:description',
          content:
            'A scroll-driven, WebGL-accented showcase of the most acclaimed anime. Nuxt · GSAP · OGL.',
        },
        { property: 'og:type', content: 'website' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/anime-immersive/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', href: '/anime-immersive/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/anime-immersive/apple-touch-icon.png' },
        // Preconnect to the CDN that serves cover art so first images paint fast.
        { rel: 'preconnect', href: 'https://cdn.myanimelist.net' },
        // Fonts: preconnect, then load the sheet NON-render-blocking (the old
        // CSS @import was render-blocking and chained a request, hurting FCP).
        // `media=print` + onload flips it to `all` once fetched; a <noscript>
        // keeps it working without JS.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
          media: 'print',
          onload: "this.media='all'",
        },
      ],
      noscript: [
        {
          innerHTML:
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">',
        },
      ],
    },
  },

  // GitHub Pages preset: emits .nojekyll and a 404.html SPA fallback,
  // so a fully static deploy works on a project sub-path.
  nitro: {
    preset: 'github-pages',
    prerender: {
      // Crawl off: we enumerate the routes we want explicitly (homepage + the
      // top detail routes), so the long tail stays SPA-fallback rather than
      // dragging the whole catalogue into the build.
      crawlLinks: false,
      routes: ['/'],
      failOnError: false,
    },
  },

  // SSR ON. The homepage and the top detail routes are server-rendered at build
  // (real server-painted HTML/LCP); the long tail resolves client-side via the
  // 404.html SPA fallback. This is SSG, not a server runtime at deploy time.
  ssr: true,

  // Inject the build-time-seeded detail routes into the prerender list.
  hooks: {
    async 'nitro:config'(nitroConfig) {
      if (!nitroConfig.prerender) nitroConfig.prerender = {}
      const ids = await seedTopIds()
      const routes = ids.map((id) => `/anime/${id}`)
      nitroConfig.prerender.routes = [
        ...(nitroConfig.prerender.routes || []),
        ...routes,
      ]
      // eslint-disable-next-line no-console
      console.log(`[prerender-seed] prerendering ${routes.length} detail routes`)
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // run explicitly via `npm run typecheck`
  },

  runtimeConfig: {
    public: {
      jikanBase: JIKAN_BASE,
    },
  },
})
