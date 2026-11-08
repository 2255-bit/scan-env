# Contributing to scan-env

Thank you for your interest in contributing to `scan-env`! We believe in keeping this tool lightning-fast, zero-dependency, and rock-solid.

## Core Principles

1. **Zero External Dependencies:** Only native Node.js standard modules are allowed (`node:fs`, `node:path`, `node:util`, etc.). No chalk, no commander, no lodash.
2. **Speed:** Execution must stay under 50ms for typical projects.
3. **Accuracy:** Zero false positives. Commented-out code must never trigger false alerts.
4. **Tested:** Every feature or bug fix must include tests run through the native `node --test` runner.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/scan-env/scan-env.git
cd scan-env

# Verify tests pass
npm test

# Run syntax linting
npm run lint
```

## Adding a Test

Add new test cases to the appropriate file in `test/`:
- `test/scanner.test.js`: for code scanning, AST/regex parsing, multi-framework syntax.
- `test/env-parser.test.js`: for `.env` formatting and manipulation.
- `test/cli.test.js`: for command-line arguments and process exit codes.
- `test/api.test.js`: for programmatic JavaScript API.

## Submitting a Pull Request

1. Fork the repo and create your branch from `main`.
2. Ensure `npm test` and `npm run lint` pass cleanly.
3. Write a clear description of your changes in your PR.
