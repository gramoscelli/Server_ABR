# Nginx Alpine container with Let's Encrypt ACME support
FROM nginx:alpine

# Copy custom Nginx configuration
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Fix permissions
RUN chown nginx:nginx /usr/share/nginx/html/* -R && \
    mkdir -p /var/www/certbot && \
    chown nginx:nginx /var/www/certbot
