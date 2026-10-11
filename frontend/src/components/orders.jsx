import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { formatPrice } from '../utils/format'
import { orderSteps, STATUS_STYLE } from '../utils/orders'
import { Loader } from './ui'

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {t(`orders.status.${status}`)}
    </span>
  )
}

// Suivi de commande : etapes passees cochees, etape en cours mise en avant
export function OrderTimeline({ order }) {
  const { t } = useTranslation()
  if (order.status === 'ANNULEE') return <StatusBadge status="ANNULEE" />
  const steps = orderSteps(order.delivery_mode)
  const current = steps.indexOf(order.status)
  return (
    <ol className="grid gap-3 sm:grid-cols-5" aria-label={t('orders.tracking')}>
      {steps.map((step, index) => {
        const done = index <= current
        return (
          <li key={step} className="flex items-center gap-2 sm:flex-col sm:items-start" aria-current={index === current ? 'step' : undefined}>
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done ? 'bg-brand-700 text-white' : 'bg-stone-200 text-stone-500'
              }`}
            >
              {done ? <Check className="size-4" aria-hidden /> : index + 1}
            </span>
            <span className={`text-sm ${index === current ? 'font-semibold text-ink' : 'text-stone-500'}`}>
              {t(`orders.status.${step}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// Lignes d'une commande et totaux
export function OrderSummary({ order }) {
  const { t } = useTranslation()
  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <span className="size-4 shrink-0 rounded-full ring-1 ring-stone-300" style={{ backgroundColor: item.color_hex }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{item.product_name}</p>
              <p className="text-sm text-stone-500">
                {t('cart.variant', { size: item.size, color: item.color })} · × {item.quantity}
              </p>
            </div>
            <p className="font-semibold text-ink">{formatPrice(item.line_total)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-500">{t('checkout.subtotal')}</dt>
          <dd>{formatPrice(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">{t('checkout.deliveryFee')}</dt>
          <dd>{Number(order.delivery_fee) ? formatPrice(order.delivery_fee) : t('checkout.free')}</dd>
        </div>
        <div className="flex justify-between text-base font-bold text-ink">
          <dt>{t('checkout.total')}</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </div>
  )
}

// Page reservee aux utilisateurs connectes (et eventuellement au personnel de la boutique)
export function RequireAuth({ staff = false, manager = false, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loader />
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />
  if (staff && !['GERANT', 'VENDEUR'].includes(user.role)) return <Navigate to="/" replace />
  if (manager && user.role !== 'GERANT') return <Navigate to="/gestion" replace />
  return children
}
