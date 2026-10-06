import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function PaymentFailed() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  return (
    <>
      <Navbar />
      <div className="status-page">
        <h2>Payment failed</h2>
        <p>The Razorpay attempt did not complete. No live charge was made in test mode unless Razorpay captured it.</p>
        {orderId ? (
          <p>
            Order ID <strong>{orderId}</strong>
            <br />
            <Link to={`/order/${orderId}`}>View order</Link>
          </p>
        ) : null}
        <Link className="gold-btn" to="/checkout">
          Try again
        </Link>
      </div>
      <Footer />
    </>
  )
}
