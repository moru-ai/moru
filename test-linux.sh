#!/bin/bash
set -e

echo "================================"
echo "Linux Shell Installation Test"
echo "================================"
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 테스트 결과 저장
PASSED=0
FAILED=0

test_shell() {
    local shell_name=$1
    local shell_cmd=$2
    local config_file=$3

    echo -e "${YELLOW}=== Testing ${shell_name} ===${NC}"

    # 설치 실행 (SHELL 환경변수를 해당 셸로 설정)
    if SHELL=$(which $shell_cmd) $shell_cmd -c "./install.sh"; then
        echo -e "${GREEN}✓ Installation completed${NC}"
    else
        echo -e "${RED}✗ Installation failed${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    # Config 파일 확인
    if [ -f "$config_file" ]; then
        echo -e "${GREEN}✓ Config file created: ${config_file}${NC}"
    else
        echo -e "${RED}✗ Config file not found: ${config_file}${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    # PATH 추가 확인
    if grep -q "Added by moru installer" "$config_file"; then
        echo -e "${GREEN}✓ PATH added to config${NC}"
    else
        echo -e "${RED}✗ PATH not added to config${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    # 바이너리 설치 확인
    if [ -f "$HOME/.local/bin/moru" ]; then
        echo -e "${GREEN}✓ Binary installed${NC}"
    else
        echo -e "${RED}✗ Binary not installed${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    # Config 내용 출력
    echo "Config file content:"
    tail -5 "$config_file"

    # 중복 설치 테스트
    echo ""
    echo "Testing duplicate installation..."
    if SHELL=$(which $shell_cmd) $shell_cmd -c "./install.sh" 2>&1 | grep -q "PATH already configured"; then
        echo -e "${GREEN}✓ Duplicate prevention works${NC}"

        # 중복이 실제로 추가되지 않았는지 확인
        count=$(grep -c "Added by moru installer" "$config_file")
        if [ "$count" -eq 1 ]; then
            echo -e "${GREEN}✓ No duplicate entries (count: ${count})${NC}"
        else
            echo -e "${RED}✗ Duplicate entries found (count: ${count})${NC}"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}✗ Duplicate prevention failed${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi

    PASSED=$((PASSED + 1))
    echo ""
    return 0
}

# Bash 테스트
test_shell "Bash" "bash" "$HOME/.bashrc"

# Zsh 테스트
test_shell "Zsh" "zsh" "$HOME/.zshrc"

# Fish 테스트
test_shell "Fish" "fish" "$HOME/.config/fish/config.fish"

# 최종 결과
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
