import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { ordersApi } from '../api/resources'
import { OrderSummary, OrderTimeline, StatusBadge } from '../components/orders'
import { Alert, Button, Loader } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { formatPrice } from '../utils/format'

const dateFormat = (value, language) =>
  new Date(value).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// US-11 : liste des commandes du client (affichee dans « Mon compte »)
export function MyOrders() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useFetch(ordersApi.list, 'my-orders')
  if (loading) return <Loader />
  if (error) return <Alert>{error}</Alert>
  if (data.results.length === 0) return <p className="text-sm text-stone-500">{t('orders.none')}</p>
  return (
    <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
      {data.results.map((order) => (
        <li key={order.id}>
          <Link to={`/compte/commandes/${order.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-stone-50">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{order.reference}</p>
              <p className="text-sm text-stone-500">
                {dateFormat(order.created_at, i18n.language)} · {t('cart.pairs', { count: order.items.reduce((sum, item) => sum + item.quantity, 0) })}
              </p>
            </div>
            <StatusBadge status={order.status} />
            <p className="w-28 text-right font-semibold text-ink">{formatPrice(order.total)}</p>
            <ChevronRight className="size-5 text-stone-400" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  )
}

// Detail d'une commande : suivi, contenu, reception et annulation possible
export function OrderPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const placed = useLocation().state?.placed
  const { data, loading, error } = useFetch(() => ordersApi.get(id), id)
  const [order, setOrder] = useState(null)
  const [actionError, setActionError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  if (loading) return <Loader />
  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><Alert>{error}</Alert></div>

  const current = order ?? data
  const cancel = async () => {
    if (!window.confirm(t('orders.confirmCancel'))) return
    setCancelling(true)
    setActionError('')
    try {
      setOrder(await ordersApi.cancel(current.id))
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {placed && (
        <div className="mb-8 flex gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-200" role="status">
          <CheckCircle2 className="size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{t('orders.thanks')}</p>
            <p className="text-sm">{t('orders.thanksText')}</p>
          </div>
        </div>
      )}
      <Link to="/compte" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
        ← {t('orders.backToAccount')}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t('orders.title', { reference: current.reference })}</h1>
          <p className="text-sm text-stone-500">{dateFormat(current.created_at, i18n.language)}</p>
        </div>
        <StatusBadge status={current.status} />
      </div>

      <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-stone-200">
        <OrderTimeline order={current} />
      </section>

      <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-stone-200">
        <OrderSummary order={current} />
      </section>

      <section className="mt-6 grid gap-4 rounded-2xl bg-white p-6 text-sm ring-1 ring-stone-200 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-ink">{t('checkout.reception')}</p>
          <p className="mt-1 text-stone-600">
            {current.delivery_mode === 'LIVRAISON'
              ? `${t('checkout.delivery')} · ${t(`checkout.zones.${current.delivery_zone}`)}`
              : t('checkout.pickup')}
          </p>
          {current.delivery_address && <p className="text-stone-600">{current.delivery_address}</p>}
          <p className="text-stone-600">{current.phone}</p>
        </div>
        <div>
          <p className="font-semibold text-ink">{t('checkout.payment')}</p>
          <p className="mt-1 text-stone-600">{t(`checkout.payments.${current.payment_method}`)}</p>
          <p className={current.is_paid ? 'text-emerald-700' : 'text-stone-500'}>
            {current.is_paid ? t('orders.paid') : t('orders.notPaid')}
          </p>
        </div>
      </section>

      <Alert>{actionError}</Alert>
      {current.can_cancel && (
        <Button variant="secondary" className="mt-6" loading={cancelling} onClick={cancel}>
          {t('orders.cancel')}
        </Button>
      )}
    </div>
  )
}
