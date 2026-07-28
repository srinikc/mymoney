#!/usr/bin/env bash
set -euo pipefail

# ─── SSL + Reverse Proxy Setup Script ─────────────────────────────────────
# Installs Caddy and configures it as a reverse proxy with automatic SSL.
# Usage: ./scripts/setup-ssl.sh [domain]
# Example: ./scripts/setup-ssl.sh mymoney.example.com

DOMAIN="${1:-mymoney.example.com}"
CADDYFILE="./Caddyfile"

echo "=== SSL / Reverse Proxy Setup ==="
echo "Domain: ${DOMAIN}"

# ── Install Caddy ──────────────────────────────────────────────────────────
if ! command -v caddy &>/dev/null; then
  echo ">>> Installing Caddy..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -qq
  sudo apt-get install -y -qq caddy
else
  echo ">>> Caddy already installed ($(caddy version))"
fi

# ── Configure Caddy ────────────────────────────────────────────────────────
echo ">>> Writing Caddy configuration..."
cat > "${CADDYFILE}" <<CADDYEOF
${DOMAIN} {
    reverse_proxy localhost:3005
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}

# Redirect www to non-www
www.${DOMAIN} {
    redir https://${DOMAIN}{uri}
}
CADDYEOF

if [ -f /etc/caddy/Caddyfile ]; then
  sudo cp "${CADDYFILE}" /etc/caddy/Caddyfile
else
  sudo mkdir -p /etc/caddy
  sudo cp "${CADDYFILE}" /etc/caddy/Caddyfile
fi

# ── Start / Reload Caddy ───────────────────────────────────────────────────
if systemctl is-active --quiet caddy; then
  echo ">>> Reloading Caddy..."
  sudo systemctl reload caddy
else
  echo ">>> Starting Caddy..."
  sudo systemctl enable caddy
  sudo systemctl start caddy
fi

# ── Firewall ───────────────────────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  echo ">>> Configuring firewall..."
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw reload 2>/dev/null || true
fi

echo "=== Setup complete ==="
echo "Your app should be available at: https://${DOMAIN}"
echo ""
echo "Auto-renewal is handled automatically by Caddy."
echo "To check Caddy status: sudo systemctl status caddy"
echo "To view logs: sudo journalctl -u caddy -f"
