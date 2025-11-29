#!/bin/bash

# Test SSL/TLS Certificate Configuration
# This script validates that SSL certificates are properly configured

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN=${SERVER_DOMAIN:-"localhost"}

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}SSL Certificate Configuration Test${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Test 1: Check if certificate files exist
echo -e "${BLUE}[1] Checking certificate files...${NC}"
CERT_PATH="./nginx/data/certbot/conf/live/$DOMAIN"

if [ -d "$CERT_PATH" ]; then
    echo -e "${GREEN}✓ Certificate directory exists: $CERT_PATH${NC}"

    if [ -f "$CERT_PATH/fullchain.pem" ]; then
        echo -e "${GREEN}✓ fullchain.pem exists${NC}"
    else
        echo -e "${RED}✗ fullchain.pem NOT found${NC}"
    fi

    if [ -f "$CERT_PATH/privkey.pem" ]; then
        echo -e "${GREEN}✓ privkey.pem exists${NC}"
    else
        echo -e "${RED}✗ privkey.pem NOT found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Certificate directory not found: $CERT_PATH${NC}"
    echo -e "${YELLOW}   Run './init-letsencrypt.sh' to obtain certificates${NC}"
fi

echo ""

# Test 2: Check Nginx configuration
echo -e "${BLUE}[2] Checking Nginx configuration...${NC}"

if docker compose ps | grep -q "web.*Up"; then
    echo -e "${GREEN}✓ Nginx container is running${NC}"

    # Test HTTP access
    if curl -s http://localhost > /dev/null 2>&1; then
        echo -e "${GREEN}✓ HTTP (port 80) is accessible${NC}"
    else
        echo -e "${RED}✗ HTTP (port 80) is NOT accessible${NC}"
    fi

    # Test ACME challenge location
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/.well-known/acme-challenge/test 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "404" ]; then
        echo -e "${GREEN}✓ ACME challenge location is accessible (404 is expected)${NC}"
    else
        echo -e "${RED}✗ ACME challenge location returned $HTTP_STATUS${NC}"
    fi

    # Check SSL certificate path in config
    CERT_PATH_IN_CONFIG=$(docker compose exec -T web grep -o "ssl_certificate /etc/letsencrypt/live/[^/]*/fullchain.pem" /etc/nginx/conf.d/default.conf 2>/dev/null || echo "NOT FOUND")
    echo -e "${BLUE}  Config uses: $CERT_PATH_IN_CONFIG${NC}"
else
    echo -e "${RED}✗ Nginx container is NOT running${NC}"
fi

echo ""

# Test 3: Check Certbot status
echo -e "${BLUE}[3] Checking Certbot status...${NC}"

if docker compose ps | grep -q "certbot.*Up"; then
    echo -e "${GREEN}✓ Certbot container is running${NC}"

    # List certificates
    CERTS=$(docker compose exec -T certbot certbot certificates 2>/dev/null | grep "Certificate Name" || echo "No certificates found")
    echo -e "${BLUE}  Certificates: $CERTS${NC}"
else
    echo -e "${RED}✗ Certbot container is NOT running${NC}"
fi

echo ""

# Test 4: Check HTTPS (if certificates exist)
echo -e "${BLUE}[4] Testing HTTPS access...${NC}"

if curl -s -k https://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTPS (port 443) is accessible${NC}"

    # Get certificate details
    CERT_INFO=$(echo | openssl s_client -servername localhost -connect localhost:443 2>/dev/null | openssl x509 -noout -text 2>/dev/null | grep -E "Subject:|Not After" || echo "Could not read certificate")
    echo -e "${BLUE}  Certificate info:${NC}"
    echo "$CERT_INFO" | while read line; do
        echo -e "${BLUE}    $line${NC}"
    done
else
    echo -e "${RED}✗ HTTPS (port 443) is NOT accessible${NC}"
fi

echo ""

# Test 5: Check logs
echo -e "${BLUE}[5] Checking recent logs...${NC}"

echo -e "${BLUE}  Recent Nginx errors (if any):${NC}"
docker compose logs web 2>/dev/null | grep -i "error" | tail -3 || echo -e "${GREEN}    No errors found${NC}"

echo -e "${BLUE}  Recent Certbot activity:${NC}"
docker compose logs certbot 2>/dev/null | grep -v "No renewals" | tail -3 || echo -e "${GREEN}    No activity${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Test complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Summary
if [ -d "$CERT_PATH" ] && [ -f "$CERT_PATH/fullchain.pem" ]; then
    echo -e "${GREEN}✓ SSL certificates appear to be properly configured${NC}"
    echo -e "${GREEN}✓ Access your application at: https://$DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️  No valid SSL certificates found${NC}"
    echo -e "${YELLOW}Run './init-letsencrypt.sh' to obtain certificates${NC}"
fi

echo ""
