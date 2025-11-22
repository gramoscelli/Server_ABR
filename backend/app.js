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
// var whatsappRouter = require('./routes/whatsapp'); // Temporarily disabled due to ES module issues

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
const { csrfLimiter } = require('./middleware/rateLimiters');

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

// CSRF token endpoint (requires authentication)
// More permissive rate limit as it's needed for every protected request
app.get('/api/csrf-token', csrfLimiter, authenticateToken, generateCsrfToken);

// CAPTCHA routes (public, no CSRF needed)
app.use('/api/captcha', captchaRouter);

// Authentication routes (public, with specific rate limiting per endpoint)
// CSRF validation enabled for POST/PUT/DELETE operations
// Each route in authRouter has its own specific rate limiter applied
// See middleware/rateLimiters.js and routes/auth.js for specific limits
app.use('/api/auth', validateCsrfToken, authRouter);

// OAuth routes (public, no CSRF needed as OAuth uses state parameter)
app.use('/api/auth/oauth', oauthRouter);

// Protected API routes (require authentication + rate limiting + CSRF validation)
const authenticateEither = require('./middleware/authenticateEither');
app.use('/api/tirada', apiLimiter, authenticateEither, tiradascob); // Accepts JWT or API key, no CSRF needed
app.use('/api/api-keys', apiLimiter, validateCsrfToken, apiKeysRouter); // State-changing, needs CSRF
app.use('/api/admin', apiLimiter, validateCsrfToken, adminRouter); // State-changing, needs CSRF
app.use('/api/csrf', apiLimiter, csrfRouter); // CSRF management routes
app.use('/api/roles', apiLimiter, validateCsrfToken, rolesRouter); // Role management routes
app.use('/api/socios', apiLimiter, sociosRouter); // Socios search routes (read-only, no CSRF needed)
// app.use('/api/whatsapp', apiLimiter, validateCsrfToken, whatsappRouter); // Temporarily disabled - WhatsApp integration routes

// Accounting module routes (protected, state-changing routes need CSRF)
app.use('/api/accounting/expense-categories', apiLimiter, authenticateToken, validateCsrfToken, accountingExpenseCategoriesRouter);
app.use('/api/accounting/income-categories', apiLimiter, authenticateToken, validateCsrfToken, accountingIncomeCategoriesRouter);
app.use('/api/accounting/transfer-types', apiLimiter, authenticateToken, validateCsrfToken, accountingTransferTypesRouter);
app.use('/api/accounting/accounts', apiLimiter, authenticateToken, validateCsrfToken, accountingAccountsRouter);
app.use('/api/accounting/expenses', apiLimiter, authenticateToken, validateCsrfToken, accountingExpensesRouter);
app.use('/api/accounting/incomes', apiLimiter, authenticateToken, validateCsrfToken, accountingIncomesRouter);
app.use('/api/accounting/transfers', apiLimiter, authenticateToken, validateCsrfToken, accountingTransfersRouter);
app.use('/api/accounting/cash-reconciliations', apiLimiter, authenticateToken, validateCsrfToken, accountingCashReconciliationsRouter);
app.use('/api/accounting/dashboard', apiLimiter, authenticateToken, accountingDashboardRouter); // Dashboard is read-only, no CSRF needed


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
