import { cpSync, existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = resolve(process.cwd())
const standaloneDir = resolve(root, '.next', 'standalone')
const staticDir = resolve(root, '.next', 'static')
const publicDir = resolve(root, 'public')

if (!existsSync(standaloneDir)) {
  throw new Error('Missing .next/standalone. Run next build first.')
}

if (existsSync(staticDir)) {
  await mkdir(dirname(resolve(standaloneDir, '.next', 'static')), { recursive: true })
  cpSync(staticDir, resolve(standaloneDir, '.next', 'static'), { recursive: true })
}

if (existsSync(publicDir)) {
  cpSync(publicDir, resolve(standaloneDir, 'public'), { recursive: true })
}
