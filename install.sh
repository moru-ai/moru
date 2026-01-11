#!/usr/bin/env bash
set -euo pipefail

REPO="moru-ai/moru"
INSTALL_DIR=""
VERSION=""
TOTAL_STEPS=5

# =============================================================================
# Color codes with terminal detection
# =============================================================================
if [[ -t 1 ]]; then
    MUTED='\033[0;2m'
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    ORANGE='\033[38;5;214m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    MUTED=''
    RED=''
    GREEN=''
    ORANGE=''
    BOLD=''
    NC=''
fi

# Check if terminal supports Unicode
if [[ "${LANG:-}" == *UTF-8* ]] || [[ "${LC_ALL:-}" == *UTF-8* ]] || [[ "${LC_CTYPE:-}" == *UTF-8* ]]; then
    PROGRESS_FILLED='■'
    PROGRESS_EMPTY='･'
else
    PROGRESS_FILLED='#'
    PROGRESS_EMPTY='-'
fi

# =============================================================================
# Helper functions
# =============================================================================
print_step() {
    local step_num=$1
    local message=$2
    echo -e "${MUTED}[${step_num}/${TOTAL_STEPS}]${NC} ${message}"
}

print_info() {
    echo -e "      ${MUTED}$1${NC}"
}

print_success() {
    echo -e "      ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}error:${NC} $1" >&2
    exit 1
}

# Print progress bar
print_progress() {
    local bytes="$1"
    local total="$2"
    [[ "$total" -gt 0 ]] || return 0

    local width=40
    local percent=$(( bytes * 100 / total ))
    [[ "$percent" -gt 100 ]] && percent=100
    local filled=$(( percent * width / 100 ))
    local empty=$(( width - filled ))

    local bar_filled=$(printf "%${filled}s" | tr ' ' "$PROGRESS_FILLED")
    local bar_empty=$(printf "%${empty}s" | tr ' ' "$PROGRESS_EMPTY")

    printf "\r      ${ORANGE}%s%s${NC} %3d%%" "$bar_filled" "$bar_empty" "$percent" >&4
}

# Unbuffered sed for real-time progress parsing
unbuffered_sed() {
    if echo | sed -u -e "" >/dev/null 2>&1; then
        sed -nu "$@"
    elif echo | sed -l -e "" >/dev/null 2>&1; then
        sed -nl "$@"
    else
        local pad="$(printf "\n%512s" "")"
        sed -ne "s/$/\\${pad}/" "$@"
    fi
}

# Download file with progress bar
download_with_progress() {
    local url="$1"
    local output="$2"

    if [[ -t 2 ]]; then
        exec 4>&2
    else
        exec 4>/dev/null
    fi

    local tmp_dir="${TMPDIR:-/tmp}"
    local tracefile="${tmp_dir}/moru_install_$$.trace"

    rm -f "$tracefile"
    if ! mkfifo "$tracefile" 2>/dev/null; then
        exec 4>&-
        return 1
    fi

    # Hide cursor during progress
    printf "\033[?25l" >&4

    trap "trap - RETURN; rm -f \"$tracefile\"; printf '\033[?25h' >&4; exec 4>&- 2>/dev/null || true" RETURN

    (
        curl --trace-ascii "$tracefile" -s -L -o "$output" "$url"
    ) &
    local curl_pid=$!

    unbuffered_sed \
        -e 'y/ACDEGHLNORTV/acdeghlnortv/' \
        -e '/^0000: content-length:/p' \
        -e '/^<= recv data/p' \
        "$tracefile" 2>/dev/null | \
    {
        local length=0
        local bytes=0

        while IFS=" " read -r -a line; do
            [[ "${#line[@]}" -lt 2 ]] && continue
            local tag="${line[0]} ${line[1]}"

            if [[ "$tag" = "0000: content-length:" ]]; then
                length="${line[2]}"
                length=$(echo "$length" | tr -d '\r')
                bytes=0
            elif [[ "$tag" = "<= recv" ]]; then
                local size="${line[3]}"
                bytes=$(( bytes + size ))
                if [[ "$length" -gt 0 ]]; then
                    print_progress "$bytes" "$length"
                fi
            fi
        done
    }

    wait $curl_pid
    local ret=$?
    echo "" >&4
    return $ret
}

# Download with fallback
download_file() {
    local url="$1"
    local output="$2"

    if [[ "${OS:-}" == "win" ]] || ! [[ -t 2 ]] || ! download_with_progress "$url" "$output" 2>/dev/null; then
        curl -# -L -o "$output" "$url" 2>&1 || curl -fsSL -o "$output" "$url"
    fi
}

# Print completion banner
print_completion() {
    local version="$1"
    echo ""
    echo -e "  ${GREEN}Installation complete!${NC}"
    echo ""
    echo -e "  ${BOLD}moru${NC} ${MUTED}v${version}${NC} installed to ${MUTED}${DEST}${NC}"
    echo ""
    echo -e "${MUTED}To get started:${NC}"
    echo ""
    echo -e "  ${BOLD}moru --help${NC}       ${MUTED}# Show available commands${NC}"
    echo -e "  ${BOLD}moru auth login${NC}   ${MUTED}# Authenticate with your account${NC}"
    echo ""
    echo -e "${MUTED}Documentation:${NC} https://moru.io/docs"
    echo ""
}

# =============================================================================
# Usage
# =============================================================================
usage() {
    cat <<'EOF'
Usage: install.sh [--version vX.Y.Z] [--install-dir PATH]

Defaults:
  --version     latest release
  --install-dir ~/.local/bin (macOS/Linux)
                %LOCALAPPDATA%/moru/bin (Windows Git Bash)
EOF
}

# =============================================================================
# Argument parsing
# =============================================================================
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

# =============================================================================
# Main installation flow
# =============================================================================
echo ""
echo -e "${BOLD}Installing moru CLI${NC}"
echo ""

# Step 1: Fetch version
print_step 1 "Fetching latest version..."
if [[ -z "$VERSION" ]]; then
    VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
        | grep -E '"tag_name":' \
        | head -n 1 \
        | sed -E 's/.*"([^"]+)".*/\1/')"
fi

TAG="${VERSION}"
VERSION="${VERSION##*@}"
VERSION="${VERSION#v}"
print_info "Found version: v${VERSION}"

# Detect OS
UNAME_S="$(uname -s)"
case "$UNAME_S" in
    Darwin) OS="darwin" ;;
    Linux) OS="linux" ;;
    MINGW*|MSYS*|CYGWIN*) OS="win" ;;
    *)
        print_error "Unsupported OS: $UNAME_S"
        ;;
esac

# Detect architecture
UNAME_M="$(uname -m)"
case "$UNAME_M" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *)
        print_error "Unsupported architecture: $UNAME_M"
        ;;
esac

TARGET="${OS}-${ARCH}"
FILENAME="moru-v${VERSION}-${TARGET}"
if [[ "$OS" == "win" ]]; then
    FILENAME="${FILENAME}.exe"
fi

# Prepare temp directory
TMP_DIR="$(mktemp -d)"
cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

ASSET_URL="https://github.com/${REPO}/releases/download/${TAG}/${FILENAME}"
SUMS_URL="https://github.com/${REPO}/releases/download/${TAG}/SHA256SUMS"

# Step 2: Download binary
print_step 2 "Downloading ${FILENAME}..."
download_file "$ASSET_URL" "$TMP_DIR/$FILENAME"

# Step 3: Verify checksum
print_step 3 "Verifying checksum..."
curl -fsSL "$SUMS_URL" -o "$TMP_DIR/SHA256SUMS"

EXPECTED_SUM="$(grep " ${FILENAME}$" "$TMP_DIR/SHA256SUMS" | awk '{print $1}')"
if [[ -z "$EXPECTED_SUM" ]]; then
    print_error "Checksum not found for ${FILENAME}"
fi

if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL_SUM="$(sha256sum "$TMP_DIR/$FILENAME" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
    ACTUAL_SUM="$(shasum -a 256 "$TMP_DIR/$FILENAME" | awk '{print $1}')"
else
    print_error "sha256sum or shasum is required to verify downloads."
fi

if [[ "$EXPECTED_SUM" != "$ACTUAL_SUM" ]]; then
    print_error "Checksum verification failed."
fi
print_info "Checksum verified"

# Step 4: Install binary
print_step 4 "Installing binary..."
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
print_info "Installed to ${DEST}"

# Step 5: Configure shell PATH
print_step 5 "Configuring shell PATH..."
CURRENT_SHELL="$(basename "$SHELL")"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"

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
        CONFIG_FILES=(
            "$HOME/.bashrc"
            "$HOME/.bash_profile"
            "$HOME/.profile"
        )
        ;;
esac

SHELL_CONFIG=""
for config_file in "${CONFIG_FILES[@]}"; do
    if [[ -f "$config_file" ]]; then
        SHELL_CONFIG="$config_file"
        break
    fi
done

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

if [[ -f "$SHELL_CONFIG" ]] && grep -q "Added by moru installer" "$SHELL_CONFIG" 2>/dev/null; then
    print_info "PATH already configured in ${SHELL_CONFIG}"
else
    case "$CURRENT_SHELL" in
        fish)
            echo "" >> "$SHELL_CONFIG"
            echo "# Added by moru installer" >> "$SHELL_CONFIG"
            echo "fish_add_path $INSTALL_DIR" >> "$SHELL_CONFIG"
            print_info "Added ${INSTALL_DIR} to PATH in ${SHELL_CONFIG}"
            ;;
        zsh|bash|*)
            echo "" >> "$SHELL_CONFIG"
            echo "# Added by moru installer" >> "$SHELL_CONFIG"
            echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_CONFIG"
            print_info "Added ${INSTALL_DIR} to PATH in ${SHELL_CONFIG}"
            ;;
    esac
fi

# Print completion banner
print_completion "$VERSION"
