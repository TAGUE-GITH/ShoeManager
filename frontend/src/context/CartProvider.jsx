import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { cartApi } from '../api/resources'
import { useAuth } from './AuthProvider'

const CartContext = createContext(null)
const EMPTY = { items: [], total: '0', count: 0 }

// Panier partage entre les pages (pastille du nombre de paires dans l'en-tete)
export function CartProvider({ children }) {
  const { user } = useAuth()
  const [loaded, setLoaded] = useState(EMPTY)
  // Visiteur ou utilisateur deconnecte : panier vide, sans appel a l'API
  const cart = user ? loaded : EMPTY

  const refresh = useCallback(async () => {
    if (user) setLoaded(await cartApi.get())
  }, [user])

  // Chargement du panier a la connexion ; une reponse arrivee apres une deconnexion est ignoree
  useEffect(() => {
    if (!user) return undefined
    let active = true
    cartApi
      .get()
      .then((data) => active && setLoaded(data))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user])

  const add = useCallback(async (variantId, quantity = 1) => {
    await cartApi.add(variantId, quantity)
    await refresh()
  }, [refresh])

  const update = useCallback(async (itemId, quantity) => {
    await cartApi.update(itemId, quantity)
    await refresh()
  }, [refresh])

  const remove = useCallback(async (itemId) => {
    await cartApi.remove(itemId)
    await refresh()
  }, [refresh])

  const value = useMemo(() => ({ cart, refresh, add, update, remove }), [cart, refresh, add, update, remove])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart doit être utilisé dans un CartProvider')
  return context
}
