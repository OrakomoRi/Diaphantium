# Version Injector

Reads `version` from `package.json` and injects it into both release scripts, then stages them for the current commit.

## Usage

Runs automatically as a **git pre-commit hook** — no manual invocation needed.

```bash
# or manually
node scripts/update-scripts-version/inject-version.cjs
```

## What it updates

| File | Pattern replaced |
|------|-----------------|
| `release/severitium.client.js` | `const CLIENT_VERSION = '...'` |
| `release/severitium.user.js` | `// @version ...` |

## Workflow

1. Change `"version"` in `package.json`
2. `git commit` — hook injects the version and stages both files automatically

## Hook setup

The hook lives in `.githooks/pre-commit` and is activated via the `prepare` npm script:

```bash
npm install  # runs: git config core.hooksPath .githooks
```
