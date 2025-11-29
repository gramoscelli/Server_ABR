# Certificate Verification Guide

Complete guide for verifying that your SSL/TLS certificates are working correctly using both local and external validation methods.

## Overview

This guide covers two verification approaches:

1. **Local Verification** (`test-ssl.sh`) - Validates certificates from your server
2. **External Verification** (`verify-cert-external.sh`) - Validates certificates from the internet

## Prerequisites

Ensure all services are running:

```bash
docker compose up -d
docker compose ps  # Should show all services running
```

## Local Verification Script

### Purpose

The `test-ssl.sh` script validates that SSL certificates are properly configured on your server locally.

### Usage

```bash
./test-ssl.sh
```

### What It Checks

1. **Certificate Files**: Verifies certificate files exist in the correct locations
2. **Nginx Configuration**: Confirms Nginx is running and HTTP is accessible
3. **ACME Challenge Location**: Tests that ACME files can be served
4. **Certbot Status**: Checks if Certbot is running and has certificates
5. **HTTPS Accessibility**: Tests that HTTPS port 443 is accessible
6. **Logs**: Reviews recent logs for any errors
7. **External Verification** (for production domains): Tests HTTPS with certificate validation

### Example Output

```
================================
SSL Certificate Configuration Test
================================

[1] Checking certificate files...
✓ Certificate directory exists: ./nginx/data/certbot/conf/live/localhost
✓ fullchain.pem exists
✓ privkey.pem exists

[2] Checking Nginx configuration...
✓ Nginx container is running
✓ HTTP (port 80) is accessible
✓ ACME challenge location is accessible (404 is expected)

[3] Checking Certbot status...
✓ Certbot container is running

[4] Testing HTTPS access...
✓ HTTPS (port 443) is accessible
✓ Certificate info:
    Subject=CN = localhost
    Not After = Dec 29 10:00:00 2025

[5] Checking recent logs...
  No errors found
  No activity

================================
✓ Test complete!
================================
```

## External Verification Script

### Purpose

The `verify-cert-external.sh` script validates that your SSL certificates are properly configured and accessible from the internet.

### Usage

**For production domains only:**

```bash
# Set domain and run
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh
```

Or as a one-liner:

```bash
SERVER_DOMAIN=yourdomain.com ./verify-cert-external.sh
```

### What It Checks

1. **Local Pre-Check**: Verifies domain is accessible via HTTPS
2. **DNS Resolution**: Confirms domain resolves correctly
3. **Certificate Details**: Retrieves and displays certificate information
4. **TLS Protocol Support**: Checks TLS 1.2 and TLS 1.3 support
5. **Security Headers**: Validates HSTS and other security headers
6. **HTTP to HTTPS Redirect**: Confirms HTTP redirects to HTTPS
7. **Certificate Chain**: Validates the full certificate chain
8. **Response Time**: Measures server response time
9. **Cipher Strength**: Displays the cipher being used

### Example Output

```
================================
External Certificate Verification
================================

Domain: abrbp.ddnsfree.com

[1] Local Pre-Check
✓ Domain is accessible via HTTPS

[2] DNS Resolution Check
✓ Domain resolves to: 192.168.1.100

[3] Certificate Details (OpenSSL)
Subject:
    Subject=CN = abrbp.ddnsfree.com
Issuer:
    Issuer=C = US, O = Let's Encrypt, CN = R3
Valid From:
    Not Before = Nov 29 10:00:00 2024 GMT
Valid To:
    Not After = Feb 27 10:00:00 2025 GMT

[4] TLS Protocol Support
✓ TLS 1.2 is supported
✓ TLS 1.3 is supported

[5] Security Headers
✓ HSTS (HTTP Strict Transport Security) enabled
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
✓ X-Frame-Options header present
✓ CSP (Content Security Policy) header present

[6] HTTP to HTTPS Redirect
✓ HTTP correctly redirects to HTTPS
  Redirect: HTTP/1.1 301 Moved Permanently

[7] External Verification Tools
...
```

## Complete Verification Workflow

### Step 1: Setup (One-time)

```bash
# Ensure services are running
docker compose up -d

# Configure domain for Let's Encrypt
export SERVER_DOMAIN=yourdomain.com
export LETSENCRYPT_EMAIL=your-email@example.com

# Initialize certificates
./init-letsencrypt.sh
```

### Step 2: Local Verification

```bash
# Run local verification
./test-ssl.sh

# Should see:
# ✓ Certificate files exist
# ✓ Nginx is running
# ✓ HTTP is accessible
# ✓ HTTPS is accessible
```

### Step 3: External Verification

```bash
# Set your domain
export SERVER_DOMAIN=yourdomain.com

# Run external verification
./verify-cert-external.sh

# Provides links to online verification tools
```

### Step 4: Online Tool Verification

The script provides direct links to external verification tools. Click on them to validate:

1. **SSL Labs** - Most comprehensive analysis
   - Provides SSL rating (A+, A, B, etc.)
   - Shows detailed vulnerability scan
   - Best practice recommendations

2. **Just Encrypt** - Quick verification
   - Fast certificate information
   - Expiration date
   - Chain validation

3. **TestSSL.sh** - Local deep analysis
   - Runs a detailed script on your machine
   - Cipher analysis
   - Protocol testing
   - Performance metrics

## Common Scenarios

### Scenario 1: Development (localhost)

```bash
# Skip external verification for localhost
./test-ssl.sh

# Expected output includes:
# ✓ Certificate directory exists
# ✓ HTTPS (port 443) is accessible
```

**Note**: Localhost certificates cannot be verified externally.

### Scenario 2: Production (Real Domain)

```bash
# Step 1: Initialize Let's Encrypt certificates
./init-letsencrypt.sh

# Step 2: Verify locally
./test-ssl.sh

# Step 3: Verify externally
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh

# Step 4: Visit SSL Labs for comprehensive analysis
# https://www.ssllabs.com/ssltest/?d=yourdomain.com
```

### Scenario 3: After Certificate Renewal

```bash
# Certbot automatically renews every 12 hours
# Verify renewal was successful:

docker compose logs certbot | tail -20

# Run verification to confirm
./test-ssl.sh
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh
```

## Troubleshooting Verification Failures

### Issue: "Domain is NOT accessible via HTTPS"

**Cause**: The domain is not accessible from your machine.

**Solutions**:

1. Check DNS resolution:
   ```bash
   nslookup yourdomain.com
   ```

2. Check firewall allows port 443:
   ```bash
   curl -v https://yourdomain.com
   ```

3. Check Nginx logs:
   ```bash
   docker compose logs web --tail 50
   ```

### Issue: "Could not retrieve certificate"

**Cause**: OpenSSL cannot connect to the server.

**Solutions**:

1. Verify HTTPS is accessible:
   ```bash
   curl -I https://yourdomain.com
   ```

2. Check if Nginx is running:
   ```bash
   docker compose ps | grep web
   ```

3. Check certificate files exist:
   ```bash
   ls -la ./nginx/data/certbot/conf/live/yourdomain.com/
   ```

### Issue: "HSTS header not found"

**Cause**: Nginx configuration doesn't include HSTS header.

**Solution**: Update `nginx/conf.d/default.conf` to include:

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

Then reload Nginx:

```bash
docker compose restart web
```

## External Tool Details

### SSL Labs (Recommended for Production)

**Purpose**: Comprehensive SSL security analysis

**How to use**:
1. Visit https://www.ssllabs.com/ssltest/
2. Enter your domain
3. Wait 2-3 minutes for analysis
4. Review the grade (A+ is best)

**What to look for**:
- Grade A or higher
- No security warnings
- Certificate chain validated
- Perfect Forward Secrecy enabled
- No weak protocols (TLS 1.0, 1.1)

### Just Encrypt

**Purpose**: Quick certificate verification

**How to use**:
1. Visit https://just-encrypt.it/
2. Enter your domain
3. Get instant results

**What to look for**:
- Certificate is valid
- Not expired
- Domain matches
- Issuer is Let's Encrypt (for production)

### TestSSL.sh

**Purpose**: Local detailed cryptographic analysis

**How to use**:
```bash
bash <(curl -sSL https://raw.githubusercontent.com/drwetter/testssl.sh/master/testssl.sh) yourdomain.com
```

**What to look for**:
- TLS 1.2 and 1.3 support
- Strong ciphers
- No vulnerable protocols
- Secure default configuration

### Mozilla Observatory

**Purpose**: General security best practices

**How to use**:
1. Visit https://observatory.mozilla.org/
2. Enter your domain
3. Get security score

**What to look for**:
- Score of 50+
- No critical issues
- Recommended headers present
- Security policies configured

## Monitoring Certificate Renewal

Certificates are automatically renewed by Certbot every 12 hours.

**Monitor renewal**:

```bash
# Watch logs in real-time
docker compose logs certbot -f

# Check renewal history
docker compose logs certbot | grep "renewal"

# Check certificate expiration dates
docker compose exec -T certbot certbot certificates
```

**Expected renewal output**:

```
certbot | Processing /etc/letsencrypt/renewal/yourdomain.com.conf
certbot | Renewing an existing certificate for yourdomain.com
certbot | Cert is due for renewal, auto-renewing.
certbot | Successfully received certificate
```

## Manual Certificate Renewal

If automatic renewal fails (rarely happens):

```bash
# Force renewal
docker compose exec -T certbot certbot renew --force-renewal

# Then verify
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh
```

## Security Checklist

After running external verification, ensure:

- [ ] Certificate is from Let's Encrypt (or valid CA)
- [ ] Certificate is not expired
- [ ] Domain name matches certificate
- [ ] HTTPS certificate chain is valid
- [ ] TLS 1.2 or 1.3 is in use
- [ ] Strong ciphers are configured
- [ ] HSTS header is present
- [ ] HTTP redirects to HTTPS
- [ ] No security warnings from external tools
- [ ] SSL Labs grade is A or higher

## Quick Reference Commands

```bash
# Run all local checks
./test-ssl.sh

# Verify certificates externally
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh

# View certificate details
docker compose exec -T certbot certbot certificates

# Check Certbot logs
docker compose logs certbot -f

# View Nginx SSL configuration
docker compose exec -T web grep -A 5 "ssl_certificate" /etc/nginx/conf.d/default.conf

# Test HTTPS manually
curl -I https://yourdomain.com

# Get certificate chain
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -text
```

## Performance Tips

- **Local verification** takes ~2-5 seconds
- **External verification** takes ~5-10 seconds
- **SSL Labs** takes 2-3 minutes (runs on their servers)
- **TestSSL.sh** takes 2-5 minutes (comprehensive analysis)

Run these in order for fastest feedback:

```bash
# Quick local check (2 seconds)
./test-ssl.sh

# Moderately detailed check (10 seconds)
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh

# Comprehensive check (2-5 minutes)
bash <(curl -sSL https://raw.githubusercontent.com/drwetter/testssl.sh/master/testssl.sh) yourdomain.com
```

## FAQ

**Q: Do I need to run these scripts regularly?**

A: For development, run `./test-ssl.sh` once to verify setup. For production, run `./verify-cert-external.sh` monthly to catch any issues. Certbot handles renewal automatically.

**Q: What if I'm behind a firewall?**

A: `test-ssl.sh` will work behind a firewall. `verify-cert-external.sh` requires internet connectivity to reach your domain. If your domain isn't accessible from the internet, some tests will fail.

**Q: How long are certificates valid?**

A: Let's Encrypt certificates are valid for 90 days. Certbot automatically renews them every 12 hours starting 30 days before expiration.

**Q: Can I use self-signed certificates in production?**

A: Not recommended. Self-signed certificates will fail SSL Labs and online verification. Use Let's Encrypt certificates instead (they're free and automatic).

**Q: What if external tools show warnings?**

A: Review the warnings carefully:
- If it's about certificate age: Wait, it will resolve on renewal
- If it's about weak ciphers: Update Nginx configuration
- If it's about missing headers: Add headers to nginx/conf.d/default.conf

## Support

If verification fails:

1. Check the relevant guide:
   - `SSL_SETUP.md` - Basic setup
   - `INIT_LETSENCRYPT_DEBUG.md` - Debugging certificate initialization
   - `CERTIFICATES_SETUP_GUIDE.md` - Comprehensive troubleshooting

2. Run diagnostics:
   ```bash
   docker compose logs web --tail 50
   docker compose logs certbot --tail 50
   ./test-ssl.sh
   ```

3. Review logs and error messages for specific issues

## Next Steps

After verifying your certificates:

1. Access your application at `https://yourdomain.com`
2. Configure DNS records if needed
3. Update OAuth callback URLs to use HTTPS
4. Monitor certificate renewal: `docker compose logs certbot -f`
5. Periodically verify with external tools (monthly recommended)

---

Happy certificate verification! 🔒
