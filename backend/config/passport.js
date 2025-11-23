/**
 * Passport OAuth2 Configuration
 * Configures OAuth strategies for Google, GitHub, Facebook, and Microsoft
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const { User, OAuthProvider, Role } = require('../models');

/**
 * Serialize user for session (if using sessions)
 * For API use, we don't use sessions, but this is required by Passport
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Google OAuth Strategy
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/oauth/google/callback',
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if OAuth provider already exists
      let oauthProvider = await OAuthProvider.findByProvider('google', profile.id);

      if (oauthProvider) {
        // Update existing provider tokens
        await OAuthProvider.upsertProvider({
          provider: 'google',
          provider_user_id: profile.id,
          user_id: oauthProvider.user_id,
          provider_email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
          provider_username: profile.displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            photos: profile.photos,
            locale: profile._json.locale
          }
        });

        // Get the user
        const user = await User.findByPk(oauthProvider.user_id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, user);
      } else {
        // New OAuth login - check if user exists by email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        let user = null;

        if (email) {
          user = await User.findOne({
            where: { email },
            include: [{ model: Role, as: 'role' }]
          });
        }

        if (!user) {
          // Create new user with new_user role (no permissions, awaiting admin approval)
          const newUserRole = await Role.findByName('new_user');
          const username = email ? email.split('@')[0] : `google_${profile.id}`;

          // Extract name from Google profile
          const givenName = profile.name?.givenName || profile._json?.given_name || '';
          const familyName = profile.name?.familyName || profile._json?.family_name || '';

          user = await User.create({
            username: username,
            email: email,
            nombre: givenName,
            apellido: familyName,
            password_hash: null,  // OAuth users don't have passwords
            role_id: newUserRole.id,
            oauth_only: true,
            email_verified: profile.emails && profile.emails[0] && profile.emails[0].verified,
            avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            is_active: true
          });
        }

        // Create OAuth provider record
        await OAuthProvider.create({
          user_id: user.id,
          provider: 'google',
          provider_user_id: profile.id,
          provider_email: email,
          provider_username: profile.displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            photos: profile.photos,
            locale: profile._json.locale
          }
        });

        // Re-fetch user with role
        const userWithRole = await User.findByPk(user.id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, userWithRole);
      }
    } catch (error) {
      return done(error, null);
    }
  }));
}

/**
 * GitHub OAuth Strategy
 */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/oauth/github/callback',
    scope: ['user:email'],
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if OAuth provider already exists
      let oauthProvider = await OAuthProvider.findByProvider('github', profile.id);

      if (oauthProvider) {
        // Update existing provider tokens
        await OAuthProvider.upsertProvider({
          provider: 'github',
          provider_user_id: profile.id,
          user_id: oauthProvider.user_id,
          provider_email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
          provider_username: profile.username,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            username: profile.username,
            profileUrl: profile.profileUrl,
            avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          }
        });

        // Get the user
        const user = await User.findByPk(oauthProvider.user_id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, user);
      } else {
        // New OAuth login - check if user exists by email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        let user = null;

        if (email) {
          user = await User.findOne({
            where: { email },
            include: [{ model: Role, as: 'role' }]
          });
        }

        if (!user) {
          // Create new user with new_user role (no permissions, awaiting admin approval)
          const newUserRole = await Role.findByName('new_user');
          const username = profile.username || `github_${profile.id}`;

          user = await User.create({
            username: username,
            email: email,
            password_hash: null,  // OAuth users don't have passwords
            role_id: newUserRole.id,
            oauth_only: true,
            email_verified: false,  // GitHub doesn't provide email verification status
            avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            is_active: true
          });
        }

        // Create OAuth provider record
        await OAuthProvider.create({
          user_id: user.id,
          provider: 'github',
          provider_user_id: profile.id,
          provider_email: email,
          provider_username: profile.username,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            username: profile.username,
            profileUrl: profile.profileUrl,
            avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          }
        });

        // Re-fetch user with role
        const userWithRole = await User.findByPk(user.id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, userWithRole);
      }
    } catch (error) {
      return done(error, null);
    }
  }));
}

/**
 * Facebook OAuth Strategy
 */
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/oauth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'photos', 'name'],
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if OAuth provider already exists
      let oauthProvider = await OAuthProvider.findByProvider('facebook', profile.id);

      if (oauthProvider) {
        // Update existing provider tokens
        await OAuthProvider.upsertProvider({
          provider: 'facebook',
          provider_user_id: profile.id,
          user_id: oauthProvider.user_id,
          provider_email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
          provider_username: profile.displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            photos: profile.photos,
            profileUrl: `https://facebook.com/${profile.id}`
          }
        });

        // Get the user
        const user = await User.findByPk(oauthProvider.user_id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, user);
      } else {
        // New OAuth login - check if user exists by email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        let user = null;

        if (email) {
          user = await User.findOne({
            where: { email },
            include: [{ model: Role, as: 'role' }]
          });
        }

        if (!user) {
          // Create new user with new_user role (no permissions, awaiting admin approval)
          const newUserRole = await Role.findByName('new_user');
          const username = email ? email.split('@')[0] : `facebook_${profile.id}`;

          user = await User.create({
            username: username,
            email: email,
            password_hash: null,  // OAuth users don't have passwords
            role_id: newUserRole.id,
            oauth_only: true,
            email_verified: false,  // Facebook doesn't provide email verification status
            avatar_url: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            is_active: true
          });
        }

        // Create OAuth provider record
        await OAuthProvider.create({
          user_id: user.id,
          provider: 'facebook',
          provider_user_id: profile.id,
          provider_email: email,
          provider_username: profile.displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            photos: profile.photos,
            profileUrl: `https://facebook.com/${profile.id}`
          }
        });

        // Re-fetch user with role
        const userWithRole = await User.findByPk(user.id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, userWithRole);
      }
    } catch (error) {
      return done(error, null);
    }
  }));
}

/**
 * Microsoft OAuth Strategy
 */
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL || '/api/auth/oauth/microsoft/callback',
    scope: ['user.read'],
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if OAuth provider already exists
      let oauthProvider = await OAuthProvider.findByProvider('microsoft', profile.id);

      if (oauthProvider) {
        // Update existing provider tokens
        await OAuthProvider.upsertProvider({
          provider: 'microsoft',
          provider_user_id: profile.id,
          user_id: oauthProvider.user_id,
          provider_email: profile.emails && profile.emails[0] ? profile.emails[0].value : profile._json.userPrincipalName,
          provider_username: profile.displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            userPrincipalName: profile._json.userPrincipalName,
            jobTitle: profile._json.jobTitle,
            officeLocation: profile._json.officeLocation
          }
        });

        // Get the user
        const user = await User.findByPk(oauthProvider.user_id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, user);
      } else {
        // New OAuth login - check if user exists by email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : profile._json.userPrincipalName;
        let user = null;

        if (email) {
          user = await User.findOne({
            where: { email },
            include: [{ model: Role, as: 'role' }]
          });
        }

        if (!user) {
          // Create new user with new_user role (no permissions, awaiting admin approval)
          const newUserRole = await Role.findByName('new_user');
          const username = email ? email.split('@')[0] : `microsoft_${profile.id}`;

          user = await User.create({
            username: username,
            email: email,
            password_hash: null,  // OAuth users don't have passwords
            role_id: newUserRole.id,
            oauth_only: true,
            email_verified: true,  // Microsoft accounts are verified
            avatar_url: null,  // Microsoft API doesn't provide photo in basic profile
            is_active: true
          });
        }

        // Create OAuth provider record
        await OAuthProvider.create({
          user_id: user.id,
          provider: 'microsoft',
          provider_user_id: profile.id,
          provider_email: email,
          provider_username: profile.displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          profile_data: {
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            userPrincipalName: profile._json.userPrincipalName,
            jobTitle: profile._json.jobTitle,
            officeLocation: profile._json.officeLocation
          }
        });

        // Re-fetch user with role
        const userWithRole = await User.findByPk(user.id, {
          include: [{ model: Role, as: 'role' }]
        });

        return done(null, userWithRole);
      }
    } catch (error) {
      return done(error, null);
    }
  }));
}

module.exports = passport;
