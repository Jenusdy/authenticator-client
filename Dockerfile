FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install Electron runtime libraries, Xvfb, window manager, and noVNC
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    fluxbox \
    xclip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY main.js preload.js ./
COPY src ./src
COPY assets ./assets
COPY test ./test
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV DISPLAY=:99

EXPOSE 6080

ENTRYPOINT ["./docker-entrypoint.sh"]
