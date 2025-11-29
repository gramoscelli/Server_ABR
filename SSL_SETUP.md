# SSL/TLS Certificate Setup Guide

This guide explains how to set up SSL/TLS certificates for your Biblio-Server application using Let's Encrypt and Certbot.

## Overview

The `init-letsencrypt.sh` script automates the process of obtaining and configuring SSL certificates from Let's Encrypt. The system is configured to automatically renew certificates every 12 hours via Certbot.

## Prerequisites

- Docker and Docker Compose running
- A public domain name (for Let's Encrypt)
- Port 80 (HTTP) accessible from the internet
- Port 443 (HTTPS) accessible from the internet

## Quick Start

### For Development (localhost/127.0.0.1)

```bash
./init-letsencrypt.sh
```

The script will automatically generate self-signed certificates for development. No Let's Encrypt domain is required.

### For Production

```bash
# Set your configuration
export SERVER_DOMAIN=yourdomain.com
export LETSENCRYPT_EMAIL=your-email@example.com

# Run the initialization script
./init-letsencrypt.sh
```

Or edit your `.env` file:
```env
SERVER_DOMAIN=yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
```

Then run:
```bash
./init-letsencrypt.sh
```

## Step-by-Step Instructions

### 1. Start Docker Services

Ensure all services are running:
```bash
docker compose up -d
```

### 2. Run the Initialization Script

```bash
./init-letsencrypt.sh
```

The script will:
- ✅ Check if Docker containers are running
- ✅ Create necessary directories
- ✅ Download recommended TLS parameters
- ✅ Generate Diffie-Hellman parameters (2048-bit)
- ✅ Request a certificate from Let's Encrypt
- ✅ Reload Nginx with the new certificate

### 3. Verify Certificate

Check if the certificate was successfully created:
```bash
ls -la ./nginx/data/certbot/conf/live/yourdomain.com/
```

You should see:
- `privkey.pem` - Private key
- `fullchain.pem` - Certificate chain
- `cert.pem` - Server certificate

### 4. Test HTTPS

```bash
curl -I https://yourdomain.com
```

You should see:
```
HTTP/2 200
```

## File Structure

```
nginx/data/certbot/
├── conf/
│   ├── live/
│   │   └── yourdomain.com/
│   │       ├── privkey.pem         # Private key
│   │       ├── fullchain.pem       # Full certificate chain
│   │       ├── cert.pem            # Server certificate
│   │       └── chain.pem           # Intermediate certificates
│   ├── options-ssl-nginx.conf      # Nginx SSL configuration
│   └── ssl-dhparams.pem            # Diffie-Hellman parameters
└── www/
    └── .well-known/acme-challenge/ # ACME validation files
```

## Certificate Renewal

The Certbot container is configured to automatically check for certificate renewal every 12 hours. Renewal is automatic and requires no manual intervention.

Monitor renewal status:
```bash
docker compose logs certbot
```

Look for messages like:
```
Cert not yet due for renewal
```

Or if renewing:
```
Renewing an existing certificate
```

## Nginx Configuration

The Nginx configuration in `nginx/conf.d/` is already set up to:
- Listen on port 443 (HTTPS)
- Use the certificates from Let's Encrypt
- Redirect HTTP (port 80) to HTTPS
- Use modern TLS settings from Let's Encrypt

Key configuration files:
- `nginx/conf.d/default.conf` - Main server configuration
- `nginx/conf.d/ssl.conf` - SSL/TLS settings

## Troubleshooting

### Certificate Request Failed

**Problem:** "Failed to obtain certificate"

**Solutions:**
1. **Domain DNS not pointing to server:**
   - Ensure your domain's DNS A record points to your server's IP address
   - Wait for DNS propagation (can take up to 48 hours)
   - Test: `nslookup yourdomain.com`

2. **Port 80 not accessible:**
   - Check firewall settings
   - Ensure no other service is using port 80
   - Test: `curl -v http://yourdomain.com`

3. **Nginx not running:**
   - Check service status: `docker compose ps`
   - View logs: `docker compose logs nginx`

### Certificate Permission Issues

```bash
# Check certificate ownership
ls -l nginx/data/certbot/conf/live/yourdomain.com/

# Fix permissions if needed
sudo chown -R $(id -u):$(id -g) nginx/data/certbot/
```

### Manual Certificate Renewal

Force immediate renewal:
```bash
docker compose exec certbot certbot renew --force-renewal
```

### Self-Signed Certificate Issues

If you need to regenerate development certificates:
```bash
rm -rf nginx/data/certbot/conf/live/localhost/
./init-letsencrypt.sh
```

## Security Best Practices

1. **Keep certificates updated:**
   - Monitor renewal logs: `docker compose logs certbot | grep Renewing`
   - Set up email notifications in Certbot if desired

2. **TLS Security:**
   - The script generates modern 2048-bit Diffie-Hellman parameters
   - Nginx is configured to use TLSv1.2+ only
   - HSTS headers are enabled (preload recommended)

3. **Firewall:**
   ```bash
   # Allow HTTP and HTTPS
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

4. **Certificate Backup:**
   ```bash
   # Backup your certificates
   tar -czf cert-backup-$(date +%Y%m%d).tar.gz nginx/data/certbot/
   ```

## Advanced Configuration

### Custom Email for Renewal Notifications

Edit the Certbot container in `docker-compose.yml`:
```yaml
certbot:
  # ... existing config ...
  environment:
    - CERTBOT_EMAIL=admin@yourdomain.com
```

### Multiple Domains

To obtain certificates for multiple domains:
```bash
export SERVER_DOMAIN=domain1.com,domain2.com,www.domain1.com
./init-letsencrypt.sh
```

### Wildcard Certificates

Let's Encrypt supports wildcard certificates (*.yourdomain.com) using DNS validation. Contact your system administrator for DNS-based setup.

## Getting Help

### Check Logs

```bash
# Nginx logs
docker compose logs nginx | tail -50

# Certbot logs
docker compose logs certbot | tail -50

# All services
docker compose logs
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| `Connection refused` | Ensure containers are running (`docker compose up -d`) |
| `Domain not found` | Check DNS configuration and wait for propagation |
| `Permission denied` | Check file permissions in `nginx/data/certbot/` |
| `Port 80 already in use` | Stop conflicting services or change Nginx port |

### Let's Encrypt Resources

- [Official Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://certbot.eff.org/)
- [SSL Server Test](https://www.ssllabs.com/ssltest/)

## Related Files

- `docker-compose.yml` - Certbot service configuration
- `nginx/conf.d/default.conf` - Nginx SSL configuration
- `.env` - Environment configuration (SERVER_DOMAIN)
- `CLAUDE.md` - Project documentation

## Version History

- **v1.0** - Initial release
  - Self-signed certificate support
  - Let's Encrypt integration
  - Automatic renewal

## License

This script is part of the Biblio-Server project.
