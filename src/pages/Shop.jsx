import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { formatInr, useCart } from '../context/CartContext.jsx'

const CATEGORIES = [
  'Earrings',
  'Hair Accessories',
  'Hair Clips',
  'Jewellery',
  'Bangles',
  'Gift Hampers',
]

export default function Shop({ products }) {
  const { addItem } = useCart()
  const [params] = useSearchParams()

  const category = params.get('category')

  const list = category
    ? products.filter((product) => product.category === category)
    : products

  return (
    <>
      <Navbar />

      <main className="shop-page">

        {/* Shop Header */}
        <section className="shop-header">
          <div className="shop-label">HOUSE OF RAINBOW</div>

          <h1>{category || 'Shop All'}</h1>

          <p>
            {category
              ? `Explore our beautiful ${category} collection.`
              : 'Discover our curated collection of fine Indian jewellery and accessories.'}
          </p>
        </section>

        {/* Category Navigation */}
        <nav className="shop-categories">
          <Link
            className={`shop-category ${!category ? 'active' : ''}`}
            to="/shop"
          >
            All
          </Link>

          {CATEGORIES.map((name) => (
            <Link
              key={name}
              className={`shop-category ${
                category === name ? 'active' : ''
              }`}
              to={`/shop?category=${encodeURIComponent(name)}`}
            >
              {name}
            </Link>
          ))}
        </nav>

        {/* Products */}
        <section className="shop-products">

          {list.length === 0 ? (
            <div className="empty-products">
              <h3>No products yet</h3>
              <p>
                We are adding beautiful pieces to this collection soon.
              </p>
            </div>
          ) : (
            <div className="product-grid">
              {list.map((product) => (
                <article className="card" key={product.id}>

                  <Link
                    to={`/product/${product.id}`}
                    className="card-image"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  </Link>

                  <div className="card-body">

                    <h3>
                      <Link to={`/product/${product.id}`}>
                        {product.name}
                      </Link>
                    </h3>

                    <p className="price">
                      {formatInr(product.price_paise)}
                    </p>

                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={() => addItem(product)}
                    >
                      Add to Cart
                    </button>

                  </div>
                </article>
              ))}
            </div>
          )}

        </section>
      </main>

      <Footer />
    </>
  )
}