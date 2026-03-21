FROM node:18-alpine

# Security: non-root user
RUN addgroup -S konggest && adduser -S konggest -G konggest

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
