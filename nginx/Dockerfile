# Nginx reverse proxy
FROM nginx:alpine

# Copy custom nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

RUN chown nginx:nginx /usr/share/nginx/html/* -R
