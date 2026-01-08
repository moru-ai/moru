#!/usr/bin/env bash
set -euo pipefail

REPO="moru-ai/sdks"
INSTALL_DIR=""
VERSION=""

usage() {
  cat <<'EOF'
Usage: install.sh [--version vX.Y.Z] [--install-dir PATH]

Defaults:
  --version     latest release
  --install-dir ~/.local/bin (macOS/Linux)
                %LOCALAPPDATA%/moru/bin (Windows Git Bash)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep -E '"tag_name":' \
    | head -n 1 \
    | sed -E 's/.*"([^"]+)".*/\1/')"
fi

VERSION="${VERSION#v}"
TAG="v${VERSION}"

UNAME_S="$(uname -s)"
case "$UNAME_S" in
  Darwin) OS="darwin" ;;
  Linux) OS="linux" ;;
  MINGW*|MSYS*|CYGWIN*) OS="win" ;;
  *)
    echo "Unsupported OS: $UNAME_S" >&2
    exit 1
    ;;
esac

UNAME_M="$(uname -m)"
case "$UNAME_M" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $UNAME_M" >&2
    exit 1
    ;;
esac

TARGET="${OS}-${ARCH}"
FILENAME="moru-${TAG}-${TARGET}"
if [[ "$OS" == "win" ]]; then
  FILENAME="${FILENAME}.exe"
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

ASSET_URL="https://github.com/${REPO}/releases/download/${TAG}/${FILENAME}"
SUMS_URL="https://github.com/${REPO}/releases/download/${TAG}/SHA256SUMS"

curl -fsSL "$ASSET_URL" -o "$TMP_DIR/$FILENAME"
curl -fsSL "$SUMS_URL" -o "$TMP_DIR/SHA256SUMS"

EXPECTED_SUM="$(grep " ${FILENAME}$" "$TMP_DIR/SHA256SUMS" | awk '{print $1}')"
if [[ -z "$EXPECTED_SUM" ]]; then
  echo "Checksum not found for ${FILENAME}" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_SUM="$(sha256sum "$TMP_DIR/$FILENAME" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL_SUM="$(shasum -a 256 "$TMP_DIR/$FILENAME" | awk '{print $1}')"
else
  echo "sha256sum or shasum is required to verify downloads." >&2
  exit 1
fi

if [[ "$EXPECTED_SUM" != "$ACTUAL_SUM" ]]; then
  echo "Checksum verification failed." >&2
  exit 1
fi

if [[ -z "$INSTALL_DIR" ]]; then
  if [[ "$OS" == "win" ]]; then
    INSTALL_DIR="${LOCALAPPDATA:-$HOME/AppData/Local}/moru/bin"
  else
    INSTALL_DIR="$HOME/.local/bin"
  fi
fi

mkdir -p "$INSTALL_DIR"
DEST="$INSTALL_DIR/moru"
if [[ "$OS" == "win" ]]; then
  DEST="$INSTALL_DIR/moru.exe"
fi

mv "$TMP_DIR/$FILENAME" "$DEST"
chmod +x "$DEST" || true

echo "moru installed to $DEST"

# Auto-configure shell PATH
# Detect the user's shell from $SHELL environment variable
CURRENT_SHELL="$(basename "$SHELL")"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"

# Define potential config files for each shell
case "$CURRENT_SHELL" in
  fish)
    CONFIG_FILES=(
      "$HOME/.config/fish/config.fish"
      "$XDG_CONFIG_HOME/fish/config.fish"
    )
    ;;
  zsh)
    CONFIG_FILES=(
      "$HOME/.zshrc"
      "$HOME/.zshenv"
      "$XDG_CONFIG_HOME/zsh/.zshrc"
      "$XDG_CONFIG_HOME/zsh/.zshenv"
    )
    ;;
  bash)
    CONFIG_FILES=(
      "$HOME/.bashrc"
      "$HOME/.bash_profile"
      "$HOME/.profile"
      "$XDG_CONFIG_HOME/bash/.bashrc"
      "$XDG_CONFIG_HOME/bash/.bash_profile"
    )
    ;;
  *)
    # Unknown shell, try common bash configs
    CONFIG_FILES=(
      "$HOME/.bashrc"
      "$HOME/.bash_profile"
      "$HOME/.profile"
    )
    ;;
esac

# Find first existing config file
SHELL_CONFIG=""
for config_file in "${CONFIG_FILES[@]}"; do
  if [[ -f "$config_file" ]]; then
    SHELL_CONFIG="$config_file"
    break
  fi
done

# If no config file exists, create the default one
if [[ -z "$SHELL_CONFIG" ]]; then
  case "$CURRENT_SHELL" in
    fish)
      SHELL_CONFIG="$HOME/.config/fish/config.fish"
      mkdir -p "$(dirname "$SHELL_CONFIG")"
      ;;
    zsh)
      SHELL_CONFIG="$HOME/.zshrc"
      ;;
    bash)
      SHELL_CONFIG="$HOME/.bashrc"
      ;;
    *)
      SHELL_CONFIG="$HOME/.bashrc"
      ;;
  esac
fi

# Check if PATH is already configured in the config file
if [[ -f "$SHELL_CONFIG" ]] && grep -q "Added by moru installer" "$SHELL_CONFIG" 2>/dev/null; then
  echo "✓ PATH already configured in $SHELL_CONFIG"
else
  # Add PATH to shell config based on shell type
  case "$CURRENT_SHELL" in
    fish)
      echo "" >> "$SHELL_CONFIG"
      echo "# Added by moru installer" >> "$SHELL_CONFIG"
      echo "fish_add_path $INSTALL_DIR" >> "$SHELL_CONFIG"
      echo "✓ Added $INSTALL_DIR to PATH in $SHELL_CONFIG"
      echo "  Run 'source $SHELL_CONFIG' or restart your shell to use moru"
      ;;
    zsh|bash|*)
      echo "" >> "$SHELL_CONFIG"
      echo "# Added by moru installer" >> "$SHELL_CONFIG"
      echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_CONFIG"
      echo "✓ Added $INSTALL_DIR to PATH in $SHELL_CONFIG"
      echo "  Run 'source $SHELL_CONFIG' or restart your shell to use moru"
      ;;
  esac
fi
