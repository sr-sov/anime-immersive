#!/usr/bin/env node
/**
 * a11y gate (cross-cutting C). Serves the generated `.output/public` and runs
 * axe-core against:
 *   - the homepage,
 *   - a prerendered detail deep link,
 *   - the homepage with the immersive gallery scrolled into its pinned/active
 *     state (the "overlay open" equivalent for this site).
 *
 * Any axe violation fails the build. Uses puppeteer-core driving the Chrome that
 * `puppeteer` installs in CI (PUPPETEER_EXECUTABLE_PATH or the default cache).
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { createRequire } from 'node:module'
import puppeteer from 'puppeteer-core'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core'), 'utf8')

const ROOT = join(process.cwd(), '.output', 'public')
const BASE = '/anime-immersive'
const PORT = 8123
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
}

// Minimal static server that mirrors GitHub Pages' sub-path + SPA fallback.
const server = createServer((req, res) => {
  let path = decodeURIComponent((req.url || '/').split('?')[0])
  if (path.startsWith(BASE)) path = path.slice(BASE.length) || '/'
  let file = join(ROOT, path)
  if (path.endsWith('/')) file = join(file, 'index.html')
  if (!existsSync(file)) {
    const idx = join(file, 'index.html')
    file = existsSync(idx) ? idx : join(ROOT, '404.html')
  }
  try {
    const body = readFileSync(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})

function resolveChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH
  // Look up the puppeteer-installed Chrome.
  try {
    const pptr = require('puppeteer')
    return pptr.executablePath()
  } catch {
    return undefined
  }
}

async function axeOf(page, url, { scroll = false } = {}) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 3500))
  if (scroll) {
    // Drive the immersive gallery into its pinned/active state.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.5))
    await new Promise((r) => setTimeout(r, 1500))
  }
  await page.evaluate(axeSource)
  const res = await page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }))
  return res.violations
}

const targets = [
  { name: 'homepage', url: `http://localhost:${PORT}${BASE}/` },
  { name: 'homepage (gallery scrolled/active)', url: `http://localhost:${PORT}${BASE}/`, scroll: true },
  { name: 'detail deep link /anime/5114/', url: `http://localhost:${PORT}${BASE}/anime/5114/` },
]

await new Promise((r) => server.listen(PORT, r))
const browser = await puppeteer.launch({
  executablePath: resolveChrome(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,900'],
})

let total = 0
for (const t of targets) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 900 })
  const v = await axeOf(page, t.url, { scroll: t.scroll })
  if (v.length) {
    total += v.length
    console.error(`✗ ${t.name}: ${v.length} violation(s)`)
    for (const x of v) console.error(`   - [${x.impact}] ${x.id}: ${x.help}`)
  } else {
    console.log(`✓ ${t.name}: clean`)
  }
  await page.close()
}

await browser.close()
server.close()

if (total) {
  console.error(`\naxe gate FAILED: ${total} violation(s).`)
  process.exit(1)
}
console.log('\naxe gate passed.')
