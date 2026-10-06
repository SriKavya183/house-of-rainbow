
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

export default function About() {
  return (
    <>
      <Navbar />

      <main className="about-page">
        {/* Hero Section */}
        <section className="about-hero">
          <div className="about-content">
            <p className="about-label">OUR STORY</p>

            <h1>
              A little sparkle,
              <br />
              a lot of <span>elegance.</span>
            </h1>

            <p className="about-description">
              House of Rainbow brings you beautiful Indian
              jewellery that blends traditional charm with
              modern elegance. Made for every special moment.
            </p>

            <Link to="/shop" className="about-button">
              Explore Collection →
            </Link>
          </div>

          <div className="about-image">
            <img
              src="/images/house-of-rainbow-logo.jpeg"
              alt="House of Rainbow Logo"
            />
          </div>
        </section>

        {/* Trust Statistics */}
        <section className="about-stats">
          <div className="stat-card">
            <div className="stat-icon">♧</div>
            <div>
              <h2>5,000+</h2>
              <h3>TRUSTED ORDERS</h3>
              <p>Loved by happy customers</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pink">♡</div>
            <div>
              <h2>100%</h2>
              <h3>LOVE & CARE</h3>
              <p>Quality checked jewellery</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✧</div>
            <div>
              <h2>SECURE</h2>
              <h3>ONLINE PAYMENTS</h3>
              <p>Safe and hassle-free shopping</p>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="about-features">
          <p className="about-label">THE HOUSE OF RAINBOW</p>

          <h2>Why Our Customers Love Us</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <span>✧</span>
              <h3>Elegant Designs</h3>
              <p>
                Traditional and modern collections
                for every style.
              </p>
            </div>

            <div className="feature-card">
              <span>♡</span>
              <h3>For Every Occasion</h3>
              <p>
                Weddings, festivals and everyday
                elegance.
              </p>
            </div>

            <div className="feature-card">
              <span>◇</span>
              <h3>Quality You Can Trust</h3>
              <p>
                Carefully selected jewellery
                made with love.
              </p>
            </div>
          </div>

          <Link to="/shop" className="about-button">
            Shop Now →
          </Link>
        </section>
      </main>

      <Footer />
    </>
  )
}