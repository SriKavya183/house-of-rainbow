import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { formatInr, useCart } from '../context/CartContext.jsx'

export default function Product({ products }) {
  const { id } = useParams()
  const { addItem } = useCart()
  const product = products.find((p) => p.id === id)

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="status-page">
          <p>This piece is not in the sample catalogue.</p>
          <Link to="/shop">Back to shop</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <section className="section">
        <div className="container product-layout">
          <div className="product-media card">
            <img src={product.image} alt={product.name} style={{ height: 420 }} />
          </div>
          <div>
            <p className="eyebrow" style={{ color: 'var(--gold-dark)', letterSpacing: '0.18em' }}>
              {product.category}
            </p>
            <h1>{product.name}</h1>
            <p className="price" style={{ fontSize: '1.4rem' }}>
              {formatInr(product.price_paise)}
            </p>
            <p>{product.description}</p>
            <button className="gold-btn" type="button" onClick={() => addItem(product)}>
              Add to cart
            </button>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}
