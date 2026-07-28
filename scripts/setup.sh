#!/bin/bash
# MyMoney — Linux/macOS Setup Script

echo ""
echo "═══════════════════════════════════════"
echo " MyMoney — Setup"
echo "═══════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Install from: https://nodejs.org (v20 or later)"
    echo "Or use your package manager:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  RHEL/Fedora:   sudo dnf install nodejs"
    echo "  macOS:         brew install node"
    exit 1
fi

NODE_VER=$(node -v)
echo "[OK] Node.js $NODE_VER"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm ci
if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed"
    exit 1
fi
echo "[OK] Dependencies installed"

# Push database schema
echo ""
echo "Setting up database..."
npx prisma db push --skip-generate
if [ $? -ne 0 ]; then
    echo "[ERROR] Database setup failed"
    exit 1
fi
echo "[OK] Database ready"

# Run seed
echo ""
echo "Loading merchant mappings..."
npx tsx prisma/seed.ts
echo "[OK] Seed complete"

# Generate PWA icons
echo ""
echo "Generating icons..."
npx tsx scripts/generate-icons.ts

echo ""
echo "═══════════════════════════════════════"
echo " Setup complete!"
echo ""
echo " Run ./scripts/start.sh to launch MyMoney"
echo " Then open http://localhost:3005"
echo "═══════════════════════════════════════"
echo ""
