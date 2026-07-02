#!/usr/bin/env bash
set -euo pipefail

# ─── VPS / Hosting Setup Script ───────────────────────────────────────────
# Installs prerequisites, clones the repo, configures SSL, and starts services.
# Usage: ./scripts/setup-vps.sh [domain]
# Example: ./scripts/setup-vps.sh mymoney.example.com

DOMAIN="${1:-mymoney.example.com}"
REPO_URL="${REPO_URL:-git@github.com:your-org/mymoney.git}"
APP_DIR="${APP_DIR:-/opt/mymoney}"
ENV_FILE="${APP_DIR}/.env"

echo "=== MyMoney VPS Setup ==="
echo "Domain: ${DOMAIN}"
echo "App directory: ${APP_DIR}"

# ── Update system ──────────────────────────────────────────────────────────
echo ">>> Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ── Install prerequisites ──────────────────────────────────────────────────
echo ">>> Installing prerequisites..."
sudo apt-get install -y -qq curl git ufw

# Node.js 20
if ! command -v node &>/dev/null || [[ "$(node --version)" != v20* ]]; then
  echo ">>> Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# Docker
if ! command -v docker &>/dev/null; then
  echo ">>> Installing Docker..."
  curl -fsSL https://get.docker.com | sudo bash
  sudo usermod -aG docker "${USER}"
fi
echo "Docker: $(docker --version)"

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
  echo ">>> Installing Docker Compose plugin..."
  sudo apt-get install -y -qq docker-compose-plugin
fi
echo "Docker Compose: $(docker compose version)"

# ── Clone / update repo ────────────────────────────────────────────────────
if [ -d "${APP_DIR}" ]; then
  echo ">>> Updating existing repository..."
  cd "${APP_DIR}"
  git pull
else
  echo ">>> Cloning repository..."
  sudo mkdir -p "${APP_DIR}"
  sudo chown "${USER}:${USER}" "${APP_DIR}"
  git clone "${REPO_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

# ── Create .env file ───────────────────────────────────────────────────────
if [ ! -f "${ENV_FILE}" ]; then
  echo ">>> Creating .env file from template..."
  cp .env.template "${ENV_FILE}"
  # Generate random secrets
  sed -i "s/generate-a-random-secret/$(openssl rand -hex 32)/" "${ENV_FILE}"
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://${DOMAIN}|" "${ENV_FILE}"
  # Generate a random PG password
  PG_PASS=$(openssl rand -base64 12 | tr '+/' '_-')
  sed -i "s|postgresql://mymoney:password@localhost:5432/mymoney|postgresql://mymoney:${PG_PASS}@postgres:5432/mymoney|" "${ENV_FILE}"
  echo "PG_PASSWORD=${PG_PASS}" >> "${ENV_FILE}"
  
  echo ">>> IMPORTANT: Edit ${ENV_FILE} to add your Google OAuth credentials"
else
  echo ">>> .env file already exists, skipping..."
fi

# ── Start services with Docker Compose ─────────────────────────────────────
echo ">>> Starting services..."
cd "${APP_DIR}"
docker compose up -d --build

# ── Configure firewall ─────────────────────────────────────────────────────
echo ">>> Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3005/tcp # App direct (optional)
sudo ufw status

# ── Setup SSL via Caddy ────────────────────────────────────────────────────
echo ">>> Setting up SSL with Caddy..."
bash "${APP_DIR}/scripts/setup-ssl.sh" "${DOMAIN}"

echo ""
echo "=== VPS Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit ${ENV_FILE} and fill in your API keys:"
echo "     - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET"
echo "     - OPENAI_API_KEY / ANTHROPIC_API_KEY (if using LLM features)"
echo "  2. Rebuild and restart: docker compose up -d --build"
echo "  3. Access your app at: https://${DOMAIN}"
echo "  4. Check logs: docker compose logs -f app"
