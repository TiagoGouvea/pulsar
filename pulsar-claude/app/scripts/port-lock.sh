#!/bin/sh
# Runs "$@" holding the ports lock: parallel worktrees share the preview and emulator ports,
# so only one e2e/rules run at a time. The harness gates hold the same lock (HARNESS_PORT_LOCK_HELD=1).
[ "$HARNESS_PORT_LOCK_HELD" = 1 ] && exec "$@"
L="${PORT_LOCK:-/tmp/pulsar-claude-ports.lock}"
until mkdir "$L" 2>/dev/null; do
  find "$L" -maxdepth 0 -mmin +30 -exec rm -rf {} \; 2>/dev/null   # stale lock from a killed run
  sleep 2
done
trap 'rm -rf "$L"' EXIT
trap 'exit 130' INT TERM HUP
"$@"
