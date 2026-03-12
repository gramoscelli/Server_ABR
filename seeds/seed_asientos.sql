USE `accounting`;

-- 1. Cobro cuotas sociales en caja (5 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-05', '2026-000001', 'ingreso', 'Cobro cuotas sociales - primera quincena enero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 1, 'debe', 185000.00),
(@a, 38, 'haber', 185000.00);

-- 2. Depósito en Banco Nación (6 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-06', '2026-000002', 'transferencia', 'Depósito recaudación en Banco Nación', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 2, 'debe', 150000.00),
(@a, 1, 'haber', 150000.00);

-- 3. Pago internet (10 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-10', '2026-000003', 'egreso', 'Servicio de internet enero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 68, 'debe', 12800.00),
(@a, 2, 'haber', 12800.00);

-- 4. Pago luz (15 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-15', '2026-000004', 'egreso', 'Factura energía eléctrica enero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 88, 'debe', 45200.00),
(@a, 1, 'haber', 45200.00);

-- 5. Pago gas (15 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-15', '2026-000005', 'egreso', 'Factura gas enero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 89, 'debe', 18500.00),
(@a, 1, 'haber', 18500.00);

-- 6. Cobro cuotas segunda quincena (20 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-20', '2026-000006', 'ingreso', 'Cobro cuotas sociales - segunda quincena enero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 1, 'debe', 162000.00),
(@a, 38, 'haber', 162000.00);

-- 7. Ingreso por espectáculo (25 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-25', '2026-000007', 'ingreso', 'Recaudación función teatro 25/01', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 1, 'debe', 78000.00),
(@a, 42, 'haber', 78000.00);

-- 8. Pago sueldos enero (31 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-31', '2026-000008', 'egreso', 'Sueldos personal enero 2026', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 57, 'debe', 420000.00),
(@a, 2, 'haber', 420000.00);

-- 9. Pago cargas sociales enero (31 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-31', '2026-000009', 'egreso', 'Cargas sociales enero 2026', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 59, 'debe', 138600.00),
(@a, 2, 'haber', 138600.00);

-- 10. Pago limpieza enero (31 de enero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-01-31', '2026-000010', 'egreso', 'Servicio de limpieza enero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 91, 'debe', 35000.00),
(@a, 1, 'haber', 35000.00);

-- 11. Cobro cuotas febrero (5 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-05', '2026-000011', 'ingreso', 'Cobro cuotas sociales - primera quincena febrero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 1, 'debe', 191000.00),
(@a, 38, 'haber', 191000.00);

-- 12. Cobro bonos contribución por MercadoPago (8 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-08', '2026-000012', 'ingreso', 'Cobro bonos contribución por MercadoPago', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 5, 'debe', 52000.00),
(@a, 40, 'haber', 52000.00);

-- 13. Pago honorarios contador (10 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-10', '2026-000013', 'egreso', 'Honorarios profesionales - estudio contable febrero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 60, 'debe', 85000.00),
(@a, 2, 'haber', 85000.00);

-- 14. Depósito en Banco Provincia (12 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-12', '2026-000014', 'transferencia', 'Depósito recaudación en Banco Provincia', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 3, 'debe', 120000.00),
(@a, 1, 'haber', 120000.00);

-- 15. Compra material bibliográfico (18 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-18', '2026-000015', 'egreso', 'Compra libros - lote febrero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 17, 'debe', 67000.00),
(@a, 2, 'haber', 67000.00);

-- 16. Subsidio municipal (20 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-20', '2026-000016', 'ingreso', 'Subsidio municipal - convenio cultural 2026', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 2, 'debe', 350000.00),
(@a, 53, 'haber', 350000.00);

-- 17. Cobro parquímetros febrero (25 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-25', '2026-000017', 'ingreso', 'Recaudación parquímetros febrero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 1, 'debe', 95000.00),
(@a, 54, 'haber', 95000.00);

-- 18. Pago sueldos febrero (28 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-28', '2026-000018', 'egreso', 'Sueldos personal febrero 2026', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 57, 'debe', 420000.00),
(@a, 2, 'haber', 420000.00);

-- 19. Pago vigilancia febrero (28 de febrero)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-02-28', '2026-000019', 'egreso', 'Servicio de vigilancia febrero', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 78, 'debe', 42000.00),
(@a, 1, 'haber', 42000.00);

-- 20. Alquiler UNS Colón 48 (1 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-01', '2026-000020', 'ingreso', 'Alquiler UNS - Colón 48 marzo 2026', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 2, 'debe', 120000.00),
(@a, 43, 'haber', 120000.00);

-- 21. Cobro cuotas marzo (5 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-05', '2026-000021', 'ingreso', 'Cobro cuotas sociales - primera quincena marzo', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 1, 'debe', 198000.00),
(@a, 38, 'haber', 198000.00);

-- 22. Pago mantenimiento edificio (5 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-05', '2026-000022', 'egreso', 'Reparación cañerías sede Colón 31', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 93, 'debe', 58000.00),
(@a, 1, 'haber', 58000.00);

-- 23. Pago ARBA (8 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-08', '2026-000023', 'egreso', 'Impuesto inmobiliario ARBA - 1er bimestre', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 82, 'debe', 28500.00),
(@a, 2, 'haber', 28500.00);

-- 24. Rendimiento MercadoPago (10 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-10', '2026-000024', 'ingreso', 'Rendimientos cuenta MercadoPago marzo', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 5, 'debe', 3200.00),
(@a, 55, 'haber', 3200.00);

-- 25. Pago seguros (10 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-10', '2026-000025', 'egreso', 'Póliza seguros edificio trimestral', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 76, 'debe', 45000.00),
(@a, 2, 'haber', 45000.00);

-- 26. Pago teléfono (12 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-12', '2026-000026', 'egreso', 'Servicio telefónico marzo', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 67, 'debe', 9500.00),
(@a, 1, 'haber', 9500.00);

-- 27. Espectáculo teatro marzo (15 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-15', '2026-000027', 'ingreso', 'Recaudación obra de teatro 15/03', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 1, 'debe', 92000.00),
(@a, 42, 'haber', 92000.00);

-- 28. Donación recibida (22 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-22', '2026-000028', 'ingreso', 'Donación Fundación Cultural del Sur', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 2, 'debe', 200000.00),
(@a, 46, 'haber', 200000.00);

-- 29. Pago comisiones bancarias (31 de marzo)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-31', '2026-000029', 'egreso', 'Comisiones y mantenimiento cuenta Banco Nación', 'confirmado', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 62, 'debe', 8900.00),
(@a, 2, 'haber', 8900.00);

-- 30. Asiento borrador (pendiente aprobación)
INSERT INTO asiento (fecha, nro_comprobante, origen, concepto, estado, usuario_id)
VALUES ('2026-03-20', '2026-000030', 'egreso', 'Compra equipamiento informático (pendiente aprobación)', 'borrador', 1);
SET @a = LAST_INSERT_ID();
INSERT INTO asiento_detalle (id_asiento, id_cuenta, tipo_mov, importe) VALUES
(@a, 19, 'debe', 250000.00),
(@a, 3, 'haber', 250000.00);
