-- Migration 024: Add link between contra-asiento and original anulado asiento
-- Also add 'anulacion' to origen ENUM

USE accounting;

-- Add column to reference the original voided asiento
ALTER TABLE asiento
  ADD COLUMN id_asiento_anulado INT NULL AFTER usuario_id,
  ADD CONSTRAINT fk_asiento_anulado
    FOREIGN KEY (id_asiento_anulado) REFERENCES asiento(id_asiento)
    ON DELETE SET NULL;

-- Add 'anulacion' to the origen ENUM
ALTER TABLE asiento
  MODIFY COLUMN origen ENUM('manual','ingreso','egreso','transferencia','ajuste','compra','liquidacion','anulacion')
  NOT NULL DEFAULT 'manual';

-- Backfill existing contra-asientos: match by concepto pattern "ANULACIÓN de XXXX-NNNNNN:"
UPDATE asiento ca
  JOIN asiento orig ON ca.concepto LIKE CONCAT('ANULACIÓN de ', orig.nro_comprobante, ':%')
SET ca.id_asiento_anulado = orig.id_asiento,
    ca.origen = 'anulacion'
WHERE ca.id_asiento_anulado IS NULL
  AND ca.concepto LIKE 'ANULACIÓN de %';
