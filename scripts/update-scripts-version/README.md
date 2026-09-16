# Version Injector

Reads `version` from the staged `package.json` and writes it into the release userscript, then stages the userscript for the current commit.

## Usage

Runs automatically as a **git pre-commit hook** — no manual invocation needed.

```bash
# or manually
node scripts/update-scripts-version/inject-version.cjs
```

## What it updates

| File | Pattern replaced |
|------|-----------------|
| `release/diaphantium.user.js` | `// @version ...` |

## Workflow

1. Change `"version"` in `package.json`
2. `git commit` — the hook writes the version into the userscript and stages it

## Hook setup

The hook lives in `.githooks/pre-commit` and is activated by the `prepare` npm script:

```bash
npm install  # runs: git config core.hooksPath .githooks
```
