# Release and Publish Scripts

This directory contains standalone scripts for releasing, publishing, and verifying the turkey-map-react package.

## Scripts

### `release.sh`

Prepares a new release by running tests, building, generating changelog, and updating version.

**Usage:**
```bash
./scripts/release.sh [release-type]
```

**Release types:**
- `auto` - Let conventional commits decide the bump; no-op if there is nothing new (used by the automated workflow)
- `major` - Breaking changes (1.0.0 → 2.0.0)
- `minor` - New features (1.0.0 → 1.1.0)
- `patch` - Bug fixes (default, 1.0.0 → 1.0.1)
- `prerelease` - Pre-release version (1.0.0 → 1.0.1-0)

**Example:**
```bash
# Automatic bump (used by the Release workflow)
./scripts/release.sh auto

# Patch release (default)
./scripts/release.sh

# Minor release
./scripts/release.sh minor

# Major release
./scripts/release.sh major
```

### `publish.sh`

Publishes the package to npm registry.

**Usage:**
```bash
# With NPM token
NPM_TOKEN=your_token ./scripts/publish.sh

# With npm login
npm login
./scripts/publish.sh
```

## Verification

`npm run verify` builds the package and runs every test layer:

```bash
npm run verify
```

Individual layers can be run separately:

```bash
npm run typecheck       # TypeScript source check
npm run test:coverage   # source tests with coverage thresholds
npm run test:artifact   # tests against the built lib/index.js
npm run test:package    # packs, validates, and installs the package
npm run test:types      # compiles a TypeScript consumer
REACT_VERSION=16.8.6 npm run test:compat
```

## npm Scripts

These scripts can also be run via npm:

```bash
# Release
npm run release          # patch release
npm run release:auto     # automatic bump from conventional commits
npm run release:patch    # patch release (explicit)
npm run release:minor    # minor release
npm run release:major    # major release

# Publish
npm run publish:npm
```

## Documentation

For complete documentation, see [RELEASE.md](../RELEASE.md) in the root directory.
