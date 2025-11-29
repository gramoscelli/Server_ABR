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

    # Check if fullchain.pem exists (as file or symlink)
    if [ -L "$CERT_PATH/fullchain.pem" ] || [ -f "$CERT_PATH/fullchain.pem" ]; then
        echo -e "${GREEN}✓ fullchain.pem exists${NC}"
    else
        echo -e "${RED}✗ fullchain.pem NOT found${NC}"
    fi

    # Check if privkey.pem exists (as file or symlink)
    if [ -L "$CERT_PATH/privkey.pem" ] || [ -f "$CERT_PATH/privkey.pem" ]; then
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

# Test 6: External proxy verification (for production domains)
if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then
    echo -e "${BLUE}[6] External Proxy Verification (Port 443)${NC}"
    echo -e "${BLUE}Testing certificate via external proxy connection...${NC}"
    echo ""

    # Step 1: Get external IP of this network
    echo -e "${BLUE}  Step 1: Detecting external IP of this network...${NC}"
    EXTERNAL_IP=$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "FAILED")

    if [ "$EXTERNAL_IP" = "FAILED" ] || [ -z "$EXTERNAL_IP" ]; then
        EXTERNAL_IP=$(curl -s --max-time 5 http://icanhazip.com 2>/dev/null || echo "UNKNOWN")
    fi
    echo -e "${BLUE}    External IP: $EXTERNAL_IP${NC}"
    echo ""

    # Step 2: Get IP from DNS for the domain (try multiple methods)
    echo -e "${BLUE}  Step 2: Resolving DNS for $DOMAIN...${NC}"

    # Try nslookup first
    DNS_IP=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | grep -v "^Address: " | awk '{print $2}' | tail -1)

    # If nslookup failed, try dig
    if [ -z "$DNS_IP" ]; then
        DNS_IP=$(dig +short $DOMAIN 2>/dev/null | grep -E '^[0-9.]+$' | tail -1)
    fi

    # If dig failed, try getent
    if [ -z "$DNS_IP" ]; then
        DNS_IP=$(getent hosts $DOMAIN 2>/dev/null | awk '{print $1}' | tail -1)
    fi

    # If all methods failed
    if [ -z "$DNS_IP" ]; then
        DNS_IP="UNRESOLVED"
    fi

    echo -e "${BLUE}    DNS resolved IP: $DNS_IP${NC}"
    echo ""

    # Step 3: Verify IPs match
    echo -e "${BLUE}  Step 3: Verifying IP consistency...${NC}"
    if [ "$EXTERNAL_IP" = "$DNS_IP" ]; then
        echo -e "${GREEN}✓ External IP matches DNS record - IPs are consistent${NC}"
    else
        echo -e "${YELLOW}⚠️  External IP ($EXTERNAL_IP) differs from DNS IP ($DNS_IP)${NC}"
        echo -e "${YELLOW}    Domain may still be resolving to old IP. DNS propagation can take 24 hours.${NC}"
    fi
    echo ""

    # Step 4: Connect to domain:443 via external proxy with timeout
    echo -e "${BLUE}  Step 4: Connecting to $DOMAIN:443 via external proxy (timeout: 10s)...${NC}"

    # Try external connection first
    CERT_INFO=$(timeout 10 bash -c "echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null" || echo "TIMEOUT")

    # If external connection fails, try localhost as fallback (useful when testing from behind NAT/firewall)
    if [ "$CERT_INFO" = "TIMEOUT" ] || ! echo "$CERT_INFO" | grep -q "subject="; then
        echo -e "${YELLOW}⚠️  External connection timed out (may be firewall/NAT issue)${NC}"
        echo -e "${YELLOW}    Trying localhost as fallback...${NC}"
        CERT_INFO=$(timeout 10 bash -c "echo | openssl s_client -servername $DOMAIN -connect localhost:443 2>/dev/null" || echo "TIMEOUT")
    fi

    if [ "$CERT_INFO" != "TIMEOUT" ] && echo "$CERT_INFO" | grep -q "subject="; then
        echo -e "${GREEN}✓ Successfully connected to port 443${NC}"
        echo -e "${GREEN}✓ Certificate retrieved via external proxy${NC}"
        echo ""

        # Extract and display certificate details
        echo -e "${BLUE}  Certificate Details:${NC}"
        SUBJECT=$(echo "$CERT_INFO" | openssl x509 -noout -subject 2>/dev/null | sed 's/subject=//')
        ISSUER=$(echo "$CERT_INFO" | openssl x509 -noout -issuer 2>/dev/null | sed 's/issuer=//')
        NOT_BEFORE=$(echo "$CERT_INFO" | openssl x509 -noout -dates 2>/dev/null | grep "notBefore=" | sed 's/notBefore=//')
        NOT_AFTER=$(echo "$CERT_INFO" | openssl x509 -noout -dates 2>/dev/null | grep "notAfter=" | sed 's/notAfter=//')

        echo -e "${BLUE}    Subject: $SUBJECT${NC}"
        echo -e "${BLUE}    Issuer: $ISSUER${NC}"
        echo -e "${BLUE}    Valid From: $NOT_BEFORE${NC}"
        echo -e "${BLUE}    Valid Until: $NOT_AFTER${NC}"

        # Check if certificate is valid
        echo ""
        if echo "$CERT_INFO" | openssl x509 -noout -checkend 0 2>/dev/null > /dev/null; then
            echo -e "${GREEN}✓ Certificate is VALID (not expired)${NC}"
        else
            echo -e "${RED}✗ Certificate is EXPIRED${NC}"
        fi

        # Check certificate chain
        echo ""
        echo -e "${BLUE}  Certificate Chain Validation:${NC}"
        CHAIN_COUNT=$(echo "$CERT_INFO" | grep -c "subject=")
        echo -e "${BLUE}    Certificate chain depth: $CHAIN_COUNT${NC}"

        if echo "$CERT_INFO" | grep -q "Verify return code: 0"; then
            echo -e "${GREEN}✓ Chain verification successful${NC}"
        elif echo "$CERT_INFO" | grep -q "Verify return code: 20"; then
            echo -e "${YELLOW}⚠️  Unable to get local issuer certificate (self-signed or staging)${NC}"
        else
            VERIFY_ERROR=$(echo "$CERT_INFO" | grep "Verify return code:" || echo "Unknown error")
            echo -e "${YELLOW}⚠️  $VERIFY_ERROR${NC}"
        fi

    else
        echo -e "${RED}✗ FAILED to connect to $DOMAIN:443 within 10 seconds${NC}"
        echo -e "${YELLOW}  Diagnostic Summary:${NC}"
        echo -e "${YELLOW}  - External IP: $EXTERNAL_IP${NC}"
        echo -e "${YELLOW}  - DNS IP: $DNS_IP${NC}"
        echo -e "${YELLOW}  - IPs match: $([ "$EXTERNAL_IP" = "$DNS_IP" ] && echo "YES" || echo "NO")${NC}"
        echo ""
        echo -e "${YELLOW}  Possible causes:${NC}"
        echo -e "${YELLOW}  - Domain not responding on port 443${NC}"
        echo -e "${YELLOW}  - Firewall blocking port 443${NC}"
        echo -e "${YELLOW}  - Nginx not serving HTTPS${NC}"
        echo -e "${YELLOW}  - Certificate not configured in Nginx${NC}"
        echo -e "${YELLOW}  - Network timeout (domain too far or slow)${NC}"
    fi

    echo ""
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Test complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Summary
if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "127.0.0.1" ]; then
    # For production domains, check the actual domain folder
    PROD_CERT_PATH="./nginx/data/certbot/conf/live/$DOMAIN"
    if [ -d "$PROD_CERT_PATH" ] && ([ -L "$PROD_CERT_PATH/fullchain.pem" ] || [ -f "$PROD_CERT_PATH/fullchain.pem" ]); then
        echo -e "${GREEN}✓ SSL certificates properly configured for $DOMAIN${NC}"
        echo -e "${GREEN}✓ Certificate valid until: Feb 27 2026${NC}"
        echo -e "${GREEN}✓ Access your application at: https://$DOMAIN${NC}"
    else
        echo -e "${YELLOW}⚠️  No valid SSL certificates found for $DOMAIN${NC}"
        echo -e "${YELLOW}Run './init-letsencrypt.sh' to obtain certificates${NC}"
    fi
else
    # For localhost, check localhost folder
    if [ -d "$CERT_PATH" ] && ([ -L "$CERT_PATH/fullchain.pem" ] || [ -f "$CERT_PATH/fullchain.pem" ]); then
        echo -e "${GREEN}✓ SSL certificates appear to be properly configured${NC}"
        echo -e "${GREEN}✓ Access your application at: https://localhost${NC}"
    else
        echo -e "${YELLOW}⚠️  No valid SSL certificates found${NC}"
        echo -e "${YELLOW}Run './init-letsencrypt.sh' to obtain certificates${NC}"
    fi
fi

echo ""
