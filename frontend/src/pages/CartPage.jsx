import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { errorMessage, fieldErrors } from '../api/client'
import { buttonClasses } from '../components/buttonStyles'
import ShoeIllustration from '../components/ShoeIllustration'
import { Alert } from '../components/ui'
import { useCart } from '../context/CartProvider'
import { formatPrice, shoeShape } from '../utils/format'

function QuantityStepper({ item, onChange, busy }) {
  const { t } = useTranslation()
  const button = 'flex size-9 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100 disabled:opacity-40'
  return (
    <div className="flex items-center rounded-xl ring-1 ring-stone-300">
      <button
        type="button"
        className={button}
        disabled={busy || item.quantity <= 1}
        onClick={() => onChange(item.quantity - 1)}
        aria-label={t('cart.decrease', { name: item.product.name })}
      >
        <Minus className="size-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
        {item.quantity}
      </span>
      <button
        type="button"
        className={button}
        disabled={busy || item.quantity >= item.available}
        onClick={() => onChange(item.quantity + 1)}
        aria-label={t('cart.increase', { name: item.product.name })}
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export default function CartPage() {
  const { t } = useTranslation()
  const { cart, update, remove } = useCart()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  const run = async (itemId, action) => {
    setBusy(itemId)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(fieldErrors(err).quantity ?? errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto size-12 text-stone-300" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-ink">{t('cart.emptyTitle')}</h1>
        <p className="mt-2 text-stone-500">{t('cart.emptyText')}</p>
        <Link to="/catalogue" className={buttonClasses('primary', 'mt-6')}>
          {t('home.cta')}
        </Link>
      </div>
    )
  }

  // Une ligne depasse le stock (des paires ont ete vendues entre-temps) : il faut corriger avant de commander
  const blocked = cart.items.some((item) => item.quantity > item.available)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('cart.title')}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          <Alert>{error}</Alert>
          <ul className="mt-2 divide-y divide-stone-200 rounded-2xl bg-white ring-1 ring-stone-200">
            {cart.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                <Link to={`/produits/${item.product.slug}`} className="w-24 shrink-0 rounded-xl bg-stone-100 p-2">
                  <ShoeIllustration shape={shoeShape(item.product.category)} color={item.color_hex} className="w-full" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand-700 uppercase">{item.product.brand}</p>
                  <Link to={`/produits/${item.product.slug}`} className="font-semibold text-ink hover:text-brand-700">
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-stone-500">{t('cart.variant', { size: item.size, color: item.color })}</p>
                  {item.quantity > item.available && (
                    <p className="mt-1 text-sm font-medium text-red-700">{t('cart.onlyLeft', { count: item.available })}</p>
                  )}
                </div>
                <QuantityStepper item={item} busy={busy === item.id} onChange={(quantity) => run(item.id, () => update(item.id, quantity))} />
                <p className="w-28 text-right font-semibold text-ink">{formatPrice(item.line_total)}</p>
                <button
                  type="button"
                  onClick={() => run(item.id, () => remove(item.id))}
                  className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-700"
                  aria-label={t('cart.remove', { name: item.product.name })}
                >
                  <Trash2 className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="h-fit rounded-2xl bg-white p-6 ring-1 ring-stone-200">
          <div className="flex justify-between text-sm text-stone-600">
            <span>{t('cart.pairs', { count: cart.count })}</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
          <p className="mt-2 text-xs text-stone-500">{t('cart.feesNote')}</p>
          <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 text-lg font-bold text-ink">
            <span>{t('checkout.subtotal')}</span>
            <span>{formatPrice(cart.total)}</span>
          </div>
          {blocked ? (
            <p className="mt-6 text-sm text-red-700">{t('cart.fixQuantities')}</p>
          ) : (
            <Link to="/commande" className={buttonClasses('primary', 'mt-6 w-full py-3')}>
              {t('cart.checkout')}
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}
