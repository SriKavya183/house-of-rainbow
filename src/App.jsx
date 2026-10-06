import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
import About from './pages/About.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'
import PaymentFailed from './pages/PaymentFailed.jsx'
import PaymentPending from './pages/PaymentPending.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'

export default function App() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home products={products} />} />
      <Route path="/shop" element={<Shop products={products} />} />
      <Route path="/product/:id" element={<Product products={products} />} />
      <Route path="/about" element={<About />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order/:orderId" element={<OrderConfirmation />} />
      <Route path="/payment/failed" element={<PaymentFailed />} />
      <Route path="/payment/pending" element={<PaymentPending />} />
      <Route path="/admin" element={<AdminOrders />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
