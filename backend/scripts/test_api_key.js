#!/usr/bin/env node
/**
 * Script de Verificación de Claves API
 *
 * Verifica el funcionamiento de una clave API y muestra:
 * - Estado de la clave (activa/inactiva/expirada)
 * - Información de la clave (nombre, fecha de creación, etc.)
 * - Alcance y permisos disponibles
 * - Test de endpoints accesibles
 *
 * Uso:
 *   node scripts/test_api_key.js <API_KEY>
 *   node scripts/test_api_key.js --env  (usa API_KEY del .env)
 *
 * Desde Docker:
 *   docker exec -it nodejs node scripts/test_api_key.js <API_KEY>
 */

const http = require('http');
const https = require('https');

// Configuración
const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = process.env.API_PORT || 3000;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log('═'.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(60), 'cyan');
}

function logResult(label, value, status = 'neutral') {
  const statusColors = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    neutral: 'white',
    info: 'cyan',
  };
  const color = statusColors[status] || 'white';
  console.log(`  ${colors.dim}${label}:${colors.reset} ${colors[color]}${value}${colors.reset}`);
}

/**
 * Realiza una petición HTTP/HTTPS
 */
function makeRequest(path, apiKey, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    };

    const protocol = USE_HTTPS ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout de conexión'));
    });

    req.end();
  });
}

/**
 * Verifica la validez de la clave API
 */
async function verifyApiKey(apiKey) {
  logSection('VERIFICACIÓN DE CLAVE API');

  log(`\n  Probando conexión con: ${API_HOST}:${API_PORT}`, 'dim');
  log(`  Protocolo: ${USE_HTTPS ? 'HTTPS' : 'HTTP'}`, 'dim');

  try {
    // Test básico: endpoint de roles (requiere autenticación)
    const response = await makeRequest('/api/roles', apiKey);

    if (response.status === 200) {
      logResult('Estado', '✓ CLAVE VÁLIDA', 'success');
      return { valid: true, response };
    } else if (response.status === 401) {
      logResult('Estado', '✗ CLAVE INVÁLIDA O EXPIRADA', 'error');
      if (response.data?.message) {
        logResult('Mensaje', response.data.message, 'warning');
      }
      return { valid: false, response };
    } else if (response.status === 403) {
      logResult('Estado', '✗ ACCESO DENEGADO', 'error');
      logResult('Mensaje', response.data?.message || 'Sin permisos suficientes', 'warning');
      return { valid: false, response };
    } else {
      logResult('Estado', `? RESPUESTA INESPERADA (${response.status})`, 'warning');
      return { valid: false, response };
    }
  } catch (error) {
    logResult('Estado', '✗ ERROR DE CONEXIÓN', 'error');
    logResult('Error', error.message, 'error');
    return { valid: false, error };
  }
}

/**
 * Obtiene información de la clave API
 */
async function getApiKeyInfo(apiKey) {
  logSection('INFORMACIÓN DE LA CLAVE');

  try {
    // Las claves API tienen acceso a /api/api-keys si son del usuario root
    const response = await makeRequest('/api/api-keys', apiKey);

    if (response.status === 200 && response.data?.apiKeys) {
      logResult('Claves registradas', response.data.apiKeys.length, 'info');

      // Mostrar información de las claves (sin exponer datos sensibles)
      response.data.apiKeys.forEach((key, index) => {
        console.log();
        log(`  Clave #${index + 1}:`, 'bright');
        logResult('    Nombre', key.name, 'info');
        logResult('    Estado', key.active ? 'Activa' : 'Inactiva', key.active ? 'success' : 'error');
        logResult('    Creada', new Date(key.created_at).toLocaleString('es-AR'), 'neutral');
        if (key.expires_at) {
          const expired = new Date(key.expires_at) < new Date();
          logResult('    Expira', new Date(key.expires_at).toLocaleString('es-AR'), expired ? 'error' : 'warning');
        } else {
          logResult('    Expira', 'Sin expiración', 'success');
        }
        if (key.last_used) {
          logResult('    Último uso', new Date(key.last_used).toLocaleString('es-AR'), 'neutral');
        } else {
          logResult('    Último uso', 'Nunca usada', 'dim');
        }
      });

      return response.data;
    } else {
      logResult('Info', 'No se pudo obtener información de claves', 'warning');
      return null;
    }
  } catch (error) {
    logResult('Error', error.message, 'error');
    return null;
  }
}

/**
 * Prueba el alcance de la clave API en diferentes endpoints
 */
async function testApiScope(apiKey) {
  logSection('ALCANCE Y PERMISOS');

  const endpoints = [
    { path: '/api/roles', name: 'Roles', resource: 'roles' },
    { path: '/api/roles/stats', name: 'Estadísticas de Roles', resource: 'roles' },
    { path: '/api/admin/users', name: 'Usuarios', resource: 'users' },
    { path: '/api/api-keys', name: 'Claves API', resource: 'api_keys' },
    { path: '/api/socios/search?q=test', name: 'Búsqueda de Socios', resource: 'socios' },
    { path: '/api/tirada/current', name: 'Tirada Actual', resource: 'tirada' },
    { path: '/api/accounting/summary', name: 'Resumen Contable', resource: 'accounting' },
  ];

  console.log();
  log('  Probando acceso a endpoints...', 'dim');
  console.log();

  const results = {
    accessible: [],
    restricted: [],
    errors: [],
  };

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.path, apiKey);

      const statusIcon = response.status === 200 ? '✓' :
                         response.status === 401 ? '✗' :
                         response.status === 403 ? '⊘' :
                         response.status === 404 ? '?' : '!';

      const statusColor = response.status === 200 ? 'green' :
                          response.status === 401 ? 'red' :
                          response.status === 403 ? 'yellow' :
                          response.status === 404 ? 'dim' : 'yellow';

      console.log(`  ${colors[statusColor]}${statusIcon}${colors.reset} [${response.status}] ${endpoint.name} (${endpoint.path})`);

      if (response.status === 200) {
        results.accessible.push(endpoint);
      } else if (response.status === 401 || response.status === 403) {
        results.restricted.push({ ...endpoint, status: response.status });
      }
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} [ERR] ${endpoint.name}: ${error.message}`);
      results.errors.push({ ...endpoint, error: error.message });
    }
  }

  // Resumen
  console.log();
  log('  Resumen de Alcance:', 'bright');
  logResult('Endpoints accesibles', results.accessible.length, results.accessible.length > 0 ? 'success' : 'warning');
  logResult('Endpoints restringidos', results.restricted.length, results.restricted.length > 0 ? 'warning' : 'success');
  logResult('Errores', results.errors.length, results.errors.length > 0 ? 'error' : 'success');

  return results;
}

/**
 * Muestra la leyenda de símbolos
 */
function showLegend() {
  logSection('LEYENDA');
  console.log(`  ${colors.green}✓${colors.reset} Acceso permitido (200 OK)`);
  console.log(`  ${colors.red}✗${colors.reset} No autorizado (401 Unauthorized)`);
  console.log(`  ${colors.yellow}⊘${colors.reset} Prohibido (403 Forbidden)`);
  console.log(`  ${colors.dim}?${colors.reset} No encontrado (404 Not Found)`);
  console.log(`  ${colors.yellow}!${colors.reset} Otro código de estado`);
}

/**
 * Función principal
 */
async function main() {
  console.log();
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       VERIFICADOR DE CLAVES API - Biblio-Server            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Obtener la clave API de los argumentos o del entorno
  let apiKey = process.argv[2];

  if (!apiKey) {
    log('\n  Uso: node scripts/test_api_key.js <API_KEY>', 'yellow');
    log('       node scripts/test_api_key.js --env', 'yellow');
    log('\n  Ejemplos:', 'dim');
    log('    node scripts/test_api_key.js abr_live_abc123def456...', 'dim');
    log('    API_KEY=tu_clave node scripts/test_api_key.js --env', 'dim');
    process.exit(1);
  }

  if (apiKey === '--env') {
    apiKey = process.env.API_KEY;
    if (!apiKey) {
      log('\n  Error: Variable de entorno API_KEY no definida', 'red');
      process.exit(1);
    }
  }

  // Mostrar clave parcialmente oculta
  const maskedKey = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
  log(`\n  Clave a verificar: ${maskedKey}`, 'dim');

  // 1. Verificar validez
  const verifyResult = await verifyApiKey(apiKey);

  if (!verifyResult.valid) {
    showLegend();
    log('\n  La clave no es válida o no se pudo verificar.', 'red');
    log('  Verifica que el servidor esté corriendo y la clave sea correcta.\n', 'dim');
    process.exit(1);
  }

  // 2. Obtener información de la clave
  await getApiKeyInfo(apiKey);

  // 3. Probar alcance
  await testApiScope(apiKey);

  // 4. Mostrar leyenda
  showLegend();

  console.log();
  log('  Verificación completada.', 'green');
  console.log();
}

// Ejecutar
main().catch((error) => {
  log(`\n  Error fatal: ${error.message}`, 'red');
  process.exit(1);
});
