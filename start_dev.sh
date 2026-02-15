#!/bin/bash

# 1. Kill old processes (including any previous ngrok)
pkill -f ngrok 2>/dev/null
lsof -ti:3000,5173 | xargs kill -9 2>/dev/null

echo "🌍 Starting ngrok tunnel on port 3000..."
ngrok http 3000 > /dev/null 2>&1 &

# Give ngrok 2 seconds to wake up
sleep 2

# 2. Automatically grab the public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ "$NGROK_URL" == "null" ] || [ -z "$NGROK_URL" ]; then
    echo "⚠️  Ngrok failed to start. Running locally only."
    NGROK_URL="http://localhost:3000"
fi

# 3. Start Backend & Frontend
echo "🧠 Starting Backend..."
SERVER_URL=$NGROK_URL node server.js &
SERVER_PID=$!

echo "💻 Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🚀 DASHBOARD"
echo "--------------------------------------"
echo "Frontend:     http://localhost:5173"
echo "Backend (Local): http://localhost:3000"
echo "Backend (Railway): https://junodesk-production.up.railway.app"
echo "Ngrok Tunnel: $NGROK_URL"
echo "--------------------------------------"
echo ""
echo "✅ Checking Railway backend..."
curl -s https://junodesk-production.up.railway.app/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Railway backend is ONLINE"
else
    echo "⚠️  Railway backend is OFFLINE or unreachable"
fi
echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# Cleanup on exit
trap "kill $SERVER_PID $FRONTEND_PID; pkill -f ngrok" EXIT

wait 
