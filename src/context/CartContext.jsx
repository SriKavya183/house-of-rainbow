import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'hor-cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const api = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalPaise = items.reduce((sum, item) => sum + item.price_paise * item.quantity, 0)
    return {
      items,
      count,
      totalPaise,
      addItem(product) {
        setItems((current) => {
          const found = current.find((item) => item.id === product.id)
          if (found) {
            return current.map((item) =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
            )
          }
          return [
            ...current,
            {
              id: product.id,
              name: product.name,
              price_paise: product.price_paise,
              image: product.image,
              quantity: 1,
            },
          ]
        })
      },
      setQuantity(id, quantity) {
        setItems((current) =>
          current
            .map((item) => (item.id === id ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0),
        )
      },
      clear() {
        setItems([])
      },
    }
  }, [items])

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}

export function formatInr(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)
}
