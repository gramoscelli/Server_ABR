-- Migration 025: Add subdiario support to asiento table
-- Allows journal entries to belong to a sub-journal (e.g. 'caja')
-- and tracks which summary entry they were posted to via id_pase_diario

USE accounting;

-- Add subdiario column (NULL = libro diario general, 'caja' = subdiario de caja)
ALTER TABLE asiento
  ADD COLUMN subdiario VARCHAR(20) NULL DEFAULT NULL AFTER id_asiento_anulado;

-- Add reference to the summary entry created during "pase al diario"
ALTER TABLE asiento
  ADD COLUMN id_pase_diario INT NULL DEFAULT NULL AFTER subdiario,
  ADD CONSTRAINT fk_asiento_pase_diario
    FOREIGN KEY (id_pase_diario) REFERENCES asiento(id_asiento)
    ON DELETE SET NULL;

-- Extend origen ENUM to include 'pase_subdiario'
ALTER TABLE asiento
  MODIFY COLUMN origen ENUM(
    'manual', 'ingreso', 'egreso', 'transferencia',
    'ajuste', 'compra', 'liquidacion', 'anulacion',
    'pase_subdiario'
  ) NOT NULL DEFAULT 'manual';

-- Index for efficient subdiario queries
CREATE INDEX idx_asiento_subdiario ON asiento(subdiario, id_pase_diario);
CREATE INDEX idx_asiento_subdiario_fecha ON asiento(subdiario, fecha, estado);
