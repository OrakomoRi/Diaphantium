# Diaphantium builds

This branch stores published build artifacts and a compact index of stable releases. It is intended for consumption by static hosts, CDN references and release automation — not for active development.

## Repository layout

```
builds/
├── versions/
│   ├── 1.0.0/
│   │   └── diaphantium.min.js
│   ├── 2.0.0/
│   │   └── diaphantium.min.js
│   └── ...
├── stable.json
├── vercel.json
└── README.md
```

### File structure

| Path | Description |
|------|-------------|
| `versions/<version>/diaphantium.min.js` | Minified build artifacts produced by CI. Each version is isolated in its own directory. |
| `stable.json` | Append-only index of official stable releases containing version metadata. |
| `vercel.json` | Deployment configuration for caching and CORS headers. |
| `README.md` | This document. |

## Purpose

Keep binary and minified artifacts out of `main` while maintaining a straightforward, tag-free place to host release files. The `builds` branch functions as an artifact registry that CI can safely rewrite and append to without affecting source history.

## CI workflow

Triggered by changes to `release/diaphantium.user.js` on `main`:

1. **Extract version** — CI reads the `@version` header from the userscript
2. **Determine stability** — Versions matching [SemVer] pattern (`x.y.z`) are considered stable
3. **Build** — Webpack produces `diaphantium.min.js` in production mode
4. **Publish** — Artifact is committed to `versions/<VERSION>/diaphantium.min.js`
5. **Index** — For stable versions only:
   - Entry is appended to `stable.json`
   - GitHub release is created with downloadable artifacts

### Version classification

- **Stable**: `1.2.3` — Pure [SemVer], triggers full release process
- **Pre-release**: `1.2.3-beta.1`, `2.0.0-rc.2` — Built but not indexed in `stable.json`
- **Dev builds**: `5.0.1+build.2` — Built but not indexed

## `stable.json` schema

```json
{
  "versions": [
    {
      "version": "1.2.3",
      "date": "2023-01-01",
      "hash": "abc123",
      "link": "https://cdn.jsdelivr.net/gh/OrakomoRi/Diaphantium@abc123/release/diaphantium.user.js"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | [SemVer] version number |
| `date` | string | Release date (YYYY-MM-DD) |
| `hash` | string | Git commit SHA from `main` |
| `link` | string | CDN link to the userscript at that commit |

**Rules:**
- Created automatically if missing
- Entries are appended, never modified
- Duplicates are skipped by version comparison

## Publishing a release

1. Update `@version` in `release/diaphantium.user.js` on `main`
2. Push to `main`
3. CI automatically builds and publishes

For stable releases (e.g., `1.2.3`):
- Artifact appears in `versions/1.2.3/`
- Entry added to `stable.json`
- GitHub release created with tag

For pre-releases or dev builds:
- Only artifact is published to `versions/`
- No GitHub release or `stable.json` entry

## Local verification

Preview CI build output before publishing:

```bash
npm ci
npx webpack --mode production --output-path ./tmp-build
```

Inspect `./tmp-build/diaphantium.min.js` and verify the `@version` header.

## CDN usage

Access builds via jsDelivr:

```
https://cdn.jsdelivr.net/gh/OrakomoRi/Diaphantium@builds/versions/<VERSION>/diaphantium.min.js
```

Example:
```
https://cdn.jsdelivr.net/gh/OrakomoRi/Diaphantium@builds/versions/5.0.0/diaphantium.min.js
```

## Operational notes

- **CI is authoritative** — Avoid manual edits to this branch
- **No history rewriting** — Use controlled retraction workflows if needed
- **Artifact immutability** — Once published, versions should not be modified
- **Vercel deployment** — Configured via `vercel.json` for optimal caching

## Maintenance

This branch is managed entirely by GitHub Actions. Manual intervention should be limited to:
- Retraction of compromised versions
- Cleanup of obsolete pre-release artifacts
- Emergency fixes to `stable.json` structure

For all other changes, modify the workflow in `main` branch.

[SemVer]: https://semver.org/
