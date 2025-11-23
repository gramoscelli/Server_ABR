/**
 * Settings Routes
 * Admin endpoints for managing system settings
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { Setting } = require('../models');
const nodemailer = require('nodemailer');

/**
 * GET /api/settings/email
 * Get email configuration (admin only)
 */
router.get('/email', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const emailSettings = await Setting.getEmailSettings();

    // Mask sensitive values
    if (emailSettings.smtp_password) {
      emailSettings.smtp_password = emailSettings.smtp_password ? '********' : '';
    }
    if (emailSettings.resend_api_key) {
      emailSettings.resend_api_key = emailSettings.resend_api_key ? '********' : '';
    }

    res.json({
      settings: emailSettings,
      providers: [
        { value: 'smtp', label: 'SMTP (Servidor de correo)' },
        { value: 'resend', label: 'Resend (API)' }
      ],
      encryptionOptions: [
        { value: 'none', label: 'Ninguna', port: 25 },
        { value: 'tls', label: 'STARTTLS', port: 587 },
        { value: 'ssl', label: 'SSL/TLS', port: 465 }
      ]
    });
  } catch (error) {
    console.error('Get email settings error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la configuración de email'
    });
  }
});

/**
 * PUT /api/settings/email
 * Update email configuration (admin only)
 */
router.put('/email', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const {
      provider,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_password,
      smtp_from_email,
      smtp_from_name,
      resend_api_key,
      enabled
    } = req.body;

    // Validate provider
    if (provider && !['smtp', 'resend'].includes(provider)) {
      return res.status(400).json({
        error: 'Proveedor inválido',
        message: 'El proveedor debe ser "smtp" o "resend"'
      });
    }

    // Build settings object (only include non-placeholder values)
    const settingsToSave = { provider, enabled };

    if (smtp_host !== undefined) settingsToSave.smtp_host = smtp_host;
    if (smtp_port !== undefined) settingsToSave.smtp_port = smtp_port;
    if (smtp_secure !== undefined) settingsToSave.smtp_secure = smtp_secure;
    if (smtp_user !== undefined) settingsToSave.smtp_user = smtp_user;
    if (smtp_from_email !== undefined) settingsToSave.smtp_from_email = smtp_from_email;
    if (smtp_from_name !== undefined) settingsToSave.smtp_from_name = smtp_from_name;

    // Only update passwords if they're not the placeholder
    if (smtp_password && smtp_password !== '********') {
      settingsToSave.smtp_password = smtp_password;
    }
    if (resend_api_key && resend_api_key !== '********') {
      settingsToSave.resend_api_key = resend_api_key;
    }

    await Setting.saveEmailSettings(settingsToSave);

    console.log(`[Settings] Email settings updated by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Configuración de email guardada exitosamente'
    });
  } catch (error) {
    console.error('Update email settings error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al guardar la configuración de email'
    });
  }
});

/**
 * POST /api/settings/email/test
 * Test email configuration by sending a test email (admin only)
 */
router.post('/email/test', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail || !testEmail.includes('@')) {
      return res.status(400).json({
        error: 'Email inválido',
        message: 'Por favor proporciona una dirección de email válida para la prueba'
      });
    }

    // Get current email settings
    const settings = await Setting.getEmailSettings();

    if (!settings.enabled) {
      return res.status(400).json({
        error: 'Email deshabilitado',
        message: 'El servicio de email está deshabilitado. Actívalo primero.'
      });
    }

    if (settings.provider === 'smtp') {
      // Test SMTP connection
      if (!settings.smtp_host) {
        return res.status(400).json({
          error: 'Configuración incompleta',
          message: 'Falta configurar el servidor SMTP'
        });
      }

      try {
        const transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: parseInt(settings.smtp_port) || 587,
          secure: settings.smtp_secure === true || settings.smtp_secure === 'true',
          auth: settings.smtp_user ? {
            user: settings.smtp_user,
            pass: settings.smtp_password
          } : undefined,
          tls: {
            rejectUnauthorized: false // Allow self-signed certs for testing
          }
        });

        // Verify connection
        await transporter.verify();

        // Send test email
        await transporter.sendMail({
          from: `"${settings.smtp_from_name || 'Biblio Admin'}" <${settings.smtp_from_email || settings.smtp_user}>`,
          to: testEmail,
          subject: 'Prueba de Configuración de Email - Biblio Admin',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">¡Prueba Exitosa!</h2>
              <p>Este es un email de prueba enviado desde <strong>Biblio Admin</strong>.</p>
              <p>Si estás leyendo este mensaje, la configuración de email es correcta.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                Fecha: ${new Date().toLocaleString('es-AR')}<br>
                Servidor: ${settings.smtp_host}:${settings.smtp_port}
              </p>
            </div>
          `,
          text: `¡Prueba Exitosa!\n\nEste es un email de prueba enviado desde Biblio Admin.\n\nFecha: ${new Date().toLocaleString('es-AR')}`
        });

        console.log(`[Email Test] Test email sent to ${testEmail} via SMTP`);

        res.json({
          success: true,
          message: `Email de prueba enviado a ${testEmail}`,
          details: {
            provider: 'SMTP',
            server: `${settings.smtp_host}:${settings.smtp_port}`,
            from: settings.smtp_from_email || settings.smtp_user
          }
        });

      } catch (smtpError) {
        console.error('[Email Test] SMTP error:', smtpError);
        res.status(400).json({
          error: 'Error de conexión SMTP',
          message: smtpError.message || 'No se pudo conectar con el servidor SMTP',
          details: {
            code: smtpError.code,
            command: smtpError.command
          }
        });
      }

    } else if (settings.provider === 'resend') {
      // Test Resend
      if (!settings.resend_api_key) {
        return res.status(400).json({
          error: 'Configuración incompleta',
          message: 'Falta configurar la API Key de Resend'
        });
      }

      try {
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key);

        const { data, error } = await resend.emails.send({
          from: settings.smtp_from_email || 'onboarding@resend.dev',
          to: [testEmail],
          subject: 'Prueba de Configuración de Email - Biblio Admin',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">¡Prueba Exitosa!</h2>
              <p>Este es un email de prueba enviado desde <strong>Biblio Admin</strong> usando Resend.</p>
              <p>Si estás leyendo este mensaje, la configuración de email es correcta.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">
                Fecha: ${new Date().toLocaleString('es-AR')}
              </p>
            </div>
          `
        });

        if (error) {
          throw new Error(error.message);
        }

        console.log(`[Email Test] Test email sent to ${testEmail} via Resend`);

        res.json({
          success: true,
          message: `Email de prueba enviado a ${testEmail}`,
          details: {
            provider: 'Resend',
            emailId: data.id
          }
        });

      } catch (resendError) {
        console.error('[Email Test] Resend error:', resendError);
        res.status(400).json({
          error: 'Error de Resend',
          message: resendError.message || 'No se pudo enviar el email via Resend'
        });
      }

    } else {
      return res.status(400).json({
        error: 'Proveedor no configurado',
        message: 'Selecciona un proveedor de email (SMTP o Resend)'
      });
    }

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al enviar el email de prueba'
    });
  }
});

/**
 * GET /api/settings/email/status
 * Get email service status (admin only)
 */
router.get('/email/status', authenticateToken, authorizeRoles('root'), async (req, res) => {
  try {
    const settings = await Setting.getEmailSettings();

    let status = 'unconfigured';
    let message = 'El servicio de email no está configurado';

    if (!settings.enabled) {
      status = 'disabled';
      message = 'El servicio de email está deshabilitado';
    } else if (settings.provider === 'smtp' && settings.smtp_host) {
      status = 'configured';
      message = `Configurado con SMTP (${settings.smtp_host})`;
    } else if (settings.provider === 'resend' && settings.resend_api_key) {
      status = 'configured';
      message = 'Configurado con Resend API';
    } else if (process.env.RESEND_API_KEY) {
      status = 'env_configured';
      message = 'Usando configuración de variables de entorno (Resend)';
    }

    res.json({
      status,
      message,
      enabled: settings.enabled,
      provider: settings.provider
    });
  } catch (error) {
    console.error('Get email status error:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener el estado del email'
    });
  }
});

module.exports = router;
