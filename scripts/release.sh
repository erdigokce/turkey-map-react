#!/bin/bash

# Release Script
# This script handles the complete release process:
# 1. Runs tests
# 2. Creates production build
# 3. Generates changelog from conventional commits
# 4. Updates version and creates git tag
#
# Usage: ./scripts/release.sh [release-type]
# release-type: auto, major, minor, patch, or prerelease (default: patch)
#   auto - let conventional commits decide the bump; skips when there is
#          nothing new since the last tag (used by the automatic release)

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Release type (default to patch if not provided)
RELEASE_TYPE=${1:-patch}
# When true, only report whether a release is needed via $GITHUB_OUTPUT and
# exit without running tests or bumping the version.
CHECK_ONLY=${CHECK_ONLY:-false}

set_output() {
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "$1" >> "$GITHUB_OUTPUT"
    fi
}

case "$RELEASE_TYPE" in
    auto|major|minor|patch|prerelease) ;;
    *)
        echo -e "${RED}Invalid release type: ${RELEASE_TYPE}${NC}"
        echo "Use one of: auto, major, minor, patch, prerelease"
        exit 1
        ;;
esac

# Automatic releases should be a no-op when nothing that can affect the
# published package has happened since the last tag. This keeps docs, CI,
# agent-skill and test-only commits from creating empty patch releases.
if [ "$RELEASE_TYPE" = "auto" ]; then
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
    if [ -n "$LAST_TAG" ]; then
        if [ -z "$(git log --oneline "${LAST_TAG}..HEAD")" ]; then
            if [ "$CHECK_ONLY" = "true" ]; then
                set_output "release=false"
            fi
            echo -e "${YELLOW}No commits since ${LAST_TAG}; nothing to release.${NC}"
            exit 0
        fi

        if git diff --quiet "${LAST_TAG}..HEAD" -- \
            src \
            package.json \
            package-lock.json \
            tsconfig.json \
            webpack.config.js \
            .babelrc \
            .npmignore \
            ':(exclude)src/__tests__/**' \
            ':(exclude)src/**/*.test.ts' \
            ':(exclude)src/**/*.test.tsx'; then
            if [ "$CHECK_ONLY" = "true" ]; then
                set_output "release=false"
            fi
            echo -e "${YELLOW}No package-affecting changes since ${LAST_TAG}; nothing to release.${NC}"
            exit 0
        fi
    fi
fi

if [ "$CHECK_ONLY" = "true" ]; then
    set_output "release=true"
    exit 0
fi

echo -e "${GREEN}Starting release process...${NC}"
echo -e "${YELLOW}Release type: ${RELEASE_TYPE}${NC}"
echo ""

# Step 1: Run typecheck and tests
echo -e "${GREEN}Step 1/4: Running typecheck and tests...${NC}"
npm run typecheck
npm run test:coverage
if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed! Aborting release.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Typecheck and tests passed${NC}"
echo ""

# Step 2: Create production build and verify what will be published
echo -e "${GREEN}Step 2/4: Creating and verifying production build...${NC}"
npm run clean-build
npm run test:artifact
npm run test:package
npm run test:types
if [ $? -ne 0 ]; then
    echo -e "${RED}Build verification failed! Aborting release.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Production build and package verified${NC}"
echo ""

# Step 3: Generate changelog and update version
echo -e "${GREEN}Step 3/4: Generating changelog and updating version...${NC}"
if [ "$RELEASE_TYPE" = "auto" ]; then
    npx commit-and-tag-version
elif [ "$RELEASE_TYPE" = "prerelease" ]; then
    npx commit-and-tag-version --prerelease
else
    npx commit-and-tag-version --release-as "${RELEASE_TYPE}"
fi
if [ $? -ne 0 ]; then
    echo -e "${RED}Version update failed! Aborting release.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Changelog updated and version bumped${NC}"
echo ""

# Step 4: Summary
echo -e "${GREEN}Step 4/4: Release preparation complete${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release prepared successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes in CHANGELOG.md"
echo "2. Review the version bump in package.json"
echo "3. Push the changes and tag:"
echo "   git push --follow-tags origin master"
echo ""
echo "Or use the publish script to publish to npm:"
echo "   ./scripts/publish.sh"
echo ""
