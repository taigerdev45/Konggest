FROM node:18-bookworm-slim

# Security: update packages and non-root user
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
RUN groupadd -r konggest && useradd -r -g konggest konggest

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install

# Copy source
COPY . .

# Switch to non-root
RUN chown -R konggest:konggest /app
USER konggest

EXPOSE 3000

CMD ["npm", "run", "dev"]
