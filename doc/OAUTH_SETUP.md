# OAuth2 Setup Guide

This guide explains how to set up OAuth2 authentication with multiple providers for the biblio-server application.

## Overview

The application supports OAuth2 authentication with the following providers:
- **Google** - Sign in with Google account
- **GitHub** - Sign in with GitHub account
- **Facebook** - Sign in with Facebook account
- **Microsoft** - Sign in with Microsoft account

Users can sign in using OAuth providers, and the system will:
1. Create a new account if the user doesn't exist
2. Link the OAuth provider to an existing account (matched by email)
3. Generate JWT tokens for API access

## Database Schema

### Tables Created

#### `oauth_providers`
Stores OAuth provider connections for users:
- `id` - Primary key
- `user_id` - Foreign key to usuarios table
- `provider` - Provider name (google, github)
- `provider_user_id` - User ID from the OAuth provider
- `provider_email` - Email from OAuth provider
- `provider_username` - Username from OAuth provider
- `access_token` - OAuth access token (should be encrypted in production)
- `refresh_token` - OAuth refresh token
- `token_expires_at` - Token expiration time
- `profile_data` - Additional profile data (JSON)
- `created_at`, `updated_at` - Timestamps

#### `usuarios` Table Updates
New columns added:
- `oauth_only` - Boolean flag indicating user only uses OAuth (no password)
- `email_verified` - Email verification status
- `avatar_url` - User avatar URL from OAuth provider

## Setup Instructions

### 1. Apply Database Migration

```bash
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < migrations/004_add_oauth_support.sql
```

### 2. Configure Google OAuth

#### A. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure the consent screen if prompted
6. Choose "Web application" as application type
7. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/oauth/google/callback`
   - Production: `https://yourdomain.com/api/auth/oauth/google/callback`
8. Save and copy your Client ID and Client Secret

#### B. Add Google Credentials to .env

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/oauth/google/callback
```

### 3. Configure GitHub OAuth

#### A. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000` (development)
   - Authorization callback URL: `http://localhost:3000/api/auth/oauth/github/callback`
4. Click "Register application"
5. Copy the Client ID
6. Click "Generate a new client secret" and copy it

#### B. Add GitHub Credentials to .env

```bash
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/oauth/github/callback
```

### 4. Configure Facebook OAuth

#### A. Create Facebook OAuth App

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Click "Create App"
3. Choose "Consumer" as app type
4. Fill in the application details:
   - App Name: Your app name
   - Contact Email: Your email
5. Click "Create App"
6. In the dashboard, go to "Settings" > "Basic"
7. Copy your App ID and App Secret
8. Add Facebook Login product:
   - Go to "Add Product" and select "Facebook Login"
   - Choose "Web" platform
9. Configure OAuth Redirect URLs:
   - Go to "Facebook Login" > "Settings"
   - Add Valid OAuth Redirect URIs:
     - Development: `http://localhost:3000/api/auth/oauth/facebook/callback`
     - Production: `https://yourdomain.com/api/auth/oauth/facebook/callback`

#### B. Add Facebook Credentials to .env

```bash
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/oauth/facebook/callback
```

### 5. Configure Microsoft OAuth

#### A. Create Microsoft OAuth App

1. Go to [Azure Portal - App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click "New registration"
3. Fill in the application details:
   - Name: Your app name
   - Supported account types: Choose appropriate option (e.g., "Accounts in any organizational directory and personal Microsoft accounts")
   - Redirect URI:
     - Platform: Web
     - URI: `http://localhost:3000/api/auth/oauth/microsoft/callback`
4. Click "Register"
5. Copy the "Application (client) ID"
6. Go to "Certificates & secrets"
7. Click "New client secret"
8. Add a description and expiration
9. Copy the secret value (shown only once!)
10. Go to "Authentication" and add additional redirect URIs for production if needed

#### B. Add Microsoft Credentials to .env

```bash
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here
MICROSOFT_CALLBACK_URL=http://localhost:3000/api/auth/oauth/microsoft/callback
```

### 6. Configure OAuth Redirect

Set where users should be redirected after successful OAuth login:

```bash
OAUTH_SUCCESS_REDIRECT=http://localhost:3000/dashboard
```

### 7. Restart the Application

```bash
docker-compose restart app
```

## API Endpoints

### Get Available OAuth Providers

```bash
GET /api/auth/oauth/providers
```

Response:
```json
{
  "providers": [
    {
      "name": "google",
      "displayName": "Google",
      "authUrl": "/api/auth/oauth/google"
    },
    {
      "name": "github",
      "displayName": "GitHub",
      "authUrl": "/api/auth/oauth/github"
    },
    {
      "name": "facebook",
      "displayName": "Facebook",
      "authUrl": "/api/auth/oauth/facebook"
    },
    {
      "name": "microsoft",
      "displayName": "Microsoft",
      "authUrl": "/api/auth/oauth/microsoft"
    }
  ]
}
```

### OAuth Initiation URLs

**Google OAuth:**
```
http://localhost:3000/api/auth/oauth/google
```

**GitHub OAuth:**
```
http://localhost:3000/api/auth/oauth/github
```

**Facebook OAuth:**
```
http://localhost:3000/api/auth/oauth/facebook
```

**Microsoft OAuth:**
```
http://localhost:3000/api/auth/oauth/microsoft
```

Each will redirect to the respective provider's consent/authorization page, then back to the callback URL.

### OAuth Callback Behavior

After successful OAuth authentication, the application can behave in two ways:

#### 1. Redirect Mode (Default - for Web Apps)
Redirects to `OAUTH_SUCCESS_REDIRECT` with tokens in query params:
```
http://yourdomain.com/dashboard?accessToken=xxx&refreshToken=yyy
```

#### 2. API Mode (for API Clients)
Add `?api=true` to the OAuth initiation URL:
```
http://localhost:3000/api/auth/oauth/google?api=true
```

The callback will return JSON instead of redirecting:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "oauth_only": true
  }
}
```

## Usage Flow

### Frontend Implementation Example

```html
<!-- Login page with OAuth buttons -->
<a href="/api/auth/oauth/google" class="btn btn-google">
  Sign in with Google
</a>

<a href="/api/auth/oauth/github" class="btn btn-github">
  Sign in with GitHub
</a>

<a href="/api/auth/oauth/facebook" class="btn btn-facebook">
  Sign in with Facebook
</a>

<a href="/api/auth/oauth/microsoft" class="btn btn-microsoft">
  Sign in with Microsoft
</a>
```

### Handling the Redirect (Frontend)

```javascript
// In your dashboard or callback page
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('accessToken');
const refreshToken = urlParams.get('refreshToken');

if (accessToken && refreshToken) {
  // Store tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  // Clean URL
  window.history.replaceState({}, document.title, window.location.pathname);

  // Use tokens for API calls
  fetch('/api/protected-endpoint', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
}
```

## User Account Linking

### By Email
If a user signs in with OAuth and an account with that email already exists:
- The OAuth provider is linked to the existing account
- No new account is created
- The user can now log in using either password or OAuth

### New Users
If no account exists with the OAuth email:
- A new account is created automatically
- Username is generated from email (e.g., `john` from `john@example.com`)
- `oauth_only` is set to `true` (no password)
- User role defaults to `'user'`

## Security Considerations

### 1. OAuth Tokens in Database
Currently, OAuth tokens are stored in plain text. **For production**, you should:
- Encrypt tokens before storing
- Use environment-based encryption keys
- Consider using a vault service

### 2. CSRF Protection
OAuth routes don't require CSRF tokens because OAuth uses the `state` parameter for CSRF protection.

### 3. Callback URL Validation
Ensure your OAuth provider settings only allow authorized callback URLs:
- Development: `http://localhost:3000/api/auth/oauth/*/callback`
- Production: `https://yourdomain.com/api/auth/oauth/*/callback`

### 4. HTTPS in Production
Always use HTTPS in production for OAuth callbacks.

## Testing OAuth Locally

### Using Postman or API Clients

OAuth requires browser redirects, so it's difficult to test with Postman. Instead:

1. **Open the OAuth URL in a browser:**
   ```
   http://localhost:3000/api/auth/oauth/google?api=true
   ```

2. **Complete the OAuth flow in the browser**

3. **Copy the returned JSON tokens**

4. **Use the tokens in Postman:**
   ```
   Authorization: Bearer <accessToken>
   ```

### Using ngrok for Local Testing with Real OAuth

If you need to test with production OAuth apps (not localhost):

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3000

# Update .env with ngrok URL
GOOGLE_CALLBACK_URL=https://abc123.ngrok.io/api/auth/oauth/google/callback
GITHUB_CALLBACK_URL=https://abc123.ngrok.io/api/auth/oauth/github/callback

# Restart application
docker-compose restart app
```

## Troubleshooting

### "OAuth provider not configured"
**Solution:** Ensure environment variables are set in `.env`:
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` for GitHub

### "Redirect URI mismatch"
**Solution:** Ensure the callback URL in your OAuth provider settings exactly matches the `CALLBACK_URL` in `.env`.

### "User not found after OAuth"
**Solution:** Check application logs for errors during user creation. Ensure the database migration was applied successfully.

### "Token expired" errors
**Solution:** OAuth providers' access tokens expire. The application stores refresh tokens but doesn't automatically refresh them yet. Consider implementing token refresh logic.

## Model Methods

### OAuthProvider Model

```javascript
// Find OAuth provider by provider name and user ID
const provider = await OAuthProvider.findByProvider('google', '123456789');

// Find all OAuth providers for a user
const providers = await OAuthProvider.findByUserId(userId);

// Create or update OAuth provider
const provider = await OAuthProvider.upsertProvider({
  user_id: 1,
  provider: 'google',
  provider_user_id: '123456789',
  provider_email: 'user@example.com',
  access_token: 'token',
  refresh_token: 'refresh',
  profile_data: { displayName: 'John Doe' }
});

// Check if token is expired
if (provider.isTokenExpired()) {
  // Refresh token logic here
}
```

## Next Steps

1. **Add More Providers:** The architecture supports adding Facebook, Microsoft, Twitter, etc.
2. **Account Unlinking:** Add endpoints to unlink OAuth providers
3. **Token Refresh:** Implement automatic token refresh
4. **Profile Management:** Allow users to update their profile from OAuth data

## Support

For issues or questions about OAuth setup, check:
- Application logs: `docker-compose logs app`
- Database: `docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} abr`
- OAuth provider documentation (Google/GitHub)
