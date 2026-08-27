/**
 * Fails when a module in src/lib or src/hooks has no test file beside it.
 *
 * This replaces a coverage threshold, which sounds stronger but gates nothing
 * here: the v8 provider reports zero instrumented rows in this setup, so any
 * percentage it produced would be vacuous. "Every module has a test" is a
 * weaker claim, but it is one this repository can actually verify — and it
 * catches the regression that matters, a new module landing with no tests.
 *
 * Run: npm run check:modules
 */
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIRS = ['src/lib', 'src/hooks']

/** Modules that legitimately have no test, with the reason. */
const EXEMPT: Record<string, string> = {
  'src/lib/utils.ts': 'the shadcn cn() re-export — testing it would test clsx and tailwind-merge',
}

const untested = DIRS.flatMap((dir) =>
  readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => join(dir, name))
    .filter((file) => {
      if (EXEMPT[file]) return false
      const base = file.replace(/\.tsx?$/, '')
      return !existsSync(`${base}.test.ts`) && !existsSync(`${base}.test.tsx`)
    }),
)

if (untested.length) {
  console.error('Modules with no test file:\n' + untested.map((f) => `  - ${f}`).join('\n'))
  console.error('\nAdd a test beside it, or add it to EXEMPT in this script with a reason.')
  process.exit(1)
}

const exempt = Object.keys(EXEMPT).length
console.log(`every module in ${DIRS.join(' and ')} has tests (${exempt} exempt)`)
