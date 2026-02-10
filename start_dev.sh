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
echo "Public URL:   $NGROK_URL"
echo "Backend:      http://localhost:3000"
echo "Frontend:     http://localhost:5173"
echo "--------------------------------------"
echo "Press Ctrl+C to stop everything."

# Cleanup on exit
trap "kill $SERVER_PID $FRONTEND_PID; pkill -f ngrok" EXIT

wait 
