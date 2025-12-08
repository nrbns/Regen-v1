#!/bin/bash
# Repository audit script
# Checks for secrets, large files, and project structure issues

set -e

echo "🔍 Regen Browser Repository Audit"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ISSUES=0

# Check for secrets
echo "🔐 Checking for secrets..."

SECRET_PATTERNS=(
    "sk-[a-zA-Z0-9]{32,}"
    "AKIA[0-9A-Z]{16}"
    "AIza[0-9A-Z_-]{35}"
    "ya29\\.[0-9A-Za-z_-]+"
    "xox[baprs]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32}"
    "ghp_[a-zA-Z0-9]{36}"
    "gho_[a-zA-Z0-9]{36}"
    "ghu_[a-zA-Z0-9]{36}"
    "ghs_[a-zA-Z0-9]{36}"
    "ghr_[a-zA-Z0-9]{76}"
    "-----BEGIN PRIVATE KEY-----"
    "-----BEGIN RSA PRIVATE KEY-----"
    "password\s*[:=]\s*['\"][^'\"]+['\"]"
    "api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]"
    "secret\s*[:=]\s*['\"][^'\"]+['\"]"
)

SECRET_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    if git grep -I -n -E "$pattern" -- ':!.git' ':!node_modules' ':!dist' ':!dist-web' ':!*.lock' 2>/dev/null | grep -v "example\|test\|mock\|placeholder\|TODO" > /tmp/secrets_check.txt; then
        SECRET_FOUND=1
        echo -e "${RED}⚠️  Potential secrets found:${NC}"
        cat /tmp/secrets_check.txt | head -10
        ISSUES=$((ISSUES + 1))
    fi
done

if [ $SECRET_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious secrets found${NC}"
fi

# Check for large files
echo ""
echo "📦 Checking for large files..."

LARGE_FILES=$(find . -type f -size +5M ! -path "./.git/*" ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./dist-web/*" ! -path "./*.lock" 2>/dev/null | head -10)

if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Large files found (>5MB):${NC}"
    for file in $LARGE_FILES; do
        SIZE=$(du -h "$file" | cut -f1)
        echo "   $SIZE - $file"
    done
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No large files found${NC}"
fi

# Check for binary files in wrong locations
echo ""
echo "🔍 Checking for binary files in source directories..."

BINARY_IN_SRC=$(find src server -type f -exec file {} \; 2>/dev/null | grep -E "executable|binary|archive" | grep -v "text\|ASCII\|UTF-8" | head -10)

if [ -n "$BINARY_IN_SRC" ]; then
    echo -e "${YELLOW}⚠️  Binary files in source directories:${NC}"
    echo "$BINARY_IN_SRC"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ No unexpected binary files in source${NC}"
fi

# Check .gitignore
echo ""
echo "📝 Checking .gitignore..."

CRITICAL_PATTERNS=(
    ".env"
    ".env.local"
    "node_modules"
    "dist"
    "*.log"
    ".bridge_token"
    "models/"
    "*.gguf"
)

for pattern in "${CRITICAL_PATTERNS[@]}"; do
    if ! grep -q "^${pattern}" .gitignore 2>/dev/null && ! grep -q "/${pattern}" .gitignore 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Consider adding to .gitignore: $pattern${NC}"
        ISSUES=$((ISSUES + 1))
    fi
done

# Check project structure
echo ""
echo "🏗️  Checking project structure..."

REQUIRED_DIRS=("src" "server" "scripts" "docs")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo -e "${RED}❌ Required directory missing: $dir${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}✅ Found: $dir${NC}"
    fi
done

# Check for AI Bridge
if [ ! -d "server/ai-bridge" ]; then
    echo -e "${YELLOW}⚠️  AI Bridge not found (expected at server/ai-bridge)${NC}"
    ISSUES=$((ISSUES + 1))
else
    echo -e "${GREEN}✅ AI Bridge found${NC}"
fi

# Summary
echo ""
echo "=================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Audit complete - No issues found!${NC}"
else
    echo -e "${YELLOW}⚠️  Audit complete - $ISSUES potential issue(s) found${NC}"
    echo "   Review the items above and fix as needed"
fi

exit $ISSUES


