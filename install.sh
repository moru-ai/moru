#!/usr/bin/env bash
set -euo pipefail

REPO="moru-ai/moru"
INSTALL_DIR=""
VERSION=""

# =============================================================================
# Color codes with terminal detection
# =============================================================================
if [[ -t 1 ]]; then
    MUTED='\033[0;2m'
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    CYAN='\033[38;2;0;209;255m'
    BOLD='\033[1m'
    NC='\033[0m'
else
    MUTED=''
    RED=''
    GREEN=''
    CYAN=''
    BOLD=''
    NC=''
fi

# Check if terminal supports Unicode
if [[ "${LANG:-}" == *UTF-8* ]] || [[ "${LC_ALL:-}" == *UTF-8* ]] || [[ "${LC_CTYPE:-}" == *UTF-8* ]]; then
    PROGRESS_FILLED='■'
    PROGRESS_EMPTY='･'
    SPINNER_FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
    CHECKMARK='✓'
    ARROW_DOWN='↓'
else
    PROGRESS_FILLED='#'
    PROGRESS_EMPTY='-'
    SPINNER_FRAMES=('-' '\' '|' '/')
    CHECKMARK='*'
    ARROW_DOWN='>'
fi

SPINNER_PID=""

# =============================================================================
# Helper functions
# =============================================================================
print_error() {
    stop_spinner
    echo -e "${RED}error:${NC} $1" >&2
    exit 1
}

# Spinner functions
start_spinner() {
    local message="$1"
    [[ -t 1 ]] || return 0

    printf "\033[?25l"  # Hide cursor

    (
        local i=0
        while true; do
            printf "\r${CYAN}%s${NC} %s" "${SPINNER_FRAMES[$i]}" "$message"
            i=$(( (i + 1) % ${#SPINNER_FRAMES[@]} ))
            sleep 0.08
        done
    ) &
    SPINNER_PID=$!
}

stop_spinner() {
    [[ -n "$SPINNER_PID" ]] && kill "$SPINNER_PID" 2>/dev/null && wait "$SPINNER_PID" 2>/dev/null || true
    SPINNER_PID=""
    printf "\033[?25h"  # Show cursor
}

# Complete a spinner with success
spinner_success() {
    local message="$1"
    stop_spinner
    printf "\r${GREEN}${CHECKMARK}${NC} %s\n" "$message"
}

# Complete a spinner with the current state (no checkmark)
spinner_done() {
    stop_spinner
    printf "\r\033[K"  # Clear line
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

    printf "\r      ${CYAN}%s%s${NC} %3d%%" "$bar_filled" "$bar_empty" "$percent" >&4
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
    local message="${3:-Downloading...}"

    # Windows: always use silent curl
    if [[ "${OS:-}" == "win" ]]; then
        curl -fsSL -o "$output" "$url"
        return
    fi

    # Try advanced progress bar in TTY environment
    if [[ -t 1 ]] && download_with_progress "$url" "$output" 2>/dev/null; then
        return
    fi

    # Fallback: download with spinner
    start_spinner "$message"
    if curl -fsSL -o "$output" "$url"; then
        stop_spinner
    else
        stop_spinner
        return 1
    fi
}

# Print completion banner
print_completion() {
    local version="$1"
    echo ""
    echo -e "${GREEN}Installation complete!${NC} ${MUTED}(v${version})${NC}"
    echo -e "Run ${CYAN}${BOLD}moru auth login${NC} to get started."
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
start_spinner "Fetching latest version..."
if [[ -z "$VERSION" ]]; then
    VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
        | grep -E '"tag_name":' \
        | head -n 1 \
        | sed -E 's/.*"([^"]+)".*/\1/')"
fi

TAG="${VERSION}"
VERSION="${VERSION##*@}"
VERSION="${VERSION#v}"
spinner_success "Found version v${VERSION}"

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
    stop_spinner
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

ASSET_URL="https://github.com/${REPO}/releases/download/${TAG}/${FILENAME}"
SUMS_URL="https://github.com/${REPO}/releases/download/${TAG}/SHA256SUMS"

# Step 2: Download binary
if ! download_file "$ASSET_URL" "$TMP_DIR/$FILENAME" "Downloading ${FILENAME}..."; then
    print_error "Failed to download ${FILENAME}"
fi
spinner_success "Downloaded ${FILENAME}"

# Step 3: Verify checksum
start_spinner "Verifying checksum..."
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
spinner_success "Checksum verified"

# Step 4: Install binary
start_spinner "Installing binary..."
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
spinner_success "Installed to ${DEST}"

# Step 5: Configure shell PATH
start_spinner "Configuring shell PATH..."
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
    spinner_success "PATH already configured"
else
    case "$CURRENT_SHELL" in
        fish)
            echo "" >> "$SHELL_CONFIG"
            echo "# Added by moru installer" >> "$SHELL_CONFIG"
            echo "fish_add_path $INSTALL_DIR" >> "$SHELL_CONFIG"
            ;;
        zsh|bash|*)
            echo "" >> "$SHELL_CONFIG"
            echo "# Added by moru installer" >> "$SHELL_CONFIG"
            echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$SHELL_CONFIG"
            ;;
    esac
    spinner_success "Added to PATH in ${SHELL_CONFIG}"
fi

# Print completion banner
print_completion "$VERSION"
