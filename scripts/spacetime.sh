#!/bin/sh
set -eu
if command -v spacetime >/dev/null 2>&1; then exec spacetime "$@"; fi
KALPI_ST_ROOT="${KALPI_SPACETIME_ROOT:-$HOME/.local/share/kalpi-spacetime}"
exec "$KALPI_ST_ROOT/spacetime" "--root-dir=$KALPI_ST_ROOT" "$@"
