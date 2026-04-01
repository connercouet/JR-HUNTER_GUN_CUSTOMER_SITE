#!/bin/bash
# Hunter's Edge Dashboard — Start Script
# Run this from the dashboard/ directory

echo "🦅 Starting Hunter's Edge Dashboard..."

# Check if .env exists
if [ ! -f backend/.env ]; then
  echo "⚠️  No .env file found. Copying from .env.example..."
  cp backend/.env.example backend/.env
  echo "   Please edit backend/.env with your API keys, then run this script again."
  exit 1
fi

# Install if needed
if [ ! -d backend/node_modules ]; then
  echo "📦 Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

if [ ! -d frontend/node_modules ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo "🚀 Starting backend on port 3001..."
cd backend && npm run dev &
BACKEND_PID=$!

sleep 2

echo "🎨 Starting frontend on port 3000..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Dashboard running!"
echo "   Open: http://localhost:3000"
echo "   Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
