/**
 * Email Service
 * Handles sending emails for verification, notifications, etc.
 *
 * Supports two modes:
 * 1. Database configuration (via Settings model) - configured in Admin Panel
 * 2. Environment variables fallback (RESEND_API_KEY)
 *
 * PRODUCTION SETUP:
 * - Configure email settings via Admin Panel -> Sistema -> Configuración
 * - Or use environment variables as fallback
 *
 * See EMAIL_DELIVERABILITY_GUIDE.md for full documentation
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Cache for email transporter
let cachedTransporter = null;
let cachedConfigKey = null;

/**
 * Generate a random verification token
 * @returns {string} Random token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get email configuration from database or environment
 * @returns {Promise<Object>} Email configuration
 */
async function getEmailConfig() {
  try {
    const { Setting } = require('../models');
    const dbSettings = await Setting.getEmailSettings();

    // If database settings are enabled, use them
    if (dbSettings.enabled) {
      return dbSettings;
    }

    // Fallback to environment variables
    if (process.env.RESEND_API_KEY) {
      return {
        provider: 'resend',
        resend_api_key: process.env.RESEND_API_KEY,
        smtp_from_email: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        smtp_from_name: 'Biblio Admin',
        enabled: true
      };
    }

    return { enabled: false };
  } catch (error) {
    // Database might not be ready yet (during startup)
    if (process.env.RESEND_API_KEY) {
      return {
        provider: 'resend',
        resend_api_key: process.env.RESEND_API_KEY,
        smtp_from_email: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        smtp_from_name: 'Biblio Admin',
        enabled: true
      };
    }
    return { enabled: false };
  }
}

/**
 * Create or get cached email transporter for SMTP
 * @param {Object} config - Email configuration
 * @returns {Object} Nodemailer transporter
 */
function getTransporter(config) {
  const configKey = JSON.stringify({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure,
    user: config.smtp_user
  });

  if (cachedTransporter && cachedConfigKey === configKey) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port) || 587,
    secure: config.smtp_secure === true || config.smtp_secure === 'true',
    auth: config.smtp_user ? {
      user: config.smtp_user,
      pass: config.smtp_password
    } : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });

  cachedConfigKey = configKey;
  return cachedTransporter;
}

/**
 * Send email using configured provider
 * @param {Object} options - Email options (to, subject, html, text)
 * @returns {Promise<boolean>} Success status
 */
async function sendEmail(options) {
  // In development: Log email instead of sending
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n========================================');
    console.log(`📧 EMAIL (Development Mode)`);
    console.log('========================================');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('========================================\n');
    return true;
  }

  const config = await getEmailConfig();

  if (!config.enabled) {
    console.warn('[EmailService] Email is disabled. Enable in admin settings or set RESEND_API_KEY.');
    return false;
  }

  const fromAddress = `"${config.smtp_from_name || 'Biblio Admin'}" <${config.smtp_from_email || 'noreply@example.com'}>`;

  try {
    if (config.provider === 'smtp') {
      const transporter = getTransporter(config);
      await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      console.log(`[EmailService] Email sent via SMTP to ${options.to}`);
      return true;

    } else if (config.provider === 'resend') {
      const { Resend } = require('resend');
      const resend = new Resend(config.resend_api_key);

      const { error } = await resend.emails.send({
        from: config.smtp_from_email || 'onboarding@resend.dev',
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`[EmailService] Email sent via Resend to ${options.to}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[EmailService] Error sending email:', error.message);
    return false;
  }
}

/**
 * Send email verification email
 *
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @param {string} username - User's username
 * @returns {Promise<boolean>} Success status
 */
async function sendVerificationEmail(email, token, username) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px;">
                  <h1 style="margin: 0 0 24px 0; color: #111827; font-size: 28px; font-weight: 700;">
                    ¡Bienvenido a Biblio Admin, ${username}!
                  </h1>

                  <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Gracias por registrarte. Para activar tu cuenta, por favor verifica tu dirección de email haciendo clic en el botón de abajo:
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 24px 0;">
                        <a href="${verificationUrl}"
                           style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                          Verificar Email
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 24px 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                  </p>

                  <p style="margin: 0 0 24px 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; font-size: 13px; color: #4b5563;">
                    ${verificationUrl}
                  </p>

                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                      Este enlace expirará en 24 horas.
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                      Si no creaste esta cuenta, puedes ignorar este email de forma segura.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                    © 2025 Biblio Admin. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `Bienvenido a Biblio Admin, ${username}!\n\nPor favor verifica tu email visitando: ${verificationUrl}\n\nEste enlace expirará en 24 horas.\n\nSi no creaste esta cuenta, puedes ignorar este email.`;

  return sendEmail({
    to: email,
    subject: 'Verifica tu email - Biblio Admin',
    html,
    text
  });
}

/**
 * Send password reset email
 *
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {string} username - User's username
 * @returns {Promise<boolean>} Success status
 */
async function sendPasswordResetEmail(email, token, username) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer contraseña</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px;">
                  <h1 style="margin: 0 0 24px 0; color: #111827; font-size: 28px; font-weight: 700;">
                    Restablecer Contraseña
                  </h1>

                  <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Hola ${username},
                  </p>

                  <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña:
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 24px 0;">
                        <a href="${resetUrl}"
                           style="display: inline-block; padding: 14px 32px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                          Restablecer Contraseña
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 24px 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                  </p>

                  <p style="margin: 0 0 24px 0; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all; font-size: 13px; color: #4b5563;">
                    ${resetUrl}
                  </p>

                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                      Este enlace expirará en 1 hora.
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                      Si no solicitaste restablecer tu contraseña, ignora este email. Tu contraseña permanecerá sin cambios.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                    © 2025 Biblio Admin. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `Restablecer Contraseña\n\nHola ${username},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nVisita este enlace para crear una nueva contraseña:\n${resetUrl}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste esto, ignora este email.`;

  return sendEmail({
    to: email,
    subject: 'Restablecer contraseña - Biblio Admin',
    html,
    text
  });
}

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmail,
  getEmailConfig
};
