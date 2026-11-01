#!/bin/sh
# Runs "$@" holding the ports lock: parallel worktrees share the preview and emulator ports,
# so only one e2e/rules run at a time. The harness gates hold the same lock (HARNESS_PORT_LOCK_HELD=1).
[ "$HARNESS_PORT_LOCK_HELD" = 1 ] && exec "$@"
L="${PORT_LOCK:-/tmp/pulsar-claude-ports.lock}"
until mkdir "$L" 2>/dev/null; do
  P=$(cat "$L/pid" 2>/dev/null); [ -n "$P" ] && ! kill -0 "$P" 2>/dev/null && rm -rf "$L"   # owner gone: stale lock from a killed run
  find "$L" -maxdepth 0 -mmin +30 -exec rm -rf {} \; 2>/dev/null
  sleep 2
done
echo $$ > "$L/pid"
trap 'rm -rf "$L"' EXIT
trap 'exit 130' INT TERM HUP
"$@"
