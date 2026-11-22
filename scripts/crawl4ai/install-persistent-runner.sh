#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VENV_DIR="$HOME/.crawl4ai-venv"
RUNNER="$REPO_DIR/scripts/crawl4ai/run_watcher.sh"
SYSTEMD_DIR="$HOME/.config/systemd/user"

chmod +x "$RUNNER"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "Creating persistent venv at $VENV_DIR..."
  python3 -m venv "$VENV_DIR"
fi

if ! "$VENV_DIR/bin/python" -c "import crawl4ai" >/dev/null 2>&1; then
  echo "Installing crawl4ai in $VENV_DIR..."
  PIP_DISABLE_PIP_VERSION_CHECK=1 "$VENV_DIR/bin/pip" install --no-input crawl4ai
fi

if ! compgen -G "$HOME/.cache/ms-playwright/chromium*" >/dev/null 2>&1; then
  echo "Installing Playwright Chromium browser..."
  DEBIAN_FRONTEND=noninteractive "$VENV_DIR/bin/python" -m playwright install chromium
fi

if command -v systemctl >/dev/null 2>&1 && systemctl --user is-system-running >/dev/null 2>&1; then
  mkdir -p "$SYSTEMD_DIR"
  cat > "$SYSTEMD_DIR/cso-crawl4ai.service" <<EOF
[Unit]
Description=CS Odisha Crawl4AI .gov.in Notice Watcher
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/env bash $RUNNER
EOF

  cat > "$SYSTEMD_DIR/cso-crawl4ai.timer" <<EOF
[Unit]
Description=Run CS Odisha Crawl4AI watcher twice daily at 7:30 AM and 7:30 PM IST

[Timer]
OnCalendar=*-*-* 07:30:00
OnCalendar=*-*-* 19:30:00
Persistent=true
Unit=cso-crawl4ai.service

[Install]
WantedBy=timers.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now cso-crawl4ai.timer
  echo "Installed & started systemd user timer cso-crawl4ai.timer (07:30 & 19:30)."
else
  CRON_LINE="30 7,19 * * * /usr/bin/env bash $RUNNER >/dev/null 2>&1"
  EXISTING="$(crontab -l 2>/dev/null || true)"
  if ! printf '%s\n' "$EXISTING" | grep -Fq "$RUNNER"; then
    {
      printf '%s\n' "$EXISTING" | sed '/^$/d'
      printf '%s\n' "$CRON_LINE"
    } | crontab -
  fi
  echo "Installed crontab schedule: $CRON_LINE"
fi
