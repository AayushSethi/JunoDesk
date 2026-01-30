#!/bin/bash

# Kill any existing processes on port 3000 to avoid EADDRINUSE
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "Starting Backend Server..."
node server.js &
SERVER_PID=$!

echo "Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

echo "🚀 App is running!"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"

# Cleanup on exit
trap "kill $SERVER_PID $FRONTEND_PID" EXIT

wait
