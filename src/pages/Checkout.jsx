import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { formatInr, useCart } from '../context/CartContext.jsx'
import { useStoreConfig } from '../hooks/useStoreConfig.js'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Checkout() {
  const { items, totalPaise, clear } = useCart()
  const config = useStoreConfig()
  const navigate = useNavigate()
  const [method, setMethod] = useState('razorpay')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
  })

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function placeOrder(event) {
    event.preventDefault()
    setError('')
    if (items.length === 0) {
      setError('Your cart is empty')
      return
    }
    setBusy(true)
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          payment_method: method,
          items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error || 'Could not create order')

      if (method === 'cod') {
        clear()
        navigate(`/order/${order.id}`)
        return
      }

      const payRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const pay = await payRes.json()
      if (!payRes.ok) throw new Error(pay.error)

      const scriptOk = await loadRazorpayScript()
      if (!scriptOk) throw new Error('Could not load Razorpay Checkout')

      const checkout = new window.Razorpay({
        key: pay.keyId,
        amount: pay.amount,
        currency: pay.currency,
        name: 'House of Rainbow',
        description: `Order ${order.id} (Razorpay test checkout)`,
        order_id: pay.razorpayOrderId,
        prefill: {
          name: form.customer_name,
          email: form.customer_email,
          contact: form.customer_phone,
        },
        notes: { store_order_id: order.id },
        theme: { color: '#5c4b7a' },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        handler: async (response) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const verify = await verifyRes.json()
          if (!verifyRes.ok) {
            navigate(`/payment/failed?orderId=${encodeURIComponent(order.id)}`)
            return
          }
          clear()
          navigate(`/order/${order.id}`)
        },
        modal: {
          ondismiss: async () => {
            await fetch('/api/payments/mark-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.id, status: 'pending' }),
            })
            navigate(`/payment/pending?orderId=${encodeURIComponent(order.id)}`)
          },
        },
      })

      checkout.on('payment.failed', async () => {
        await fetch('/api/payments/mark-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, status: 'failed' }),
        })
        navigate(`/payment/failed?orderId=${encodeURIComponent(order.id)}`)
      })

      checkout.open()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <div className="status-page">
          <p>Add jewellery to your cart before checkout.</p>
          <Link to="/shop">Shop Now</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <section className="section">
        <div className="container checkout-layout">
          <form className="form" onSubmit={placeOrder}>
            <h2>Checkout</h2>
            <p>
              Pay with UPI, Google Pay, PhonePe, debit/credit cards or net banking through Razorpay, or choose Cash on
              Delivery. This checkout is mobile-friendly and currently uses <strong>test mode</strong>
              {config.paymentsLive ? '' : ' — not live payments'}.
            </p>
            <label>
              Full name
              <input required value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} />
            </label>
            <label>
              Phone
              <input required value={form.customer_phone} onChange={(e) => update('customer_phone', e.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={form.customer_email} onChange={(e) => update('customer_email', e.target.value)} />
            </label>
            <label>
              Address
              <textarea required rows="3" value={form.address_line} onChange={(e) => update('address_line', e.target.value)} />
            </label>
            <label>
              City
              <input required value={form.city} onChange={(e) => update('city', e.target.value)} />
            </label>
            <label>
              State
              <input required value={form.state} onChange={(e) => update('state', e.target.value)} />
            </label>
            <label>
              PIN code
              <input required value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
            </label>
            <div className="pay-options">
              <label className={`pay-option ${method === 'razorpay' ? 'selected' : ''}`}>
                <input type="radio" name="method" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} />
                <span>
                  <strong>Razorpay</strong>
                  <br />
                  UPI, Google Pay, PhonePe, debit cards, credit cards, net banking
                </span>
              </label>
              <label className={`pay-option ${method === 'cod' ? 'selected' : ''}`}>
                <input type="radio" name="method" checked={method === 'cod'} onChange={() => setMethod('cod')} />
                <span>
                  <strong>Cash on Delivery</strong>
                  <br />
                  Pay when your jewellery arrives. No Razorpay charge.
                </span>
              </label>
            </div>
            {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}
            <button className="gold-btn" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : method === 'cod' ? 'Place COD order' : 'Pay with Razorpay'}
            </button>
          </form>
          <aside className="card" style={{ padding: '1.2rem', height: 'fit-content' }}>
            <h3>Order summary</h3>
            {items.map((item) => (
              <p key={item.id}>
                {item.name} × {item.quantity}
                <br />
                <span className="price">{formatInr(item.price_paise * item.quantity)}</span>
              </p>
            ))}
            <p>
              Total <strong>{formatInr(totalPaise)}</strong>
            </p>
          </aside>
        </div>
      </section>
      <Footer />
    </>
  )
}
