import { ClipboardList, Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { catalogApi } from '../api/resources'
import { useAuth } from '../context/AuthProvider'
import { useCart } from '../context/CartProvider'
import { useFetch } from '../hooks/useFetch'
import { LANGUAGES } from '../i18n'
import Logo from './Logo'

const YEAR = new Date().getFullYear()

function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  return (
    <div className="flex rounded-lg bg-stone-100 p-0.5" role="group" aria-label={t('common.language')}>
      {LANGUAGES.map(({ code, label, short }) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={label}
          aria-pressed={i18n.language === code}
          onClick={() => i18n.changeLanguage(code)}
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            i18n.language === code ? 'bg-white text-ink shadow-sm' : 'text-stone-500 hover:text-ink'
          }`}
        >
          {short}
        </button>
      ))}
    </div>
  )
}

function SearchBox({ onSearch }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const submit = (event) => {
    event.preventDefault()
    navigate(query.trim() ? `/catalogue?search=${encodeURIComponent(query.trim())}` : '/catalogue')
    onSearch?.()
  }
  return (
    <form onSubmit={submit} role="search" className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('nav.searchPlaceholder')}
        aria-label={t('nav.search')}
        className="w-full rounded-xl border border-stone-300 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
      />
    </form>
  )
}

function Header() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { cart } = useCart()
  const isStaff = ['GERANT', 'VENDEUR'].includes(user?.role)
  const [open, setOpen] = useState(false)
  const { data: categories } = useFetch(catalogApi.categories, 'categories')

  const links = (categories ?? []).map((category) => ({ to: `/catalogue?category=${category.slug}`, label: category.name }))
  const navClass = 'text-sm font-semibold whitespace-nowrap text-stone-700 hover:text-brand-700'

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex" aria-label={t('nav.main')}>
          <NavLink to="/catalogue" end className={navClass}>
            {t('nav.allShoes')}
          </NavLink>
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={navClass}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden w-56 xl:block 2xl:w-64">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          {isStaff && (
            <Link
              to="/gestion/commandes"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-stone-700 hover:bg-stone-100"
              title={t('nav.shopSpace')}
            >
              <ClipboardList className="size-5" aria-hidden />
              <span className="hidden 2xl:inline">{t('nav.shopSpace')}</span>
              <span className="sr-only 2xl:hidden">{t('nav.shopSpace')}</span>
            </Link>
          )}
          <Link
            to="/panier"
            className="relative rounded-xl p-2 text-stone-700 hover:bg-stone-100"
            aria-label={t('nav.cart', { count: cart.count })}
          >
            <ShoppingBag className="size-5" aria-hidden />
            {cart.count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[11px] font-bold text-white">
                {cart.count}
              </span>
            )}
          </Link>
          <Link
            to={user ? '/compte' : '/connexion'}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            <User className="size-5" aria-hidden />
            <span className="hidden sm:inline">{user ? user.first_name : t('nav.login')}</span>
            <span className="sr-only sm:hidden">{user ? t('nav.account') : t('nav.login')}</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            className="rounded-xl p-2 text-stone-700 hover:bg-stone-100 md:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="space-y-4 border-t border-stone-200 bg-white px-4 py-4 md:hidden">
          <SearchBox onSearch={() => setOpen(false)} />
          <nav className="flex flex-col gap-1" aria-label={t('nav.main')}>
            {[{ to: '/catalogue', label: t('nav.allShoes') }, ...links].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher />
        </div>
      )}
    </header>
  )
}

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mt-20 border-t border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-stone-500">{t('footer.tagline')}</p>
        </div>
        <div className="text-sm text-stone-600">
          <p className="font-semibold text-ink">{t('footer.shop')}</p>
          <p className="mt-2">{t('footer.address')}</p>
          <p>{t('footer.hours')}</p>
        </div>
        <div className="text-sm text-stone-600">
          <p className="font-semibold text-ink">{t('footer.services')}</p>
          <p className="mt-2">{t('footer.delivery')}</p>
          <p>{t('footer.reservation')}</p>
        </div>
      </div>
      <p className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
        © {YEAR} FranckShoese · {t('footer.poweredBy')}
      </p>
    </footer>
  )
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
