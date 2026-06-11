#!/usr/bin/env bash
# scripts/version.sh
# Usage: ./scripts/version.sh <patch|minor|major>
#
# Bumps all version files in sync. Does NOT commit or tag.
# Review changes with `git diff`, then commit manually.

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <patch|minor|major>"
    exit 1
fi

TYPE=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

increment_version() {
    local version="${1#v}"
    IFS='.' read -r major minor patch <<< "$version"

    case $TYPE in
        major) major=$((major + 1)); minor=0; patch=0 ;;
        minor) minor=$((minor + 1)); patch=0 ;;
        patch) patch=$((patch + 1)) ;;
        *)
            echo "Invalid type: $TYPE. Use patch, minor, or major." >&2
            exit 1
            ;;
    esac

    echo "$major.$minor.$patch"
}

CURRENT=$(node -p "require('$ROOT/package.json').version")
NEW_VERSION=$(increment_version "$CURRENT")

echo "Bumping: $CURRENT → $NEW_VERSION ($TYPE)"

# Root package.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/package.json"
echo "  ✓ package.json"

# web/package.json
WEB_CURRENT=$(node -p "require('$ROOT/web/package.json').version")
sed -i "s/\"version\": \"$WEB_CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/web/package.json"
echo "  ✓ web/package.json"

# server/pyproject.toml
sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" "$ROOT/server/pyproject.toml"
echo "  ✓ server/pyproject.toml"

# src-tauri/tauri.conf.json (safe JSON edit via node)
if [ -f "$ROOT/src-tauri/tauri.conf.json" ]; then
    node -e "
        const fs = require('fs');
        const path = '$ROOT/src-tauri/tauri.conf.json';
        const conf = JSON.parse(fs.readFileSync(path, 'utf8'));
        conf.version = '$NEW_VERSION';
        fs.writeFileSync(path, JSON.stringify(conf, null, 2) + '\n');
    "
    echo "  ✓ src-tauri/tauri.conf.json"
fi

echo ""
echo "Done. Files updated to v$NEW_VERSION."
echo "Review with: git diff"
echo "Then commit:  git add -A && git commit -m \"chore: release v$NEW_VERSION\" && git tag v$NEW_VERSION"