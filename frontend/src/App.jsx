import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AccountPage, LoginPage, NotFoundPage, RegisterPage } from './pages/AuthPages'
import CatalogPage from './pages/CatalogPage'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'

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
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
