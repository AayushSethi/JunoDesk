#!/bin/bash

# 1. Kill old processes
lsof -ti:3000,5173 | xargs kill -9 2>/dev/null

# 2. Start Backend & Frontend
echo "🧠 Starting Backend..."
node server.js &
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
echo "ℹ️  Frontend uses Railway backend via VITE_API_BASE_URL"
echo "ℹ️  Local backend runs for development/testing only"
echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# Cleanup on exit
trap "kill $SERVER_PID $FRONTEND_PID" EXIT

wait 
