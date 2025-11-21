const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route POST /api/whatsapp/session/init
 * @desc Initialize a new WhatsApp session
 * @access Protected
 */
router.post('/session/init', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    // Use user ID as part of session if not provided explicitly
    const fullSessionId = sessionId || `user_${req.user.id}`;

    const result = await whatsappService.initializeWhatsAppConnection(fullSessionId);

    res.json(result);

  } catch (error) {
    console.error('Error in session init:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize WhatsApp session'
    });
  }
});

/**
 * @route GET /api/whatsapp/session/:sessionId/qr
 * @desc Get QR code for a session
 * @access Protected
 */
router.get('/session/:sessionId/qr', authenticateToken, (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = whatsappService.getQRCode(sessionId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error getting QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code'
    });
  }
});

/**
 * @route GET /api/whatsapp/session/:sessionId/status
 * @desc Get connection status for a session
 * @access Protected
 */
router.get('/session/:sessionId/status', authenticateToken, (req, res) => {
  try {
    const { sessionId } = req.params;

    const status = whatsappService.getConnectionStatus(sessionId);

    res.json(status);

  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session status'
    });
  }
});

/**
 * @route GET /api/whatsapp/sessions
 * @desc Get all active sessions
 * @access Protected
 */
router.get('/sessions', authenticateToken, (req, res) => {
  try {
    const sessions = whatsappService.getAllSessions();

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    });
  }
});

/**
 * @route POST /api/whatsapp/message/send
 * @desc Send a WhatsApp message
 * @access Protected
 */
router.post('/message/send', authenticateToken, async (req, res) => {
  try {
    const { sessionId, to, message } = req.body;

    if (!sessionId || !to || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, to, and message are required'
      });
    }

    // Validate phone number format (basic check)
    const phoneRegex = /^\d{10,15}$/;
    const cleanNumber = to.replace(/[@s.whatsapp.net]/g, '');

    if (!phoneRegex.test(cleanNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Use country code + number (e.g., 5491112345678)'
      });
    }

    const result = await whatsappService.sendMessage(sessionId, to, message);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * @route DELETE /api/whatsapp/session/:sessionId
 * @desc Disconnect and logout from a WhatsApp session
 * @access Protected
 */
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await whatsappService.disconnectSession(sessionId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('Error disconnecting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect session'
    });
  }
});

/**
 * @route POST /api/whatsapp/message/bulk
 * @desc Send bulk WhatsApp messages
 * @access Protected
 */
router.post('/message/bulk', authenticateToken, async (req, res) => {
  try {
    const { sessionId, recipients } = req.body;

    if (!sessionId || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and recipients array are required'
      });
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array cannot be empty'
      });
    }

    if (recipients.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 recipients per bulk send'
      });
    }

    const results = [];

    for (const recipient of recipients) {
      const { to, message } = recipient;

      if (!to || !message) {
        results.push({
          to,
          success: false,
          error: 'Missing to or message field'
        });
        continue;
      }

      const result = await whatsappService.sendMessage(sessionId, to, message);
      results.push({
        to,
        ...result
      });

      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      total: recipients.length,
      successful: successCount,
      failed: recipients.length - successCount,
      results
    });

  } catch (error) {
    console.error('Error sending bulk messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk messages'
    });
  }
});

module.exports = router;
