import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')

fs.mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(path.join(dataDir, 'orders.db'))

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')


// ======================================================
// DATABASE TABLES
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_paise INTEGER NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    featured INTEGER NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    address_line TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_paise INTEGER NOT NULL,
    image TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    razorpay_refund_id TEXT,
    amount_paise INTEGER NOT NULL,
    raw_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
`)


// ======================================================
// DATABASE MIGRATIONS
// ======================================================

const productColumns = db
  .prepare('PRAGMA table_info(products)')
  .all()

const hasImagesColumn = productColumns.some(
  (column) => column.name === 'images',
)

if (!hasImagesColumn) {
  db.exec(`
    ALTER TABLE products
    ADD COLUMN images TEXT NOT NULL DEFAULT '[]'
  `)
}

const hasStockColumn = productColumns.some(
  (column) => column.name === 'stock_quantity',
)

if (!hasStockColumn) {
  db.exec(`
    ALTER TABLE products
    ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0
  `)
}


// ======================================================
// DEFAULT PRODUCTS
// ======================================================

const PRODUCTS = [
  {
    id: 'meenakari-haar',
    name: 'Meenakari Bridal Haar',
    category: 'Necklaces',
    price_paise: 4850000,
    featured: 1,
    image:
      'https://images.unsplash.com/photo-1601121141461-9d7917fa2f54?auto=format&fit=crop&w=900&q=80',
    description:
      'Hand-set kundan and meenakari necklace with matching drops. 22K gold-plated finish for bridal wear.',
  },

  {
    id: 'polki-choker',
    name: 'Polki Pearl Choker',
    category: 'Necklaces',
    price_paise: 3290000,
    featured: 1,
    image:
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',
    description:
      'Close-set polki choker with Basra-style pearls. Lightweight for all-day wedding ceremonies.',
  },

  {
    id: 'temple-jhumkas',
    name: 'Temple Lakshmi Jhumkas',
    category: 'Earrings',
    price_paise: 1850000,
    featured: 1,
    image:
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=900&q=80',
    description:
      'South Indian temple work jhumkas with goddess motifs and antique gold tone.',
  },

  {
    id: 'chandbali-drops',
    name: 'Chandbali Emerald Drops',
    category: 'Earrings',
    price_paise: 2190000,
    featured: 0,
    image:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',
    description:
      'Crescent chandbalis with green glass and kundan. Pair with pastel lehengas.',
  },

  {
    id: 'kada-bangles',
    name: 'Royal Kada Pair',
    category: 'Bangles',
    price_paise: 2750000,
    featured: 1,
    image:
      'https://images.unsplash.com/photo-1611652022419-a73b6dcd47c7?auto=format&fit=crop&w=900&q=80',
    description:
      'Openable kada pair with ruby-tone stones and engraved paisley borders.',
  },

  {
    id: 'glass-bangles',
    name: 'Festive Stack Bangles',
    category: 'Bangles',
    price_paise: 890000,
    featured: 0,
    image:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80',
    description:
      'A stack of gold-tone and enamel bangles for Navratri and sangeet nights.',
  },

  {
    id: 'solitaire-ring',
    name: 'Navratna Statement Ring',
    category: 'Rings',
    price_paise: 1450000,
    featured: 1,
    image:
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80',
    description:
      'Nine-stone navratna ring in a high-polish gold setting. Adjustable inner band.',
  },

  {
    id: 'bridal-set',
    name: 'Jaipur Bridal Set',
    category: 'Bridal Sets',
    price_paise: 8990000,
    featured: 1,
    image:
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
    description:
      'Complete haar, earrings, maang tikka and bangles. Designed for pheras and reception.',
  },
]


// ======================================================
// INSERT DEFAULT PRODUCTS
// ======================================================

const insertProduct = db.prepare(`
  INSERT INTO products (
    id,
    name,
    category,
    price_paise,
    description,
    image,
    images,
    featured,
    stock_quantity
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING
`)

db.exec('BEGIN')

try {
  for (const product of PRODUCTS) {
    insertProduct.run(
      product.id,
      product.name,
      product.category,
      product.price_paise,
      product.description,
      product.image,
      JSON.stringify([product.image]),
      product.featured,
      0,
    )
  }

  db.exec('COMMIT')
} catch (err) {
  db.exec('ROLLBACK')
  throw err
}


// ======================================================
// PRODUCT HELPERS
// ======================================================

function parseImages(product) {
  if (!product) return product

  let images = []

  try {
    images = JSON.parse(product.images || '[]')
  } catch {
    images = []
  }

  if (!Array.isArray(images)) {
    images = []
  }

  // Backward compatibility with old single image field
  if (images.length === 0 && product.image) {
    images = [product.image]
  }

  return {
    ...product,
    images,
  }
}


// ======================================================
// PRODUCT FUNCTIONS
// ======================================================

export function listProducts({ category, featured } = {}) {
  let products

  if (category) {
    products = db
      .prepare(
        'SELECT * FROM products WHERE category = ? ORDER BY name',
      )
      .all(category)
  } else if (featured) {
    products = db
      .prepare(
        'SELECT * FROM products WHERE featured = 1 ORDER BY name',
      )
      .all()
  } else {
    products = db
      .prepare(
        'SELECT * FROM products ORDER BY category, name',
      )
      .all()
  }

  return products.map(parseImages)
}


export function getProduct(id) {
  const product = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(id)

  return parseImages(product)
}


// ======================================================
// CREATE PRODUCT
// ======================================================

export function createProduct(product) {
  const {
    id,
    name,
    category,
    price_paise,
    description = '',
    image = '',
    images = [],
    featured = 0,
    stock_quantity = 0,
  } = product

  const finalImages =
    Array.isArray(images) && images.length > 0
      ? images
      : image
        ? [image]
        : []

  const mainImage = finalImages[0] || image || ''

  db.prepare(`
    INSERT INTO products (
      id,
      name,
      category,
      price_paise,
      description,
      image,
      images,
      featured,
      stock_quantity
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    category,
    price_paise,
    description,
    mainImage,
    JSON.stringify(finalImages),
    featured ? 1 : 0,
    stock_quantity,
  )

  return getProduct(id)
}


// ======================================================
// UPDATE PRODUCT
// ======================================================

export function updateProduct(id, product) {
  const existing = getProduct(id)

  if (!existing) {
    return null
  }

  const {
    name = existing.name,
    category = existing.category,
    price_paise = existing.price_paise,
    description = existing.description,
    image = existing.image,
    images = existing.images || [],
    featured = existing.featured,
    stock_quantity = existing.stock_quantity,
  } = product

  const finalImages =
    Array.isArray(images) && images.length > 0
      ? images
      : image
        ? [image]
        : existing.images || []

  const mainImage = finalImages[0] || image || ''

  const result = db.prepare(`
    UPDATE products
    SET
      name = ?,
      category = ?,
      price_paise = ?,
      description = ?,
      image = ?,
      images = ?,
      featured = ?,
      stock_quantity = ?
    WHERE id = ?
  `).run(
    name,
    category,
    price_paise,
    description,
    mainImage,
    JSON.stringify(finalImages),
    featured ? 1 : 0,
    stock_quantity,
    id,
  )

  return result.changes > 0 ? getProduct(id) : null
}


// ======================================================
// DELETE PRODUCT
// ======================================================

export function deleteProduct(id) {
  const result = db
    .prepare('DELETE FROM products WHERE id = ?')
    .run(id)

  return result.changes > 0
}


// ======================================================
// ORDER FUNCTIONS
// ======================================================

export function createOrder({
  id,
  customer_name,
  customer_email,
  customer_phone,
  address_line,
  city,
  state,
  pincode,
  payment_method,
  payment_status,
  amount_paise,
  items,
}) {
  const now = new Date().toISOString()

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id,
      customer_name,
      customer_email,
      customer_phone,
      address_line,
      city,
      state,
      pincode,
      payment_method,
      payment_status,
      amount_paise,
      currency,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?)
  `)

  const insertItem = db.prepare(`
    INSERT INTO order_items (
      order_id,
      product_id,
      name,
      quantity,
      unit_price_paise,
      image
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertPayment = db.prepare(`
    INSERT INTO payments (
      order_id,
      method,
      status,
      amount_paise,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  db.exec('BEGIN')

  try {
    insertOrder.run(
      id,
      customer_name,
      customer_email || '',
      customer_phone,
      address_line,
      city,
      state,
      pincode,
      payment_method,
      payment_status,
      amount_paise,
      now,
      now,
    )

    for (const item of items) {
      insertItem.run(
        id,
        item.product_id,
        item.name,
        item.quantity,
        item.unit_price_paise,
        item.image || '',
      )
    }

    insertPayment.run(
      id,
      payment_method,
      payment_status,
      amount_paise,
      now,
      now,
    )

    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return getOrder(id)
}


// ======================================================
// GET ORDER
// ======================================================

export function getOrder(id) {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(id)

  if (!order) {
    return null
  }

  const items = db
    .prepare(
      'SELECT * FROM order_items WHERE order_id = ?',
    )
    .all(id)

  const payments = db
    .prepare(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC',
    )
    .all(id)

  return {
    ...order,
    items,
    payments,
  }
}


// ======================================================
// LIST ORDERS
// ======================================================

export function listOrders() {
  const orders = db
    .prepare(
      'SELECT * FROM orders ORDER BY created_at DESC',
    )
    .all()

  return orders.map((order) => getOrder(order.id))
}


// ======================================================
// UPDATE ORDER STATUS
// ======================================================

export function updateOrderStatus(id, payment_status) {
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE orders
    SET payment_status = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    payment_status,
    now,
    id,
  )
}


// ======================================================
// UPDATE LATEST PAYMENT
// ======================================================

export function updateLatestPayment(orderId, fields) {
  const now = new Date().toISOString()

  const payment = db
    .prepare(`
      SELECT id
      FROM payments
      WHERE order_id = ?
      ORDER BY id DESC
      LIMIT 1
    `)
    .get(orderId)

  if (!payment) {
    return
  }

  const allowed = [
    'status',
    'razorpay_order_id',
    'razorpay_payment_id',
    'razorpay_signature',
    'razorpay_refund_id',
    'raw_json',
  ]

  const sets = ['updated_at = ?']
  const values = [now]

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`)
      values.push(fields[key])
    }
  }

  values.push(payment.id)

  db.prepare(`
    UPDATE payments
    SET ${sets.join(', ')}
    WHERE id = ?
  `).run(...values)
}


// ======================================================
// FIND ORDER BY RAZORPAY ORDER ID
// ======================================================

export function findOrderByRazorpayOrderId(razorpayOrderId) {
  const row = db
    .prepare(`
      SELECT order_id
      FROM payments
      WHERE razorpay_order_id = ?
      LIMIT 1
    `)
    .get(razorpayOrderId)

  return row ? getOrder(row.order_id) : null
}


// ======================================================
// EXPORT DATABASE
// ======================================================

export default db