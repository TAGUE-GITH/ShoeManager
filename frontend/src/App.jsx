import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ManageLayout from './components/ManageLayout'
import { RequireAuth } from './components/orders'
import { AccountPage, LoginPage, NotFoundPage, RegisterPage } from './pages/AuthPages'
import CartPage from './pages/CartPage'
import CatalogPage from './pages/CatalogPage'
import CheckoutPage from './pages/CheckoutPage'
import HomePage from './pages/HomePage'
import ManageOrdersPage from './pages/ManageOrdersPage'
import { OrderPage } from './pages/OrderPages'
import ProductPage from './pages/ProductPage'
import { ManageReservationsPage } from './pages/ReservationPages'
import TillPage from './pages/TillPage'

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
        <Route path="gestion" element={staff(<ManageLayout />)}>
          <Route index element={<Navigate to="commandes" replace />} />
          <Route path="commandes" element={<ManageOrdersPage />} />
          <Route path="reservations" element={<ManageReservationsPage />} />
          <Route path="caisse" element={<TillPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
