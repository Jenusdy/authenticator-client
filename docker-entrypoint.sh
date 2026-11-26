#!/bin/sh
set -e

# Clean up stale X lock if container restarts
rm -f /tmp/.X99-lock

# Start virtual X display
Xvfb :99 -screen 0 1024x800x24 -ac +extension GLX +render -noreset &
sleep 1

# Start lightweight window manager
fluxbox >/dev/null 2>&1 &

# Start VNC server and noVNC web proxy on port 6080
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 -quiet &
websockify --web=/usr/share/novnc 6080 localhost:5900 >/dev/null 2>&1 &

# Run Electron (--no-sandbox and --disable-gpu required inside Docker)
exec npx electron . --no-sandbox --disable-gpu
