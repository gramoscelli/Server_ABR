-- Migration 026: Add audit columns to asiento + asiento_audit table
-- Adds soft delete and tracks who confirmed/voided/deleted each entry

USE accounting;

-- === A. New columns on asiento ===
ALTER TABLE asiento
  ADD COLUMN confirmado_por INT NULL AFTER id_pase_diario,
  ADD COLUMN confirmado_at TIMESTAMP NULL AFTER confirmado_por,
  ADD COLUMN anulado_por INT NULL AFTER confirmado_at,
  ADD COLUMN anulado_at TIMESTAMP NULL AFTER anulado_por,
  ADD COLUMN eliminado BOOLEAN NOT NULL DEFAULT FALSE AFTER anulado_at,
  ADD COLUMN eliminado_por INT NULL AFTER eliminado,
  ADD COLUMN eliminado_at TIMESTAMP NULL AFTER eliminado_por;

-- === B. Create audit table ===
CREATE TABLE IF NOT EXISTS asiento_audit (
  id_audit INT AUTO_INCREMENT PRIMARY KEY,
  id_asiento INT NOT NULL,
  accion ENUM('creado','editado','confirmado','anulado','eliminado','pase_diario') NOT NULL,
  usuario_id INT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  detalle JSON NULL,
  CONSTRAINT fk_audit_asiento FOREIGN KEY (id_asiento)
    REFERENCES asiento(id_asiento) ON DELETE CASCADE,
  INDEX idx_audit_asiento (id_asiento),
  INDEX idx_audit_usuario (usuario_id),
  INDEX idx_audit_accion (accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- === C. Backfill existing data ===

-- Confirmed entries: set confirmado_por = usuario_id, confirmado_at = updated_at
UPDATE asiento
SET confirmado_por = usuario_id,
    confirmado_at = updated_at
WHERE estado = 'confirmado'
  AND confirmado_por IS NULL;

-- Voided entries: set anulado_por from the contra-asiento's usuario_id
UPDATE asiento a
  JOIN asiento contra ON contra.id_asiento_anulado = a.id_asiento
SET a.anulado_por = contra.usuario_id,
    a.anulado_at = contra.created_at
WHERE a.estado = 'anulado'
  AND a.anulado_por IS NULL;

-- Also set confirmado_por for contra-asientos (anulacion entries are created as confirmed)
UPDATE asiento
SET confirmado_por = usuario_id,
    confirmado_at = created_at
WHERE origen = 'anulacion'
  AND estado = 'confirmado'
  AND confirmado_por IS NULL;

-- Insert initial audit rows for all existing entries
INSERT INTO asiento_audit (id_asiento, accion, usuario_id, timestamp, detalle)
SELECT id_asiento, 'creado', usuario_id, created_at,
  JSON_OBJECT('backfill', true, 'origen', origen)
FROM asiento;

-- Insert 'confirmado' audit for confirmed entries
INSERT INTO asiento_audit (id_asiento, accion, usuario_id, timestamp, detalle)
SELECT id_asiento, 'confirmado', COALESCE(confirmado_por, usuario_id), COALESCE(confirmado_at, updated_at),
  JSON_OBJECT('backfill', true)
FROM asiento
WHERE estado = 'confirmado' OR estado = 'anulado';

-- Insert 'anulado' audit for voided entries
INSERT INTO asiento_audit (id_asiento, accion, usuario_id, timestamp, detalle)
SELECT a.id_asiento, 'anulado', COALESCE(a.anulado_por, contra.usuario_id, a.usuario_id),
  COALESCE(a.anulado_at, contra.created_at, a.updated_at),
  JSON_OBJECT('backfill', true, 'contra_asiento_id', contra.id_asiento)
FROM asiento a
  LEFT JOIN asiento contra ON contra.id_asiento_anulado = a.id_asiento
WHERE a.estado = 'anulado';
