#!/usr/bin/env bash
# scripts/version.sh
# Managed via: pnpm release <patch|minor|major|x.y.z> [--help]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

# ── Colors ────────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

# ── Help ──────────────────────────────────────────────────────────────────────
show_help() {
    echo ""
    echo -e "  ${BOLD}Nextract Version Manager${RESET}"
    echo -e "  ${DIM}Keeps all components in sync — no manual editing.${RESET}"
    echo ""
    echo -e "  ${BOLD}Usage${RESET}"
    echo -e "    ${CYAN}pnpm release patch${RESET}       Bump patch   1.2.3 → 1.2.4"
    echo -e "    ${CYAN}pnpm release minor${RESET}       Bump minor   1.2.3 → 1.3.0"
    echo -e "    ${CYAN}pnpm release major${RESET}       Bump major   1.2.3 → 2.0.0"
    echo -e "    ${CYAN}pnpm release 2.1.0${RESET}       Set exact    * → 2.1.0"
    echo ""
    echo -e "  ${BOLD}What gets updated${RESET}"
    echo -e "    ${DIM}·${RESET} package.json                ${DIM}(root)${RESET}"
    echo -e "    ${DIM}·${RESET} web/package.json            ${DIM}(Next.js)${RESET}"
    echo -e "    ${DIM}·${RESET} server/pyproject.toml       ${DIM}(FastAPI)${RESET}"
    echo -e "    ${DIM}·${RESET} src-tauri/tauri.conf.json   ${DIM}(Tauri, if present)${RESET}"
    echo ""
    echo -e "  ${BOLD}Notes${RESET}"
    echo -e "    ${DIM}This script never commits or tags. You stay in control.${RESET}"
    echo -e "    ${DIM}After running, review with ${RESET}${CYAN}git diff${DIM} then commit manually.${RESET}"
    echo ""
}

# ── Validate semver format ────────────────────────────────────────────────────
is_valid_semver() {
    [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

# ── Increment helper ──────────────────────────────────────────────────────────
increment_version() {
    local version="${1#v}"
    IFS='.' read -r major minor patch <<< "$version"

    case $2 in
        major) major=$((major + 1)); minor=0; patch=0 ;;
        minor) minor=$((minor + 1)); patch=0 ;;
        patch) patch=$((patch + 1)) ;;
    esac

    echo "$major.$minor.$patch"
}

# ── Entry point ───────────────────────────────────────────────────────────────
ARG="${1:-}"

if [[ -z "$ARG" || "$ARG" == "--help" || "$ARG" == "-h" || "$ARG" == "help" ]]; then
    show_help
    exit 0
fi

# ── Resolve new version ───────────────────────────────────────────────────────
CURRENT=$(node -p "require('$ROOT/package.json').version")

if [[ "$ARG" == "patch" || "$ARG" == "minor" || "$ARG" == "major" ]]; then
    NEW_VERSION=$(increment_version "$CURRENT" "$ARG")
elif is_valid_semver "$ARG"; then
    NEW_VERSION="$ARG"
else
    echo ""
    echo -e "  ${RED}✗ Invalid argument:${RESET} \"$ARG\""
    echo -e "  ${DIM}Expected: patch, minor, major, or a version like 1.5.3${RESET}"
    echo -e "  ${DIM}Run ${RESET}${CYAN}pnpm release --help${DIM} for usage.${RESET}"
    echo ""
    exit 1
fi

if [[ "$NEW_VERSION" == "$CURRENT" ]]; then
    echo ""
    echo -e "  ${YELLOW}⚠ Version is already $CURRENT — nothing to do.${RESET}"
    echo ""
    exit 0
fi

# ── Apply updates ─────────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Nextract Version Manager${RESET}"
echo -e "  ${DIM}$CURRENT${RESET} → ${CYAN}${BOLD}$NEW_VERSION${RESET}"
echo ""

# root package.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/package.json"
echo -e "  ${GREEN}✓${RESET} package.json"

# web/package.json
WEB_CURRENT=$(node -p "require('$ROOT/web/package.json').version")
sed -i "s/\"version\": \"$WEB_CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/web/package.json"
echo -e "  ${GREEN}✓${RESET} web/package.json"

# server/pyproject.toml
sed -i "s/^version = \".*\"/version = \"$NEW_VERSION\"/" "$ROOT/server/pyproject.toml"
echo -e "  ${GREEN}✓${RESET} server/pyproject.toml"

# src-tauri/tauri.conf.json
if [ -f "$ROOT/src-tauri/tauri.conf.json" ]; then
    node -e "
        const fs = require('fs');
        const p = '$ROOT/src-tauri/tauri.conf.json';
        const conf = JSON.parse(fs.readFileSync(p, 'utf8'));
        conf.version = '$NEW_VERSION';
        fs.writeFileSync(p, JSON.stringify(conf, null, 2) + '\n');
    "
    echo -e "  ${GREEN}✓${RESET} src-tauri/tauri.conf.json"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}All files updated to v${NEW_VERSION}.${RESET}"
echo ""
echo -e "  ${DIM}Review changes:${RESET}"
echo -e "  ${CYAN}git diff${RESET}"
echo ""
echo -e "  ${DIM}Commit when ready:${RESET}"
echo -e "  ${CYAN}git add -A && git commit -m \"chore: release v${NEW_VERSION}\" && git tag v${NEW_VERSION}${RESET}"
echo ""