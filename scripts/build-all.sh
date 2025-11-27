#!/bin/bash

# Build script for all browser targets
# Usage: ./scripts/build-all.sh [--zip] [browser1 browser2 ...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# All supported browsers
ALL_BROWSERS=("chrome" "firefox" "safari" "edge" "opera" "brave")

# Parse arguments
ZIP_PACKAGES=false
BROWSERS=()

for arg in "$@"; do
  case $arg in
    --zip)
      ZIP_PACKAGES=true
      ;;
    *)
      BROWSERS+=("$arg")
      ;;
  esac
done

# If no browsers specified, build all
if [ ${#BROWSERS[@]} -eq 0 ]; then
  BROWSERS=("${ALL_BROWSERS[@]}")
fi

echo -e "${BLUE}🚀 AI Chat Export - Multi-Browser Build${NC}"
echo "=========================================="
echo -e "Building for: ${YELLOW}${BROWSERS[*]}${NC}"
[ "$ZIP_PACKAGES" = true ] && echo -e "📦 Will create zip packages after build"
echo ""

FAILED=()
SUCCEEDED=()

# Build each browser
for browser in "${BROWSERS[@]}"; do
  echo -e "\n${BLUE}📦 Building for ${browser}...${NC}"
  
  if BROWSER="$browser" npm run build:base; then
    echo -e "${GREEN}✅ ${browser} build completed${NC}"
    SUCCEEDED+=("$browser")
  else
    echo -e "${RED}❌ ${browser} build failed${NC}"
    FAILED+=("$browser")
  fi
done

# Create zip packages if requested
if [ "$ZIP_PACKAGES" = true ]; then
  echo -e "\n${BLUE}📦 Creating distribution packages...${NC}"
  mkdir -p packages
  
  for browser in "${SUCCEEDED[@]}"; do
    if [ -d "dist/$browser" ]; then
      zip_file="packages/ai-chat-export-${browser}.zip"
      cd "dist/$browser"
      zip -r "../../$zip_file" . -x "*.map"
      cd "$PROJECT_DIR"
      echo -e "${GREEN}📁 Created: $zip_file${NC}"
    fi
  done
fi

# Summary
echo ""
echo "=========================================="
echo -e "${BLUE}📊 Build Summary${NC}"
echo "=========================================="
echo -e "Successful: ${GREEN}${#SUCCEEDED[@]}/${#BROWSERS[@]}${NC}"

if [ ${#FAILED[@]} -gt 0 ]; then
  echo -e "\n${RED}❌ Failed builds:${NC}"
  for browser in "${FAILED[@]}"; do
    echo "  - $browser"
  done
fi

echo -e "\n${GREEN}Build outputs:${NC}"
for browser in "${SUCCEEDED[@]}"; do
  echo "  - dist/$browser/"
done

if [ "$ZIP_PACKAGES" = true ] && [ ${#SUCCEEDED[@]} -gt 0 ]; then
  echo -e "\n${GREEN}Distribution packages:${NC}"
  for browser in "${SUCCEEDED[@]}"; do
    echo "  - packages/ai-chat-export-${browser}.zip"
  done
fi

echo -e "\n${YELLOW}📝 Loading instructions:${NC}"
echo "  Chrome/Edge/Opera/Brave: chrome://extensions → Load unpacked"
echo "  Firefox: about:debugging → This Firefox → Load Temporary Add-on"
echo "  Safari: See SAFARI_SETUP.md"

# Exit with error if any builds failed
[ ${#FAILED[@]} -gt 0 ] && exit 1
exit 0

