/**
 * Email Service
 * Handles sending emails for verification, notifications, etc.
 *
 * PRODUCTION SETUP REQUIRED:
 * This service uses Resend for email delivery to avoid spam filters.
 *
 * Setup Instructions:
 * 1. Create account at https://resend.com (free tier: 3,000 emails/month)
 * 2. Get API key from dashboard
 * 3. Install package: npm install resend
 * 4. Add to .env: RESEND_API_KEY=re_your_key_here
 * 5. Add to .env: EMAIL_FROM=noreply@yourdomain.com (or use onboarding@resend.dev for testing)
 *
 * See EMAIL_DELIVERABILITY_GUIDE.md for full documentation
 */

const crypto = require('crypto');

/**
 * Generate a random verification token
 * @returns {string} Random token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send email verification email
 * Uses Resend in production for better deliverability
 *
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @param {string} username - User's username
 * @returns {Promise<boolean>} Success status
 */
async function sendVerificationEmail(email, token, username) {
  try {
    // Generate verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;

    // In development: Log the verification link instead of sending email
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================');
      console.log('📧 EMAIL VERIFICATION (Development Mode)');
      console.log('========================================');
      console.log(`To: ${email}`);
      console.log(`Username: ${username}`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log('========================================\n');
      return true;
    }

    // PRODUCTION: Use Resend (Recommended)
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: [email],
        subject: 'Verifica tu email - Biblio Admin',
        html: `
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
                            ⏰ Este enlace expirará en 24 horas.
                          </p>
                          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                            🔒 Si no creaste esta cuenta, puedes ignorar este email de forma segura.
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
        `,
        text: `Bienvenido a Biblio Admin, ${username}!\n\nPor favor verifica tu email visitando: ${verificationUrl}\n\nEste enlace expirará en 24 horas.\n\nSi no creaste esta cuenta, puedes ignorar este email.`
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log('✅ Verification email sent successfully via Resend:', data.id);
      return true;
    }

    // ALTERNATIVE: SendGrid (commented out)
    /*
    if (process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: email,
        from: process.env.EMAIL_FROM || 'noreply@biblio.com',
        subject: 'Verifica tu email - Biblio Admin',
        html: // same HTML as above
      };

      await sgMail.send(msg);
      return true;
    }
    */

    // ALTERNATIVE: AWS SES (commented out)
    /*
    if (process.env.AWS_ACCESS_KEY_ID) {
      const AWS = require('aws-sdk');
      const ses = new AWS.SES({
        region: process.env.AWS_REGION || 'us-east-1'
      });

      const params = {
        Source: process.env.EMAIL_FROM,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: 'Verifica tu email - Biblio Admin' },
          Body: { Html: { Data: // same HTML as above } }
        }
      };

      await ses.sendEmail(params).promise();
      return true;
    }
    */

    // ALTERNATIVE: Nodemailer with SMTP (commented out)
    /*
    if (process.env.SMTP_HOST) {
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Verifica tu email - Biblio Admin',
        html: // same HTML as above
      });

      return true;
    }
    */

    console.warn('⚠️  No email service configured. Set RESEND_API_KEY in .env file.');
    console.warn('⚠️  See EMAIL_DELIVERABILITY_GUIDE.md for setup instructions.');
    return false;

  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
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
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;

    // In development: Log the reset link
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================');
      console.log('🔑 PASSWORD RESET (Development Mode)');
      console.log('========================================');
      console.log(`To: ${email}`);
      console.log(`Username: ${username}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('========================================\n');
      return true;
    }

    // PRODUCTION: Use Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: [email],
        subject: 'Restablecer contraseña - Biblio Admin',
        html: `
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
                            ⏰ Este enlace expirará en 1 hora.
                          </p>
                          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                            🔒 Si no solicitaste restablecer tu contraseña, ignora este email. Tu contraseña permanecerá sin cambios.
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
        `,
        text: `Restablecer Contraseña\n\nHola ${username},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nVisita este enlace para crear una nueva contraseña:\n${resetUrl}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste esto, ignora este email.`
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }

      console.log('✅ Password reset email sent successfully via Resend:', data.id);
      return true;
    }

    console.warn('⚠️  No email service configured. Set RESEND_API_KEY in .env file.');
    return false;

  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendPasswordResetEmail
};
