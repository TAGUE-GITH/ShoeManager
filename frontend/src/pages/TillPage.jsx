import { FileText, Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage, fieldErrors } from '../api/client'
import { salesApi } from '../api/resources'
import ProductPicker from '../components/ProductPicker'
import { Alert, Button, Field, Loader } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { formatPrice } from '../utils/format'
import { addToTicket, SALE_PAYMENTS, ticketTotal } from '../utils/shop'

function SalesOfTheDay({ refreshKey }) {
  const { t, i18n } = useTranslation()
  const { data, loading } = useFetch(salesApi.list, `sales-${refreshKey}`)
  // Date du jour lue une fois a l'affichage de la caisse
  const [today] = useState(() => new Date().toDateString())
  if (loading) return <Loader />
  const sales = (data?.results ?? []).filter((sale) => new Date(sale.created_at).toDateString() === today)
  const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0)
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold text-ink">{t('till.today')}</h2>
        <p className="text-sm text-stone-600">
          {t('till.todayTotal', { count: sales.length, total: formatPrice(total) })}
        </p>
      </div>
      {sales.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">{t('till.noSales')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
          {sales.map((sale) => (
            <li key={sale.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{sale.reference}</p>
                <p className="text-sm text-stone-500">
                  {new Date(sale.created_at).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {sale.items.map((item) => `${item.quantity} × ${item.product_name} (${item.size})`).join(', ')}
                  {sale.reservation && ` · ${sale.reservation}`}
                </p>
              </div>
              <p className="font-semibold text-ink">{formatPrice(sale.total)}</p>
              <Button
                variant="secondary"
                onClick={() => salesApi.openReceipt(sale.id)}
                aria-label={t('till.receiptOf', { reference: sale.reference })}
              >
                <FileText className="size-4" aria-hidden />
                {t('till.receipt')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// US-17 et US-18 : caisse de la boutique
export default function TillPage() {
  const { t } = useTranslation()
  const [lines, setLines] = useState([])
  const [payment, setPayment] = useState('ESPECES')
  const [customerEmail, setCustomerEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [lastSale, setLastSale] = useState(null)

  const setQuantity = (variant, quantity) =>
    setLines((current) =>
      current.map((line) =>
        line.variant === variant ? { ...line, quantity: Math.max(1, Math.min(quantity, line.available)) } : line,
      ),
    )

  const checkout = async () => {
    setSending(true)
    setError('')
    setErrors({})
    try {
      const sale = await salesApi.create({
        items: lines.map(({ variant, quantity }) => ({ variant, quantity })),
        payment_method: payment,
        customer_email: customerEmail.trim(),
      })
      setLastSale(sale)
      setLines([])
      setCustomerEmail('')
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      setError(byField.customer_email ? '' : errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <ProductPicker onPick={(line) => setLines((current) => addToTicket(current, line))} />

        <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-stone-200" aria-label={t('till.ticket')}>
          <h2 className="font-bold text-ink">{t('till.ticket')}</h2>
          {lines.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">{t('till.emptyTicket')}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {lines.map((line) => (
                <li key={line.variant} className="text-sm">
                  <p className="font-medium text-ink">{line.label}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-lg ring-1 ring-stone-300">
                      <button
                        type="button"
                        className="p-1.5 disabled:opacity-40"
                        disabled={line.quantity <= 1}
                        onClick={() => setQuantity(line.variant, line.quantity - 1)}
                        aria-label={t('till.less')}
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-6 text-center font-semibold">{line.quantity}</span>
                      <button
                        type="button"
                        className="p-1.5 disabled:opacity-40"
                        disabled={line.quantity >= line.available}
                        onClick={() => setQuantity(line.variant, line.quantity + 1)}
                        aria-label={t('till.more')}
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="font-semibold">{formatPrice(Number(line.price) * line.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((item) => item.variant !== line.variant))}
                      className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-700"
                      aria-label={t('till.removeLine')}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 text-lg font-bold text-ink">
            <span>{t('checkout.total')}</span>
            <span>{formatPrice(ticketTotal(lines))}</span>
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-stone-700">{t('till.payment')}</legend>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {SALE_PAYMENTS.map((method) => (
                <label
                  key={method}
                  className={`cursor-pointer rounded-lg px-2 py-2 text-center text-xs font-semibold ring-1 focus-within:ring-2 focus-within:ring-brand-600 ${
                    payment === method ? 'bg-ink text-white ring-ink' : 'ring-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method}
                    checked={payment === method}
                    onChange={() => setPayment(method)}
                    className="sr-only"
                  />
                  {t(`till.payments.${method}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            className="mt-4"
            label={t('till.customer')}
            type="email"
            placeholder="client@exemple.cm"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            error={errors.customer_email}
          />

          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
          <Button className="mt-4 w-full py-3" disabled={lines.length === 0} loading={sending} onClick={checkout}>
            {t('till.checkout')}
          </Button>
        </aside>
      </div>

      {lastSale && (
        <div
          className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900 ring-1 ring-emerald-200"
          role="status"
        >
          <p className="flex-1 font-semibold">
            {t('till.done', { reference: lastSale.reference, total: formatPrice(lastSale.total) })}
          </p>
          <Button variant="secondary" onClick={() => salesApi.openReceipt(lastSale.id)}>
            <FileText className="size-4" aria-hidden />
            {t('till.receipt')}
          </Button>
        </div>
      )}

      <SalesOfTheDay refreshKey={lastSale?.id ?? 0} />
    </>
  )
}
