const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Store active WhatsApp connections
const connections = new Map();
const qrCodes = new Map();           // Raw QR data
const qrCodesBase64 = new Map();     // Base64 image QR
const connectionStates = new Map();

// Events emitter for status updates
const { EventEmitter } = require('events');
const statusEmitter = new EventEmitter();

// Default session ID for the server (single instance)
const DEFAULT_SESSION_ID = 'biblio-server';

// Cache for Baileys module (loaded dynamically)
let baileysModule = null;

/**
 * Load Baileys module dynamically (ESM module in CommonJS)
 * @returns {Promise<Object>} Baileys module exports
 */
async function loadBaileys() {
  if (baileysModule) {
    return baileysModule;
  }

  try {
    baileysModule = await import('@whiskeysockets/baileys');
    return baileysModule;
  } catch (error) {
    console.error('Error loading Baileys module:', error);
    throw new Error('Failed to load WhatsApp library');
  }
}

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

    // Load Baileys dynamically
    const baileys = await loadBaileys();
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

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
        // Generate base64 QR code image
        try {
          const qrBase64 = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 2
          });
          qrCodesBase64.set(sessionId, qrBase64);
          connectionStates.set(sessionId, { status: 'qr_ready', qr, qrBase64 });
          statusEmitter.emit('qr', { sessionId, qr, qrBase64 });
        } catch (qrErr) {
          console.error('Error generating QR base64:', qrErr);
          connectionStates.set(sessionId, { status: 'qr_ready', qr });
          statusEmitter.emit('qr', { sessionId, qr });
        }
      }

      if (connection === 'close') {
        // Load Baileys to get DisconnectReason
        const { DisconnectReason: DR } = await loadBaileys();
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DR.loggedOut;

        connectionStates.set(sessionId, {
          status: 'disconnected',
          reason: lastDisconnect?.error?.message
        });

        connections.delete(sessionId);
        qrCodes.delete(sessionId);
        qrCodesBase64.delete(sessionId);

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
        qrCodesBase64.delete(sessionId);
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
  const qrBase64 = qrCodesBase64.get(sessionId);
  const state = connectionStates.get(sessionId);

  if (!qr && state?.status !== 'qr_ready') {
    return {
      success: false,
      message: 'No QR code available. Initialize connection first.',
      status: state?.status || 'not_initialized'
    };
  }

  return {
    success: true,
    qr,
    qrBase64,
    sessionId,
    status: state?.status || 'unknown'
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
    qrCodesBase64.delete(sessionId);
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

/**
 * Get the default session ID
 * @returns {string} Default session ID
 */
function getDefaultSessionId() {
  return DEFAULT_SESSION_ID;
}

/**
 * Check if a session exists (either active or has stored credentials)
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if session exists
 */
function sessionExists(sessionId) {
  const authFolder = path.join(__dirname, '../.whatsapp-auth', sessionId);
  return connections.has(sessionId) || fs.existsSync(authFolder);
}

/**
 * Get stored sessions from auth folder
 * @returns {Array} List of stored session IDs
 */
function getStoredSessions() {
  const authDir = path.join(__dirname, '../.whatsapp-auth');
  if (!fs.existsSync(authDir)) {
    return [];
  }
  return fs.readdirSync(authDir).filter(name => {
    const fullPath = path.join(authDir, name);
    return fs.statSync(fullPath).isDirectory();
  });
}

module.exports = {
  initializeWhatsAppConnection,
  getQRCode,
  sendMessage,
  getConnectionStatus,
  disconnectSession,
  getAllSessions,
  getDefaultSessionId,
  sessionExists,
  getStoredSessions,
  statusEmitter,
  DEFAULT_SESSION_ID
};
