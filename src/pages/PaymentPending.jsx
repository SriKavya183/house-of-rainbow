import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function PaymentPending() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  return (
    <>
      <Navbar />
      <div className="status-page">
        <h2>Payment pending</h2>
        <p>
          Checkout was closed before confirmation. If money was deducted in a test UPI flow, the webhook can still mark
          this order paid. Refresh the order page in a minute.
        </p>
        {orderId ? (
          <p>
            Order ID <strong>{orderId}</strong>
            <br />
            <Link to={`/order/${orderId}`}>Check payment status</Link>
          </p>
        ) : null}
        <Link className="gold-btn" to="/checkout">
          Return to checkout
        </Link>
      </div>
      <Footer />
    </>
  )
}
