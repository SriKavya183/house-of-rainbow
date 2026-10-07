import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import multer from 'multer'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  findOrderByRazorpayOrderId,
  getOrder,
  getProduct,
  listOrders,
  listProducts,
  updateLatestPayment,
  updateOrderStatus,
} from './db.js'
import { createRazorpayClient, getPublicKeyId, getRazorpayMode, isRazorpayConfigured } from './razorpay.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads')

fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const filename = `${crypto.randomUUID()}${ext}`

    cb(null, filename)
  },
})

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8,
  },

  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error('Only JPG, PNG and WEBP images are allowed'),
      )
    }

    cb(null, true)
  },
})
const PORT = Number(process.env.PORT || 3001)
const adminSessions = new Map()

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
)
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf
    },
  }),
)
app.use(cookieParser())
app.use('/uploads', express.static(uploadsDir))
function nowId() {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `HOR-${stamp}${rand}`
}

function publicOrder(order) {
  if (!order) return null
  return {
    id: order.id,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    address_line: order.address_line,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    amount_paise: order.amount_paise,
    currency: order.currency,
    created_at: order.created_at,
    items: order.items,
    payments: (order.payments || []).map((p) => ({
      method: p.method,
      status: p.status,
      razorpay_order_id: p.razorpay_order_id,
      razorpay_payment_id: p.razorpay_payment_id,
      razorpay_refund_id: p.razorpay_refund_id,
      amount_paise: p.amount_paise,
      updated_at: p.updated_at,
    })),
  }
}

function requireAdmin(req, res, next) {
  const token = req.cookies.hor_admin
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Admin login required' })
  }
  next()
}
app.post(
  '/api/admin/upload',
  requireAdmin,
  upload.array('images', 4),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Please select at least one image',
      })
    }

    const images = req.files.map(
      (file) => `/uploads/${file.filename}`,
    )

    res.json({
      images,
    })
  },
)
app.get('/api/config', (_req, res) => {
  const configured = isRazorpayConfigured()
  const mode = getRazorpayMode()
  const liveReady = configured && mode === 'live' && (process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_live_')
  res.json({
    storeName: 'House of Rainbow',
    razorpayKeyId: getPublicKeyId(),
    razorpayConfigured: configured,
    mode: liveReady ? 'live' : 'test',
    paymentsLive: liveReady,
    testModeBanner: !liveReady,
  })
})

app.get('/api/products', (req, res) => {
  const category = req.query.category
  const featured = req.query.featured === '1' || req.query.featured === 'true'
  res.json(listProducts({ category, featured }))
})

app.get('/api/products/:id', (req, res) => {
  const product = getProduct(req.params.id)
  if (!product) return res.status(404).json({ error: 'Product not found' })
  res.json(product)
})

app.post('/api/orders', (req, res) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    address_line,
    city,
    state,
    pincode,
    payment_method,
    items,
  } = req.body || {}

  if (!customer_name || !customer_phone || !address_line || !city || !state || !pincode) {
    return res.status(400).json({ error: 'Please fill name, phone and full address' })
  }
  if (!['razorpay', 'cod'].includes(payment_method)) {
    return res.status(400).json({ error: 'Choose Razorpay or Cash on Delivery' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' })
  }

  const lineItems = []
  let amount_paise = 0
  for (const item of items) {
    const product = getProduct(item.product_id)
    if (!product) return res.status(400).json({ error: `Unknown product ${item.product_id}` })
    const quantity = Math.max(1, Number(item.quantity) || 1)
    amount_paise += product.price_paise * quantity
    lineItems.push({
      product_id: product.id,
      name: product.name,
      quantity,
      unit_price_paise: product.price_paise,
      image: product.image,
    })
  }

  const payment_status = payment_method === 'cod' ? 'pending_cod' : 'pending'
  const order = createOrder({
    id: nowId(),
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
    items: lineItems,
  })

  res.status(201).json(publicOrder(order))
})

app.get('/api/orders/:id', (req, res) => {
  const order = getOrder(req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(publicOrder(order))
})

app.post('/api/payments/create-order', async (req, res) => {
  const { orderId } = req.body || {}
  const order = getOrder(orderId)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.payment_method !== 'razorpay') {
    return res.status(400).json({ error: 'This order is Cash on Delivery' })
  }
  if (!isRazorpayConfigured()) {
    return res.status(503).json({
      error:
        'Razorpay test keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env. Payments are not live.',
    })
  }

  try {
    const razorpay = createRazorpayClient()
    const rzpOrder = await razorpay.orders.create({
      amount: order.amount_paise,
      currency: 'INR',
      receipt: order.id,
      notes: { store_order_id: order.id },
    })
    updateLatestPayment(order.id, {
      status: 'pending',
      razorpay_order_id: rzpOrder.id,
      raw_json: JSON.stringify(rzpOrder),
    })
    updateOrderStatus(order.id, 'pending')
    res.json({
      keyId: getPublicKeyId(),
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      orderId: order.id,
      mode: getRazorpayMode(),
    })
  } catch (err) {
    updateOrderStatus(order.id, 'failed')
    updateLatestPayment(order.id, { status: 'failed', raw_json: JSON.stringify({ message: err.message }) })
    res.status(502).json({ error: 'Could not create Razorpay order. Check test keys and try again.' })
  }
})

app.post('/api/payments/verify', (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}
  const order = getOrder(orderId)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (!isRazorpayConfigured()) {
    return res.status(503).json({ error: 'Razorpay is not configured' })
  }
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    updateOrderStatus(order.id, 'failed')
    updateLatestPayment(order.id, { status: 'failed' })
    return res.status(400).json({ error: 'Missing payment details', payment_status: 'failed' })
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expected !== razorpay_signature) {
    updateOrderStatus(order.id, 'failed')
    updateLatestPayment(order.id, {
      status: 'failed',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    })
    return res.status(400).json({ error: 'Payment signature mismatch', payment_status: 'failed' })
  }

  updateOrderStatus(order.id, 'paid')
  updateLatestPayment(order.id, {
    status: 'paid',
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  })
  res.json({ ok: true, payment_status: 'paid', order: publicOrder(getOrder(order.id)) })
})

app.post('/api/payments/mark-status', (req, res) => {
  const { orderId, status } = req.body || {}
  const order = getOrder(orderId)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (!['failed', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  if (order.payment_status === 'paid' || order.payment_status === 'refunded') {
    return res.json(publicOrder(order))
  }
  updateOrderStatus(order.id, status)
  updateLatestPayment(order.id, { status })
  res.json(publicOrder(getOrder(order.id)))
})

app.post('/api/payments/webhook', (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return res.status(503).json({ error: 'Webhook secret not set' })
  }
  const signature = req.headers['x-razorpay-signature']
  const body = req.rawBody || Buffer.from(JSON.stringify(req.body))
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (expected !== signature) {
    return res.status(400).json({ error: 'Invalid webhook signature' })
  }

  const event = req.body?.event
  const paymentEntity = req.body?.payload?.payment?.entity
  const razorpayOrderId = paymentEntity?.order_id
  if (!razorpayOrderId) return res.json({ ok: true })

  const order = findOrderByRazorpayOrderId(razorpayOrderId)
  if (!order) return res.json({ ok: true })

  if (event === 'payment.captured') {
    updateOrderStatus(order.id, 'paid')
    updateLatestPayment(order.id, {
      status: 'paid',
      razorpay_payment_id: paymentEntity.id,
      raw_json: JSON.stringify(req.body),
    })
  } else if (event === 'payment.failed') {
    if (order.payment_status !== 'paid') {
      updateOrderStatus(order.id, 'failed')
      updateLatestPayment(order.id, { status: 'failed', raw_json: JSON.stringify(req.body) })
    }
  } else if (event === 'order.paid') {
    updateOrderStatus(order.id, 'paid')
    updateLatestPayment(order.id, { status: 'paid', raw_json: JSON.stringify(req.body) })
  }

  res.json({ ok: true })
})

app.post('/api/admin/login', (req, res) => {
  const password = req.body?.password
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' })
  }
  const token = crypto.randomBytes(24).toString('hex')
  adminSessions.set(token, Date.now())
  res.cookie('hor_admin', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12,
  })
  res.json({ ok: true })
})

app.post('/api/admin/logout', (req, res) => {
  const token = req.cookies.hor_admin
  if (token) adminSessions.delete(token)
  res.clearCookie('hor_admin')
  res.json({ ok: true })
})

app.get('/api/admin/session', (req, res) => {
  const token = req.cookies.hor_admin
  res.json({ authenticated: Boolean(token && adminSessions.has(token)) })
})

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  res.json(listOrders().map(publicOrder))
})

app.post('/api/admin/orders/:id/refund', requireAdmin, async (req, res) => {
  const order = getOrder(req.params.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })

  if (order.payment_method === 'cod') {
    updateOrderStatus(order.id, 'refunded')
    updateLatestPayment(order.id, { status: 'refunded' })
    return res.json(publicOrder(getOrder(order.id)))
  }

  const paymentId = order.payments?.[0]?.razorpay_payment_id
  if (!paymentId || order.payment_status !== 'paid') {
    return res.status(400).json({ error: 'Only captured Razorpay payments can be refunded here' })
  }
  if (!isRazorpayConfigured()) {
    return res.status(503).json({ error: 'Razorpay is not configured' })
  }

  try {
    const razorpay = createRazorpayClient()
    const refund = await razorpay.payments.refund(paymentId, {
      amount: order.amount_paise,
      notes: { store_order_id: order.id },
    })
    updateOrderStatus(order.id, 'refunded')
    updateLatestPayment(order.id, {
      status: 'refunded',
      razorpay_refund_id: refund.id,
      raw_json: JSON.stringify(refund),
    })
    res.json(publicOrder(getOrder(order.id)))
  } catch (err) {
    res.status(502).json({ error: err.error?.description || err.message || 'Refund failed' })
  }
})

// ADMIN PRODUCT MANAGEMENT

// Get all products (admin)
app.get('/api/admin/products', requireAdmin, (_req, res) => {
  res.json(listProducts())
})

// Add a new product
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const {
    name,
    category,
    price_paise,
    description = '',
    image = '',
    featured = false,
    stock_quantity = 0,
  } = req.body || {}

  if (!name?.trim() || !category?.trim()) {
    return res.status(400).json({
      error: 'Product name and category are required',
    })
  }

  const price = Number(price_paise)
  const stock = Number(stock_quantity)

  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({
      error: 'Enter a valid price',
    });
  }

  if (!Number.isSafeInteger(stock) || stock < 0) {
    return res.status(400).json({
      error: 'Enter a valid stock quantity',
    })
  }

  try {
    const product = createProduct({
      id: `PRD-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      name: name.trim(),
      category: category.trim(),
      price_paise: price,
      description,
      image,
      featured: featured ? 1 : 0,
      stock_quantity: stock,
    })

    res.status(201).json(product || { ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Update an existing product
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const existing = getProduct(req.params.id)

  if (!existing) {
    return res.status(404).json({ error: 'Product not found' })
  }

  const {
    name,
    category,
    price_paise,
    description,
    image,
    featured,
    stock_quantity,
  } = req.body || {}

  const updates = {}

  if (name !== undefined) {
    if (!String(name).trim()) {
      return res.status(400).json({ error: 'Product name is required' })
    }
    updates.name = String(name).trim()
  }

  if (category !== undefined) {
    if (!String(category).trim()) {
      return res.status(400).json({ error: 'Category is required' })
    }
    updates.category = String(category).trim()
  }

  if (price_paise !== undefined) {
    const price = Number(price_paise)
    if (!Number.isSafeInteger(price) || price <= 0) {
      return res.status(400).json({ error: 'Invalid price in paise' })
    }
    updates.price_paise = price
  }

  if (stock_quantity !== undefined) {
    const stock = Number(stock_quantity)
    if (!Number.isSafeInteger(stock) || stock < 0) {
      return res.status(400).json({ error: 'Invalid stock quantity' })
    }
    updates.stock_quantity = stock
  }

  if (description !== undefined) updates.description = description
  if (image !== undefined) updates.image = image
  if (featured !== undefined) updates.featured = featured ? 1 : 0

  try {
    updateProduct(req.params.id, updates)
    res.json(getProduct(req.params.id))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete a product
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const existing = getProduct(req.params.id)

  if (!existing) {
    return res.status(404).json({ error: 'Product not found' })
  }

  try {
    deleteProduct(req.params.id)
    res.json({ ok: true, message: 'Product deleted' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`House of Rainbow API on http://127.0.0.1:${PORT}`)
  console.log(`Razorpay configured: ${isRazorpayConfigured()} (mode: ${getRazorpayMode()})`)
})
