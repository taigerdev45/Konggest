FROM nginx:1.27-alpine

# Run as non-root
RUN addgroup -S konggest && adduser -S konggest -G konggest

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY rate-limiting.conf /etc/nginx/rate-limiting.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Generate self-signed cert for development
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/konggest.key \
    -out /etc/nginx/ssl/konggest.crt \
    -subj "/C=FR/ST=IDF/L=Paris/O=Konggest/CN=localhost" && \
    apk del openssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
