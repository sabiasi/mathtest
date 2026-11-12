// Checks that every resource link in src/content/roadmap.json still works.
// Run it with:  npm run check:links
//
// Websites move pages around over time ("link rot"), so it's worth running
// this now and then, and always after adding new resources.
// It needs an internet connection. It's a plain Node script (.mjs = a
// JavaScript module), not part of the app itself.

import { readFile } from 'node:fs/promises'

const roadmap = JSON.parse(
  await readFile(new URL('../src/content/roadmap.json', import.meta.url), 'utf8'),
)

// Collect each unique URL once, remembering which topics use it.
const usedBy = new Map()
for (const stage of roadmap.stages) {
  for (const topic of stage.topics) {
    for (const resource of topic.resources) {
      if (!usedBy.has(resource.url)) usedBy.set(resource.url, [])
      usedBy.get(resource.url).push(topic.id)
    }
  }
}

async function check(url) {
  try {
    // Some sites block unknown programs, so we say who we are, politely.
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (DevPath link checker)' },
      signal: AbortSignal.timeout(15_000), // give up after 15 seconds
    })
    // Some sites (e.g. those behind Cloudflare) answer scripts with a 403
    // "prove you're a human" challenge, but work fine in a real browser. That
    // isn't a broken link, so we flag it separately for a manual check.
    const botCheck = response.status === 403 && response.headers.has('cf-mitigated')
    return { url, status: response.status, botCheck }
  } catch (error) {
    return { url, status: 'ERROR', error: error.cause?.code ?? error.message }
  }
}

// Check 8 links at a time: fast, but without hammering any one website.
const urls = [...usedBy.keys()]
const results = []
for (let i = 0; i < urls.length; i += 8) {
  results.push(...(await Promise.all(urls.slice(i, i + 8).map(check))))
}

const manual = results.filter((r) => r.botCheck)
const broken = results.filter((r) => r.status !== 200 && !r.botCheck)

for (const r of manual) {
  console.log(`? ${r.url}  (bot protection; open it in your browser to check)`)
}
for (const r of broken) {
  console.log(`✗ ${r.status} ${r.url}`)
  if (r.error) console.log(`    reason: ${r.error}`)
  console.log(`    used by: ${usedBy.get(r.url).join(', ')}`)
}
const ok = results.length - broken.length - manual.length
console.log(`\n${ok} OK, ${manual.length} to check by hand, ${broken.length} broken.`)

// A non-zero exit code tells other tools (and you) that something failed.
process.exitCode = broken.length > 0 ? 1 : 0
