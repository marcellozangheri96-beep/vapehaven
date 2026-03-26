require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// ===== Logging Setup =====
const LOG_PATH = process.env.VERCEL
  ? path.join('/tmp', 'server.log')
  : path.join(__dirname, 'server.log');

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level.toUpperCase()}] ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
  console.log(entry);
  try {
    fs.appendFileSync(LOG_PATH, entry + '\n');
  } catch (e) { /* ignore write errors */ }
}

// ===== Process-Level Error Handlers =====
process.on('uncaughtException', (err) => {
  log('FATAL', 'Uncaught Exception — server crashing', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled Promise Rejection', { reason: String(reason), stack: reason?.stack });
});

// Import database initialization
const { closeDatabase, dbReady } = require('./database/init');

// Import routes
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database on startup
console.log('Initializing database...');

// Middleware: Security (relaxed CSP for SPA with inline styles from Google Fonts)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development (Google Fonts, inline styles)
  crossOriginEmbedderPolicy: false
}));

// Middleware: CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Middleware: Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      log('WARN', `${req.method} ${req.path} ${res.statusCode}`, { duration: `${duration}ms`, ip: req.ip });
    }
  });
  next();
});

// Middleware: No-cache for API routes (development)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Middleware: Serve static files (no cache in development)
app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));

// Rate limiting: General API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting: Payment endpoint (stricter)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment attempts per windowMs
  message: 'Too many payment attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST' // Only limit POST requests
});

// Routes
app.use('/api/products', generalLimiter, productsRouter);
app.use('/api/cart', generalLimiter, cartRouter);
app.use('/api/orders', generalLimiter, ordersRouter);
app.use('/api/payments', paymentLimiter, paymentsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Vaperoo API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Sitemap.xml — dynamically generated from products
app.get('/sitemap.xml', async (req, res) => {
  try {
    await dbReady;
    const { queryAll } = require('./database/init');
    const products = queryAll('SELECT slug, name FROM products');
    const bundles = ['tropical-paradise', 'berry-blast', 'sweet-classics', 'mystery-box'];
    const today = new Date().toISOString().split('T')[0];
    const base = 'https://vape-roo.com';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage — highest priority
    xml += `  <url>\n    <loc>${base}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // Product pages
    for (const p of products) {
      xml += `  <url>\n    <loc>${base}/#product/${p.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    // Bundle pages
    for (const slug of bundles) {
      xml += `  <url>\n    <loc>${base}/#bundle/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24h
    res.send(xml);
  } catch (error) {
    log('ERROR', 'Failed to generate sitemap', { error: error.message });
    res.status(500).send('Error generating sitemap');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  log('ERROR', `${req.method} ${req.path} — ${err.message}`, { stack: err.stack });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
async function startServer() {
  // Ensure database is ready before starting server
  await dbReady;

  const server = app.listen(PORT, '0.0.0.0', () => {
    log('INFO', `Vaperoo API server listening on port ${PORT}`);
    log('INFO', `Environment: ${process.env.NODE_ENV || 'development'}`);
    log('INFO', `PID: ${process.pid}`);
  });

  server.on('error', (err) => {
    log('FATAL', 'Server error', { error: err.message, code: err.code });
    if (err.code === 'EADDRINUSE') {
      log('FATAL', `Port ${PORT} is already in use`);
    }
    process.exit(1);
  });

  return server;
}

let server;

// Only start listening when run directly (not on Vercel serverless)
if (!process.env.VERCEL) {
  startServer()
    .then((s) => {
      server = s;
    })
    .catch((error) => {
      log('FATAL', 'Failed to start server', { error: error.message, stack: error.stack });
      process.exit(1);
    });
}

// Graceful shutdown
function shutdown(signal) {
  log('INFO', `${signal} received, gracefully shutting down...`);
  if (server) {
    server.close(() => {
      log('INFO', 'Server closed');
      closeDatabase();
      process.exit(0);
    });
    // Force exit after 5 seconds if graceful shutdown stalls
    setTimeout(() => {
      log('WARN', 'Forced shutdown after timeout');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
