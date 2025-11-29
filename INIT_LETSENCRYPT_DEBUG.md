# Let's Encrypt Certificate Setup - Debugging Guide

## Errors Found and Solutions

When running `./init-letsencrypt.sh` against the domain `abrbp.ddnsfree.com`, we encountered specific issues that have now been resolved.

### Error 1: 404 Not Found on ACME Challenge Path

**Symptom:**
```
Detail: 190.194.103.101: Invalid response from http://abrbp.ddnsfree.com/.well-known/acme-challenge/...: 404
```

**Root Cause:**
Nginx was not configured to serve files from the Let's Encrypt ACME challenge directory (`/.well-known/acme-challenge/`). The web server was returning 404 when Certbot tried to validate domain ownership.

**Solution Implemented:**

1. **Created Nginx configuration file** (`nginx/conf.d/default.conf`):
   ```nginx
   location /.well-known/acme-challenge/ {
       root /var/www/certbot;
       access_log off;
   }
   ```

2. **Updated Nginx Dockerfile** to copy the configuration:
   ```dockerfile
   COPY conf.d/default.conf /etc/nginx/conf.d/default.conf
   RUN mkdir -p /var/www/certbot && \
       chown nginx:nginx /var/www/certbot
   ```

3. **Updated docker-compose.yml** volume mount:
   ```yaml
   volumes:
     - ./nginx/conf.d:/etc/nginx/conf.d  # Changed from ./nginx/data/nginx
   ```

This allows Nginx to properly serve ACME challenge files from the `/var/www/certbot` directory that's shared with the Certbot container.

### Error 2: Let's Encrypt Rate Limiting

**Symptom:**
```
too many failed authorizations (5) for "abrbp.ddnsfree.com" in the last 1h0m0s
```

**Root Cause:**
When Nginx was not properly configured to serve ACME files, Certbot kept failing validation. After 5 failed attempts within 1 hour, Let's Encrypt temporarily blocked further certificate requests from this account.

**Solution:**
- Fixed Nginx configuration (Error 1)
- Wait 1 hour for rate limit to expire
- Optionally use the Let's Encrypt staging environment for testing:
  ```bash
  certbot certonly --staging ...
  ```

**How Rate Limiting Works:**
- Per hostname, per account: 50 failed authorizations per 3 hours
- Rate limit resets after 1 hour from the first attempt
- Using staging environment doesn't count against production limits

### How the Fix Works

```
1. User runs: ./init-letsencrypt.sh
   ↓
2. Script validates prerequisites (Docker containers, directories)
   ↓
3. Script runs Certbot with --webroot method:
   certbot certonly --webroot -w /var/www/certbot ...
   ↓
4. Certbot:
   - Creates temporary challenge files in /var/www/certbot/.well-known/acme-challenge/
   - Tells Let's Encrypt where to validate
   ↓
5. Let's Encrypt validates:
   - Makes HTTP request to http://abrbp.ddnsfree.com/.well-known/acme-challenge/TOKEN
   - Nginx receives request and serves file from /var/www/certbot
   - ✓ Validation successful!
   ↓
6. Certbot receives certificate from Let's Encrypt
   ↓
7. Nginx reloads with new certificate
```

## Testing the Configuration

### Test 1: Verify Nginx Serves ACME Location

```bash
# From host machine
curl -I http://localhost/.well-known/acme-challenge/test
# Should return 404 (file doesn't exist, but location is accessible)

# Or test with Nginx container
docker compose exec -T web curl http://localhost/.well-known/acme-challenge/test
```

### Test 2: Verify Volume Mounts

```bash
# Check Nginx can write to /var/www/certbot
docker compose exec -T web touch /var/www/certbot/test-file
docker compose exec -T web ls -la /var/www/certbot/

# Check Certbot can access the same directory
docker compose exec -T certbot ls -la /var/www/certbot/
```

### Test 3: Verify Nginx Configuration

```bash
# View the running configuration
docker compose exec -T web cat /etc/nginx/conf.d/default.conf | grep -A 3 "acme"

# Test Nginx syntax
docker compose exec -T web nginx -t
```

### Test 4: Check Certificates

```bash
# List certificates
docker compose exec -T certbot certbot certificates

# View certificate details
docker compose exec -T certbot certbot show abrbp.ddnsfree.com
```

## Troubleshooting Checklist

Before running the script again:

- [ ] **DNS Configuration**
  ```bash
  nslookup abrbp.ddnsfree.com
  # Should resolve to your server's IP (190.194.103.101)
  ```

- [ ] **Port 80 Accessible**
  ```bash
  curl -I http://abrbp.ddnsfree.com
  # Should get response (not timeout/refused)
  ```

- [ ] **Nginx Configuration Valid**
  ```bash
  docker compose exec -T web nginx -t
  # Should say "syntax is ok"
  ```

- [ ] **Certbot Directory Writable**
  ```bash
  docker compose exec -T web touch /var/www/certbot/test && \
  rm /var/www/certbot/test && \
  echo "✓ Directory is writable"
  ```

- [ ] **Nginx Has Correct Configuration**
  ```bash
  docker compose exec -T web cat /etc/nginx/conf.d/default.conf | \
  grep -A 3 "\.well-known"
  # Should show the acme-challenge location block
  ```

- [ ] **Rate Limit Has Expired**
  ```bash
  # If you got rate limited, wait 1+ hours before retrying
  # Or use staging: certbot certonly --staging ...
  ```

## Using Staging Environment for Testing

The Let's Encrypt staging environment is perfect for testing because:
- No rate limits
- Doesn't produce valid certificates (but validates setup)
- Great for debugging

```bash
docker compose run --rm --entrypoint "\
  certbot certonly --staging --webroot -w /var/www/certbot \
    --email your-email@example.com \
    --agree-tos \
    --non-interactive \
    -d abrbp.ddnsfree.com" \
  certbot
```

## Files Modified

### Created:
- `nginx/conf.d/default.conf` - Nginx configuration with ACME support
- `INIT_LETSENCRYPT_DEBUG.md` - This file

### Updated:
- `nginx/Dockerfile` - Copy configuration and create certbot directory
- `docker-compose.yml` - Changed volume mount path
- `init-letsencrypt.sh` - Improved error handling

## Next Steps

1. **Wait for rate limit to expire** (1+ hour from first failed attempt)
2. **Run the script again**:
   ```bash
   ./init-letsencrypt.sh
   ```
3. **Verify certificate was installed**:
   ```bash
   docker compose exec -T certbot certbot certificates
   ```
4. **Check Nginx is using new certificate**:
   ```bash
   curl -I https://abrbp.ddnsfree.com
   # Should return 200 with your certificate
   ```

## Additional Resources

- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Certbot Webroot Auth](https://certbot.eff.org/docs/using.html#webroot)
- [ACME Challenge Explanation](https://en.wikipedia.org/wiki/Automated_Certificate_Management_Environment)

## Contact Support

If issues persist after following this guide:
1. Check all logs:
   ```bash
   docker compose logs web -f
   docker compose logs certbot -f
   ```
2. Consult [Let's Encrypt Community](https://community.letsencrypt.org/)
3. Review Certbot documentation for advanced options
