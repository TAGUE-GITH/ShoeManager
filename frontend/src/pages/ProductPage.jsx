import { CalendarClock, ChevronRight, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { errorMessage, fieldErrors } from '../api/client'
import { catalogApi } from '../api/resources'
import ShoeIllustration from '../components/ShoeIllustration'
import { Alert, Button, Loader } from '../components/ui'
import { useAuth } from '../context/AuthProvider'
import { useCart } from '../context/CartProvider'
import { useFetch } from '../hooks/useFetch'
import { formatPrice, shoeShape } from '../utils/format'

// Couleurs du modele, dans l'ordre d'apparition des declinaisons
function colorsOf(product) {
  const colors = new Map()
  product.variants.forEach((variant) => colors.set(variant.color.id, variant.color))
  return [...colors.values()]
}

export default function ProductPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const { data: product, error, loading } = useFetch(() => catalogApi.product(slug), slug)
  const [colorId, setColorId] = useState(null)
  const [variantId, setVariantId] = useState(null)
  const { user } = useAuth()
  const { add } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', text: '' })

  if (loading) return <Loader />
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Alert>{error}</Alert>
        <Link to="/catalogue" className="mt-6 inline-block font-semibold text-brand-700">
          {t('product.backToCatalog')}
        </Link>
      </div>
    )
  }

  const colors = colorsOf(product)
  const color = colors.find((c) => c.id === colorId) ?? colors[0]
  const variants = product.variants.filter((variant) => variant.color.id === color?.id)
  const selected = variants.find((variant) => variant.id === variantId)

  // US-09 : il faut etre connecte pour avoir un panier ; on revient ensuite sur ce produit
  const addToCart = async () => {
    if (!user) {
      navigate('/connexion', { state: { from: location.pathname } })
      return
    }
    setAdding(true)
    setFeedback({ type: '', text: '' })
    try {
      await add(selected.id)
      setFeedback({ type: 'success', text: t('product.added', { size: selected.size }) })
    } catch (err) {
      setFeedback({ type: 'error', text: fieldErrors(err).quantity ?? errorMessage(err) })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-stone-500" aria-label={t('product.breadcrumb')}>
        <Link to="/catalogue" className="hover:text-ink">
          {t('nav.allShoes')}
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <Link to={`/catalogue?category=${product.category.slug}`} className="hover:text-ink">
          {product.category.name}
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-3xl bg-gradient-to-br from-stone-100 to-brand-50 p-10">
          {product.images[0] ? (
            <img src={product.images[0].image} alt={product.name} className="h-full w-full object-contain" />
          ) : (
            <ShoeIllustration shape={shoeShape(product.category.name)} color={color?.hex_code} className="w-full" />
          )}
        </div>

        <div>
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">{product.brand.name}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{product.name}</h1>
          <p className="mt-3 text-2xl font-bold text-ink">{formatPrice(product.price)}</p>
          {product.description && <p className="mt-5 leading-relaxed text-stone-600">{product.description}</p>}

          {colors.length > 0 && (
            <fieldset className="mt-8">
              <legend className="text-sm font-semibold text-ink">
                {t('product.colorValue', { name: color.name })}
              </legend>
              <div className="mt-3 flex gap-3">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={c.id === color.id}
                    onClick={() => {
                      setColorId(c.id)
                      setVariantId(null)
                    }}
                    className={`size-10 rounded-full ring-offset-2 ${c.id === color.id ? 'ring-2 ring-ink' : 'ring-1 ring-stone-300'}`}
                    style={{ backgroundColor: c.hex_code }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="mt-8">
            <legend className="text-sm font-semibold text-ink">{t('product.size')}</legend>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {variants.map((variant) => {
                const soldOut = variant.available === 0
                const active = variant.id === selected?.id
                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={soldOut}
                    aria-pressed={active}
                    aria-label={soldOut ? t('product.sizeSoldOut', { size: variant.size }) : variant.size}
                    onClick={() => setVariantId(variant.id)}
                    className={`rounded-xl py-2.5 text-sm font-semibold ring-1 transition ${
                      soldOut
                        ? 'cursor-not-allowed bg-stone-100 text-stone-400 line-through ring-stone-200'
                        : active
                          ? 'bg-ink text-white ring-ink'
                          : 'bg-white text-ink ring-stone-300 hover:ring-ink'
                    }`}
                  >
                    {variant.size}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 min-h-5 text-sm text-stone-600" aria-live="polite">
              {selected &&
                (selected.available <= 2
                  ? t('product.lastPairs', { count: selected.available })
                  : t('product.inStock', { count: selected.available }))}
            </p>
          </fieldset>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button onClick={addToCart} loading={adding} disabled={!selected}>
              <ShoppingBag className="size-4" aria-hidden />
              {t('product.addToCart')}
            </Button>
            <Button variant="secondary" disabled title={t('product.soon')}>
              <CalendarClock className="size-4" aria-hidden />
              {t('product.reserve')}
            </Button>
          </div>
          {!selected && <p className="mt-3 text-xs text-stone-500">{t('product.chooseSize')}</p>}
          {feedback.text && (
          <div className="mt-4">
            <Alert type={feedback.type}>
              {feedback.text}
              {feedback.type === 'success' && (
                <>
                  {' '}
                  <Link to="/panier" className="font-semibold underline">
                    {t('product.seeCart')}
                  </Link>
                </>
              )}
            </Alert>
          </div>
          )}
          <p className="mt-3 text-xs text-stone-500">{t('product.reserveSoon')}</p>
        </div>
      </div>
    </div>
  )
}
