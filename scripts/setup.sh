#!/bin/bash

# Closepilot Development Environment Setup Script
# This script sets up the development environment for Closepilot

set -e

echo "🚀 Setting up Closepilot development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm@8.14.0
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Please install Docker for PostgreSQL."
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start PostgreSQL
echo "🐘 Starting PostgreSQL container..."
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Create .env files if they don't exist
echo "🔧 Setting up environment files..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file. Please update with your API keys."
fi

if [ ! -f "packages/mcp-server/.env" ]; then
    cp packages/mcp-server/.env.example packages/mcp-server/.env
fi

if [ ! -f "packages/api/.env" ]; then
    cp packages/api/.env.example packages/api/.env
fi

if [ ! -f "packages/web/.env.local" ]; then
    cp packages/web/.env.local.example packages/web/.env.local
fi

# Build all packages
echo "🔨 Building all packages..."
pnpm build

# Run tests to verify setup
echo "🧪 Running tests..."
pnpm test || echo "⚠️  Some tests may be failing (stubs not implemented yet)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Update .env files with your API keys"
echo "  2. Start development servers:"
echo "     - MCP Server: pnpm mcp:dev"
echo "     - API: pnpm api:dev"
echo "     - Web: pnpm web:dev"
echo "  3. Or start all at once: pnpm dev"
echo ""
echo "📚 For more information, see README.md"
