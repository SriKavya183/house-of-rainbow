import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <strong>House of Rainbow</strong>
            <p>Premium Indian jewellery, crafted for weddings and everyday grace.</p>
          </div>
          <div>
            <Link to="/shop">Shop</Link>
            <br />
            <Link to="/about">Our atelier</Link>
          </div>
          <div>
            <p>UPI, Google Pay, PhonePe, cards, net banking via Razorpay test checkout, plus Cash on Delivery.</p>
          </div>
        </div>
        <small>Test mode — not live payments. Switch to live keys only after Razorpay verification and a successful test.</small>
      </div>
    </footer>
  )
}
