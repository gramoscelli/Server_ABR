-- Migration 027: Create audit_log table for admin audit trail
-- Tracks all administrative actions (user management, role changes, settings, etc.)

USE abr;

CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  accion VARCHAR(50) NOT NULL COMMENT 'Action performed (e.g. user.create, user.delete, role.update)',
  entidad VARCHAR(50) NOT NULL COMMENT 'Entity type (e.g. user, role, api_key, setting)',
  entidad_id INT NULL COMMENT 'ID of the affected entity',
  usuario_id INT NOT NULL COMMENT 'User who performed the action',
  detalle JSON NULL COMMENT 'Additional context (previous values, changes, etc.)',
  ip VARCHAR(45) NULL COMMENT 'IP address of the request',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_usuario (usuario_id),
  INDEX idx_audit_entidad (entidad, entidad_id),
  INDEX idx_audit_accion (accion),
  INDEX idx_audit_created (created_at),

  CONSTRAINT fk_audit_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
