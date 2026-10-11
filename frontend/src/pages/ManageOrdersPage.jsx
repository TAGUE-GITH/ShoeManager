import { Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../api/client'
import { manageOrdersApi } from '../api/resources'
import { OrderSummary, StatusBadge } from '../components/orders'
import { Alert, Button, Loader } from '../components/ui'
import { useFetch } from '../hooks/useFetch'

const FILTERS = ['', 'EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'PRETE', 'LIVREE', 'ANNULEE']

function ManagedOrder({ order: initial }) {
  const { t, i18n } = useTranslation()
  const [order, setOrder] = useState(initial)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const move = async (status) => {
    if (status === 'ANNULEE' && !window.confirm(t('manage.confirmCancel', { reference: order.reference }))) return
    setBusy(status)
    setError('')
    try {
      setOrder(await manageOrdersApi.setStatus(order.id, status))
    } catch (err) {
      setError(err.response?.data?.status?.[0] ?? errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink">{order.reference}</p>
          <p className="text-sm text-stone-500">
            {new Date(order.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <p className="mt-1 text-sm text-stone-700">
            {order.customer.name} · <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1 text-brand-700"><Phone className="size-3.5" aria-hidden />{order.phone}</a>
          </p>
          <p className="text-sm text-stone-500">
            {order.delivery_mode === 'LIVRAISON' ? `${t('checkout.delivery')} · ${order.delivery_address}` : t('checkout.pickup')} ·{' '}
            {t(`checkout.payments.${order.payment_method}`)} {order.is_paid && `(${t('orders.paid')})`}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-4">
        <OrderSummary order={order} />
      </div>
      <Alert>{error}</Alert>
      {order.next_statuses.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
          {order.next_statuses.map(({ value }) => (
            <Button
              key={value}
              variant={value === 'ANNULEE' ? 'ghost' : 'primary'}
              loading={busy === value}
              disabled={Boolean(busy)}
              onClick={() => move(value)}
              className={value === 'ANNULEE' ? 'text-red-700 hover:bg-red-50' : ''}
            >
              {t(`manage.actions.${value}`)}
            </Button>
          ))}
        </div>
      )}
    </li>
  )
}

// US-12 : traitement des commandes par la boutique (gerant et vendeurs)
export default function ManageOrdersPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('EN_ATTENTE')
  const { data, loading, error } = useFetch(() => manageOrdersApi.list(status ? { status } : {}), status)

  return (
    <>
      <h1 className="sr-only">{t('manage.ordersTitle')}</h1>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t('manage.filter')}>
        {FILTERS.map((value) => (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => setStatus(value)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 ${
              status === value ? 'bg-ink text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300 hover:ring-stone-500'
            }`}
          >
            {value ? t(`orders.status.${value}`) : t('manage.all')}
          </button>
        ))}
      </div>
      {loading && <Loader />}
      <Alert>{error}</Alert>
      {data && data.results.length === 0 && <p className="mt-8 text-center text-stone-500">{t('manage.noOrders')}</p>}
      {data && (
        <ul className="mt-6 space-y-4">
          {data.results.map((order) => (
            <ManagedOrder key={order.id} order={order} />
          ))}
        </ul>
      )}
    </>
  )
}
