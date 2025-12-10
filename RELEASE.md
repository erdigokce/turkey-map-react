# Release Process Documentation

This document describes the automated build, test, and release pipeline for the turkey-map-react package.

## Overview

The release process is automated using standalone scripts that can be run independently or through GitHub Actions. The pipeline consists of two main scripts:

1. **Release Script** (`scripts/release.sh`) - Prepares a release
2. **Publish Script** (`scripts/publish.sh`) - Publishes the package to npm

## Prerequisites

### For Local Development

- Node.js 16+ installed
- Git configured with user name and email
- npm account with publish permissions (for publishing)

### For GitHub Actions

- `NPM_TOKEN` secret configured in repository settings (for publishing to npm)
  - Go to GitHub repository → Settings → Secrets and variables → Actions
  - Create a new repository secret named `NPM_TOKEN`
  - Get your npm token from https://www.npmjs.com/settings/[username]/tokens

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This enables automated changelog generation and semantic versioning.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature (triggers MINOR version bump)
- `fix`: A bug fix (triggers PATCH version bump)
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (white-space, formatting)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Breaking Changes

Add `BREAKING CHANGE:` in the commit body or append `!` after type to trigger MAJOR version bump:

```
feat!: remove deprecated API
```

or

```
feat: add new feature

BREAKING CHANGE: This removes the old API
```

### Examples

```bash
feat: add support for custom tooltips
fix: resolve rendering issue on mobile devices
docs: update README with new examples
chore: upgrade dependencies
```

## Release Scripts

### 1. Release Script (`scripts/release.sh`)

Prepares a new release by:
1. Running tests
2. Creating a production build
3. Generating/updating CHANGELOG.md from conventional commits
4. Bumping version in package.json
5. Creating a git tag

#### Usage

```bash
# Run with default (patch) version bump
./scripts/release.sh

# Or use npm scripts
npm run release          # patch version bump
npm run release:patch    # explicit patch version bump
npm run release:minor    # minor version bump
npm run release:major    # major version bump
```

#### Release Types

- `major`: Breaking changes (1.0.0 → 2.0.0)
- `minor`: New features (1.0.0 → 1.1.0)
- `patch`: Bug fixes (1.0.0 → 1.0.1)
- `prerelease`: Pre-release version (1.0.0 → 1.0.1-0)

#### What Happens

1. All tests are run (`npm test`)
2. Production build is created (`npm run clean-build`)
3. Commits since last release are analyzed
4. CHANGELOG.md is automatically updated
5. Version is bumped in package.json
6. Changes are committed with message: `chore(release): [version]`
7. Git tag is created

After the script completes:
```bash
# Review the changes
git log -1
cat CHANGELOG.md

# Push to remote
git push --follow-tags origin main
```

### 2. Publish Script (`scripts/publish.sh`)

Publishes the package to npm registry.

#### Usage with npm Token

```bash
NPM_TOKEN=your_npm_token ./scripts/publish.sh

# Or use npm script
NPM_TOKEN=your_npm_token npm run publish:npm
```

#### Usage with npm Login

```bash
# First, login to npm
npm login

# Then publish
./scripts/publish.sh
# or
npm run publish:npm
```

#### What Happens

1. Checks for NPM_TOKEN environment variable
2. Displays current version to be published
3. Asks for confirmation
4. Publishes package to npm with public access
5. Cleans up temporary authentication files

## GitHub Actions Workflows

### Manual Release Workflow

**File:** `.github/workflows/release.yml`

**Trigger:** Manual workflow dispatch

**Steps:**
1. Go to GitHub repository → Actions → Release
2. Click "Run workflow"
3. Select release type (major, minor, patch, or prerelease)
4. Click "Run workflow"

The workflow will:
- Run all tests
- Create production build
- Generate changelog
- Bump version
- Push changes and tags
- Create GitHub Release

### Manual Publish Workflow

**File:** `.github/workflows/publish.yml`

**Trigger:** Manual workflow dispatch

**Configuration Required:** `NPM_TOKEN` secret must be set in repository settings

**Steps:**
1. Go to GitHub repository → Actions → Publish to npm
2. Click "Run workflow"
3. Type "publish" to confirm
4. Click "Run workflow"

The workflow will:
- Build the package
- Run tests
- Publish to npm
- Create success summary

## Complete Release Flow

### Recommended Workflow

1. **Develop features** using conventional commits
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git push origin main
   ```

2. **Create release** (via GitHub Actions)
   - Go to Actions → Release → Run workflow
   - Select release type
   - Wait for completion

3. **Verify release**
   - Check GitHub Releases page
   - Review CHANGELOG.md
   - Verify version in package.json

4. **Publish to npm** (via GitHub Actions)
   - Go to Actions → Publish to npm → Run workflow
   - Type "publish" to confirm
   - Wait for completion
   - Verify on npm: https://www.npmjs.com/package/turkey-map-react

### Alternative: Local Release and Publish

```bash
# 1. Create release
npm run release:minor

# 2. Review changes
git log -1
cat CHANGELOG.md

# 3. Push to GitHub
git push --follow-tags origin main

# 4. Publish to npm
NPM_TOKEN=your_token npm run publish:npm
```

## Troubleshooting

### Tests Fail During Release

The release script will abort if tests fail. Fix the failing tests and try again.

```bash
# Run tests locally
npm test

# Run tests in watch mode
npm run test:watch
```

### Build Fails During Release

The release script will abort if the build fails. Check build errors and fix them.

```bash
# Run build locally
npm run clean-build
```

### Publish Fails - Authentication Error

Ensure NPM_TOKEN is correctly set:
```bash
# Verify token is set
echo $NPM_TOKEN

# Or login manually
npm login
```

### Publish Fails - Version Already Exists

The version already exists on npm. You need to create a new release with a bumped version.

```bash
# Create a new patch release
npm run release:patch
git push --follow-tags origin main

# Then publish again
npm run publish:npm
```

### Want to Skip CI During Development

If you're making documentation-only changes or want to skip CI:

```bash
git commit -m "docs: update README [skip ci]"
```

## Best Practices

1. **Use conventional commits** - This enables automated changelog generation
2. **Test locally first** - Run `npm test` and `npm run build` before releasing
3. **Review changelog** - Always review CHANGELOG.md after running release script
4. **Keep changelog clean** - Use meaningful commit messages
5. **Semantic versioning** - Follow semver principles for version bumps
6. **Small releases** - Release often with smaller changes
7. **Document breaking changes** - Always document breaking changes in commits

## Scripts Independence

Both `release.sh` and `publish.sh` are designed to be independent from GitHub Actions:

- They can be run locally without any GitHub-specific dependencies
- They use standard Unix shell scripting (bash)
- They rely only on npm/node and git, which are available in most development environments
- They provide colored output and clear error messages for better usability
- They can be integrated into any CI/CD system, not just GitHub Actions

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [npm Publishing](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [standard-version](https://github.com/conventional-changelog/standard-version)
