#!/bin/bash
# Scout CLI wrapper - increases Node heap size for long conversations
# Use absolute path to work correctly with npm link symlinks
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node --max-old-space-size=4096 "${SCRIPT_DIR}/../dist/cli/index.js" "$@"
