
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useStoreConfig } from '../hooks/useStoreConfig.js'

export default function Navbar() {
  const { count } = useCart()
  const config = useStoreConfig()
  const [open, setOpen] = useState(false)

  const closeMenu = () => setOpen(false)

  return (
    <>
      {config.testModeBanner && (
        <div className="test-banner">
          Razorpay test mode — payments are not live.
          Use test keys only until your Razorpay account is verified.
        </div>
      )}

      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" to="/" onClick={closeMenu}>
            <span className="brand-name">House of Rainbow</span>
            <span className="brand-tagline">
              FINE INDIAN JEWELLERY
            </span>
          </Link>

          <button
            className="menu-toggle"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? '✕' : '☰'}
          </button>

          <nav
            className={`nav-links ${open ? 'open' : ''}`}
            onClick={closeMenu}
          >
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/shop?category=Bridal%20Sets">
              Collections
            </NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/cart">Cart ({count})</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>
        </div>
      </header>
    </>
  )
}