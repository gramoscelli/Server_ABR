#!/bin/bash

# Script to initialize Let's Encrypt SSL certificates for Nginx
# This script should be run once before starting the application in production
# Usage: ./init-letsencrypt.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${SERVER_DOMAIN:-"abrbp.ddnsfree.com"}
EMAIL=${LETSENCRYPT_EMAIL:-"admin@example.com"}
NGINX_CONTAINER="nginx"
CERTBOT_CONTAINER="certbot"
DATA_PATH="./nginx/data/certbot"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Let's Encrypt SSL Initialization${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if domain is set
if [ "$DOMAIN" == "localhost" ] || [ "$DOMAIN" == "127.0.0.1" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Domain is set to localhost/127.0.0.1${NC}"
    echo -e "${YELLOW}   Let's Encrypt cannot issue certificates for localhost.${NC}"
    echo -e "${YELLOW}   This script is only for production domains.${NC}"
    echo ""
    echo -e "${BLUE}For development, using self-signed certificates instead...${NC}"
    mkdir -p "$DATA_PATH/conf"
    mkdir -p "$DATA_PATH/www"

    if [ ! -f "$DATA_PATH/conf/live/localhost/privkey.pem" ]; then
        echo -e "${BLUE}Generating self-signed certificate for development...${NC}"
        mkdir -p "$DATA_PATH/conf/live/localhost"
        openssl req -x509 -newkey rsa:4096 -keyout "$DATA_PATH/conf/live/localhost/privkey.pem" \
            -out "$DATA_PATH/conf/live/localhost/fullchain.pem" -days 365 -nodes \
            -subj "/C=AR/ST=Argentina/L=Buenos Aires/O=ABR/CN=localhost"
        echo -e "${GREEN}✓ Self-signed certificate created${NC}"
    else
        echo -e "${GREEN}✓ Self-signed certificate already exists${NC}"
    fi
    exit 0
fi

# Check if containers are running
echo -e "${BLUE}Checking if Docker containers are running...${NC}"
if ! docker ps | grep -q "$NGINX_CONTAINER"; then
    echo -e "${RED}✗ Nginx container is not running${NC}"
    echo -e "${YELLOW}  Please ensure containers are started with: docker compose up -d${NC}"
    exit 1
fi

if ! docker ps | grep -q "$CERTBOT_CONTAINER"; then
    echo -e "${RED}✗ Certbot container is not running${NC}"
    echo -e "${YELLOW}  Please ensure containers are started with: docker compose up -d${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Containers are running${NC}"
echo ""

# Create directories if they don't exist
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p "$DATA_PATH/conf"
mkdir -p "$DATA_PATH/www"
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Download recommended TLS parameters
echo -e "${BLUE}Downloading recommended TLS parameters...${NC}"
if [ ! -f "$DATA_PATH/conf/options-ssl-nginx.conf" ]; then
    docker compose run --rm --entrypoint "\
      wget -O /etc/letsencrypt/options-ssl-nginx.conf https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf" \
      "$CERTBOT_CONTAINER" || echo -e "${YELLOW}⚠️  Could not download options-ssl-nginx.conf (may already exist)${NC}"
fi

if [ ! -f "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
    echo -e "${BLUE}Generating Diffie-Hellman parameters (this may take a few minutes)...${NC}"
    docker compose run --rm --entrypoint "\
      openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048" \
      "$CERTBOT_CONTAINER" || echo -e "${YELLOW}⚠️  Could not generate Diffie-Hellman parameters${NC}"
fi

echo -e "${GREEN}✓ TLS parameters configured${NC}"
echo ""

# Request certificate
echo -e "${BLUE}Requesting certificate from Let's Encrypt...${NC}"
echo -e "${BLUE}Domain: ${YELLOW}$DOMAIN${NC}"
echo -e "${BLUE}Email: ${YELLOW}$EMAIL${NC}"
echo ""

# Stage 1: Get certificate
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN" \
  "$CERTBOT_CONTAINER"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificate obtained successfully${NC}"
else
    echo -e "${RED}✗ Failed to obtain certificate${NC}"
    echo -e "${YELLOW}Troubleshooting tips:${NC}"
    echo -e "${YELLOW}1. Ensure your domain is pointing to this server's IP address${NC}"
    echo -e "${YELLOW}2. Ensure port 80 is accessible from the internet${NC}"
    echo -e "${YELLOW}3. Check Nginx logs: docker compose logs nginx${NC}"
    echo -e "${YELLOW}4. Check Certbot logs: docker compose logs certbot${NC}"
    exit 1
fi

echo ""

# Reload Nginx with new certificate
echo -e "${BLUE}Reloading Nginx with new certificate...${NC}"
docker compose exec -T "$NGINX_CONTAINER" nginx -s reload || echo -e "${YELLOW}⚠️  Could not reload Nginx${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ SSL initialization complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Certificate Details:${NC}"
echo -e "${BLUE}  Domain: ${YELLOW}$DOMAIN${NC}"
echo -e "${BLUE}  Location: ${YELLOW}$DATA_PATH/conf/live/$DOMAIN/${NC}"
echo -e "${BLUE}  Auto-renewal: Every 12 hours${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "${BLUE}1. Update your firewall to allow HTTP (80) and HTTPS (443)${NC}"
echo -e "${BLUE}2. Access your application at: ${YELLOW}https://$DOMAIN${NC}"
echo -e "${BLUE}3. Monitor certificate renewal: ${YELLOW}docker compose logs certbot${NC}"
echo ""
