#!/bin/bash

# Release Script
# This script handles the complete release process:
# 1. Runs tests
# 2. Creates production build
# 3. Generates changelog from conventional commits
# 4. Updates version and creates git tag
#
# Usage: ./scripts/release.sh [release-type]
# release-type: major, minor, patch, or prerelease (default: patch)

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Release type (default to patch if not provided)
RELEASE_TYPE=${1:-patch}

echo -e "${GREEN}Starting release process...${NC}"
echo -e "${YELLOW}Release type: ${RELEASE_TYPE}${NC}"
echo ""

# Step 1: Run tests
echo -e "${GREEN}Step 1/4: Running tests...${NC}"
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed! Aborting release.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Tests passed${NC}"
echo ""

# Step 2: Create production build
echo -e "${GREEN}Step 2/4: Creating production build...${NC}"
npm run clean-build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Aborting release.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Production build created${NC}"
echo ""

# Step 3: Generate changelog and update version
echo -e "${GREEN}Step 3/4: Generating changelog and updating version...${NC}"
npx standard-version --release-as ${RELEASE_TYPE}
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
echo "   git push --follow-tags origin main"
echo ""
echo "Or use the publish script to publish to npm:"
echo "   ./scripts/publish.sh"
echo ""
