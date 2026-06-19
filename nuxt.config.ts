// https://nuxt.com/docs/api/configuration/nuxt-config
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
      ],
    },
  },

  // GitHub Pages preset: emits .nojekyll and a 404.html SPA fallback,
  // so a fully static deploy works on a project sub-path.
  nitro: {
    preset: 'github-pages',
    prerender: {
      // Pre-render only the shell. Detail routes resolve client-side via the
      // 404.html SPA fallback, so the build never depends on Jikan being up.
      crawlLinks: false,
      routes: ['/'],
      failOnError: false,
    },
  },

  // Data is fetched client-side from Jikan; no server runtime at deploy time.
  ssr: false,

  typescript: {
    strict: true,
    typeCheck: false, // run explicitly via `npm run typecheck`
  },

  runtimeConfig: {
    public: {
      jikanBase: 'https://api.jikan.moe/v4',
    },
  },
})
