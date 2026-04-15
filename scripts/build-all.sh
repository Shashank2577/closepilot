#!/bin/bash

# Closepilot Build Runner
# Builds all packages in dependency order

set -e

echo "🔨 Building all packages..."

# Build all packages using workspace command
pnpm build

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Built packages:"
echo "  - @closepilot/core"
echo "  - @closepilot/mcp-client"
echo "  - @closepilot/mcp-server"
echo "  - @closepilot/db"
echo "  - @closepilot/api"
echo "  - @closepilot/web"
