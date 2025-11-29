var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var rateLimit = require('express-rate-limit');
var cors = require('cors');

var tiradascob = require('./routes/tiradascob');
var authRouter = require('./routes/auth');
var oauthRouter = require('./routes/oauth');
var apiKeysRouter = require('./routes/apiKeys');
var adminRouter = require('./routes/admin');
var csrfRouter = require('./routes/csrf');
var rolesRouter = require('./routes/roles');
var captchaRouter = require('./routes/captcha');
var sociosRouter = require('./routes/socios');
var settingsRouter = require('./routes/settings');
var whatsappRouter = require('./routes/whatsapp');

// Accounting routes
var accountingExpenseCategoriesRouter = require('./routes/accounting/expenseCategories');
var accountingIncomeCategoriesRouter = require('./routes/accounting/incomeCategories');
var accountingTransferTypesRouter = require('./routes/accounting/transferTypes');
var accountingAccountsRouter = require('./routes/accounting/accounts');
var accountingExpensesRouter = require('./routes/accounting/expenses');
var accountingIncomesRouter = require('./routes/accounting/incomes');
var accountingTransfersRouter = require('./routes/accounting/transfers');
var accountingCashReconciliationsRouter = require('./routes/accounting/cashReconciliations');
var accountingDashboardRouter = require('./routes/accounting/dashboard');

// Purchase module routes
var purchaseSuppliersRouter = require('./routes/purchases/suppliers');
var purchaseSupplierCategoriesRouter = require('./routes/purchases/supplierCategories');
var purchaseCategoriesRouter = require('./routes/purchases/purchaseCategories');
var purchaseSettingsRouter = require('./routes/purchases/settings');
var purchaseRequestsRouter = require('./routes/purchases/requests');
var purchaseQuotationsRouter = require('./routes/purchases/quotations');
var purchaseOrdersRouter = require('./routes/purchases/orders');

var { authenticateToken } = require('./middleware/auth');
var { generateToken: generateCsrfToken, validateToken: validateCsrfToken } = require('./middleware/csrf');
var passport = require('./config/passport');

var app = express();

// Trust proxy - required for rate limiting to work correctly behind nginx
// This allows Express to trust the X-Forwarded-* headers from the proxy
app.set('trust proxy', 1);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// HTTPS redirect middleware for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Security middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Bootstrap
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration - fail fast if not properly configured
const allowedOrigins = process.env.ALLOWED_ORIGINS;
if (!allowedOrigins) {
  console.error('FATAL ERROR: ALLOWED_ORIGINS environment variable is not set!');
  console.error('Please set ALLOWED_ORIGINS in your .env file (comma-separated list of origins).');
  console.error('Example: ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com');
  process.exit(1);
}

const corsOptions = {
  origin: allowedOrigins.split(',').map(o => o.trim()),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Import specific rate limiters for different endpoints
const { csrfLimiter, authenticatedAwareApiLimiter } = require('./middleware/rateLimiters');

// Rate limiting for general API routes (non-auth)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Demasiadas solicitudes desde esta IP. Por favor, intenta nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(logger('dev'));
app.use(express.json({ limit: '10kb' })); // Limit JSON payload size to prevent DoS
app.use(express.urlencoded({ extended: false, limit: '10kb' })); // Limit URL-encoded payload size
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Passport for OAuth
app.use(passport.initialize());

// Bootstrap 4 y librerías necesarias
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/js', express.static(__dirname + '/node_modules/popper.js/dist'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));

// CSRF token endpoint (optionally authenticated)
// The middleware will capture user ID if authenticated
// More permissive rate limit as it's needed for every protected request
const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : null;

  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invalid or expired, continue without user
    }
  }
  next();
};
app.get('/api/csrf-token', csrfLimiter, optionalAuth, generateCsrfToken);

// CAPTCHA routes (public, no CSRF needed)
app.use('/api/captcha', captchaRouter);

// OAuth routes (public, no CSRF needed as OAuth uses state parameter)
// Must come BEFORE /api/auth routes to match longer paths first
app.use('/api/auth/oauth', oauthRouter);

// Authentication routes (public, with specific rate limiting per endpoint)
// CSRF validation enabled for POST/PUT/DELETE operations
// Each route in authRouter has its own specific rate limiter applied
// See middleware/rateLimiters.js and routes/auth.js for specific limits
app.use('/api/auth', validateCsrfToken, authRouter);

// Protected API routes (require authentication + rate limiting + CSRF validation)
const authenticateEither = require('./middleware/authenticateEither');
app.use('/api/tirada', apiLimiter, authenticateEither, tiradascob); // Accepts JWT or API key, no CSRF needed
app.use('/api/api-keys', apiLimiter, validateCsrfToken, apiKeysRouter); // State-changing, needs CSRF
app.use('/api/admin', apiLimiter, validateCsrfToken, adminRouter); // State-changing, needs CSRF
app.use('/api/csrf', apiLimiter, csrfRouter); // CSRF management routes
app.use('/api/roles', apiLimiter, validateCsrfToken, rolesRouter); // Role management routes
app.use('/api/socios', apiLimiter, sociosRouter); // Socios search routes (read-only, no CSRF needed)
app.use('/api/settings', apiLimiter, validateCsrfToken, settingsRouter); // System settings routes
app.use('/api/whatsapp', apiLimiter, validateCsrfToken, whatsappRouter); // WhatsApp integration routes

// Accounting module routes (protected, state-changing routes need CSRF)
// Note: authenticateToken runs BEFORE rate limiter so authenticated users skip rate limiting
app.use('/api/accounting/expense-categories', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingExpenseCategoriesRouter);
app.use('/api/accounting/income-categories', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingIncomeCategoriesRouter);
app.use('/api/accounting/transfer-types', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingTransferTypesRouter);
app.use('/api/accounting/accounts', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingAccountsRouter);
app.use('/api/accounting/expenses', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingExpensesRouter);
app.use('/api/accounting/incomes', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingIncomesRouter);
app.use('/api/accounting/transfers', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingTransfersRouter);
app.use('/api/accounting/cash-reconciliations', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, accountingCashReconciliationsRouter);
app.use('/api/accounting/dashboard', authenticateToken, authenticatedAwareApiLimiter, accountingDashboardRouter); // Dashboard is read-only, no CSRF needed

// Purchase module routes (protected, state-changing routes need CSRF)
app.use('/api/purchases/suppliers', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, purchaseSuppliersRouter);
app.use('/api/purchases/supplier-categories', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, purchaseSupplierCategoriesRouter);
app.use('/api/purchases/categories', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, purchaseCategoriesRouter);
app.use('/api/purchases/settings', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, purchaseSettingsRouter);
app.use('/api/purchases/requests', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, purchaseRequestsRouter);
app.use('/api/purchases/quotations', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, purchaseQuotationsRouter);
app.use('/api/purchases/orders', authenticateToken, authenticatedAwareApiLimiter, validateCsrfToken, purchaseOrdersRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Return JSON for API endpoints
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(req.app.get('env') === 'development' && { stack: err.stack })
    });
  }

  // Return JSON for all routes (no views configured)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(req.app.get('env') === 'development' && { stack: err.stack })
  });
});

module.exports = app;
