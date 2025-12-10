# Release and Publish Scripts

This directory contains standalone scripts for releasing and publishing the turkey-map-react package.

## Scripts

### `release.sh`

Prepares a new release by running tests, building, generating changelog, and updating version.

**Usage:**
```bash
./scripts/release.sh [release-type]
```

**Release types:**
- `major` - Breaking changes (1.0.0 → 2.0.0)
- `minor` - New features (1.0.0 → 1.1.0)
- `patch` - Bug fixes (default, 1.0.0 → 1.0.1)
- `prerelease` - Pre-release version (1.0.0 → 1.0.1-0)

**Example:**
```bash
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

## npm Scripts

These scripts can also be run via npm:

```bash
# Release
npm run release          # patch release
npm run release:patch    # patch release (explicit)
npm run release:minor    # minor release
npm run release:major    # major release

# Publish
npm run publish:npm
```

## Documentation

For complete documentation, see [RELEASE.md](../RELEASE.md) in the root directory.
