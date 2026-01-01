# Moru SDK Deployment Specification

## Overview

This document specifies the deployment plan for Moru SDKs to npm (`@moru-ai`), PyPI (`moru`), and Homebrew core (`moru`). The SDKs are forked from E2B and require complete rebranding before the initial v0.1.0 release.

**Target Timeline:** ASAP (minimal viable release, iterate later)

---

## Package Naming & Distribution

### npm Packages

| Package | npm Name | Binary | Description |
|---------|----------|--------|-------------|
| JS SDK | `@moru-ai/core` | - | Core SDK for sandbox management |
| CLI | `@moru-ai/cli` | `moru` | Command-line interface |

**Organization:** `@moru-ai` (already created on npmjs.com)

### PyPI Packages

| Package | PyPI Name | Description |
|---------|-----------|-------------|
| Python SDK | `moru` | Python SDK with sync/async support |
| moru_connect | (internal) | Internal RPC protocol, not published |

**Note:** `moru` is available on PyPI. Fallback: `moru-ai` if needed.

### Homebrew

| Formula | Command | Description |
|---------|---------|-------------|
| `moru` | `brew install moru` | CLI with Node.js dependency |

**Distribution:** Homebrew core (not a custom tap)
**Runtime:** Node.js dependency (same approach as E2B)

---

## Domain Configuration

### Default Domains

| Purpose | Domain | Notes |
|---------|--------|-------|
| API | `api.moru.io` | REST API endpoint |
| Sandboxes | `*.moru.io` | Wildcard for sandbox connections |
| Auth | `auth.moru.io` | CLI browser authentication |
| Dashboard | `dashboard.moru.io` | (planned, not yet available) |

### SDK Connection Logic

```
Default domain: moru.io
API URL: https://api.{domain} → https://api.moru.io
Sandbox URL: https://{port}-{sandboxId}.{domain}
```

### Environment Variables

All environment variables use `MORU_` prefix (no E2B backward compatibility):

| Variable | Description |
|----------|-------------|
| `MORU_API_KEY` | API key for authentication |
| `MORU_ACCESS_TOKEN` | Access token for authentication |
| `MORU_DOMAIN` | Override default domain (default: `moru.io`) |
| `MORU_API_URL` | Override API URL |
| `MORU_SANDBOX_URL` | Override sandbox connection URL |
| `MORU_DEBUG` | Enable debug mode (default: `false`) |

---

## E2B Cleanup Requirements

### Complete Purge (149 files affected)

All E2B references must be removed. No backward compatibility layer.

#### Package References to Update

1. **Python SDK `package.json`**: Change `@e2b/python-sdk` → (remove or update)
2. **CLI imports**: `import * as e2b from 'moru'` → `import * as moru from '@moru-ai/core'`
3. **Error messages**: Remove all `e2b.dev/dashboard` references
4. **User-Agent**: Keep `moru-js-sdk/` and `moru-python-sdk/` format (matches infra)

#### Files Requiring Updates

- `packages/cli/src/user.ts`:
  - `USER_CONFIG_PATH`: `~/.e2b/config.json` → `~/.moru/config.json`
  - `DOCS_BASE`: `e2b.dev` → `moru.io`
  - `E2B_DOCS_BASE` env var → remove

- `packages/cli/src/commands/auth/login.ts`:
  - `'e2b auth logout'` → `'moru auth logout'`
  - All CLI command references

- `spec/openapi.yml`: Update server URL to `api.moru.io`

- Test files: Update URLs from `e2b.dev` → `moru.io`

- README files: Full rebrand

- Test fixtures: Update to Moru branding

### Code Generation

1. **OpenAPI**: Regenerate from fresh spec pointing to `api.moru.io`
2. **Protobuf**: Regenerate envd proto files with Moru branding
3. **Run existing codegen workflow** (keep as-is per current setup)

---

## Version Management

### Inter-Package Dependencies

Use **explicit versions**, not `workspace:*` protocol, for dependencies between packages:

```json
// packages/cli/package.json
"dependencies": {
  "@moru-ai/core": "^0.1.0"  // ✓ Explicit version
}

// NOT this:
"dependencies": {
  "@moru-ai/core": "workspace:*"  // ✗ Don't use workspace protocol
}
```

**Why explicit versions?**
1. **Publishing compatibility** - Works correctly when published to npm
2. **Version pinning** - CLI can lag behind SDK version if needed
3. **Changesets workflow** - Works better with automated version bumps

pnpm still symlinks the local package during development (when versions are compatible).

**Reference:** E2B uses the same approach:
- [E2B CLI package.json](https://github.com/e2b-dev/E2B/blob/main/packages/cli/package.json) - declares `"e2b": "^2.8.4"`
- [E2B JS SDK package.json](https://github.com/e2b-dev/E2B/blob/main/packages/js-sdk/package.json) - publishes as `e2b`

### Initial Release

- **Version:** `0.1.0` (stable, not pre-release)
- **All packages released together** (coordinated release)

### Versioning Strategy

- **Changesets:** Keep current setup
- **Major version sync:** All packages share major version
- **Minor/patch:** Independent per package
- **Changelog:** Clear history, fresh start from v0.1.0

---

## CI/CD Configuration

### GitHub Actions Secrets (Need to Set Up)

| Secret | Purpose |
|--------|---------|
| `NPM_TOKEN` | Publish to npm `@moru-ai` org |
| `PYPI_TOKEN` | Publish to PyPI as `moru` |
| `MORU_API_KEY` | Integration tests against production |

### Workflow Updates

1. **Remove docs integration**: Remove references to `e2b-dev/E2B` docs repos
2. **Update test domains**: Use `moru.io` for all connectivity tests
3. **Keep release automation**: Current Changesets-based workflow

### Test Strategy

- **Integration tests:** Against production Moru API
- **API keys:** From GitHub repo secrets
- **Browser tests:** Test and decide (keep if passing)

---

## CLI Configuration

### Config Storage

- **Location:** `~/.moru/config.json`
- **No migration** from `~/.e2b/` (users start fresh)

### Auth Flow

- Keep current browser-based OAuth flow
- Auth URL: `auth.moru.io` (or `moru.io/auth` as fallback)
- Support `MORU_API_KEY` environment variable

### Command Names

All CLI output uses `moru` command name:
- `moru auth login`
- `moru auth logout`
- `moru template build`
- etc.

---

## Python SDK Specifics

### Package Structure

- Main package: `moru`
- Internal sub-package: `moru_connect` (kept separate)
- Both sync and async variants maintained

### Requirements

- Python 3.9+ (maximum compatibility)
- No changes to dependency requirements

---

## JavaScript SDK Specifics

### Package Structure

- Main package: `@moru-ai/core`
- Types exported directly from core (no separate types package)
- MCP server functionality: Keep internal (not exported publicly)

### Requirements

- Node.js 20+
- Browser support: Test and decide

### User-Agent

Keep current format (matches infra expectations):
- `moru-js-sdk/{version}`
- `moru-python-sdk/{version}`

---

## Config Files

### Template Configuration

- **Filename:** `moru.toml` (keep current)
- **Format:** TOML (no change)

---

## Documentation

### Strategy

- **GitHub README only** (no separate docs site initially)
- **Badges:** Add later (after first release)

### Migration Guide

Provide both:
1. **Quick reference:** Simple mapping table (e2b → moru, E2B_* → MORU_*)
2. **Step-by-step:** Detailed instructions with code examples

### Error Messages

- Dashboard references: "Contact support@moru.io"
- Support email: `support@moru.io`

---

## License

- Keep both copyright holders:
  - 2023 FoundryLabs, Inc.
  - 2025 Moru AI
- License: Apache 2.0

---

## Homebrew Core Submission

### Requirements

1. **Stable release URL:** GitHub release tarball (v0.1.0)
2. **Runtime:** Node.js dependency
3. **Formula name:** `moru`
4. **Installation:** `brew install moru`

### Formula Template

```ruby
class Moru < Formula
  desc "CLI to manage Moru sandboxes and templates"
  homepage "https://moru.io"
  url "https://github.com/moru-ai/sdks/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "TBD"
  license "Apache-2.0"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "moru", shell_output("#{bin}/moru --version")
  end
end
```

---

## Development Log

> **Note:** Update this checklist regularly as tasks are completed. See `docs/development-log.txt` for detailed progress notes.

---

## Implementation Checklist

### Phase 1: Rebranding

- [x] Update default domain from `sandbox.moru.io` to `moru.io`
- [x] Update CLI config path from `~/.e2b/` to `~/.moru/`
- [x] Replace all `e2b` command references with `moru`
- [x] Update all error messages and help text
- [x] Update all test domains to `moru.io`
- [x] Update test fixtures with Moru branding
- [x] Clear changelog history (no changelog files exist yet - fresh start)
- [x] Update README files
- [x] Verify LICENSE files have both copyright holders (FoundryLabs 2023 + Moru AI 2025)
- [x] Verify `moru.toml` template config filename is used (not `e2b.toml`)

### Phase 2: Package Configuration

- [x] Rename JS SDK package to `@moru-ai/core`
- [x] Update CLI package to `@moru-ai/cli`
- [x] Update CLI imports from `'moru'` to `'@moru-ai/core'`
- [ ] Verify Python SDK is `moru` on PyPI (requires publishing)
- [x] Update package.json files with new names
- [x] Set version to `0.1.0` for all packages
- [x] Verify inter-package dependencies use explicit versions (not `workspace:*`)
- [x] Verify User-Agent format is `moru-js-sdk/` and `moru-python-sdk/`

### Phase 3: Code Generation

- [x] Update OpenAPI spec with `api.moru.io`
- [x] Regenerate OpenAPI client code (run `pnpm generate:api` in js-sdk)
- [x] Regenerate protobuf definitions (already up-to-date, no E2B references)
- [x] Verify generated code is properly branded

### Phase 4: CI/CD Setup

- [x] Create `NPM_TOKEN` secret (HUMAN REQUIRED)
- [x] Create `PYPI_TOKEN` secret (HUMAN REQUIRED)
- [x] Create `MORU_API_KEY` secret for tests (HUMAN REQUIRED)
- [x] Seed 'base' template in Moru infrastructure (HUMAN REQUIRED)
- [x] Remove docs integration from workflows (removed E2B docs sync from publish_packages.yml)
- [x] Update workflow package names (e2b → @moru-ai/core, @e2b/cli → @moru-ai/cli)
- [x] Verify release workflow works (workflows configured for @moru-ai/core, @moru-ai/cli, moru)

### Phase 5: Testing

- [x] Run CLI unit tests (42/42 passed)
- [x] Run JS SDK unit tests (48/48 passed)
- [x] Run JS SDK integration tests (2/2 passed - randomness tests)
- [x] Run Python SDK unit tests (6/6 passed)
- [x] Run Python SDK integration tests (2/2 passed - create tests)
- [ ] Test browser support (if keeping)
- [ ] Test CLI auth flow with auth.moru.io (BLOCKED - auth flow not yet implemented)

### Phase 6: Release

- [ ] Create v0.1.0 release on GitHub
- [ ] Publish `@moru-ai/core` to npm
- [ ] Publish `@moru-ai/cli` to npm
- [ ] Publish `moru` to PyPI
- [ ] Submit Homebrew formula to homebrew-core

### Phase 7: Post-Release

- [ ] Write E2B → Moru migration guide
- [ ] Monitor for issues
- [ ] Plan v0.2.0 improvements

---

## Files to Create/Update Summary

### New Files

- [x] `docs/DEPLOYMENT_SPEC.md` (this file)
- [ ] `docs/MIGRATION.md` (E2B to Moru migration guide)

### Key Files to Update

| File | Changes |
|------|---------|
| `packages/js-sdk/package.json` | Name → `@moru-ai/core` |
| `packages/cli/package.json` | Name → `@moru-ai/cli` |
| `packages/js-sdk/src/connectionConfig.ts` | Domain → `moru.io` |
| `packages/python-sdk/moru/connection_config.py` | Domain → `moru.io` |
| `packages/cli/src/user.ts` | Config path, DOCS_BASE |
| `packages/cli/src/commands/auth/login.ts` | Command names |
| `spec/openapi.yml` | Server URL |
| All README.md files | Full rebrand |
| All test files with e2b references | Domain updates |

---

## Appendix: Current E2B References Count

Based on grep analysis, 149 files contain E2B references:
- CLI source files: ~30 files
- JS SDK: ~10 files
- Python SDK: ~20 files
- Test fixtures: ~60 files
- Config/workflow files: ~15 files
- Docs/README: ~14 files

All must be updated for complete purge.
