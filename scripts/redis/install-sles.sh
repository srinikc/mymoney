#!/bin/bash
# Redis installation script for SLES / openSUSE
# Usage: sudo ./install-sles.sh

set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo $0"
  exit 1
fi

echo "==> Installing Redis on SLES/openSUSE"
zypper refresh
zypper install -y redis

echo "==> Generating strong password"
REDIS_PASS=$(openssl rand -base64 32)
echo "Generated password: $REDIS_PASS"
echo "SAVE THIS — you'll need it for REDIS_URL in .env"

CONFIG_FILE="/etc/redis/redis.conf"
cp "$CONFIG_FILE" "${CONFIG_FILE}.bak.$(date +%Y%m%d)"

echo "==> Configuring Redis"
sed -i "s/^bind 127.0.0.1.*/bind 127.0.0.1/" "$CONFIG_FILE"
sed -i "s/^port 6379.*/port 6379/" "$CONFIG_FILE"
sed -i "s/^maxmemory .*/maxmemory 512mb/" "$CONFIG_FILE"
sed -i "s/^maxmemory-policy .*/maxmemory-policy allkeys-lru/" "$CONFIG_FILE"
sed -i "s/^appendonly .*/appendonly yes/" "$CONFIG_FILE"
sed -i "s/^# requirepass .*/requirepass $REDIS_PASS/" "$CONFIG_FILE"

if ! grep -q "^requirepass" "$CONFIG_FILE"; then
  echo "requirepass $REDIS_PASS" >> "$CONFIG_FILE"
fi

echo "==> Firewall: opening port 6379"
if command -v SuSEfirewall2 &> /dev/null; then
  SuSEfirewall2 open EXT TCP 6379
  SuSEfirewall2
elif command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=6379/tcp
  firewall-cmd --reload
else
  echo "No firewall tool found — manually open port 6379"
fi

echo "==> Enabling and starting Redis"
systemctl enable redis
systemctl restart redis
sleep 2

echo "==> Verifying Redis is running"
if systemctl is-active --quiet redis; then
  echo "✓ Redis is running"
else
  echo "✗ Redis failed to start"
  systemctl status redis
  exit 1
fi

echo "==> Testing connection"
if redis-cli -a "$REDIS_PASS" ping 2>/dev/null | grep -q PONG; then
  echo "✓ Redis responding to PING"
else
  echo "✗ Redis not responding (may need password)"
fi

echo ""
echo "==> Installation complete!"
echo ""
echo "Add this to your .env file on the app server:"
echo "REDIS_URL=redis://:$REDIS_PASS@localhost:6379"
echo "REDIS_ENABLED=true"
echo ""
echo "Test with: redis-cli -a \"$REDIS_PASS\" ping"
