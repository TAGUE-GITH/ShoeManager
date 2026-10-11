import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth } from './components/orders'
import { AccountPage, LoginPage, NotFoundPage, RegisterPage } from './pages/AuthPages'
import CartPage from './pages/CartPage'
import CatalogPage from './pages/CatalogPage'
import CheckoutPage from './pages/CheckoutPage'
import HomePage from './pages/HomePage'
import ManageOrdersPage from './pages/ManageOrdersPage'
import { OrderPage } from './pages/OrderPages'
import ProductPage from './pages/ProductPage'

const authed = (page) => <RequireAuth>{page}</RequireAuth>
const staff = (page) => <RequireAuth staff>{page}</RequireAuth>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogue" element={<CatalogPage />} />
        <Route path="produits/:slug" element={<ProductPage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="compte" element={<AccountPage />} />
        <Route path="panier" element={authed(<CartPage />)} />
        <Route path="commande" element={authed(<CheckoutPage />)} />
        <Route path="compte/commandes/:id" element={authed(<OrderPage />)} />
        <Route path="gestion/commandes" element={staff(<ManageOrdersPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
