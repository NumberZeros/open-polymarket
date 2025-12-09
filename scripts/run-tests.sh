#!/bin/bash

# Test runner script for BetHub
# Runs all tests and generates summary report

echo "🧪 BetHub Test Suite"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run unit tests
echo "📦 Running Unit Tests..."
echo "------------------------"
pnpm test:run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
else
    echo -e "${RED}❌ Unit tests failed${NC}"
fi

echo ""
echo "=========================="
echo ""

# Ask if user wants to run E2E tests
echo "🌐 Run E2E Tests? (y/n)"
read -r run_e2e

if [ "$run_e2e" = "y" ] || [ "$run_e2e" = "Y" ]; then
    echo ""
    echo "🌐 Running E2E Tests..."
    echo "------------------------"
    
    # Check if Playwright is installed
    if ! command -v playwright &> /dev/null; then
        echo -e "${YELLOW}⚠️  Playwright not installed. Installing...${NC}"
        pnpm playwright:install
    fi
    
    pnpm test:e2e
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ E2E tests passed${NC}"
    else
        echo -e "${RED}❌ E2E tests failed${NC}"
    fi
fi

echo ""
echo "=========================="
echo "🎉 Test run complete!"
echo ""
echo "Available commands:"
echo "  pnpm test          - Run tests in watch mode"
echo "  pnpm test:ui       - Open test UI"
echo "  pnpm test:coverage - Generate coverage report"
echo "  pnpm test:e2e:ui   - Open Playwright UI"
echo ""
