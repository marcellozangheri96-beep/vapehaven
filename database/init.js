const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'vaperoo.db')
  : path.join(__dirname, '..', 'vaperoo.db');
let db = null;
let dbReady = null;

/**
 * Initialize SQLite database with required tables
 */
async function initializeDatabase() {
  const SQL = await initSqlJs({
    // On Vercel, explicitly locate the WASM file from the sql.js package
    locateFile: file => {
      if (process.env.VERCEL) {
        return `https://sql.js.org/dist/${file}`;
      }
      return file;
    }
  });

  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL DEFAULT 49.00,
      category TEXT,
      color TEXT,
      image_silver TEXT,
      image_black TEXT,
      original_price REAL,
      is_top_seller INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 100,
      puffs TEXT,
      capacity TEXT,
      coil TEXT,
      battery TEXT,
      display_type TEXT,
      size_dims TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      address_line2 TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      country TEXT DEFAULT 'AU',
      phone TEXT,
      status TEXT DEFAULT 'pending',
      subtotal REAL NOT NULL,
      shipping REAL DEFAULT 0,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      processor_used TEXT,
      nmi_transaction_id TEXT,
      payment_status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create order_items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Create cart_sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS cart_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create cart_items table
  db.run(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant TEXT DEFAULT 'black',
      quantity INTEGER DEFAULT 1,
      UNIQUE(session_id, product_id, variant),
      FOREIGN KEY (session_id) REFERENCES cart_sessions(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Create monthly_volume table for processor load balancing
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_volume (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      processor_id TEXT NOT NULL,
      month TEXT NOT NULL,
      total_amount REAL DEFAULT 0,
      transaction_count INTEGER DEFAULT 0,
      UNIQUE(processor_id, month)
    )
  `);

  // Seed products if table is empty
  const result = db.exec('SELECT COUNT(*) as count FROM products');
  const count = result.length > 0 ? result[0].values[0][0] : 0;
  if (count === 0) {
    seedProducts();
  }

  // Save to disk
  saveDatabase();
  console.log('Database initialized successfully');
}

/**
 * Save database to disk
 */
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Seed products from products.json
 */
function seedProducts() {
  try {
    const productsPath = path.join(__dirname, 'products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

    const commonSpecs = {
      puffs: 'Up to 9,000',
      capacity: '22ml',
      coil: 'Mesh Coil',
      battery: '2550mAh (Non-rechargeable)',
      display_type: 'Eliquid & Battery Level Display',
      size_dims: '103.5 x 40 x 26 mm'
    };

    const stmt = db.prepare(`
      INSERT INTO products (
        name, slug, description, price, original_price, is_top_seller, category, color,
        image_silver, image_black, stock,
        puffs, capacity, coil, battery, display_type, size_dims
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const product of productsData) {
      stmt.run([
        product.name,
        product.slug,
        product.description,
        product.price,
        product.original_price || null,
        product.is_top_seller ? 1 : 0,
        product.category,
        product.color,
        product.image_silver,
        product.image_black,
        product.stock,
        commonSpecs.puffs,
        commonSpecs.capacity,
        commonSpecs.coil,
        commonSpecs.battery,
        commonSpecs.display_type,
        commonSpecs.size_dims
      ]);
    }
    stmt.free();

    saveDatabase();
    console.log(`Seeded ${productsData.length} products`);
  } catch (error) {
    console.error('Error seeding products:', error.message);
  }
}

/**
 * Get database instance (singleton pattern)
 */
async function getDatabase() {
  if (!db) {
    await initializeDatabase();
  }
  return db;
}

/**
 * Helper: run a query and get all results as array of objects
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: run a query and get first result as object
 */
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Helper: run an INSERT/UPDATE/DELETE and return changes info
 */
function runSql(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] || 0;
  const changes = db.getRowsModified();
  saveDatabase();
  return { lastId, changes };
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Create the ready promise
dbReady = initializeDatabase();

module.exports = {
  getDatabase,
  closeDatabase,
  queryAll,
  queryOne,
  runSql,
  saveDatabase,
  dbReady
};
