import { Store, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { errorMessage, fieldErrors } from '../api/client'
import { deliveryApi, ordersApi } from '../api/resources'
import { Alert, Button, Field, Loader } from '../components/ui'
import { useAuth } from '../context/AuthProvider'
import { useCart } from '../context/CartProvider'
import { useFetch } from '../hooks/useFetch'
import { formatPrice } from '../utils/format'
import { deliveryFee, paymentOptions, tooFewPairsAbroad } from '../utils/orders'

function Choice({ checked, onChange, name, value, title, text, Icon }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 transition focus-within:ring-2 focus-within:ring-brand-600 ${
        checked ? 'bg-brand-50 ring-2 ring-brand-700' : 'bg-white ring-stone-300 hover:ring-stone-500'
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {Icon && <Icon className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />}
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        {text && <span className="block text-sm text-stone-500">{text}</span>}
      </span>
    </label>
  )
}

// US-10 : choix de la livraison ou du retrait, puis du paiement ; le serveur verifie le stock et recalcule tout
export default function CheckoutPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { cart, ready, refresh } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    delivery_mode: 'LIVRAISON',
    delivery_city: 'DOUALA',
    delivery_address: '',
    phone: user.phone ?? '',
    payment_method: 'A_LA_LIVRAISON',
  })
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  // Destinations et regles de livraison fournies par le serveur
  const { data: delivery } = useFetch(deliveryApi.get, 'delivery')

  if (!ready) return <Loader />
  if (cart.items.length === 0 && !sending) return <Navigate to="/panier" replace />

  const set = (changes) => setForm((current) => ({ ...current, ...changes }))
  const changeMode = (mode) => set({ delivery_mode: mode, payment_method: paymentOptions(mode)[0] })
  const destinations = delivery?.destinations ?? []
  const rules = delivery?.rules
  const zone = destinations.find((destination) => destination.key === form.delivery_city)?.zone
  const pairs = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const fee = deliveryFee(form.delivery_mode, zone, cart.total, pairs, rules)
  const blocked = form.delivery_mode === 'LIVRAISON' && tooFewPairsAbroad(zone, pairs, rules)
  const groups = ['DOUALA', 'AUTRE_VILLE', 'ETRANGER'].map((group) => [
    group,
    destinations.filter((destination) => destination.zone === group),
  ])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setErrors({})
    setSending(true)
    try {
      const order = await ordersApi.place(form)
      await refresh()
      navigate(`/compte/commandes/${order.id}`, { replace: true, state: { placed: true } })
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      setError(Object.keys(byField).length ? '' : errorMessage(err))
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl px-4 py-10 sm:px-6" noValidate>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('checkout.title')}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <Alert>{error}</Alert>

          <fieldset>
            <legend className="text-lg font-bold text-ink">{t('checkout.reception')}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Choice
                name="delivery_mode"
                value="LIVRAISON"
                checked={form.delivery_mode === 'LIVRAISON'}
                onChange={() => changeMode('LIVRAISON')}
                title={t('checkout.delivery')}
                text={t('checkout.deliveryText')}
                Icon={Truck}
              />
              <Choice
                name="delivery_mode"
                value="RETRAIT"
                checked={form.delivery_mode === 'RETRAIT'}
                onChange={() => changeMode('RETRAIT')}
                title={t('checkout.pickup')}
                text={t('checkout.pickupText')}
                Icon={Store}
              />
            </div>
          </fieldset>

          {form.delivery_mode === 'LIVRAISON' && (
            <fieldset className="space-y-4">
              <legend className="text-lg font-bold text-ink">{t('checkout.address')}</legend>
              <div>
                <label htmlFor="delivery-city" className="mb-1.5 block text-sm font-medium text-stone-700">
                  {t('checkout.city')}
                </label>
                <select
                  id="delivery-city"
                  value={form.delivery_city}
                  onChange={(event) => set({ delivery_city: event.target.value })}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                >
                  {groups.map(([group, items]) => (
                    <optgroup key={group} label={t(`checkout.zones.${group}`)}>
                      {items.map((destination) => (
                        <option key={destination.key} value={destination.key}>
                          {destination.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.delivery_city && <p className="mt-1.5 text-sm text-red-700">{errors.delivery_city}</p>}
                {rules && (
                  <ul className="mt-2 space-y-0.5 text-xs text-stone-500">
                    <li>{t('checkout.rules.douala', { fee: formatPrice(rules.douala_fee) })}</li>
                    <li>{t('checkout.rules.cities', { rate: rules.rates.AUTRE_VILLE })}</li>
                    <li>{t('checkout.rules.abroad', { rate: rules.rates.ETRANGER, count: rules.min_pairs_abroad })}</li>
                    <li>{t('checkout.rules.bulk', { discount: rules.bulk_discount, count: rules.bulk_pairs })}</li>
                  </ul>
                )}
              </div>
              {blocked && <Alert>{t('checkout.abroadMinimum', { count: rules.min_pairs_abroad, pairs })}</Alert>}
              <Field
                label={t('checkout.addressLabel')}
                placeholder={t('checkout.addressPlaceholder')}
                value={form.delivery_address}
                onChange={(event) => set({ delivery_address: event.target.value })}
                error={errors.delivery_address}
                autoComplete="street-address"
                required
              />
            </fieldset>
          )}

          <Field
            label={t('fields.phone')}
            type="tel"
            placeholder="+237 6XX XX XX XX"
            value={form.phone}
            onChange={(event) => set({ phone: event.target.value })}
            error={errors.phone}
            autoComplete="tel"
            required
          />

          <fieldset>
            <legend className="text-lg font-bold text-ink">{t('checkout.payment')}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {paymentOptions(form.delivery_mode).map((method) => (
                <Choice
                  key={method}
                  name="payment_method"
                  value={method}
                  checked={form.payment_method === method}
                  onChange={() => set({ payment_method: method })}
                  title={t(`checkout.payments.${method}`)}
                  text={method === 'MOBILE_MONEY' ? t('checkout.demoPayment') : undefined}
                />
              ))}
            </div>
            {errors.payment_method && <p className="mt-2 text-sm text-red-700">{errors.payment_method}</p>}
          </fieldset>
        </div>

        <aside className="h-fit rounded-2xl bg-white p-6 ring-1 ring-stone-200">
          <h2 className="font-bold text-ink">{t('checkout.summary')}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="text-stone-600">
                  {item.quantity} × {item.product.name} ({item.size})
                </span>
                <span className="shrink-0">{formatPrice(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-stone-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">{t('checkout.subtotal')}</dt>
              <dd>{formatPrice(cart.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t('checkout.deliveryFee')}</dt>
              <dd>{fee ? formatPrice(fee) : t('checkout.free')}</dd>
            </div>
            <div className="flex justify-between pt-2 text-lg font-bold text-ink">
              <dt>{t('checkout.total')}</dt>
              <dd>{formatPrice(Number(cart.total) + fee)}</dd>
            </div>
          </dl>
          {form.delivery_mode === 'LIVRAISON' && pairs >= (rules?.bulk_pairs ?? Infinity) && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {t('checkout.bulkApplied', { discount: rules.bulk_discount })}
            </p>
          )}
          <Button type="submit" loading={sending} disabled={blocked || !rules} className="mt-6 w-full py-3">
            {t('checkout.confirm')}
          </Button>
        </aside>
      </div>
    </form>
  )
}
