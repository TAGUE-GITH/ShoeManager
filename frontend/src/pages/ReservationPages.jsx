import { CalendarClock, FileText, Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { manageReservationsApi, reservationsApi, salesApi } from '../api/resources'
import { Alert, Button, Loader } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { formatPrice } from '../utils/format'
import { SALE_PAYMENTS, timeLeft } from '../utils/shop'

const STATUS_STYLE = {
  ACTIVE: 'bg-amber-50 text-amber-800 ring-amber-200',
  HONOREE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  ANNULEE: 'bg-stone-100 text-stone-600 ring-stone-200',
  EXPIREE: 'bg-stone-100 text-stone-600 ring-stone-200',
}

function ReservationStatus({ reservation }) {
  const { t } = useTranslation()
  // Une reservation echue mais pas encore passee par la tache planifiee est deja affichee « Expiree »
  const status = reservation.status === 'ACTIVE' && !reservation.is_holding ? 'EXPIREE' : reservation.status
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {t(`reservations.status.${status}`)}
    </span>
  )
}

function Countdown({ expiresAt }) {
  const { t } = useTranslation()
  const left = timeLeft(expiresAt)
  if (left.expired) return null
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-800">
      <CalendarClock className="size-4" aria-hidden />
      {t('reservations.timeLeft', { hours: left.hours, minutes: left.minutes })}
    </span>
  )
}

function PairLine({ reservation }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="size-4 shrink-0 rounded-full ring-1 ring-stone-300" style={{ backgroundColor: reservation.color_hex }} aria-hidden />
      <div className="min-w-0">
        <Link to={`/produits/${reservation.product_slug}`} className="font-semibold text-ink hover:text-brand-700">
          {reservation.brand} {reservation.product_name}
        </Link>
        <p className="text-sm text-stone-500">
          {t('cart.variant', { size: reservation.size, color: reservation.color })} · {formatPrice(reservation.price)}
        </p>
      </div>
    </div>
  )
}

// US-14 : reservations du client, dans « Mon compte »
export function MyReservations() {
  const { t } = useTranslation()
  const { data, loading, error } = useFetch(reservationsApi.list, 'my-reservations')
  const [updated, setUpdated] = useState({})
  const [actionError, setActionError] = useState('')

  if (loading) return <Loader />
  if (error) return <Alert>{error}</Alert>
  if (data.results.length === 0) return <p className="text-sm text-stone-500">{t('reservations.none')}</p>

  const cancel = async (reservation) => {
    if (!window.confirm(t('reservations.confirmCancel'))) return
    try {
      const result = await reservationsApi.cancel(reservation.id)
      setUpdated((current) => ({ ...current, [result.id]: result }))
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  return (
    <>
      <Alert>{actionError}</Alert>
      <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
        {data.results.map((original) => {
          const reservation = updated[original.id] ?? original
          return (
            <li key={reservation.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <PairLine reservation={reservation} />
              </div>
              {reservation.is_holding && <Countdown expiresAt={reservation.expires_at} />}
              <ReservationStatus reservation={reservation} />
              {reservation.is_holding && (
                <Button variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => cancel(reservation)}>
                  {t('reservations.cancel')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function ManagedReservation({ reservation: initial }) {
  const { t } = useTranslation()
  const [reservation, setReservation] = useState(initial)
  const [payment, setPayment] = useState('ESPECES')
  const [sale, setSale] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const run = async (kind, action) => {
    setBusy(kind)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy('')
    }
  }

  const honor = () =>
    run('honor', async () => {
      const created = await manageReservationsApi.honor(reservation.id, payment)
      setSale(created)
      setReservation({ ...reservation, status: 'HONOREE', is_holding: false })
    })
  const cancel = () => {
    if (!window.confirm(t('reservations.confirmCancel'))) return
    run('cancel', async () => setReservation(await manageReservationsApi.cancel(reservation.id)))
  }

  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PairLine reservation={reservation} />
        <div className="flex flex-wrap items-center gap-3">
          {reservation.is_holding && <Countdown expiresAt={reservation.expires_at} />}
          <ReservationStatus reservation={reservation} />
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-700">
        {reservation.reference} · {reservation.customer.name}
        {reservation.customer.phone && (
          <>
            {' · '}
            <a href={`tel:${reservation.customer.phone}`} className="inline-flex items-center gap-1 text-brand-700">
              <Phone className="size-3.5" aria-hidden />
              {reservation.customer.phone}
            </a>
          </>
        )}
      </p>
      <Alert>{error}</Alert>
      {(sale ?? reservation.sale) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          {t('reservations.sold', { reference: (sale ?? reservation.sale).reference })}
          <Button variant="secondary" onClick={() => salesApi.openReceipt((sale ?? reservation.sale).id)}>
            <FileText className="size-4" aria-hidden />
            {t('till.receipt')}
          </Button>
        </div>
      )}
      {reservation.is_holding && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
          <label className="sr-only" htmlFor={`payment-${reservation.id}`}>
            {t('till.payment')}
          </label>
          <select
            id={`payment-${reservation.id}`}
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
          >
            {SALE_PAYMENTS.map((method) => (
              <option key={method} value={method}>
                {t(`till.payments.${method}`)}
              </option>
            ))}
          </select>
          <Button loading={busy === 'honor'} disabled={Boolean(busy)} onClick={honor}>
            {t('reservations.honor')}
          </Button>
          <Button variant="ghost" className="text-red-700 hover:bg-red-50" loading={busy === 'cancel'} disabled={Boolean(busy)} onClick={cancel}>
            {t('reservations.cancel')}
          </Button>
        </div>
      )}
    </li>
  )
}

const FILTERS = ['ACTIVE', 'HONOREE', 'EXPIREE', 'ANNULEE', '']

// US-16 : reservations a traiter en boutique, les plus proches de l'echeance d'abord
export function ManageReservationsPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState('ACTIVE')
  const { data, loading, error } = useFetch(() => manageReservationsApi.list(status ? { status } : {}), status)

  return (
    <>
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
            {value ? t(`reservations.status.${value}`) : t('manage.all')}
          </button>
        ))}
      </div>
      {loading && <Loader />}
      <Alert>{error}</Alert>
      {data && data.results.length === 0 && <p className="mt-8 text-center text-stone-500">{t('reservations.noneToHandle')}</p>}
      {data && (
        <ul className="mt-6 space-y-4">
          {data.results.map((reservation) => (
            <ManagedReservation key={reservation.id} reservation={reservation} />
          ))}
        </ul>
      )}
    </>
  )
}
