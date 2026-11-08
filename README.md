<div align="center">

# scan-env

### Zero-dependency CLI to audit and sync environment variables between your codebase and `.env.example`.

[![CI](https://github.com/2255-bit/scan-env/actions/workflows/ci.yml/badge.svg)](https://github.com/2255-bit/scan-env/actions)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/scan-env)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br/>

</div>

## The Problem

In fast-moving teams and CI/CD pipelines, **builds crash and developer onboarding breaks** because developers introduce environment variables in code (`process.env.MY_VAR` or `import.meta.env.VITE_VAR`) without documenting them in `.env.example`.

Existing linters are either bloated with hundreds of dependencies, tied to a specific framework, or require complex configurations.

## The Solution: `scan-env`

`scan-env` is an ultra-fast, **100% autonomous micro-CLI with zero external dependencies** built strictly using native Node.js APIs.

- ⚡ **Instant startup:** Runs in `< 40ms` with zero dependency overhead.
- 🔍 **Universal detection:** Scans `.js`, `.ts`, `.jsx`, `.tsx`, `.vue`, `.svelte`, and `.astro`.
- 🛡️ **Zero false positives:** Accurately ignores single-line (`//`), multi-line (`/* */`), and HTML comments.
- 📍 **Exact location tracking:** Pinpoints exact file paths and line numbers where undeclared variables are used.
- 🛠️ **One-click auto-fix:** Pass `--fix` to immediately append missing variables to `.env.example` without touching existing content.
- 🚦 **CI/CD & Git hook native:** Clean Unix exit codes (`0` for synchronized, `1` for missing variables).

---

## Quickstart

Run directly without installing anything:

```bash
npx scan-env
```

Or fix missing variables automatically:

```bash
npx scan-env --fix
```

### Installation (Optional)

Install locally in your project:

```bash
npm install -D scan-env
# or
pnpm add -D scan-env
# or
yarn add -D scan-env
```

---

## What It Detects

`scan-env` recognizes all common conventions across both Node.js and modern client-side bundlers (Vite, Next.js, Nuxt, Astro, SvelteKit):

```typescript
// Standard dot notation
const db = process.env.DATABASE_URL;

// Optional chaining
const apiKey = process.env?.API_KEY;

// Bracket notation
const secret = process.env['JWT_SECRET'];

// Vite & client-side meta env
const endpoint = import.meta.env.VITE_BACKEND_URL;

// Destructuring with renaming or default fallbacks
const {
  PORT = 3000,
  REDIS_URL,
  ENCRYPTION_KEY: key,
} = process.env;
```

---

## CLI Options

```text
USAGE:
  $ npx scan-env [directory] [options]

OPTIONS:
  -f, --fix            Automatically append missing variables to your env template
  -e, --example <file> Path to template file (default: .env.example)
  -d, --dir <path>     Root directory to scan (default: current directory)
  -i, --ignore <dirs>  Comma-separated folder names to ignore (e.g. tests,scripts)
  --include <exts>     Comma-separated file extensions to scan (e.g. .ts,.tsx,.vue)
  --ignore-vars <vars> Comma-separated variable names to ignore (e.g. NODE_ENV,PORT)
  -w, --warn-unused    Warn about variables in template not used in code
  --json               Output results in pure JSON format
  -q, --quiet          Quiet mode: only outputs missing keys, minimal stdout
  --no-color           Disable ANSI terminal color output
  --color              Force ANSI terminal color output
  -v, --version        Show current version
  -h, --help           Show this help manual
```

---

## CI/CD & Git Hooks

### GitHub Actions

Block pull requests if new environment variables were added without updating `.env.example`:

```yaml
# .github/workflows/audit-env.yml
name: Audit Environment Variables

on:
  pull_request:
    branches: [ main ]

jobs:
  audit-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Verify .env.example synchronization
        run: npx scan-env
```

### Git Pre-Commit Hook (Husky)

Ensure every commit has up-to-date documentation:

```bash
# Add check to pre-commit
npx husky add .husky/pre-commit "npx scan-env"
```

Or with `lint-staged`:

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,vue,svelte}": [
      "scan-env"
    ]
  }
}
```

---

## Programmatic API

You can also use `scan-env` directly in your Node.js scripts or build tools:

```javascript
import { scanEnv } from 'scan-env';

const result = scanEnv({
  dir: './apps/web',
  example: '.env.example',
  ignoreVars: ['NODE_ENV'],
  fix: false, // set to true to auto-append missing keys
});

console.log(result.success);      // true | false
console.log(result.missingKeys);  // ['STRIPE_SECRET_KEY', ...]
console.log(result.detectedKeys); // ['DATABASE_URL', 'STRIPE_SECRET_KEY', ...]
```

---

## Why scan-env?

| Feature | `scan-env` | Others / Custom Scripts |
| :--- | :---: | :---: |
| **External Dependencies** | **0** | Often 10+ (Chalk, Commander, Babel, etc.) |
| **Speed** | **< 40ms** | 500ms - 2s |
| **Framework Agnostic** | ✅ (Node, Next, Vite, Vue, Svelte, Astro) | ❌ (Often restricted to React or Node) |
| **Comment Filtering** | ✅ (Zero false alerts) | ❌ (Basic regex detects commented lines) |
| **Line Number Reporting**| ✅ (Exact line pointer) | ❌ (File name only) |
| **Auto-Remediation** | ✅ (`--fix`) | ❌ (Manual copy-paste) |

---

## Contributing

Contributions are welcome! Please check [CONTRIBUTING.md](CONTRIBUTING.md) for details on running tests and our zero-dependency policy.

## License

[MIT](LICENSE) © 2026 scan-env contributors
