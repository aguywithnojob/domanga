// Runs automatically after `npm run deploy`
// Tags the freshly-deployed gh-pages commit so you can roll back anytime.
//
// Rollback to a previous tag:
//   git push origin refs/tags/deploy/v1.0-20260411-2230:refs/heads/gh-pages --force
//
// List all deploy tags:
//   git tag -l "deploy/*"

import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const pkg     = JSON.parse(readFileSync('./package.json', 'utf-8'))
const version = pkg.version.split('.').slice(0, 2).join('.')

const now   = new Date()
const ymd   = now.toISOString().slice(0, 10).replaceAll('-', '')
const hm    = now.toTimeString().slice(0, 5).replace(':', '')
const tag   = `deploy/v${version}-${ymd}-${hm}`

try {
  execSync('git fetch origin gh-pages --quiet')
  execSync(`git tag ${tag} origin/gh-pages`)
  execSync(`git push origin ${tag} --quiet`)
  console.log(`\n✔ Deploy tagged: ${tag}`)
  console.log(`  Rollback: git push origin refs/tags/${tag}:refs/heads/gh-pages --force\n`)
} catch (err) {
  // Non-fatal — tag may already exist or push may need auth
  console.warn(`  Tag skipped: ${err.message.trim()}`)
}
