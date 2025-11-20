# API Authentication Guide

## Overview

The printer client now uses **API Key authentication** with **CSRF token protection** to securely communicate with the biblio-server API.

## Authentication Methods

The biblio-server API supports two authentication methods:

### 1. API Key Authentication (Recommended for Clients)
- Simple and secure
- Long-lived credentials
- Perfect for service-to-service communication
- Used by printer client applications

### 2. JWT Token Authentication
- Used for web applications and user sessions
- Short-lived access tokens (1 hour)
- Requires username/password login
- Not recommended for printer clients

**This guide focuses on API Key authentication for printer clients.**

---

## Setup Instructions

### Step 1: Get API Key from Server

**Option A: Ask Server Administrator**

Contact your server administrator and request an API key for your printer client.

They will create it using:
```bash
# On server
curl -X POST http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Printer Client - PC1","userId":1}'
```

**Option B: Create via Admin Panel**

1. Login to server as admin
2. Navigate to API Keys section
3. Click "Create New Key"
4. Name: "Printer Client - [PC Name]"
5. Copy the API key (shown only once!)

**⚠️ IMPORTANT:** The API key is only shown once. Save it immediately!

### Step 2: Configure env.py

Edit `env.py` (or `python\env.py` for portable deployment):

```python
# API Configuration
APP_HOST = "http://admin.abr.net:3000"
API_KEY = "your-api-key-here"  # Paste your API key here
```

Example with actual key:
```python
APP_HOST = "http://admin.abr.net:3000"
API_KEY = "ak_1a2b3c4d5e6f7g8h9i0j"
```

### Step 3: Test Connection

```cmd
cd python
python.exe test.py
```

Expected output:
```
============================================================
Biblio Server API Connection Test
============================================================

Server URL: http://admin.abr.net:3000
API Key: ak_1a2b3c4...

[1/3] Testing CSRF token retrieval...
✅ CSRF Token received: 9a8b7c6d5e4f3g2h...

[2/3] Testing API authentication...
✅ Authentication successful!
    Retrieved 1 record(s)

[3/3] Sample data retrieved:
    Member: Juan Pérez
    Group: 101
    Amount: $500.00

============================================================
✅ ALL TESTS PASSED!
============================================================

Your printer client is ready to use.
```

---

## How It Works

### Authentication Flow

```
1. Client starts
   ↓
2. Load API_KEY from env.py
   ↓
3. Request CSRF token from /api/csrf-token
   ↓
4. Store CSRF token
   ↓
5. Make API request with:
   - Header: X-API-Key: [your-api-key]
   - Header: X-CSRF-Token: [csrf-token] (for POST/PUT/DELETE)
   ↓
6. Server validates API key
   ↓
7. Server validates CSRF token (if POST/PUT/DELETE)
   ↓
8. Return data
```

### Security Features

✅ **API Key Authentication**
- Validates identity of client
- Long-lived but revocable
- Can be revoked by admin if compromised

✅ **CSRF Token Protection**
- Prevents cross-site request forgery
- Required for all write operations
- Short-lived (expires after use or timeout)

✅ **HTTPS Support**
- Use HTTPS in production
- Encrypts all communication
- Protects API key in transit

---

## Using the API Client

### Basic Usage

```python
import api_client

# Create client (uses env.py configuration)
client = api_client.BiblioAPIClient()

# Get CSRF token (required for write operations)
csrf_token = client.get_csrf_token()

# Get tirada data by ID range
data = client.get_tirada_range(start_id=1, end_id=100)

# Get tirada data by page
data = client.get_tirada_page(page=1)

# Get tirada data by custom IDs
data = client.get_tirada_custom([101, 102, 103, 104])
```

### Advanced Usage

```python
import api_client

# Create client with custom configuration
client = api_client.BiblioAPIClient(
    base_url="http://custom-server:3000",
    api_key="custom-api-key"
)

# Get CSRF token
client.get_csrf_token()

# Make authenticated request
try:
    data = client.get_tirada_range(1, 10)
    print(f"Retrieved {len(data)} records")
except Exception as e:
    print(f"Error: {str(e)}")
```

### Convenience Functions

For simple use cases, use the convenience functions:

```python
import api_client

# Get data by range (auto-handles authentication)
data = api_client.get_tirada_data(start_id=1, end_id=100)

# Get data by page
data = api_client.get_tirada_by_page(page=1)

# Get data by IDs
data = api_client.get_tirada_by_ids([101, 102, 103])
```

---

## API Endpoints

### Public Endpoints (No Authentication)

- `GET /api/csrf-token` - Get CSRF token

### Protected Endpoints (Require API Key)

**Tirada (Fee Collection) Endpoints:**

- `GET /api/tirada/start/:start/end/:end` - Get records by ID range
  ```python
  client.get_tirada_range(1, 100)
  ```

- `GET /api/tirada/page/:page` - Get records by page (8 per page)
  ```python
  client.get_tirada_page(1)
  ```

- `GET /api/tirada/custom/:id1/:id2/.../id8` - Get up to 8 custom IDs
  ```python
  client.get_tirada_custom([101, 102, 103])
  ```

**Admin Endpoints (Require Admin Role):**

- `GET /api/api-keys` - List all API keys
- `POST /api/api-keys` - Create new API key
- `PATCH /api/api-keys/:id/revoke` - Revoke API key
- `DELETE /api/api-keys/:id` - Delete API key

---

## Troubleshooting

### Error: "No API_KEY configured in env.py"

**Cause:** API_KEY not set in env.py

**Solution:**
1. Open env.py
2. Add line: `API_KEY = "your-api-key-here"`
3. Save file
4. Run test again

### Error: "Failed to get CSRF token"

**Cause:** Cannot connect to server

**Solution:**
1. Check server is running
2. Check APP_HOST is correct
3. Test: `curl http://admin.abr.net:3000/api/csrf-token`
4. Check firewall allows connection

### Error: "HTTP 401: Unauthorized"

**Cause:** Invalid or expired API key

**Solution:**
1. Check API_KEY is correct (no spaces, complete)
2. Contact server admin to verify key is still valid
3. Create new API key if old one was revoked
4. Update env.py with new key

### Error: "HTTP 403: Forbidden"

**Cause:** API key valid but lacks permissions

**Solution:**
1. Contact server admin
2. Check API key has correct user assigned
3. Check user has appropriate role

### Error: "HTTP 403: CSRF token missing"

**Cause:** CSRF token not sent with POST/PUT/DELETE request

**Solution:**
- Call `client.get_csrf_token()` before write operations
- api_client.py handles this automatically

### Error: "Connection error: [Errno 11001] getaddrinfo failed"

**Cause:** Cannot resolve hostname

**Solution:**
1. Check APP_HOST is correct
2. Check DNS is working
3. Try IP address instead: `APP_HOST = "http://192.168.1.100:3000"`
4. Check network connection

---

## Security Best Practices

### 1. Protect API Key

❌ **DON'T:**
- Commit env.py to git
- Share API key via email/chat
- Hardcode API key in source files
- Use same API key for all clients

✅ **DO:**
- Keep env.py in .gitignore
- Store API key securely
- Use separate API key per client
- Revoke compromised keys immediately

### 2. Use HTTPS in Production

Development:
```python
APP_HOST = "http://admin.abr.net:3000"  # OK for testing
```

Production:
```python
APP_HOST = "https://admin.abr.net"  # Always use HTTPS
```

### 3. Monitor API Keys

Administrators should:
- List API keys regularly
- Revoke unused keys
- Check for suspicious activity
- Set expiration dates when creating keys

### 4. Rotate API Keys

Best practice:
- Rotate API keys every 90 days
- Update env.py on all clients
- Test before revoking old key

---

## API Key Management (Admin)

### List All API Keys

```bash
curl http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Create API Key

```bash
curl -X POST http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Printer Client - Office 1",
    "userId": 1,
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

Response:
```json
{
  "id": 1,
  "name": "Printer Client - Office 1",
  "key": "ak_1a2b3c4d5e6f7g8h9i0j",
  "userId": 1,
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

**⚠️ Save the `key` value immediately! It's shown only once.**

### Revoke API Key

```bash
curl -X PATCH http://localhost:3000/api/api-keys/1/revoke \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Delete API Key

```bash
curl -X DELETE http://localhost:3000/api/api-keys/1 \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## Migration from Old API

### Old Code (No Authentication)

```python
import urllib.request
import json

url = "http://admin.abr.net:3000/api/tirada/start/1/end/100"
response = urllib.request.urlopen(url)
data = json.loads(response.read())
```

### New Code (With Authentication)

```python
import api_client

# Method 1: Using client object
client = api_client.BiblioAPIClient()
data = client.get_tirada_range(1, 100)

# Method 2: Using convenience function
data = api_client.get_tirada_data(1, 100)
```

### Update Your Scripts

1. **Add API key to env.py**
   ```python
   API_KEY = "your-api-key-here"
   ```

2. **Replace urllib calls with api_client**
   ```python
   # Old
   import urllib.request
   response = urllib.request.urlopen(url)

   # New
   import api_client
   data = api_client.get_tirada_data(1, 100)
   ```

3. **Test**
   ```cmd
   python.exe test.py
   ```

---

## Reference

### BiblioAPIClient Class

```python
class BiblioAPIClient:
    def __init__(self, base_url=None, api_key=None)
    def get_csrf_token() -> str
    def login(username, password) -> dict
    def get_tirada_range(start_id, end_id) -> list
    def get_tirada_page(page, per_page=8) -> list
    def get_tirada_custom(cc_ids) -> list
```

### Convenience Functions

```python
def get_tirada_data(start_id, end_id) -> list
def get_tirada_by_page(page) -> list
def get_tirada_by_ids(cc_ids) -> list
```

### Environment Variables

```python
# env.py
APP_HOST = "http://admin.abr.net:3000"  # Server URL
API_KEY = ""  # API key for authentication
```

---

**Last Updated:** 2025-11-07
**API Version:** v1
**Server:** biblio-server (Node.js)
**Authentication:** API Key + CSRF Token
