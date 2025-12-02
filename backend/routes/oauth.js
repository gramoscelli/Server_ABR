/**
 * OAuth Routes
 * Handles OAuth2 authentication with Google and GitHub
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { RefreshToken } = require('../models');

/**
 * Helper function to generate tokens for OAuth users
 */
async function generateOAuthTokens(user) {
  // Check if user account is active before generating token
  if (user.is_active === false) {
    throw new Error('ACCOUNT_INACTIVE');
  }

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role ? user.role.name : 'user',
      oauth: true,
      is_active: user.is_active  // Include active status in OAuth token
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  // Generate refresh token
  const refreshTokenValue = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  // Store refresh token in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await RefreshToken.create({
    user_id: user.id,
    token: refreshTokenValue,
    expires_at: expiresAt
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role ? user.role.name : 'user',
      avatar_url: user.avatar_url,
      oauth_only: user.oauth_only
    }
  };
}

/**
 * Google OAuth Routes
 */

// Initiate Google OAuth
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  async (req, res) => {
    try {
      const tokens = await generateOAuthTokens(req.user);

      // Option 1: Return JSON (for API clients)
      if (req.query.api === 'true') {
        return res.json(tokens);
      }

      // Option 2: Redirect to frontend with tokens (for web clients)
      const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || '/';
      const queryParams = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

      res.redirect(`${redirectUrl}?${queryParams.toString()}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      if (error.message === 'ACCOUNT_INACTIVE') {
        return res.redirect('/login?error=account_inactive');
      }
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

/**
 * GitHub OAuth Routes
 */

// Initiate GitHub OAuth
router.get('/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false
  })
);

// GitHub OAuth callback
router.get('/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  async (req, res) => {
    try {
      const tokens = await generateOAuthTokens(req.user);

      // Option 1: Return JSON (for API clients)
      if (req.query.api === 'true') {
        return res.json(tokens);
      }

      // Option 2: Redirect to frontend with tokens (for web clients)
      const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || '/';
      const queryParams = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

      res.redirect(`${redirectUrl}?${queryParams.toString()}`);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      if (error.message === 'ACCOUNT_INACTIVE') {
        return res.redirect('/login?error=account_inactive');
      }
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

/**
 * Facebook OAuth Routes
 */

// Initiate Facebook OAuth
router.get('/facebook',
  passport.authenticate('facebook', {
    scope: ['email', 'public_profile'],
    session: false
  })
);

// Facebook OAuth callback
router.get('/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  async (req, res) => {
    try {
      const tokens = await generateOAuthTokens(req.user);

      // Option 1: Return JSON (for API clients)
      if (req.query.api === 'true') {
        return res.json(tokens);
      }

      // Option 2: Redirect to frontend with tokens (for web clients)
      const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || '/';
      const queryParams = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

      res.redirect(`${redirectUrl}?${queryParams.toString()}`);
    } catch (error) {
      console.error('Facebook OAuth callback error:', error);
      if (error.message === 'ACCOUNT_INACTIVE') {
        return res.redirect('/login?error=account_inactive');
      }
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

/**
 * Microsoft OAuth Routes
 */

// Initiate Microsoft OAuth
router.get('/microsoft',
  passport.authenticate('microsoft', {
    scope: ['user.read'],
    session: false
  })
);

// Microsoft OAuth callback
router.get('/microsoft/callback',
  passport.authenticate('microsoft', {
    session: false,
    failureRedirect: '/login?error=oauth_failed'
  }),
  async (req, res) => {
    try {
      const tokens = await generateOAuthTokens(req.user);

      // Option 1: Return JSON (for API clients)
      if (req.query.api === 'true') {
        return res.json(tokens);
      }

      // Option 2: Redirect to frontend with tokens (for web clients)
      const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || '/';
      const queryParams = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

      res.redirect(`${redirectUrl}?${queryParams.toString()}`);
    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      if (error.message === 'ACCOUNT_INACTIVE') {
        return res.redirect('/login?error=account_inactive');
      }
      res.redirect('/login?error=token_generation_failed');
    }
  }
);

/**
 * GET /api/auth/oauth/providers
 * Get list of configured OAuth providers
 */
router.get('/providers', (req, res) => {
  const providers = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push({
      name: 'google',
      displayName: 'Google',
      authUrl: '/api/auth/oauth/google'
    });
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push({
      name: 'github',
      displayName: 'GitHub',
      authUrl: '/api/auth/oauth/github'
    });
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    providers.push({
      name: 'facebook',
      displayName: 'Facebook',
      authUrl: '/api/auth/oauth/facebook'
    });
  }

  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    providers.push({
      name: 'microsoft',
      displayName: 'Microsoft',
      authUrl: '/api/auth/oauth/microsoft'
    });
  }

  res.json({ providers });
});

module.exports = router;
