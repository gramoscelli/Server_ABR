# SSL/TLS Certificates Setup Guide

Complete guide for setting up SSL certificates using Let's Encrypt with the init-letsencrypt.sh script.

## Current Status

Your system has:
- ✅ Self-signed certificates for `localhost` (development/testing)
- ✅ Nginx properly configured with ACME challenge support
- ✅ Certbot container ready for certificate management
- ⚠️ No Let's Encrypt certificates yet for production domains

## Prerequisites

### Domain Requirements
- A registered domain name (e.g., `abrbp.ddnsfree.com`)
- DNS A record pointing to your server's IP address
- Port 80 (HTTP) accessible from the internet
- Port 443 (HTTPS) accessible from the internet

### Verify Your Domain
```bash
# Check if domain resolves to your server IP
nslookup yourdomain.com

# Check if port 80 is accessible
curl -v http://yourdomain.com

# You should see a response, not a timeout
```

## Step 1: Configure Environment

Edit your `.env` file:
```bash
SERVER_DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=your-email@example.com
```

Or set as environment variables:
```bash
export SERVER_DOMAIN=yourdomain.com
export LETSENCRYPT_EMAIL=your-email@example.com
```

## Step 2: Ensure Services Are Running

```bash
docker compose up -d
```

Verify all services are running:
```bash
docker compose ps
```

You should see:
- ✓ backend (Running)
- ✓ mysql (Running)
- ✓ nginx/web (Running)
- ✓ certbot (Running)
- ✓ frontend (Running)

## Step 3: Run Certificate Initialization Script

```bash
./init-letsencrypt.sh
```

The script will:
1. Validate Docker containers are running
2. Create necessary directories
3. Download TLS parameters
4. Request certificate from Let's Encrypt
5. Update Nginx configuration
6. Reload Nginx with new certificate

### Expected Output

Success:
```
================================
Let's Encrypt SSL Initialization
================================

✓ Containers are running
✓ Directories created
✓ TLS parameters configured

Requesting certificate from Let's Encrypt...
Domain: yourdomain.com
Email: your-email@example.com

[Certbot output...]

✓ SSL initialization complete!

Certificate Details:
  Domain: yourdomain.com
  Location: ./nginx/data/certbot/conf/live/yourdomain.com/
  Auto-renewal: Every 12 hours
```

## Step 4: Verify Certificate Installation

Run the test script:
```bash
./test-ssl.sh
```

Check certificate details:
```bash
docker compose exec -T certbot certbot certificates
```

Test HTTPS access:
```bash
curl -I https://yourdomain.com
```

Should return HTTP/2 200.

## Troubleshooting

### Problem: Rate Limiting Error

**Error Message:**
```
too many failed authorizations (5) for "yourdomain.com" in the last 1h0m0s
```

**Cause:** Too many failed attempts to validate the certificate in 1 hour.

**Solution:**
- **Wait 1 hour** from the first attempt, then try again
- **Use staging environment** for testing (no rate limits, but invalid certificates):
  ```bash
  docker compose run --rm --entrypoint "\
    certbot certonly --staging --webroot -w /var/www/certbot \
      --email your-email@example.com \
      --agree-tos \
      --non-interactive \
      -d yourdomain.com" \
    certbot
  ```

### Problem: ACME Challenge Fails (404 Error)

**Error Message:**
```
Invalid response from http://yourdomain.com/.well-known/acme-challenge/...: 404
```

**Cause:** Nginx is not serving ACME challenge files properly.

**Solutions:**

1. **Verify Nginx is running:**
   ```bash
   docker compose ps | grep web
   ```

2. **Test ACME location:**
   ```bash
   curl -I http://yourdomain.com/.well-known/acme-challenge/test
   # Should return 404 (file doesn't exist, but location is accessible)
   ```

3. **Check Nginx configuration:**
   ```bash
   docker compose exec -T web grep -A 3 "acme-challenge" /etc/nginx/conf.d/default.conf
   ```
   Should show:
   ```
   location /.well-known/acme-challenge/ {
       root /var/www/certbot;
   }
   ```

4. **Verify volume mount:**
   ```bash
   docker compose exec -T web ls -la /var/www/certbot/
   # Should show directory (can be empty)
   ```

5. **Check Nginx logs:**
   ```bash
   docker compose logs web --tail 50 | grep error
   ```

### Problem: Domain Not Found

**Error Message:**
```
Could not resolve domain: yourdomain.com
```

**Solutions:**

1. **Verify DNS configuration:**
   ```bash
   nslookup yourdomain.com
   # Should show your server's IP address
   ```

2. **Wait for DNS propagation:**
   - DNS changes can take up to 48 hours
   - Use online tools like [whatsmydns.net](https://www.whatsmydns.net/)

3. **Verify domain points to correct IP:**
   - Check your DNS provider's control panel
   - Ensure A record points to your server's public IP
   - Test: `curl http://yourdomain.com` should work

### Problem: Port 80 Not Accessible

**Error Message:**
```
Connection refused
Temporary failure in name resolution
Timeout
```

**Solutions:**

1. **Check firewall:**
   ```bash
   # Allow ports 80 and 443
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 3000/tcp  # Backend API
   sudo ufw allow 3001/tcp  # Frontend
   ```

2. **Verify Nginx is listening:**
   ```bash
   docker compose exec -T web netstat -tlnp | grep 80
   ```

3. **Test from your machine:**
   ```bash
   # From your local machine
   curl -v http://yourdomain.com
   # Should connect and get response
   ```

### Problem: Nginx Fails to Reload

**Error Message:**
```
⚠️  Could not reload Nginx
```

**Solutions:**

1. **Check Nginx configuration syntax:**
   ```bash
   docker compose exec -T web nginx -t
   ```

2. **Check Nginx logs:**
   ```bash
   docker compose logs web --tail 50
   ```

3. **Manually restart Nginx:**
   ```bash
   docker compose restart web
   ```

## Certificate Renewal

Certificates are automatically renewed by Certbot every 12 hours.

**Monitor renewal:**
```bash
docker compose logs certbot -f
```

**Manual renewal (if needed):**
```bash
docker compose exec -T certbot certbot renew
```

**Force renewal:**
```bash
docker compose exec -T certbot certbot renew --force-renewal
```

## Certificate Details

View certificate information:
```bash
# List all certificates
docker compose exec -T certbot certbot certificates

# View certificate expiration
docker compose exec -T certbot certbot show yourdomain.com

# Check via OpenSSL
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -text | grep -E "Subject:|Not After"
```

## Verify Certificates with External Tools

To verify your SSL certificate from outside your network using online validators:

### Using SSL Labs (Free)
1. Visit [https://www.ssllabs.com/ssltest/](https://www.ssllabs.com/ssltest/)
2. Enter your domain: `yourdomain.com`
3. Click "Submit"
4. Wait for analysis (usually 2-3 minutes)
5. Review the grade and recommendations

### Using Just Encrypt (Free)
1. Visit [https://just-encrypt.it/](https://just-encrypt.it/)
2. Enter your domain
3. Get instant certificate information

### Using cURL from External Machine
```bash
# From a different machine or network
curl -I https://yourdomain.com

# Should return HTTP/2 200
# Should NOT show certificate warnings
```

### Using TestSSL.sh (Advanced)
```bash
# Download and run testssl.sh for detailed analysis
bash <(curl -sSL https://raw.githubusercontent.com/drwetter/testssl.sh/master/testssl.sh) yourdomain.com
```

### Troubleshooting Certificate Errors

If you see certificate warnings:
- **Self-signed certificate**: Expected for localhost development
- **Expired certificate**: Run `./init-letsencrypt.sh` to renew
- **Domain mismatch**: Ensure `SERVER_DOMAIN` env var matches your actual domain
- **Not found error**: Domain not accessible from internet, check DNS and firewall

### Certificate Chain Validation
```bash
# Verify the complete certificate chain
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | \
  openssl crl2pkcs7 -nocrl -certfile /dev/stdin | openssl pkcs7 -print_certs -text -noout
```

## Advanced: Using Production vs Staging

### Production (Real Certificates)
```bash
./init-letsencrypt.sh
```
- Valid certificates
- Subject to rate limits (50 failures per 3 hours)
- Ideal after you've tested everything

### Staging (Testing Only)
```bash
docker compose run --rm --entrypoint "\
  certbot certonly --staging --webroot -w /var/www/certbot \
    --email your-email@example.com \
    --agree-tos \
    --non-interactive \
    -d yourdomain.com" \
  certbot
```
- Invalid certificates (test purposes only)
- No rate limits
- Great for debugging setup issues

After testing with staging, use the production script.

## Backup Certificates

```bash
# Backup your certificates locally
tar -czf certificates-$(date +%Y%m%d).tar.gz ./nginx/data/certbot/

# Keep backups in a safe location
mv certificates-*.tar.gz ~/backups/
```

## Security Best Practices

1. **HTTPS Required:**
   ```bash
   # The init-letsencrypt.sh script enables HTTP→HTTPS redirect
   # All HTTP traffic automatically redirects to HTTPS
   ```

2. **HSTS Enabled:**
   ```
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   ```
   - Forces HTTPS for 2 years
   - Prevents downgrade attacks

3. **Modern TLS:**
   ```
   - TLSv1.2 and TLSv1.3 only
   - Strong ciphers
   - Secure defaults
   ```

## File Locations

```
Project Root/
├── init-letsencrypt.sh          # Initialization script
├── test-ssl.sh                  # Validation script
├── nginx/
│   ├── conf.d/
│   │   └── default.conf         # Nginx configuration
│   └── data/
│       └── certbot/
│           ├── conf/            # Certificate storage
│           │   └── live/
│           │       └── yourdomain.com/
│           │           ├── fullchain.pem
│           │           └── privkey.pem
│           └── www/             # ACME validation files (temporary)
└── docker-compose.yml            # Services configuration
```

## Common Commands

```bash
# Check if system is ready
./test-ssl.sh

# Get certificates
./init-letsencrypt.sh

# Check certificate status
docker compose exec -T certbot certbot certificates

# Manually renew (usually automatic)
docker compose exec -T certbot certbot renew

# View logs
docker compose logs -f certbot
docker compose logs -f web

# Test HTTPS
curl -I https://yourdomain.com

# Generate new self-signed cert (localhost)
rm -rf ./nginx/data/certbot/conf/live/localhost/
./init-letsencrypt.sh
```

## Getting Help

1. **Check logs first:**
   ```bash
   docker compose logs web
   docker compose logs certbot
   ```

2. **Run diagnostics:**
   ```bash
   ./test-ssl.sh
   ```

3. **Verify prerequisites:**
   - [ ] Domain registered
   - [ ] DNS A record configured
   - [ ] Port 80 accessible from internet
   - [ ] Port 443 accessible from internet
   - [ ] Nginx container running
   - [ ] Certbot container running

4. **Test Let's Encrypt:**
   - [ ] Run with staging first
   - [ ] Check Let's Encrypt status page
   - [ ] Review Certbot documentation

## Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Community Support](https://community.letsencrypt.org/)

## Next Steps

1. ✅ Verify all prerequisites are met
2. ✅ Ensure domain DNS is configured
3. ✅ Run `./test-ssl.sh` to check setup
4. ✅ Run `./init-letsencrypt.sh` to get certificates
5. ✅ Run `./test-ssl.sh` again to verify success
6. ✅ Access application at `https://yourdomain.com`

Good luck! 🎉
