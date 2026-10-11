import { CalendarClock, ClipboardList, Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

// Espace boutique (gerant et vendeurs) : commandes en ligne, reservations et caisse
export default function ManageLayout() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/gestion/commandes', label: t('manage.tabs.orders'), Icon: ClipboardList },
    { to: '/gestion/reservations', label: t('manage.tabs.reservations'), Icon: CalendarClock },
    { to: '/gestion/caisse', label: t('manage.tabs.till'), Icon: Store },
  ]
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">{t('nav.shopSpace')}</p>
      <nav className="mt-3 flex gap-2 overflow-x-auto border-b border-stone-200" aria-label={t('nav.shopSpace')}>
        {tabs.map(({ to, label, Icon }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  )
}
