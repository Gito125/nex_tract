#!/bin/bash
# scripts/version.sh

# Usage: ./scripts/version.sh <component: web|server|all> <type: patch|minor|major>

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <web|server|all> <patch|minor|major>"
    exit 1
fi

COMPONENT=$1
TYPE=$2

increment_version() {
  local version=$1
  local type=$2
  # Remove potential leading 'v'
  version=${version#v}
  IFS='.' read -ra ADDR <<< "$version"
  major=${ADDR[0]}
  minor=${ADDR[1]}
  patch=${ADDR[2]}

  case $type in
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
    minor)
      minor=$((minor + 1))
      patch=0
      ;;
    patch)
      patch=$((patch + 1))
      ;;
    *)
      echo "Invalid type: $type"
      exit 1
      ;;
  esac
  echo "$major.$minor.$patch"
}

update_web() {
    local version=$(grep '"version":' web/package.json | cut -d'"' -f4)
    local new_version=$(increment_version $version $TYPE)
    sed -i "s/\"version\": \".*\"/\"version\": \"$new_version\"/" web/package.json
    echo "Web updated to $new_version"
    echo "$new_version"
}

update_server() {
    local version=$(grep '^version = ' server/pyproject.toml | cut -d'"' -f2)
    local new_version=$(increment_version $version $TYPE)
    sed -i "s/^version = \".*\"/version = \"$new_version\"/" server/pyproject.toml
    echo "Server updated to $new_version"
    echo "$new_version"
}

case $COMPONENT in
    web)
        VERSION=$(update_web)
        git add web/package.json
        git commit -m "chore(web): bump version to $VERSION"
        git tag "web-v$VERSION"
        ;;
    server)
        VERSION=$(update_server)
        git add server/pyproject.toml
        git commit -m "chore(server): bump version to $VERSION"
        git tag "server-v$VERSION"
        ;;
    all)
        WEB_VERSION=$(update_web)
        SERVER_VERSION=$(update_server)
        git add web/package.json server/pyproject.toml
        git commit -m "chore: bump versions (web: $WEB_VERSION, server: $SERVER_VERSION)"
        git tag "v$WEB_VERSION-$SERVER_VERSION"
        ;;
    *)
        echo "Invalid component: $COMPONENT"
        exit 1
        ;;
esac
