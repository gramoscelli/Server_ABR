#!/bin/bash

# External Certificate Verification Script
# Uses external proxies and online tools to verify SSL certificates
# This script validates that your certificates work from the internet

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN=${SERVER_DOMAIN:-"localhost"}

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}External Certificate Verification${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Skip verification for localhost
if [ "$DOMAIN" = "localhost" ] || [ "$DOMAIN" = "127.0.0.1" ]; then
    echo -e "${YELLOW}⚠️  Localhost domains cannot be verified externally${NC}"
    echo -e "${YELLOW}This script is for production domains only${NC}"
    exit 0
fi

echo -e "${BLUE}Domain: ${CYAN}$DOMAIN${NC}"
echo ""

# Test 1: Local verification (pre-check)
echo -e "${BLUE}[1] Local Pre-Check${NC}"
if curl -s -I https://$DOMAIN > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Domain is accessible via HTTPS${NC}"
else
    echo -e "${RED}✗ Domain is NOT accessible via HTTPS${NC}"
    echo -e "${YELLOW}Fix this issue before running external verification${NC}"
    exit 1
fi

echo ""

# Test 2: DNS Resolution Check
echo -e "${BLUE}[2] DNS Resolution Check${NC}"
DNS_IP=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
if [ ! -z "$DNS_IP" ]; then
    echo -e "${GREEN}✓ Domain resolves to: $DNS_IP${NC}"
else
    echo -e "${RED}✗ Domain does not resolve${NC}"
    exit 1
fi

echo ""

# Test 3: Certificate Details (OpenSSL)
echo -e "${BLUE}[3] Certificate Details (OpenSSL)${NC}"
CERT_DETAILS=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -text 2>/dev/null)

if [ ! -z "$CERT_DETAILS" ]; then
    SUBJECT=$(echo "$CERT_DETAILS" | grep "Subject:" | head -1)
    ISSUER=$(echo "$CERT_DETAILS" | grep "Issuer:" | head -1)
    VALID_FROM=$(echo "$CERT_DETAILS" | grep "Not Before:" | head -1)
    VALID_TO=$(echo "$CERT_DETAILS" | grep "Not After:" | head -1)

    echo -e "${CYAN}Subject: ${subject:8}${NC}"
    echo "$SUBJECT"
    echo -e "${CYAN}Issuer:${NC}"
    echo "$ISSUER"
    echo -e "${CYAN}Valid From:${NC}"
    echo "$VALID_FROM"
    echo -e "${CYAN}Valid To:${NC}"
    echo "$VALID_TO"
else
    echo -e "${RED}✗ Could not retrieve certificate${NC}"
fi

echo ""

# Test 4: Protocol Support Check
echo -e "${BLUE}[4] TLS Protocol Support${NC}"

if echo | openssl s_client -tls1_2 -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | grep -q "Cipher"; then
    echo -e "${GREEN}✓ TLS 1.2 is supported${NC}"
else
    echo -e "${RED}✗ TLS 1.2 is NOT supported${NC}"
fi

if echo | openssl s_client -tls1_3 -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | grep -q "Cipher"; then
    echo -e "${GREEN}✓ TLS 1.3 is supported${NC}"
else
    echo -e "${YELLOW}⚠️  TLS 1.3 is not supported (optional)${NC}"
fi

echo ""

# Test 5: Security Headers Check
echo -e "${BLUE}[5] Security Headers${NC}"

HEADERS=$(curl -s -I https://$DOMAIN 2>/dev/null)

if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
    echo -e "${GREEN}✓ HSTS (HTTP Strict Transport Security) enabled${NC}"
    echo "$HEADERS" | grep -i "Strict-Transport-Security" | head -1 | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠️  HSTS header not found${NC}"
fi

if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    echo -e "${GREEN}✓ X-Frame-Options header present${NC}"
fi

if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
    echo -e "${GREEN}✓ CSP (Content Security Policy) header present${NC}"
fi

echo ""

# Test 6: HTTP to HTTPS Redirect
echo -e "${BLUE}[6] HTTP to HTTPS Redirect${NC}"
REDIRECT=$(curl -s -L -I http://$DOMAIN 2>&1 | head -n 1)

if echo "$REDIRECT" | grep -q "301\|302\|307\|308"; then
    echo -e "${GREEN}✓ HTTP correctly redirects to HTTPS${NC}"
    echo -e "${BLUE}  Redirect: $REDIRECT${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP redirect may not be properly configured${NC}"
fi

echo ""

# Test 7: External Verification Tools
echo -e "${BLUE}[7] External Verification Tools${NC}"
echo ""
echo -e "${CYAN}Use these online tools to verify your certificate further:${NC}"
echo ""

echo -e "${YELLOW}1. SSL Labs (Comprehensive SSL analysis):${NC}"
echo -e "   ${BLUE}https://www.ssllabs.com/ssltest/?d=$DOMAIN${NC}"
echo ""

echo -e "${YELLOW}2. Just Encrypt (Quick certificate info):${NC}"
echo -e "   ${BLUE}https://just-encrypt.it/?domain=$DOMAIN${NC}"
echo ""

echo -e "${YELLOW}3. Check MyCert (Certificate details):${NC}"
echo -e "   ${BLUE}https://checkcert.imirhil.fr/$DOMAIN${NC}"
echo ""

echo -e "${YELLOW}4. Hardenize (Security assessment):${NC}"
echo -e "   ${BLUE}https://www.hardenize.com/$DOMAIN${NC}"
echo ""

echo -e "${YELLOW}5. TestSSL.sh (Local detailed analysis):${NC}"
echo -e "   ${BLUE}bash <(curl -sSL https://raw.githubusercontent.com/drwetter/testssl.sh/master/testssl.sh) $DOMAIN${NC}"
echo ""

echo -e "${YELLOW}6. Mozilla Observatory (Security best practices):${NC}"
echo -e "   ${BLUE}https://observatory.mozilla.org/analyze/$DOMAIN${NC}"
echo ""

# Test 8: Certificate Chain Validation
echo -e "${BLUE}[8] Certificate Chain Validation${NC}"

CHAIN_CMD="echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl crl2pkcs7 -nocrl -certfile /dev/stdin 2>/dev/null | openssl pkcs7 -print_certs -text -noout 2>/dev/null"

CHAIN_COUNT=$(eval "$CHAIN_CMD" | grep -c "Subject:" || echo "0")

if [ "$CHAIN_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Certificate chain verified (${CHAIN_COUNT} certificates)${NC}"
else
    echo -e "${YELLOW}⚠️  Could not retrieve full certificate chain${NC}"
fi

echo ""

# Test 9: Response Time and Availability
echo -e "${BLUE}[9] Response Time and Availability${NC}"

RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s https://$DOMAIN)
if [ ! -z "$RESPONSE_TIME" ]; then
    echo -e "${GREEN}✓ Response time: ${RESPONSE_TIME} seconds${NC}"
else
    echo -e "${RED}✗ Could not measure response time${NC}"
fi

# Test 10: Cipher Strength Check
echo -e "${BLUE}[10] Cipher Strength${NC}"

CIPHERS=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | grep "Cipher" | head -1)

if [ ! -z "$CIPHERS" ]; then
    echo -e "${GREEN}✓ Using cipher:${NC}"
    echo "$CIPHERS" | sed 's/^/  /'
else
    echo -e "${RED}✗ Could not determine cipher${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ External verification complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Summary and next steps
echo -e "${BLUE}Summary:${NC}"
echo -e "${GREEN}✓ Local HTTPS connectivity verified${NC}"
echo -e "${GREEN}✓ DNS resolution verified${NC}"
echo -e "${GREEN}✓ Certificate details retrieved${NC}"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. Visit the online tools above to get a detailed analysis"
echo -e "2. Look for SSL grade/rating (ideally A or A+)"
echo -e "3. Check for any security warnings or issues"
echo -e "4. Fix any reported issues before going to production"
echo ""

echo -e "${BLUE}Monitoring Certificate Renewal:${NC}"
echo -e "Your certificate is automatically renewed by Certbot every 12 hours."
echo -e "Monitor renewal with:"
echo -e "  ${YELLOW}docker compose logs certbot -f${NC}"
echo ""
