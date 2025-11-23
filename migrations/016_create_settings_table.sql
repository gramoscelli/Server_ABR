-- Migration: Create settings table for system configuration
-- Date: 2024-11-23
-- Description: Stores key-value pairs for system settings (email, security, etc.)

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Setting key (e.g., smtp_host)',
    value TEXT NULL COMMENT 'Setting value (stored as string)',
    category VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT 'Category (email, security, general)',
    description VARCHAR(255) NULL COMMENT 'Human-readable description',
    is_secret BOOLEAN DEFAULT FALSE COMMENT 'If true, value should be masked in UI',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_settings_category (category),
    INDEX idx_settings_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default email settings
INSERT INTO settings (`key`, value, category, description, is_secret) VALUES
('provider', 'smtp', 'email', 'Proveedor de email (smtp, resend)', FALSE),
('smtp_host', '', 'email', 'Servidor SMTP', FALSE),
('smtp_port', '587', 'email', 'Puerto SMTP', FALSE),
('smtp_secure', 'false', 'email', 'Usar TLS/SSL', FALSE),
('smtp_user', '', 'email', 'Usuario SMTP', FALSE),
('smtp_password', '', 'email', 'Contraseña SMTP', TRUE),
('smtp_from_email', '', 'email', 'Email remitente', FALSE),
('smtp_from_name', 'Biblio Admin', 'email', 'Nombre remitente', FALSE),
('resend_api_key', '', 'email', 'API Key de Resend', TRUE),
('enabled', 'false', 'email', 'Habilitar envío de emails', FALSE)
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    is_secret = VALUES(is_secret);
