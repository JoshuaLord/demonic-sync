#!/bin/bash

# Setup Git Hooks for Database Safety
# Run this script once to install the hooks

echo "🔧 Setting up git hooks for database safety..."

# Configure git to use custom hooks directory
git config core.hooksPath .githooks

echo "✅ Git hooks configured!"
echo ""
echo "The following hooks are now active:"
echo "  - pre-push: Checks migrations for destructive operations"
echo ""
echo "To bypass hooks (NOT recommended): git push --no-verify"
