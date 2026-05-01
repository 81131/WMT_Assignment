#!/bin/bash
# ============================================================
#  CinemaApp Dev Launcher
#  Usage: bash start-dev.sh
# ============================================================
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🎬 CinemaApp Dev Environment"
echo "==============================="

# 1. Start backend in background
echo "▶ Starting backend on port 5000..."
cd "$BACKEND_DIR"
npm run dev &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
sleep 3

# 2. Start ngrok tunnel
echo "▶ Starting ngrok tunnel..."
ngrok http 5000 --log=stdout > /tmp/ngrok.log &
NGROK_PID=$!
sleep 4

# 3. Extract ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; tunnels=json.load(sys.stdin)['tunnels']; print(next(t['public_url'] for t in tunnels if t['proto']=='https'), end='')" 2>/dev/null)

if [ -n "$NGROK_URL" ]; then
  echo ""
  echo "✅ ngrok tunnel: $NGROK_URL"
  echo ""
  echo "📋 UPDATE YOUR .env:"
  echo "   PAYHERE_NOTIFY_URL=$NGROK_URL/api/payments/webhook"
  echo ""
  # Auto-update .env
  sed -i "s|PAYHERE_NOTIFY_URL=.*|PAYHERE_NOTIFY_URL=$NGROK_URL/api/payments/webhook|" "$PROJECT_DIR/.env"
  echo "✅ .env updated automatically!"
else
  echo "⚠️  Could not fetch ngrok URL. Check http://localhost:4040 manually."
fi

# 4. Get local IP for Expo
LOCAL_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}')
echo ""
echo "📱 Your local IP: $LOCAL_IP"
echo "   Update frontend/.env:"
echo "   API_BASE_URL=http://$LOCAL_IP:5000/api"
echo ""

# 5. Start Expo
echo "▶ Starting Expo (frontend)..."
cd "$FRONTEND_DIR"
npx expo start

# Cleanup on exit
trap "kill $BACKEND_PID $NGROK_PID 2>/dev/null" EXIT
