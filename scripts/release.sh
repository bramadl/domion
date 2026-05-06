#!/usr/bin/env bash

set -e

TYPE=$1

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory not clean. Commit changes first."
  exit 1
fi

if [ -z "$TYPE" ]; then
  echo "Usage: ./scripts/release.sh [patch|minor|major]"
  exit 1
fi

echo "→ Releasing ($TYPE)..."

# 1. bump version + commit + tag
npm version $TYPE -m "chore(release): v%s ($TYPE)"

# 2. build
echo "→ Building..."
bun run build

# 3. push changes
echo "→ Pushing to git..."
git push origin HEAD
git push origin --tags

# 4. publish
echo "→ Publishing to npm..."
npm publish --access public

echo "✔ Release complete"
