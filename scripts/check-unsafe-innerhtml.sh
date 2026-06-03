#!/usr/bin/env bash
set -euo pipefail

DIFF_TARGET="${1:-HEAD~1}"

if ! git rev-parse --verify "$DIFF_TARGET" >/dev/null 2>&1; then
  echo "No comparable commit found for $DIFF_TARGET; skipping unsafe HTML sink diff check."
  exit 0
fi

diff_output=$(git diff --unified=0 "$DIFF_TARGET" -- js '*.js' || true)

innerhtml_violations=$(printf '%s\n' "$diff_output" \
  | rg '^\+.*\.innerHTML\s*=.*' \
  | rg -v 'escapeHtml\(|escapeAttr\(|SAFE_INNER_HTML' || true)

insertadjacent_violations=$(printf '%s\n' "$diff_output" \
  | rg '^\+.*\.insertAdjacentHTML\s*\(.*' \
  | rg -v 'SAFE_INSERT_ADJACENT_HTML' || true)

if [[ -n "$innerhtml_violations" || -n "$insertadjacent_violations" ]]; then
  echo "Unsafe HTML sink additions detected."
  echo "Use textContent/DOM APIs or explicit sanitization, and annotate reviewed constants with SAFE_* markers."

  if [[ -n "$innerhtml_violations" ]]; then
    echo
    echo "innerHTML violations:"
    echo "$innerhtml_violations"
  fi

  if [[ -n "$insertadjacent_violations" ]]; then
    echo
    echo "insertAdjacentHTML violations:"
    echo "$insertadjacent_violations"
  fi

  exit 1
fi

echo "No new unsafe HTML sink assignments detected."
