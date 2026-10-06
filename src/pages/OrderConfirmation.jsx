import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { formatInr } from '../context/CartContext.jsx'

const LABELS = {
  paid: 'Paid',
  pending: 'Payment pending',
  pending_cod: 'Cash on Delivery — awaiting collection',
  failed: 'Payment failed',
  refunded: 'Refunded',
}

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOrder(data)
      })
      .catch((err) => setError(err.message))
  }, [orderId])

  return (
    <>
      <Navbar />
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          {error ? <p>{error}</p> : null}
          {!order && !error ? <p>Loading order…</p> : null}
          {order ? (
            <>
              <h2>Order confirmed</h2>
              <p>
                Order ID <strong>{order.id}</strong>
              </p>
              <p>
                Payment status{' '}
                <span className={`badge ${order.payment_status}`}>{LABELS[order.payment_status] || order.payment_status}</span>
              </p>
              <p>
                {order.customer_name}
                <br />
                {order.address_line}, {order.city}, {order.state} {order.pincode}
              </p>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.name} × {item.quantity} — {formatInr(item.unit_price_paise * item.quantity)}
                  </li>
                ))}
              </ul>
              <p>
                Total <strong>{formatInr(order.amount_paise)}</strong>
              </p>
              <Link to="/shop">Continue shopping</Link>
            </>
          ) : null}
        </div>
      </section>
      <Footer />
    </>
  )
}
