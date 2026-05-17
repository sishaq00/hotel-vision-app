#!/bin/bash
# NEXORA OS — PocketBase Setup Script for Linux/Mac
# Run on the computer that will act as the LAN server.

PB_VERSION="0.22.0"
PB_DIR="$HOME/nexora-server"
PB_PORT=8090

echo ""
echo "======================================="
echo "  NEXORA OS — LAN Server Setup"
echo "======================================="
echo ""

mkdir -p "$PB_DIR"

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case $ARCH in
  x86_64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
esac

PB_FILE="pocketbase_${PB_VERSION}_${OS}_${ARCH}.zip"
PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_FILE}"

if [ ! -f "$PB_DIR/pocketbase" ]; then
  echo "[1/3] Downloading PocketBase v$PB_VERSION..."
  curl -L -o "$PB_DIR/pocketbase.zip" "$PB_URL"
  unzip -o "$PB_DIR/pocketbase.zip" -d "$PB_DIR"
  rm "$PB_DIR/pocketbase.zip"
  chmod +x "$PB_DIR/pocketbase"
  echo "      Done."
else
  echo "[1/3] PocketBase already downloaded."
fi

# Get local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "[2/3] Local IP: $LOCAL_IP"
echo "[3/3] Starting server on port $PB_PORT..."
echo ""
echo "======================================="
echo "  Server URL for other computers:"
echo "  http://${LOCAL_IP}:${PB_PORT}"
echo ""
echo "  Admin panel: http://127.0.0.1:${PB_PORT}/_/"
echo ""
echo "  Next: Create 'hotel_sync' collection with fields:"
echo "  table (text), payload (json), device_id (text), ts (number)"
echo "======================================="
echo ""

"$PB_DIR/pocketbase" serve --http="0.0.0.0:$PB_PORT"
