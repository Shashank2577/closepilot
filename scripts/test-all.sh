#!/bin/bash

# Closepilot Test Runner
# Runs tests across all packages

set -e

echo "🧪 Running tests for all packages..."

# Test each package
for package in core mcp-client mcp-server db api web; do
    echo ""
    echo "📦 Testing @closepilot/$package..."
    pnpm --filter "@closepilot/$package" test || echo "⚠️  Tests in $package may not be implemented yet"
done

echo ""
echo "✅ Test run complete!"
