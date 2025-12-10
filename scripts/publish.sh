#!/bin/bash

# Publish Script
# This script publishes the package to npm
# It uses NPM_TOKEN environment variable for authentication
#
# Usage: 
#   NPM_TOKEN=your_token ./scripts/publish.sh
#   or
#   ./scripts/publish.sh (will use .npmrc or npm login credentials)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting npm publish process...${NC}"
echo ""

# Check if NPM_TOKEN is set
if [ -n "$NPM_TOKEN" ]; then
    echo -e "${YELLOW}Using NPM_TOKEN for authentication${NC}"
    # Configure npm to use the token
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
else
    echo -e "${YELLOW}No NPM_TOKEN provided, using existing npm credentials${NC}"
    echo -e "${YELLOW}Make sure you're logged in with 'npm login'${NC}"
fi
echo ""

# Verify we're publishing the right version
PACKAGE_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Publishing version: ${PACKAGE_VERSION}${NC}"
echo ""

# Ask for confirmation
read -p "Are you sure you want to publish version ${PACKAGE_VERSION} to npm? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Publish cancelled${NC}"
    # Clean up .npmrc if we created it
    if [ -n "$NPM_TOKEN" ]; then
        rm -f .npmrc
    fi
    exit 1
fi
echo ""

# Publish to npm
echo -e "${GREEN}Publishing to npm...${NC}"
npm publish --access public
if [ $? -ne 0 ]; then
    echo -e "${RED}Publish failed!${NC}"
    # Clean up .npmrc if we created it
    if [ -n "$NPM_TOKEN" ]; then
        rm -f .npmrc
    fi
    exit 1
fi

# Clean up .npmrc if we created it
if [ -n "$NPM_TOKEN" ]; then
    rm -f .npmrc
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Package published successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Package: turkey-map-react@${PACKAGE_VERSION}${NC}"
echo -e "${YELLOW}View at: https://www.npmjs.com/package/turkey-map-react${NC}"
echo ""
