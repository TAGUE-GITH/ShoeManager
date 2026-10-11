import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Package,
  Store,
  Users,
  UsersRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

// Onglets de l'espace boutique : les vendeurs voient la vente, le gerant voit aussi le pilotage
const TABS = [
  { to: '/gestion/tableau-de-bord', key: 'dashboard', Icon: LayoutDashboard, manager: true },
  { to: '/gestion/commandes', key: 'orders', Icon: ClipboardList },
  { to: '/gestion/reservations', key: 'reservations', Icon: CalendarClock },
  { to: '/gestion/caisse', key: 'till', Icon: Store },
  { to: '/gestion/catalogue', key: 'catalog', Icon: Package, manager: true },
  { to: '/gestion/categories', key: 'categories', Icon: FolderTree, manager: true },
  { to: '/gestion/stock', key: 'stock', Icon: AlertTriangle, manager: true },
  { to: '/gestion/clients', key: 'customers', Icon: UsersRound },
  { to: '/gestion/equipe', key: 'team', Icon: Users, manager: true },
]

// Page d'accueil de l'espace boutique selon le role
// eslint-disable-next-line react-refresh/only-export-components
export const manageHome = (role) => (role === 'GERANT' ? 'tableau-de-bord' : 'commandes')

export default function ManageLayout() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const tabs = TABS.filter((tab) => !tab.manager || user.role === 'GERANT')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = tabs.find((tab) => pathname.startsWith(tab.to))
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">{t('nav.shopSpace')}</p>
      {/* Telephone : toutes les rubriques dans une liste, sans defilement horizontal */}
      <label className="mt-3 block md:hidden">
        <span className="sr-only">{t('nav.shopSpace')}</span>
        <select
          value={current?.to ?? ''}
          onChange={(event) => navigate(event.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base font-semibold text-ink"
        >
          {tabs.map(({ to, key }) => (
            <option key={to} value={to}>
              {t(`manage.tabs.${key}`)}
            </option>
          ))}
        </select>
      </label>
      <nav
        className="mt-3 hidden gap-1 overflow-x-auto border-b border-stone-200 md:flex"
        aria-label={t('nav.shopSpace')}
      >
        {tabs.map(({ to, key, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-semibold ${
                isActive ? 'border-brand-700 text-brand-700' : 'border-transparent text-stone-600 hover:text-ink'
              }`
            }
          >
            <Icon className="size-4" aria-hidden />
            {t(`manage.tabs.${key}`)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  )
}
