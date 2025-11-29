# Quick Start - Certificate Verification

Fast reference guide for verifying your SSL certificates using the new external proxy verification system.

## 🎯 TL;DR - Just Run These Commands

### For Development (localhost)

```bash
./test-ssl.sh
```

### For Production (Real Domain)

```bash
# Step 1: Local verification
./test-ssl.sh

# Step 2: External verification (proxy-based)
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh

# Step 3: Visit SSL Labs (link will be provided)
# https://www.ssllabs.com/ssltest/?d=yourdomain.com
```

---

## 📋 Command Reference

### Local Verification

```bash
# Quick local check (2-5 seconds)
./test-ssl.sh
```

**What it checks**:
- Certificate files exist
- Nginx is running
- HTTP is accessible
- ACME path is working
- HTTPS is accessible
- Recent logs for errors

**For production domains, also shows**:
- Direct links to external tools
- How to verify externally

---

### External Verification (Proxy-Based)

```bash
# Set your domain
export SERVER_DOMAIN=yourdomain.com

# Run external verification (5-10 seconds)
./verify-cert-external.sh
```

**What it checks**:
1. Domain is accessible via HTTPS
2. DNS resolves correctly
3. Certificate details (subject, issuer, validity)
4. TLS 1.2 support
5. TLS 1.3 support
6. Security headers (HSTS, CSP, X-Frame-Options)
7. HTTP→HTTPS redirect
8. Certificate chain validity
9. Response time
10. Cipher strength

**Provides links to**:
- SSL Labs (comprehensive)
- Just Encrypt (quick)
- Check MyCert (detailed)
- Hardenize (security scan)
- TestSSL.sh (local deep analysis)
- Mozilla Observatory (best practices)

---

## 🔍 Using External Tools

### SSL Labs (Most Comprehensive)

**Direct link from script output or manual**:
```
https://www.ssllabs.com/ssltest/?d=yourdomain.com
```

**What to expect**:
- Takes 2-3 minutes
- Tests from multiple global locations
- Shows SSL grade (A+, A, B, etc.)
- Scans for vulnerabilities
- Detailed recommendations

**Success indicator**: Grade A or higher

---

### Just Encrypt (Quick Check)

**Direct link from script output or manual**:
```
https://just-encrypt.it/?domain=yourdomain.com
```

**What to expect**:
- Instant results
- Shows certificate details
- Validates chain
- Shows expiration date

**Success indicator**: Certificate is valid

---

### TestSSL.sh (Local Deep Analysis)

**Run locally from your machine**:
```bash
bash <(curl -sSL https://raw.githubusercontent.com/drwetter/testssl.sh/master/testssl.sh) yourdomain.com
```

**What to expect**:
- Takes 2-5 minutes
- Comprehensive cipher analysis
- Protocol testing
- Vulnerability detection
- Performance metrics

**Success indicator**: No critical vulnerabilities

---

## 📊 Complete Verification Workflow

### Step 1: Initialize Certificates (If Not Done)

```bash
# Set your domain
export SERVER_DOMAIN=yourdomain.com
export LETSENCRYPT_EMAIL=your-email@example.com

# Initialize
./init-letsencrypt.sh
```

---

### Step 2: Run Local Verification

```bash
# Quick local check
./test-ssl.sh

# Expected output:
# ✓ Certificate files exist
# ✓ Nginx container is running
# ✓ HTTP is accessible
# ✓ ACME challenge location accessible
# ✓ Certbot container is running
# ✓ HTTPS is accessible
# ✓ External verification tools listed
```

---

### Step 3: Run External Verification

```bash
# Set domain
export SERVER_DOMAIN=yourdomain.com

# Run external checks (proxy-based)
./verify-cert-external.sh

# Expected output:
# [1] Local Pre-Check ✓
# [2] DNS Resolution Check ✓
# [3] Certificate Details
# [4] TLS Protocol Support ✓
# [5] Security Headers ✓
# [6] HTTP to HTTPS Redirect ✓
# [7] External Verification Tools
# [8] Certificate Chain Validation ✓
# [9] Response Time
# [10] Cipher Strength
```

---

### Step 4: Use Online Tools

Click the links provided in the script output to visit:

1. **SSL Labs** - Comprehensive analysis
   - Takes 2-3 minutes
   - Most detailed report
   - Global testing

2. **Just Encrypt** - Quick check
   - Takes 30 seconds
   - Basic certificate info
   - Fast results

3. **TestSSL.sh** - Local analysis
   - Takes 2-5 minutes
   - Run from command line
   - Most technical details

---

## 🎯 Understanding Results

### All Checks Pass ✓

```
✓ Domain is accessible via HTTPS
✓ DNS resolves correctly
✓ Certificate is valid
✓ TLS 1.2 is supported
✓ TLS 1.3 is supported
✓ HSTS header present
✓ Redirect working
✓ Chain valid
```

**Result**: Certificate is working correctly! You can:
- Access your application at `https://yourdomain.com`
- Trust that SSL is properly configured
- Monitor renewal automatically

---

### Certificate Issues

**Issue**: "Could not retrieve certificate"

```bash
# Verify HTTPS is accessible
curl -I https://yourdomain.com

# Check Nginx logs
docker compose logs web --tail 20

# Verify certificate files exist
ls -la ./nginx/data/certbot/conf/live/yourdomain.com/
```

---

**Issue**: "Domain is NOT accessible via HTTPS"

```bash
# Verify domain resolves
nslookup yourdomain.com

# Check firewall
curl -v https://yourdomain.com

# Check Nginx is running
docker compose ps | grep web
```

---

**Issue**: External tools show warnings

**Common causes**:
1. Certificate recently renewed (wait a few hours)
2. DNS not updated (wait 24 hours for propagation)
3. Nginx config has old certificate path (run `./init-letsencrypt.sh`)

**Solution**:
```bash
# Fix path in Nginx config
./init-letsencrypt.sh

# Restart Nginx
docker compose restart web

# Re-run verification
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh
```

---

## 📅 Maintenance Commands

### Monitor Certificate Renewal

```bash
# Watch renewal logs in real-time
docker compose logs certbot -f

# Expected output every 12 hours:
# Processing /etc/letsencrypt/renewal/yourdomain.com.conf
# Cert not yet due for renewal
```

---

### Check Certificate Expiration

```bash
# List all certificates
docker compose exec -T certbot certbot certificates

# Manual renewal (if needed)
docker compose exec -T certbot certbot renew

# Force renewal
docker compose exec -T certbot certbot renew --force-renewal
```

---

### Verify Daily

```bash
# Simple daily check
./test-ssl.sh

# Detailed weekly check
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh
```

---

## 🔐 Security Checklist

After verification, confirm:

- [ ] Certificate is from Let's Encrypt
- [ ] Certificate is not expired
- [ ] Domain name matches certificate
- [ ] TLS 1.2 or higher is used
- [ ] Strong ciphers are in use
- [ ] HSTS header is present
- [ ] HTTP redirects to HTTPS
- [ ] Certificate chain is complete
- [ ] External tools show no warnings
- [ ] SSL Labs grade is A or higher

---

## ⚡ Performance Timeline

| Task | Time |
|------|------|
| Local verification | 2-5 seconds |
| External verification | 5-10 seconds |
| SSL Labs analysis | 2-3 minutes |
| TestSSL.sh analysis | 2-5 minutes |
| Total workflow | ~5-10 minutes |

---

## 📞 Quick Help

### Test HTTPS manually

```bash
# Simple test
curl -I https://yourdomain.com

# Detailed test
curl -v https://yourdomain.com

# With certificate info
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443
```

---

### View certificate details

```bash
# Certbot list
docker compose exec -T certbot certbot certificates

# OpenSSL details
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -text
```

---

### Check Nginx configuration

```bash
# View SSL settings
docker compose exec -T web grep -A 10 "ssl_certificate" /etc/nginx/conf.d/default.conf

# Test Nginx config
docker compose exec -T web nginx -t
```

---

### View logs

```bash
# Nginx logs
docker compose logs web --tail 20

# Certbot logs
docker compose logs certbot --tail 20

# All logs
docker compose logs --tail 50
```

---

## 📚 For More Information

Read the complete guides:

- **CERTIFICATE_VERIFICATION_GUIDE.md** - Comprehensive guide
- **VERIFICATION_TOOLS_SUMMARY.md** - Tools overview
- **EXTERNAL_VERIFICATION_COMPLETE.md** - Implementation details

---

## ✨ Summary

```bash
# Development
./test-ssl.sh

# Production
export SERVER_DOMAIN=yourdomain.com
./verify-cert-external.sh
# Then visit SSL Labs link

# Monitor
docker compose logs certbot -f
```

That's it! Your certificates are verified! 🎉
