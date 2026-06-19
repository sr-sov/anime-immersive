import type { Config } from 'tailwindcss'

/**
 * Palette — "Sakura Noir": a deep magenta-rose duotone on near-black, with a
 * cold cyan secondary for cinematic contrast. Accent chroma is held in the
 * 0.13–0.19 OKLCH band: bright enough to glow against the void, low enough to
 * read premium rather than gamer-RGB. The accent is scarce by design — its
 * rarity is what reads as expensive.
 */
export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        // Near-black base, faintly warmed toward the rose hue (320).
        void: {
          DEFAULT: '#0e0a10', // oklch(0.15 0.02 320) — base canvas
          50: '#1b121d', // surface
          100: '#241823', // raised surface
          200: '#2f1f2c', // hairline / border
        },
        bone: {
          DEFAULT: '#f2eef0', // oklch(0.96 0.004 320) — primary text
          dim: '#b9adb4', // secondary text
          faint: '#7c6a76', // tertiary / metadata
        },
        // Primary accent — neon magenta-rose. Anime-coded, premium-restrained.
        rose: {
          DEFAULT: '#ff4d8d', // oklch(0.72 0.19 350)
          soft: '#ff7aab',
          deep: '#c7286a',
        },
        // Secondary accent — cold cyan, for the duotone shader + cool keylines.
        ice: {
          DEFAULT: '#3fe0e0', // oklch(0.82 0.13 195)
          soft: '#7defef',
          deep: '#1f8a93',
        },
      },
      fontFamily: {
        // Expressive condensed display + clean grotesk body (loaded via @font).
        display: ['"Anton"', 'Impact', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: [
          'InterVariable',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,77,141,0.30), 0 12px 48px rgba(255,77,141,0.16)',
        'glow-ice': '0 0 0 1px rgba(63,224,224,0.28), 0 12px 48px rgba(63,224,224,0.14)',
      },
      transitionTimingFunction: {
        // The house curve — a decisive decelerate, no overshoot.
        house: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
