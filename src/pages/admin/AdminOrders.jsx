import { useEffect, useState } from 'react'

import Navbar from '../../components/Navbar.jsx'
import Footer from '../../components/Footer.jsx'
import { formatInr } from '../../context/CartContext.jsx'

const CATEGORIES = [
  'Earrings',
  'Hair Accessories',
  'Hair Clips',
  'Jewellery',
  'Bangles',
  'Gift Hampers',
]

const emptyProduct = {
  name: '',
  category: '',
  price: '',
  description: '',
  image: '',
  images: [],
  featured: false,
  stock_quantity: 0,
}

export default function AdminOrders() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)

  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])

  const [tab, setTab] = useState('products')

  const [product, setProduct] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)

  const [imageFiles, setImageFiles] = useState([])

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadSession() {
    try {
      const res = await fetch('/api/admin/session', {
        credentials: 'include',
      })

      const data = await res.json()

      setAuthed(Boolean(data.authenticated))

      if (data.authenticated) {
        await Promise.all([loadOrders(), loadProducts()])
      }
    } catch (err) {
      console.error(err)
      setError('Could not connect to the server.')
    }
  }

  async function loadOrders() {
    try {
      const res = await fetch('/api/admin/orders', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to load orders')
      }

      const data = await res.json()

      setOrders(Array.isArray(data) ? data : data.orders || [])
    } catch (err) {
      console.error(err)
      setError('Could not load orders.')
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch('/api/admin/products', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to load products')
      }

      const data = await res.json()

      setProducts(Array.isArray(data) ? data : data.products || [])
    } catch (err) {
      console.error(err)
      setError('Could not load products.')
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  async function login(event) {
    event.preventDefault()

    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid password')
      }

      setAuthed(true)
      setPassword('')
      setMessage('Login successful.')

      await Promise.all([loadOrders(), loadProducts()])
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      console.error(err)
    }

    setAuthed(false)
    setOrders([])
    setProducts([])
    setMessage('')
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target

    setProduct((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleImageChange(event) {
    const files = Array.from(event.target.files || [])

    if (files.length > 8) {
      setError('You can select maximum 8 images.')
      event.target.value = ''
      setImageFiles([])
      return
    }

    const invalid = files.find(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024,
    )

    if (invalid) {
      setError('Only JPG, PNG or WEBP images up to 5MB are allowed.')
      event.target.value = ''
      setImageFiles([])
      return
    }

    setError('')
    setImageFiles(files)
  }

  function resetProductForm() {
    setProduct(emptyProduct)
    setEditingId(null)
    setImageFiles([])

    const input = document.getElementById('product-images')

    if (input) {
      input.value = ''
    }
  }

  function editProduct(item) {
    setEditingId(item.id)

    setProduct({
      name: item.name || '',
      category: item.category || '',
      price:
        item.price_paise != null
          ? Number(item.price_paise) / 100
          : item.price != null
            ? item.price
            : '',
      description: item.description || '',
      image: item.image || '',
      images: Array.isArray(item.images)
        ? item.images
        : item.image
          ? [item.image]
          : [],
      featured: Boolean(item.featured),
      stock_quantity: item.stock_quantity ?? 0,
    })

    setImageFiles([])
    setError('')
    setMessage('')
    setTab('products')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function uploadProductImages() {
    if (!imageFiles.length) {
      return product.images || []
    }

    const formData = new FormData()

    imageFiles.forEach((file) => {
      formData.append('images', file)
    })

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Image upload failed.')
    }

    return Array.isArray(data.images) ? data.images : []
  }

  async function saveProduct(event) {
    event.preventDefault()

    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (!product.name.trim()) {
        throw new Error('Product name is required.')
      }

      if (!product.category) {
        throw new Error('Please select a category.')
      }

      const price = Number(product.price)

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error('Please enter a valid price.')
      }

      let images = product.images || []

      if (imageFiles.length) {
        if (imageFiles.length < 4 || imageFiles.length > 8) {
          throw new Error(
            'Please select minimum 4 and maximum 8 images.',
          )
        }

        images = await uploadProductImages()
      } else if (!editingId && images.length < 4) {
        throw new Error(
          'New products require minimum 4 images.',
        )
      }

      if (!images.length && !product.image) {
        throw new Error('Please add product images.')
      }

      const mainImage = images[0] || product.image || ''

      const payload = {
        name: product.name.trim(),
        category: product.category,
        price_paise: Math.round(price * 100),
        description: product.description.trim(),
        image: mainImage,
        images,
        featured: Boolean(product.featured),
        stock_quantity: Math.max(
          0,
          Number(product.stock_quantity) || 0,
        ),
      }

      const url = editingId
        ? `/api/admin/products/${editingId}`
        : '/api/admin/products'

      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not save product.')
      }

      setMessage(
        editingId
          ? 'Product updated successfully.'
          : 'Product added successfully.',
      )

      resetProductForm()
      await loadProducts()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not save product.')
    } finally {
      setLoading(false)
    }
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?',
    )

    if (!confirmed) {
      return
    }

    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not delete product.')
      }

      setMessage('Product deleted successfully.')

      if (editingId === id) {
        resetProductForm()
      }

      await loadProducts()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not delete product.')
    }
  }

  async function updateStock(id, stock) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          stock_quantity: Math.max(0, Number(stock) || 0),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Could not update stock.')
      }

      await loadProducts()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not update stock.')
    }
  }

  async function refundOrder(id) {
    const confirmed = window.confirm(
      'Are you sure you want to refund this order?',
    )

    if (!confirmed) {
      return
    }

    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/admin/orders/${id}/refund`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Refund failed.')
      }

      setMessage('Refund request completed.')

      await loadOrders()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Refund failed.')
    }
  }

  function getImage(productItem) {
    if (productItem.image) {
      return productItem.image
    }

    if (Array.isArray(productItem.images) && productItem.images.length) {
      return productItem.images[0]
    }

    return ''
  }

  function getOrderAmount(order) {
    if (order.amount_paise != null) {
      return Number(order.amount_paise)
    }

    if (order.amount != null) {
      return Number(order.amount)
    }

    return 0
  }

  if (!authed) {
    return (
      <>
        <Navbar />

        <main className="section">
          <div
            className="container"
            style={{ maxWidth: '480px' }}
          >
            <div className="card" style={{ padding: '32px' }}>
              <p
                style={{
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  fontSize: '12px',
                }}
              >
                House of Rainbow
              </p>

              <h1 style={{ marginTop: 0 }}>
                Admin Login
              </h1>

              <p>
                Login to manage products, inventory and orders.
              </p>

              {error && (
                <div className="admin-alert error">
                  {error}
                </div>
              )}

              <form onSubmit={login} className="form">
                <label>
                  Admin Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter admin password"
                    required
                  />
                </label>

                <button
                  className="gold-btn"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </div>
          </div>
        </main>

        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="section admin-page">
        <div className="container">
          <div className="admin-header">
            <div>
              <p className="admin-eyebrow">
                HOUSE OF RAINBOW
              </p>

              <h1>Admin Dashboard</h1>

              <p>
                Manage your products, inventory and customer
                orders.
              </p>
            </div>

            <button
              className="ghost-btn"
              type="button"
              onClick={logout}
            >
              Logout
            </button>
          </div>

          {error && (
            <div className="admin-alert error">
              {error}
            </div>
          )}

          {message && (
            <div className="admin-alert success">
              {message}
            </div>
          )}

          <div className="admin-tabs">
            <button
              type="button"
              className={
                tab === 'products'
                  ? 'admin-tab active'
                  : 'admin-tab'
              }
              onClick={() => setTab('products')}
            >
              Products
            </button>

            <button
              type="button"
              className={
                tab === 'orders'
                  ? 'admin-tab active'
                  : 'admin-tab'
              }
              onClick={() => setTab('orders')}
            >
              Orders
            </button>
          </div>

          {tab === 'products' && (
            <>
              <section className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>
                      {editingId
                        ? 'Edit Product'
                        : 'Add New Product'}
                    </h2>

                    <p>
                      Add product details and choose the correct
                      category.
                    </p>
                  </div>

                  {editingId && (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={resetProductForm}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <form
                  onSubmit={saveProduct}
                  className="admin-product-form"
                >
                  <div className="admin-form-grid">
                    <label>
                      Product Name
                      <input
                        name="name"
                        value={product.name}
                        onChange={updateField}
                        placeholder="Example: Korean Earrings"
                        required
                      />
                    </label>

                    <label>
                      Category
                      <select
                        name="category"
                        value={product.category}
                        onChange={updateField}
                        required
                      >
                        <option value="">
                          Select Category
                        </option>

                        {CATEGORIES.map((category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Price (₹)
                      <input
                        name="price"
                        type="number"
                        min="1"
                        step="0.01"
                        value={product.price}
                        onChange={updateField}
                        placeholder="299"
                        required
                      />
                    </label>

                    <label>
                      Stock Quantity
                      <input
                        name="stock_quantity"
                        type="number"
                        min="0"
                        value={product.stock_quantity}
                        onChange={updateField}
                        placeholder="10"
                      />
                    </label>
                  </div>

                  <label>
                    Product Images
                    <input
                      id="product-images"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleImageChange}
                    />

                    <small>
                      New product: select minimum 4 and maximum
                      8 images. JPG, PNG or WEBP, max 5MB each.
                    </small>
                  </label>

                  {imageFiles.length > 0 && (
                    <div className="image-preview-grid">
                      {imageFiles.map((file) => (
                        <div
                          className="image-preview"
                          key={`${file.name}-${file.size}`}
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {product.images?.length > 0 &&
                    imageFiles.length === 0 && (
                      <div className="image-preview-grid">
                        {product.images.map((image, index) => (
                          <div
                            className="image-preview"
                            key={`${image}-${index}`}
                          >
                            <img
                              src={image}
                              alt={`${product.name} ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  <label>
                    Description
                    <textarea
                      name="description"
                      value={product.description}
                      onChange={updateField}
                      placeholder="Write a short product description..."
                      rows="5"
                    />
                  </label>

                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      name="featured"
                      checked={product.featured}
                      onChange={updateField}
                    />

                    <span>
                      Show this product as Featured
                    </span>
                  </label>

                  <div className="admin-form-actions">
                    <button
                      type="submit"
                      className="gold-btn"
                      disabled={loading}
                    >
                      {loading
                        ? 'Saving...'
                        : editingId
                          ? 'Update Product'
                          : 'Add Product'}
                    </button>

                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={resetProductForm}
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </section>

              <section className="admin-card">
                <div className="admin-card-header">
                  <div>
                    <h2>Product Inventory</h2>
                    <p>
                      {products.length} products in your store.
                    </p>
                  </div>
                </div>

                {products.length === 0 ? (
                  <div className="admin-empty">
                    No products found.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Featured</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {products.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="admin-product-cell">
                                {getImage(item) ? (
                                  <img
                                    src={getImage(item)}
                                    alt={item.name}
                                  />
                                ) : (
                                  <div className="admin-no-image">
                                    No image
                                  </div>
                                )}

                                <strong>{item.name}</strong>
                              </div>
                            </td>

                            <td>
                              <span className="badge">
                                {item.category || '—'}
                              </span>
                            </td>

                            <td>
                              {formatInr(
                                item.price_paise ||
                                  Number(item.price || 0) * 100,
                              )}
                            </td>

                            <td>
                              <input
                                className="stock-input"
                                type="number"
                                min="0"
                                value={
                                  item.stock_quantity ?? 0
                                }
                                onChange={(event) =>
                                  setProducts((current) =>
                                    current.map((productItem) =>
                                      productItem.id === item.id
                                        ? {
                                            ...productItem,
                                            stock_quantity:
                                              event.target.value,
                                          }
                                        : productItem,
                                    ),
                                  )
                                }
                                onBlur={(event) =>
                                  updateStock(
                                    item.id,
                                    event.target.value,
                                  )
                                }
                              />
                            </td>

                            <td>
                              {item.featured ? 'Yes' : 'No'}
                            </td>

                            <td>
                              <div className="admin-action-buttons">
                                <button
                                  type="button"
                                  className="ghost-btn small"
                                  onClick={() =>
                                    editProduct(item)
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="danger-btn"
                                  onClick={() =>
                                    deleteProduct(item.id)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'orders' && (
            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2>Orders & Payments</h2>

                  <p>
                    View customer orders and payment details.
                  </p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="admin-empty">
                  No orders found.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>
                              {order.order_id ||
                                order.id}
                            </strong>
                          </td>

                          <td>
                            <div>
                              {order.customer_name ||
                                order.name ||
                                '—'}
                            </div>

                            <small>
                              {order.customer_email ||
                                order.email ||
                                ''}
                            </small>
                          </td>

                          <td>
                            {formatInr(
                              getOrderAmount(order),
                            )}
                          </td>

                          <td>
                            <span className="badge">
                              {order.status || '—'}
                            </span>
                          </td>

                          <td>
                            {order.payment_status ||
                              order.paymentStatus ||
                              '—'}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="danger-btn"
                              onClick={() =>
                                refundOrder(order.id)
                              }
                              disabled={
                                order.status === 'refunded' ||
                                order.payment_status ===
                                  'refunded'
                              }
                            >
                              Refund
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />

      <style>{`
        .admin-page {
          min-height: 80vh;
          background: #f8f4ec;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 28px;
        }

        .admin-header h1 {
          margin: 0 0 8px;
        }

        .admin-eyebrow {
          margin: 0 0 8px;
          font-size: 11px;
          letter-spacing: 3px;
          font-weight: 700;
        }

        .admin-alert {
          padding: 13px 16px;
          border-radius: 10px;
          margin-bottom: 18px;
          font-size: 14px;
        }

        .admin-alert.error {
          background: #fff0f0;
          border: 1px solid #efcaca;
          color: #9b3333;
        }

        .admin-alert.success {
          background: #effaf1;
          border: 1px solid #c9e8cf;
          color: #28713a;
        }

        .admin-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 22px;
          border-bottom: 1px solid #e4ddd2;
        }

        .admin-tab {
          border: 0;
          background: transparent;
          padding: 13px 20px;
          cursor: pointer;
          color: #6b5b70;
          font-weight: 600;
        }

        .admin-tab.active {
          color: #453453;
          border-bottom: 2px solid #b28a3b;
        }

        .admin-card {
          background: #fffdf9;
          border: 1px solid #e8e0d5;
          border-radius: 18px;
          padding: 26px;
          margin-bottom: 24px;
          box-shadow: 0 8px 30px rgba(69, 52, 83, 0.06);
        }

        .admin-card-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          margin-bottom: 22px;
        }

        .admin-card-header h2 {
          margin: 0 0 6px;
        }

        .admin-card-header p {
          margin: 0;
          color: #756979;
        }

        .admin-product-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .admin-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .admin-product-form label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-weight: 600;
          color: #453453;
        }

        .admin-product-form input,
        .admin-product-form select,
        .admin-product-form textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #ddd2c4;
          border-radius: 10px;
          padding: 12px 13px;
          background: white;
          color: #453453;
          font: inherit;
        }

        .admin-product-form input:focus,
        .admin-product-form select:focus,
        .admin-product-form textarea:focus {
          outline: none;
          border-color: #b28a3b;
          box-shadow: 0 0 0 3px rgba(178, 138, 59, 0.1);
        }

        .admin-product-form small {
          color: #7b6e7e;
          font-weight: 400;
        }

        .admin-checkbox {
          flex-direction: row !important;
          align-items: center;
          gap: 10px !important;
        }

        .admin-checkbox input {
          width: auto;
        }

        .admin-form-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .admin-action-buttons {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .ghost-btn.small,
        .danger-btn {
          padding: 8px 12px;
          font-size: 12px;
        }

        .danger-btn {
          border: 1px solid #e4bcbc;
          background: #fff5f5;
          color: #a33a3a;
          border-radius: 8px;
          cursor: pointer;
        }

        .danger-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .image-preview-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 10px;
        }

        .image-preview {
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          background: #f2eee8;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .admin-product-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 220px;
        }

        .admin-product-cell img,
        .admin-no-image {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .admin-no-image {
          display: grid;
          place-items: center;
          background: #eee8df;
          color: #8a7d8c;
          font-size: 10px;
        }

        .stock-input {
          width: 70px;
          padding: 7px;
          border: 1px solid #ddd2c4;
          border-radius: 7px;
        }

        .admin-empty {
          padding: 40px;
          text-align: center;
          color: #786c7c;
        }

        @media (max-width: 800px) {
          .admin-header,
          .admin-card-header {
            flex-direction: column;
          }

          .admin-form-grid {
            grid-template-columns: 1fr;
          }

          .image-preview-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .admin-card {
            padding: 18px;
          }

          .table-wrap {
            overflow-x: auto;
          }
        }
      `}</style>
    </>
  )
}