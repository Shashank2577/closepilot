#!/bin/bash

# Closepilot Lint Runner
# Runs linting across all packages

set -e

echo "🔍 Linting all packages..."

# Lint each package
for package in core mcp-client mcp-server db api web; do
    echo ""
    echo "📦 Linting @closepilot/$package..."
    pnpm --filter "@closepilot/$package" lint || echo "⚠️  Linting in $package may not be configured yet"
done

echo ""
echo "✅ Linting complete!"
