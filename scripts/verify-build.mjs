#!/usr/bin/env node
/**
 * Post-generate build gate (cross-cutting C — the deep-link assertion).
 *
 * Runs against `.output/public` after `npm run generate`. It proves the things
 * a unit test cannot:
 *   1. the homepage prerendered to a real file with server-painted content,
 *   2. the homepage ships a server-painted LCP cover (an <img> in the HTML,
 *      not an empty SPA shell),
 *   3. a directly-typed DETAIL deep link (a prerendered id) resolves to its own
 *      file with its OWN title + an og:image (not a 404, not the generic card),
 *   4. enough detail routes prerendered to matter (the top set),
 *   5. the SPA fallback (404.html) exists for the long tail.
 *
 * Exits non-zero on any failure so CI blocks a regression back to the old
 * ssr:false / hard-404-on-deep-link behaviour.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), '.output', 'public')
const fails = []
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else {
    console.log(`  ✗ ${msg}`)
    fails.push(msg)
  }
}

console.log('Build gate: prerender + deep-link assertions')

// 1. Homepage exists and has real content.
const homePath = join(ROOT, 'index.html')
ok(existsSync(homePath), 'homepage prerendered to index.html')
const home = existsSync(homePath) ? readFileSync(homePath, 'utf8') : ''
ok(/Sakura Noir/i.test(home), 'homepage HTML contains the brand wordmark')
ok(/Begin the descent/i.test(home), 'homepage HTML contains hero CTA copy (real SSR render)')

// 2. Server-painted LCP cover: an <img> carrying BOTH fetchpriority="high" and
//    an absolute src (attribute order is not guaranteed, so match within tag).
const heroImg = (home.match(/<img\b[^>]*>/gi) || []).find(
  (tag) => /fetchpriority="high"/i.test(tag) && /\ssrc="https?:\/\/[^"]+"/i.test(tag),
)
ok(
  !!heroImg,
  'homepage ships a server-painted LCP cover <img> (not an empty SPA shell)',
)

// 3. A known prerendered deep link resolves to its own page with its own SEO.
const DEEP_ID = '5114' // Fullmetal Alchemist: Brotherhood — a top-anime staple
const deepPath = join(ROOT, 'anime', DEEP_ID, 'index.html')
ok(existsSync(deepPath), `deep link /anime/${DEEP_ID}/ prerendered (real 200, not 404)`)
const deep = existsSync(deepPath) ? readFileSync(deepPath, 'utf8') : ''
ok(
  /<title>[^<]*·\s*Sakura Noir<\/title>/i.test(deep) && !/SAKURA NOIR — an immersive anime index/i.test(deep.match(/<title>[^<]*<\/title>/i)?.[0] || ''),
  `deep link has its OWN per-title <title> (not the generic site title)`,
)
ok(
  /<meta[^>]+property="og:image"[^>]+content="https?:\/\/[^"]+"/i.test(deep),
  'deep link sets a per-title og:image (real social card)',
)

// 4. Enough detail routes prerendered.
const animeDir = join(ROOT, 'anime')
const detailCount = existsSync(animeDir)
  ? readdirSync(animeDir, { withFileTypes: true }).filter((d) => d.isDirectory()).length
  : 0
ok(detailCount >= 30, `prerendered a meaningful set of detail routes (${detailCount} >= 30)`)

// 5. SPA fallback for the long tail.
ok(existsSync(join(ROOT, '404.html')), '404.html SPA fallback exists for the long tail')

console.log('')
if (fails.length) {
  console.error(`Build gate FAILED: ${fails.length} check(s) failed.`)
  process.exit(1)
}
console.log('Build gate passed.')
