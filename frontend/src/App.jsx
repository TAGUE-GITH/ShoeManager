import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ManageLayout, { manageHome } from './components/ManageLayout'
import { RequireAuth } from './components/orders'
import { Loader } from './components/ui'
import { useAuth } from './context/AuthProvider'
import { AccountPage, LoginPage, NotFoundPage, RegisterPage } from './pages/AuthPages'
import CartPage from './pages/CartPage'
import CatalogPage from './pages/CatalogPage'
import CheckoutPage from './pages/CheckoutPage'
import HomePage from './pages/HomePage'
import ManageOrdersPage from './pages/ManageOrdersPage'
import { OrderPage } from './pages/OrderPages'
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordPages'
import ProductPage from './pages/ProductPage'
import { ManageReservationsPage } from './pages/ReservationPages'
import TillPage from './pages/TillPage'

// Pages du gerant chargees a la demande : les graphiques ne pesent pas sur la boutique
const DashboardPage = lazy(() => import('./pages/manage/DashboardPage'))
const StockPage = lazy(() => import('./pages/manage/StockPage'))
const CategoriesPage = lazy(() => import('./pages/manage/CategoriesPage'))
const ManageCatalogPage = lazy(() =>
  import('./pages/manage/CatalogPages').then((m) => ({ default: m.ManageCatalogPage })),
)
const ProductEditorPage = lazy(() =>
  import('./pages/manage/CatalogPages').then((m) => ({ default: m.ProductEditorPage })),
)
const TeamPage = lazy(() => import('./pages/manage/TeamPages').then((m) => ({ default: m.TeamPage })))
const CustomersPage = lazy(() => import('./pages/manage/TeamPages').then((m) => ({ default: m.CustomersPage })))

const authed = (page) => <RequireAuth>{page}</RequireAuth>
const staff = (page) => <RequireAuth staff>{page}</RequireAuth>
const manager = (page) => (
  <RequireAuth manager>
    <Suspense fallback={<Loader />}>{page}</Suspense>
  </RequireAuth>
)

function ManageHome() {
  const { user } = useAuth()
  return <Navigate to={manageHome(user.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogue" element={<CatalogPage />} />
        <Route path="produits/:slug" element={<ProductPage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="reinitialiser" element={<ResetPasswordPage />} />
        <Route path="compte" element={<AccountPage />} />
        <Route path="panier" element={authed(<CartPage />)} />
        <Route path="commande" element={authed(<CheckoutPage />)} />
        <Route path="compte/commandes/:id" element={authed(<OrderPage />)} />
        <Route path="gestion" element={staff(<ManageLayout />)}>
          <Route index element={<ManageHome />} />
          <Route path="tableau-de-bord" element={manager(<DashboardPage />)} />
          <Route path="commandes" element={<ManageOrdersPage />} />
          <Route path="reservations" element={<ManageReservationsPage />} />
          <Route path="caisse" element={<TillPage />} />
          <Route path="catalogue" element={manager(<ManageCatalogPage />)} />
          <Route path="catalogue/:id" element={manager(<ProductEditorPage />)} />
          <Route path="stock" element={manager(<StockPage />)} />
          <Route path="categories" element={manager(<CategoriesPage />)} />
          <Route
            path="clients"
            element={
              <Suspense fallback={<Loader />}>
                <CustomersPage />
              </Suspense>
            }
          />
          <Route path="equipe" element={manager(<TeamPage />)} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
