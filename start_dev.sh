#!/bin/bash

# Kill any existing processes on port 3000 to avoid EADDRINUSE
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "🔍 Checking for existing ngrok tunnel..."
# Try to get existing tunnel URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ "$NGROK_URL" == "null" ] || [ -z "$NGROK_URL" ]; then
    echo "⚠️  No tunnel found. Starting new ngrok session..."
    # Start ngrok in background, silencing output
    ngrok http 3000 > /dev/null 2>&1 &
    # Allow time for initialization
    sleep 3
    # Fetch the new URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
fi

# Fallback if ngrok failed
if [ "$NGROK_URL" == "null" ] || [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to start ngrok. Falling back to localhost."
    echo "Note: Webhooks (Call Status/Audio) will NOT work without a public URL."
    FINAL_URL="http://localhost:3000"
else
    echo "🌍 Public URL: $NGROK_URL"
    FINAL_URL=$NGROK_URL
fi

echo "Starting Backend Server..."
# Pass the dynamic URL to the server process
SERVER_URL=$FINAL_URL node server.js &
SERVER_PID=$!

echo "Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

echo "🚀 App is running!"
echo "Backend:  http://localhost:3000"
echo "Webhook:  $FINAL_URL"
echo "Frontend: http://localhost:5173"

# Cleanup on exit (kills both processes when you Ctrl+C)
trap "kill $SERVER_PID $FRONTEND_PID" EXIT

wait
