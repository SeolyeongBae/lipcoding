#!/bin/bash
# Authenticate Copilot CLI using the token stored by gh CLI.
# Works headlessly — no browser required.
set -e

export PATH="$HOME/.local/bin:$PATH"

echo "🔑 Reading GitHub token from gh CLI config..."

# Try gh auth token (gh >= 2.37)
GH_TOKEN=$(gh auth token 2>/dev/null) || true

# Fallback: read directly from gh config file (older gh versions)
if [ -z "$GH_TOKEN" ] || [[ "$GH_TOKEN" == "unknown"* ]]; then
  GH_TOKEN=$(python3 -c "
import re, sys
try:
    with open('$HOME/.config/gh/hosts.yml') as f:
        content = f.read()
    m = re.search(r'oauth_token:\s*(\S+)', content)
    if m:
        print(m.group(1))
except Exception as e:
    sys.exit(1)
" 2>/dev/null) || true
fi

if [ -z "$GH_TOKEN" ]; then
  echo "❌ Could not get GitHub token. Run: gh auth login"
  exit 1
fi

echo "✅ Got token (${#GH_TOKEN} chars)"
echo "🤖 Authenticating Copilot CLI..."

GH_TOKEN="$GH_TOKEN" copilot login

echo ""
echo "✅ Copilot CLI authenticated successfully!"
