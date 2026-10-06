import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { formatInr, useCart } from '../context/CartContext.jsx'

export default function Cart() {
  const { items, totalPaise, setQuantity } = useCart()

  return (
    <>
      <Navbar />
      <section className="section">
        <div className="container">
          <h2>Your cart</h2>
          {items.length === 0 ? (
            <p>
              The cart is empty. <Link to="/shop">Continue shopping</Link>
            </p>
          ) : (
            <>
              {items.map((item) => (
                <div className="cart-row" key={item.id}>
                  <img src={item.image} alt="" />
                  <div>
                    <strong>{item.name}</strong>
                    <p className="price">{formatInr(item.price_paise)}</p>
                  </div>
                  <label>
                    Qty
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                      style={{ width: 72, marginLeft: 8 }}
                    />
                  </label>
                </div>
              ))}
              <p>
                Total <strong>{formatInr(totalPaise)}</strong>
              </p>
              <Link className="gold-btn" to="/checkout">
                Checkout
              </Link>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  )
}
