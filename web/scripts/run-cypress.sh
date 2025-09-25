#!/usr/bin/env bash

set -eu

# Function to cleanup processes
cleanup() {
    echo "Cleaning up processes..."
    
    # Kill the standalone app if it's still running
    if [ -n "${app:-}" ] && kill -0 "$app" 2>/dev/null; then
        echo "Stopping app PID: $app"
        kill "$app" 2>/dev/null || true
        
        # Wait with timeout - don't hang forever
        local count=0
        while kill -0 "$app" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$app" 2>/dev/null; then
            echo "Force killing app"
            kill -9 "$app" 2>/dev/null || true
        fi
    fi
    
    # Kill any remaining related processes
    pkill -f "start:standalone" 2>/dev/null || true
    pkill -f "serve.*dist-standalone" 2>/dev/null || true
    
    echo "Cleanup completed"
}

# Set trap for cleanup on any exit
trap cleanup EXIT INT TERM

echo "Starting standalone app..."
npm run start:standalone &
app=$!

# Wait for app to start
sleep 3

# Verify app is running
if ! kill -0 "$app" 2>/dev/null; then
    echo "Error: Standalone app failed to start"
    exit 1
fi

echo "Running Cypress tests..."
npm run cypress:run:ci
