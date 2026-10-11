import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Package,
  Store,
  Users,
  UsersRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

// Onglets de l'espace boutique : les vendeurs voient la vente, le gerant voit aussi le pilotage
const TABS = [
  { to: '/gestion/tableau-de-bord', key: 'dashboard', Icon: LayoutDashboard, manager: true },
  { to: '/gestion/commandes', key: 'orders', Icon: ClipboardList },
  { to: '/gestion/reservations', key: 'reservations', Icon: CalendarClock },
  { to: '/gestion/caisse', key: 'till', Icon: Store },
  { to: '/gestion/catalogue', key: 'catalog', Icon: Package, manager: true },
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
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">{t('nav.shopSpace')}</p>
      <nav className="mt-3 flex gap-2 overflow-x-auto border-b border-stone-200" aria-label={t('nav.shopSpace')}>
        {tabs.map(({ to, key, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${
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
