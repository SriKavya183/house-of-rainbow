import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import { formatInr, useCart } from '../context/CartContext.jsx'

const CATEGORIES = [
  {
    name: 'Earrings',
    image:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=700&q=80',
  },
  {
    name: 'Hair Accessories',
    image:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
  },
  {
    name: 'Hair Clips',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80',
  },
  {
    name: 'Jewellery',
    image:
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=700&q=80',
  },
  {
    name: 'Bangles',
    image:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=700&q=80',
  },
  {
    name: 'Gift Hampers',
    image:
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=700&q=80',
  },
]

export default function Home({ products = [] }) {
  const { addItem } = useCart()

  const featured = products.filter((product) => product.featured)

  return (
    <>
      <Navbar />

      <main className="home-page">

        {/* Hero Section */}
        <section className="home-hero">
          <div className="hero-content">

            <div className="hero-logo-text">
              <span className="logo-flower">✧</span>

              <h2>House of Rainbow</h2>

              <span className="logo-tagline">
                FINE INDIAN JEWELLERY
              </span>
            </div>

            <p className="hero-eyebrow">
              JEWELLERY · ACCESSORIES · MORE
            </p>

            <h1>
              A little sparkle,
              <br />
              a lot of <span>elegance.</span>
            </h1>

            <p className="hero-description">
              Discover jewellery that makes every moment
              special. Elegance for every occasion.
            </p>

            <Link to="/shop" className="hero-button">
              Explore Collection <span>→</span>
            </Link>

            <p className="hero-note">
              Made to make you shine ♡
            </p>

          </div>

          <div className="hero-image">
            <img
              src="/images/hero-model.jpg"
              alt="Indian woman wearing elegant jewellery"
            />
          </div>
        </section>


        {/* Trusted Orders Highlight */}
        <section className="home-trust-highlight">
          <div className="trust-number">
            5,000+
          </div>

          <div className="trust-text">
            <h2>Trusted Orders</h2>
            <p>Loved by happy customers</p>
          </div>

          <span className="trust-heart">
            ♡
          </span>
        </section>


        {/* Benefits */}
        <section className="home-benefits">

          <div>
            <span>✧</span>
            <p>Elegant Jewellery</p>
          </div>

          <div>
            <span>♡</span>
            <p>Made for Every Occasion</p>
          </div>

          <div>
            <span>◇</span>
            <p>Cash on Delivery</p>
          </div>

        </section>


        {/* Categories */}
        <section className="section home-collections">
          <div className="container">

            <div className="home-section-heading">

              <p className="section-label">
                SHOP BY CATEGORY
              </p>

              <h2>
                Find Your Favourite
              </h2>

              <p>
                Explore beautiful jewellery and accessories
                made for every style and occasion.
              </p>

            </div>


            <div className="category-grid">

              {CATEGORIES.map((cat) => (

                <Link
                  className="category-tile"
                  key={cat.name}
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                >

                  <div className="category-image">

                    <img
                      src={cat.image}
                      alt={cat.name}
                    />

                  </div>

                  <h3>
                    {cat.name}
                  </h3>

                  <span className="category-link">
                    Explore <span>→</span>
                  </span>

                </Link>

              ))}

            </div>

          </div>
        </section>


        {/* Featured Products */}
        <section className="section home-featured">

          <div className="container">

            <div className="home-section-heading">

              <p className="section-label">
                HANDPICKED FOR YOU
              </p>

              <h2>
                Featured Pieces
              </h2>

              <p>
                Discover your next favourite accessory.
              </p>

            </div>


            <div className="product-grid">

              {featured.length > 0 ? (

                featured.map((product) => (

                  <article
                    className="card"
                    key={product.id}
                  >

                    <Link to={`/product/${product.id}`}>

                      <img
                        src={product.image}
                        alt={product.name}
                      />

                    </Link>


                    <div className="card-body">

                      <h3>

                        <Link
                          to={`/product/${product.id}`}
                        >
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

                ))

              ) : (

                <p>
                  No featured products available yet.
                </p>

              )}

            </div>


            <div className="home-view-all">

              <Link
                to="/shop"
                className="outline-button"
              >
                View All Products →
              </Link>

            </div>

          </div>

        </section>


        {/* Brand Message */}
        <section className="home-brand-message">

          <p className="section-label">
            HOUSE OF RAINBOW
          </p>

          <h2>
            Everyday elegance, made special.
          </h2>

          <Link
            to="/shop"
            className="hero-button"
          >
            Shop Now →
          </Link>

        </section>

      </main>

      <Footer />
    </>
  )
}