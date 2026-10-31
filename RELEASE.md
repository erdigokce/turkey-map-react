# Release Process Documentation

This document describes the automated build, test, and release pipeline for the turkey-map-react package.

## Overview

The release process is automated using standalone scripts that can be run independently or through GitHub Actions. The pipeline has two stages:

1. **Release** (`scripts/release.sh`) - Runs tests/build, updates the changelog, bumps the version, commits, tags, and pushes.
2. **Publish** (`scripts/publish.sh` / the Publish workflow) - Publishes the tagged version to npm.

Changes accumulate on `master` and are released once a day:

```
daily schedule (07:30 Europe/Istanbul)
  └─ Release workflow (skip if nothing package-affecting changed)
       └─ auto bump, changelog, commit, tag, GitHub Release
            └─ Publish workflow (npm publish via OIDC trusted publishing)
```

If the daily run finds nothing that affects the published package, it exits without creating a release. The Release workflow can still be triggered manually (Actions → Release → Run workflow), and the Publish workflow can be triggered manually (Actions → Publish to npm → Run workflow).

## Prerequisites

### For Local Development

- Node.js 16+ installed
- Git configured with user name and email
- npm account with publish permissions (for publishing)

### For GitHub Actions

- **npm trusted publishing** configured on npmjs.com for this repository:
  - Publisher: GitHub Actions
  - Repository: `erdigokce/turkey-map-react`
  - Workflow filename: `publish.yml`
  - No `NPM_TOKEN` secret is required; the Publish workflow authenticates with OIDC.
- **Allow auto-merge** enabled in Settings → General (so Dependabot PRs can land).
- The GitHub Actions bot must be allowed to push the version-bump commit to `master` (branch protection must not block it).
- Repository setting: Actions → General → Workflow permissions must allow read/write (the workflows request `contents: write` explicitly).


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
1. Running typecheck and tests
2. Creating a production build and verifying the built artifact and packed package
3. Generating/updating CHANGELOG.md from conventional commits
4. Bumping version in package.json
5. Creating a git tag

#### Usage

```bash
# Let conventional commits decide the bump (used by the automated workflow)
./scripts/release.sh auto
npm run release:auto

# Run with an explicit bump
./scripts/release.sh patch
npm run release          # patch version bump
npm run release:patch    # explicit patch version bump
npm run release:minor    # minor version bump
npm run release:major    # major version bump
```

#### Release Types

- `auto`: Analyze commits since the last tag and pick the bump; no-op if nothing that affects the published package has changed
- `major`: Breaking changes (1.0.0 → 2.0.0)
- `minor`: New features (1.0.0 → 1.1.0)
- `patch`: Bug fixes (1.0.0 → 1.0.1)
- `prerelease`: Pre-release version (1.0.0 → 1.0.1-0)

#### What Happens

1. Typecheck and tests are run (`npm run typecheck`, `npm run test:coverage`)
2. Production build is created (`npm run clean-build`) and verified (`npm run test:artifact`, `npm run test:package`, `npm run test:types`)
3. Commits since last release are analyzed
4. CHANGELOG.md is automatically updated
5. Version is bumped in package.json
6. Changes are committed with message: `chore(release): [version]`
7. Git tag is created

After the script completes locally:
```bash
# Review the changes
git log -1
cat CHANGELOG.md

# Push to remote
git push --follow-tags origin master
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

### Automatic Release Workflow

**File:** `.github/workflows/release.yml`

**Triggers:**
- Daily schedule at 04:30 UTC (07:30 Europe/Istanbul)
- Manual workflow dispatch (for an explicit bump)

On the daily scheduled run the workflow:
- Checks whether anything package-affecting changed since the last tag; exits early if not
- Runs typecheck/tests, then creates and verifies the production build
- Lets conventional commits decide the version bump (`auto`)
- Generates the changelog and bumps the version
- Pushes the `chore(release): <version>` commit and tag
- Creates the GitHub Release

If there is nothing new since the last tag, or only docs/CI/agent-skill/test changes, it exits without creating a release. Changes to `src`, `package.json`, the lockfile, or build configuration do trigger one.

If another commit lands on `master` while a release run is in progress, that run skips instead of racing; the next daily run picks up the change.

**Manual use:**
1. Go to GitHub repository → Actions → Release
2. Click "Run workflow"
3. Select a release type (`auto`, `major`, `minor`, `patch`, or `prerelease`)
4. Click "Run workflow"

### Automatic Publish Workflow

**File:** `.github/workflows/publish.yml`

**Triggers:**
- Completion of the Release workflow (`workflow_run`)
- Manual workflow dispatch

**Configuration Required:** npm trusted publishing configured for `publish.yml`. No `NPM_TOKEN` is needed.

The workflow checks whether the current version is already on npm and skips if it is. Otherwise it:
- Builds the package
- Publishes to npm with OIDC
- Creates a success summary

**Manual use:**
1. Go to GitHub repository → Actions → Publish to npm
2. Click "Run workflow"
3. Type "publish" to confirm
4. Click "Run workflow"

> Note: the Release workflow deliberately uses `workflow_run` to invoke publishing. GitHub does not trigger workflows from tags, releases, or pushes made with the default `GITHUB_TOKEN`.

## Complete Release Flow

### Recommended Workflow

1. **Develop features** using conventional commits
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git push origin master
   ```

2. **Merge the pull request** (Dependabot PRs with safe updates do this automatically).

3. **Wait for the daily release run** (07:30 Europe/Istanbul)
   - Release workflow bumps, tags, and creates the GitHub Release if package inputs changed
   - Publish workflow publishes the new version to npm
   - Verify the GitHub Releases page and https://www.npmjs.com/package/turkey-map-react

You can also trigger it immediately from Actions → Release → Run workflow.

### Alternative: Local Release and Publish

```bash
# 1. Create release
npm run release:minor

# 2. Review changes
git log -1
cat CHANGELOG.md

# 3. Push to GitHub
git push --follow-tags origin master

# 4. Publish to npm
NPM_TOKEN=your_token npm run publish:npm
```

### Dependency updates

Dependabot runs daily at 06:00 Europe/Istanbul and opens grouped PRs:

- Grouped npm minor/patch updates: auto-merged after CI passes.
- Grouped GitHub Actions minor/patch updates: auto-merged after CI passes.
- Individual non-major updates (for example security fixes): auto-merged after CI passes.
- Major updates and `0.x` minor updates: left for manual review.
- `react`, `react-dom`, and their type packages: major updates are ignored and must be handled manually.

When the auto-merge workflow lands a Dependabot PR, it is included in the next daily release run. If the merged update does not touch package inputs (for example, a GitHub Actions-only bump), the release is skipped.

## Troubleshooting

### Tests Fail During Release

The release script will abort if tests fail. Fix the failing tests and try again.

```bash
# Run every check locally (typecheck, source, artifact, package, types)
npm run verify

# Run source tests only
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

In GitHub Actions, authentication uses OIDC trusted publishing, not a token. Check:

1. The trusted publisher on npmjs.com points at workflow filename `publish.yml` (exact filename, including `.yml`).
2. The publish job has `id-token: write` (it does).
3. `package.json`'s `repository.url` matches the GitHub repository exactly.
4. The workflow runs on Node 24+ so npm is at least 11.5.1.

For local publishing, log in with `npm login` or set `NPM_TOKEN`.

### Publish Fails - Version Already Exists

The version already exists on npm. The Publish workflow detects this and skips automatically. To publish a new version, create a release with a bump:

```bash
# Create a new patch release
npm run release:patch
git push --follow-tags origin master

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
2. **Test locally first** - Run `npm run verify` before releasing
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
