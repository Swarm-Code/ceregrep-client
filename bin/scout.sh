#!/bin/bash
# Scout CLI wrapper - increases Node heap size for long conversations
exec node --max-old-space-size=4096 "$(dirname "$0")/../dist/cli/index.js" "$@"
