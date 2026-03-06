-- ============================================================================
-- Migration: Plan de Cuentas for ABR Accounting System
-- Created: 2026-03-06
-- Description: Creates plan_de_cuentas table with real ABR chart of accounts
--              and links to expenses, incomes, and accounts tables
-- ============================================================================

USE accounting;

-- ============================================================================
-- 1. CREATE plan_de_cuentas TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS `plan_de_cuentas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` INT NOT NULL UNIQUE COMMENT 'e.g., 1101, 4101, 5501',
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Account name (e.g., CAJA, CUOTAS SOCIALES)',
  `tipo` ENUM('activo','pasivo','ingreso','egreso') NOT NULL COMMENT '1=activo,2=pasivo,4=ingreso,5=egreso',
  `grupo` VARCHAR(10) NOT NULL COMMENT 'Group prefix (11, 12, 41, 51, etc.)',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tipo (`tipo`),
  INDEX idx_codigo (`codigo`),
  INDEX idx_grupo (`grupo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. POPULATE ALL ABR ACCOUNTS FROM PLAN DE CUENTAS
-- ============================================================================

-- ACTIVO (1xxx) - Assets
INSERT INTO `plan_de_cuentas` (`codigo`, `nombre`, `tipo`, `grupo`) VALUES
(1101, 'CAJA', 'activo', '11'),
(1201, 'BANCO NACION CTA CTE', 'activo', '12'),
(1202, 'BANCO PROVINCIA CTA CTE', 'activo', '12'),
(1203, 'BANCO PZO FIJO', 'activo', '12'),
(1204, 'MERCADOPAGO', 'activo', '12'),
(1205, 'BANCO CREDICOOP', 'activo', '12'),
(1207, 'MONEDA EXTRANJERA', 'activo', '12'),
(1208, 'BANCO PROVINCIA TEATRO', 'activo', '12'),
(1209, 'BANCO FCI', 'activo', '12'),
(1301, 'CUOTAS DE ASOCIADOS A COBRAR', 'activo', '13'),
(1302, 'PARQUIMETROS A COBRAR', 'activo', '13'),
(1304, 'ADELANTO A COBRADORES', 'activo', '13'),
(1305, 'TARJETAS A COBRAR', 'activo', '13'),
(1306, 'CH PENDIENTE DE ACREDITACION', 'activo', '13'),
(1307, 'TRANSFERENCIAS A ACREDITAR', 'activo', '13'),
(1310, 'M PAGO A ACREDITAR', 'activo', '13'),
(1501, 'MATERIAL BIBLIOGRAFICO', 'activo', '15'),
(1502, 'MATERIAL FILMICO', 'activo', '15'),
(1503, 'EQUIPOS E INSTALACIONES', 'activo', '15'),
(1504, 'HEMEROTECA', 'activo', '15'),
(1601, 'AV. COLON 31', 'activo', '16'),
(1602, 'AV. COLON 48', 'activo', '16');

-- PASIVO (2xxx) - Liabilities
INSERT INTO `plan_de_cuentas` (`codigo`, `nombre`, `tipo`, `grupo`) VALUES
(2101, 'ENTRADAS A LIQUIDAR', 'pasivo', '21'),
(2105, 'ALQUILER COBRADO POR ADELANTADO', 'pasivo', '21'),
(2106, 'PRESTAMOS TOMADOS', 'pasivo', '21'),
(2301, 'SUELDOS A PAGAR', 'pasivo', '23'),
(2302, 'APORTES A PAGAR OBRA SOCIAL', 'pasivo', '23'),
(2303, 'APORTES A PAGAR SEG SOCIAL', 'pasivo', '23'),
(2304, 'CONTRIB A PAGAR OBRA SOCIAL', 'pasivo', '23'),
(2305, 'CONTRIB A PAGAR SEG SOCIAL', 'pasivo', '23'),
(2306, 'A.R.T. A PAGAR', 'pasivo', '23'),
(2307, 'SEG DE VIDA A PAGAR', 'pasivo', '23'),
(2308, 'SINDICALES A PAGAR', 'pasivo', '23'),
(2309, 'ALGO A PAGAR', 'pasivo', '23'),
(2310, 'COSEGURO A DEPOSITAR', 'pasivo', '23'),
(2311, 'PLAN 140 CUOTAS AFIP 2013', 'pasivo', '23'),
(2312, 'PLAN 2020 DEUDA AFIP', 'pasivo', '23');

-- INGRESOS (4xxx) - Income/Revenue
INSERT INTO `plan_de_cuentas` (`codigo`, `nombre`, `tipo`, `grupo`) VALUES
(4101, 'CUOTAS SOCIALES', 'ingreso', '41'),
(4102, 'BONOS CONSULTA', 'ingreso', '41'),
(4103, 'BONOS CONTRIBUCION', 'ingreso', '41'),
(4104, 'CURSOS', 'ingreso', '41'),
(4105, 'ESPECTACULOS', 'ingreso', '41'),
(4106, 'ALQUILERES UNS COLON 48', 'ingreso', '41'),
(4501, 'CONTRIBUCION POR USO SALAS', 'ingreso', '45'),
(4502, 'DONACION POR CONVENIOS', 'ingreso', '45'),
(4503, 'DONACIONES VARIAS', 'ingreso', '45'),
(4504, 'DONACIONES 12600', 'ingreso', '45'),
(4505, 'BORDERO Y RECUPERO GASTOS BRIO', 'ingreso', '45'),
(4506, 'CONVENIO SALAS TEATRO MUNIC', 'ingreso', '45'),
(4508, 'PARA AGREGAR', 'ingreso', '45'),
(4701, 'SUBSIDIOS NACIONALES', 'ingreso', '47'),
(4702, 'SUBSIDIOS PROVINCIALES', 'ingreso', '47'),
(4703, 'SUBSIDIOS MUNICIPAL', 'ingreso', '47'),
(4704, 'PARQUIMETROS', 'ingreso', '47'),
(4801, 'RENDIMIENTOS M PAGO', 'ingreso', '48'),
(4802, 'INTERESES P FIJO Y REND FCI', 'ingreso', '48');

-- EGRESOS (5xxx) - Expenses
INSERT INTO `plan_de_cuentas` (`codigo`, `nombre`, `tipo`, `grupo`) VALUES
(5101, 'REMUNERACION DE PERSONAL', 'egreso', '51'),
(5102, 'REMUNERACION COBRADORES', 'egreso', '51'),
(5103, 'CARGAS SOCIALES', 'egreso', '51'),
(5104, 'HONORARIOS', 'egreso', '51'),
(5105, 'MOVILIDAD Y VIATICOS', 'egreso', '51'),
(5106, 'COMISIONES BANCARIAS', 'egreso', '51'),
(5107, 'GRAVAMEN LEY 25413 D/C', 'egreso', '51'),
(5108, 'MENSAJERIA', 'egreso', '51'),
(5109, 'PAPELERIA Y UTILES', 'egreso', '51'),
(5110, 'FOTOCOPIA E IMPRESIONES', 'egreso', '51'),
(5111, 'TELEFONO', 'egreso', '51'),
(5112, 'INTERNET', 'egreso', '51'),
(5113, 'MUSICA AMBIENTAL', 'egreso', '51'),
(5114, 'SUSCRIPCIONES', 'egreso', '51'),
(5115, 'ENCUADERNACIONES', 'egreso', '51'),
(5116, 'GASTOS EXTRAS EXPLOTACION', 'egreso', '51'),
(5117, 'INTERESES PLANES AFIP', 'egreso', '51'),
(5118, 'AMORTIZACIONES', 'egreso', '51'),
(5119, 'SEGUROS DE PERSONAL', 'egreso', '51'),
(5120, 'SEGUROS', 'egreso', '51'),
(5121, 'GUARDAMUEBLES', 'egreso', '51'),
(5122, 'VIGILANCIA', 'egreso', '51'),
(5123, 'ROPA TRABAJO PERSONAL', 'egreso', '51'),
(5124, 'GASTOS ADMINISTRATIVOS', 'egreso', '51'),
(5125, 'DEUDAS ANTERIORES', 'egreso', '51'),
(5126, 'ARBA', 'egreso', '51'),
(5129, 'INTERESES IMPOSITIVOS', 'egreso', '51'),
(5130, 'GASTOS TARJETAS ENTRADA UNO', 'egreso', '51'),
(5131, 'CERTIFICACION BALANCES', 'egreso', '51'),
(5132, 'GASTOS BCO PCIA TEATRO', 'egreso', '51'),
(5133, 'LEY 25413 BCO PCIA TEATRO', 'egreso', '51'),
(5501, 'ENERGIA ELECTRICA', 'egreso', '55'),
(5502, 'GAS', 'egreso', '55'),
(5503, 'SS SANITARIOS', 'egreso', '55'),
(5504, 'LIMPIEZA', 'egreso', '55'),
(5505, 'MANTENIMIENTO DE MAQUINAS', 'egreso', '55'),
(5506, 'MANTENIMIENTO DE EDIFICIO', 'egreso', '55'),
(5507, 'SERVICIO DE TERCEROS', 'egreso', '55');

-- ============================================================================
-- 3. ADD plan_cta_id COLUMNS TO expenses, incomes, accounts
-- ============================================================================

ALTER TABLE `expenses`
  ADD COLUMN `plan_cta_id` INT NULL AFTER `category_id`,
  ADD CONSTRAINT `fk_expenses_plan_cta`
    FOREIGN KEY (`plan_cta_id`) REFERENCES `plan_de_cuentas`(`id`) ON DELETE SET NULL,
  ADD INDEX `idx_expenses_plan_cta_id` (`plan_cta_id`);

ALTER TABLE `incomes`
  ADD COLUMN `plan_cta_id` INT NULL AFTER `category_id`,
  ADD CONSTRAINT `fk_incomes_plan_cta`
    FOREIGN KEY (`plan_cta_id`) REFERENCES `plan_de_cuentas`(`id`) ON DELETE SET NULL,
  ADD INDEX `idx_incomes_plan_cta_id` (`plan_cta_id`);

ALTER TABLE `accounts`
  ADD COLUMN `plan_cta_id` INT NULL AFTER `notes`,
  ADD CONSTRAINT `fk_accounts_plan_cta`
    FOREIGN KEY (`plan_cta_id`) REFERENCES `plan_de_cuentas`(`id`) ON DELETE SET NULL,
  ADD INDEX `idx_accounts_plan_cta_id` (`plan_cta_id`);

-- ============================================================================
-- 4. SEED DEFAULT ACCOUNTS WITH plan_cta_id REFERENCES
-- ============================================================================

UPDATE `accounts` SET `plan_cta_id` = (SELECT id FROM plan_de_cuentas WHERE codigo = 1101)
  WHERE name = 'Caja Principal';

UPDATE `accounts` SET `plan_cta_id` = (SELECT id FROM plan_de_cuentas WHERE codigo = 1201)
  WHERE name = 'Banco Nación';

UPDATE `accounts` SET `plan_cta_id` = (SELECT id FROM plan_de_cuentas WHERE codigo = 1202)
  WHERE name = 'Banco Provincia';

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

SELECT 'Migration 018: plan_de_cuentas completed successfully' AS status;
SELECT COUNT(*) AS total_accounts FROM plan_de_cuentas;
SELECT COUNT(DISTINCT tipo) AS account_types FROM plan_de_cuentas;
