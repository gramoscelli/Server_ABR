const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Store active WhatsApp connections
const connections = new Map();
const qrCodes = new Map();
const connectionStates = new Map();

// Events emitter for status updates
const { EventEmitter } = require('events');
const statusEmitter = new EventEmitter();

/**
 * Initialize a WhatsApp connection for a given session
 * @param {string} sessionId - Unique identifier for this WhatsApp session
 * @returns {Promise<Object>} Connection status and info
 */
async function initializeWhatsAppConnection(sessionId) {
  try {
    if (connections.has(sessionId)) {
      return {
        success: false,
        message: 'Session already active',
        sessionId
      };
    }

    const authFolder = path.join(__dirname, '../.whatsapp-auth', sessionId);

    // Create auth folder if it doesn't exist
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }), // Reduce console noise
      browser: ['BiblioServer', 'Chrome', '1.0.0']
    });

    // Store connection
    connections.set(sessionId, sock);
    connectionStates.set(sessionId, { status: 'connecting', qr: null });

    // Handle QR code
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodes.set(sessionId, qr);
        connectionStates.set(sessionId, { status: 'qr_ready', qr });
        statusEmitter.emit('qr', { sessionId, qr });
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

        connectionStates.set(sessionId, {
          status: 'disconnected',
          reason: lastDisconnect?.error?.message
        });

        connections.delete(sessionId);
        qrCodes.delete(sessionId);

        if (shouldReconnect) {
          statusEmitter.emit('reconnecting', { sessionId });
          setTimeout(() => initializeWhatsAppConnection(sessionId), 5000);
        } else {
          statusEmitter.emit('logged_out', { sessionId });
        }
      }

      if (connection === 'open') {
        connectionStates.set(sessionId, { status: 'connected' });
        qrCodes.delete(sessionId);
        statusEmitter.emit('connected', { sessionId });
      }
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

    return {
      success: true,
      message: 'WhatsApp connection initiated',
      sessionId,
      status: 'connecting'
    };

  } catch (error) {
    console.error(`Error initializing WhatsApp session ${sessionId}:`, error);
    return {
      success: false,
      message: error.message,
      sessionId
    };
  }
}

/**
 * Get QR code for a session
 * @param {string} sessionId - Session identifier
 * @returns {Object} QR code data
 */
function getQRCode(sessionId) {
  const qr = qrCodes.get(sessionId);
  const state = connectionStates.get(sessionId);

  if (!qr && state?.status !== 'qr_ready') {
    return {
      success: false,
      message: 'No QR code available. Initialize connection first.'
    };
  }

  return {
    success: true,
    qr,
    sessionId
  };
}

/**
 * Send a WhatsApp message
 * @param {string} sessionId - Session identifier
 * @param {string} to - Recipient phone number (with country code, no + or spaces)
 * @param {string} message - Message text
 * @returns {Promise<Object>} Send status
 */
async function sendMessage(sessionId, to, message) {
  try {
    const sock = connections.get(sessionId);

    if (!sock) {
      return {
        success: false,
        message: 'Session not found or not connected'
      };
    }

    // Format phone number (ensure it has @s.whatsapp.net)
    const formattedNumber = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;

    const result = await sock.sendMessage(formattedNumber, { text: message });

    return {
      success: true,
      message: 'Message sent successfully',
      messageId: result.key.id,
      to: formattedNumber
    };

  } catch (error) {
    console.error(`Error sending message from session ${sessionId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get connection status for a session
 * @param {string} sessionId - Session identifier
 * @returns {Object} Connection status
 */
function getConnectionStatus(sessionId) {
  const state = connectionStates.get(sessionId);
  const isConnected = connections.has(sessionId);

  return {
    sessionId,
    active: isConnected,
    state: state || { status: 'not_initialized' }
  };
}

/**
 * Disconnect a WhatsApp session
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object>} Disconnect status
 */
async function disconnectSession(sessionId) {
  try {
    const sock = connections.get(sessionId);

    if (!sock) {
      return {
        success: false,
        message: 'Session not found'
      };
    }

    await sock.logout();
    connections.delete(sessionId);
    qrCodes.delete(sessionId);
    connectionStates.delete(sessionId);

    // Optionally delete auth folder
    const authFolder = path.join(__dirname, '../.whatsapp-auth', sessionId);
    if (fs.existsSync(authFolder)) {
      fs.rmSync(authFolder, { recursive: true, force: true });
    }

    return {
      success: true,
      message: 'Session disconnected successfully',
      sessionId
    };

  } catch (error) {
    console.error(`Error disconnecting session ${sessionId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get all active sessions
 * @returns {Array} List of active session IDs and their states
 */
function getAllSessions() {
  const sessions = [];

  for (const [sessionId, state] of connectionStates.entries()) {
    sessions.push({
      sessionId,
      active: connections.has(sessionId),
      ...state
    });
  }

  return sessions;
}

module.exports = {
  initializeWhatsAppConnection,
  getQRCode,
  sendMessage,
  getConnectionStatus,
  disconnectSession,
  getAllSessions,
  statusEmitter
};
