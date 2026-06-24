#!/bin/bash
# MyMoney — Start Script
echo ""
echo "Starting MyMoney..."
echo ""
# Prefer 192.168.x.x, then 10.x.x.x, then first
IP=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep '^192\.168\.' | head -1)
if [ -z "$IP" ]; then IP=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep '^10\.' | head -1); fi
if [ -z "$IP" ]; then IP=$(hostname -I 2>/dev/null | awk '{print $1}'); fi
echo ""
echo "  Local:    http://localhost:3005"
if [ -n "$IP" ]; then
  echo "  Network:  http://$IP:3005"
fi
echo ""
npx next dev -p 3005 -H 0.0.0.0
