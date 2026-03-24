import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'

process.env.NODE_ENV = 'production'

const require = createRequire(import.meta.url)
const standaloneRoot = resolve(process.cwd(), '.next', 'standalone')

const findServerEntry = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isFile() && entry.name === 'server.js') {
      return fullPath
    }

    if (entry.isDirectory() && entry.name !== 'node_modules') {
      const nested = findServerEntry(fullPath)
      if (nested) return nested
    }
  }

  return null
}

if (!existsSync(standaloneRoot)) {
  throw new Error(`Missing standalone build output at ${standaloneRoot}`)
}

const entry = findServerEntry(standaloneRoot)
if (!entry) {
  throw new Error(`Could not find server.js inside ${standaloneRoot}`)
}

process.chdir(dirname(entry))
require(entry)
