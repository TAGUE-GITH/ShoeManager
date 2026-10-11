import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { catalogApi } from '../api/resources'
import { useFetch } from '../hooks/useFetch'
import { formatPrice } from '../utils/format'
import { Loader } from './ui'

// Choix d'un modele puis de sa pointure et sa couleur (seules les paires disponibles sont proposees)
export default function ProductPicker({ onPick }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [slug, setSlug] = useState(null)
  const { data: results, loading } = useFetch(() => catalogApi.products(search ? { search } : {}), `till-${search}`)
  const { data: product } = useFetch(
    () => (slug ? catalogApi.product(slug) : Promise.resolve(null)),
    `till-product-${slug}`,
  )

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(query.trim())
          setSlug(null)
        }}
        className="relative"
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('till.searchPlaceholder')}
          aria-label={t('till.search')}
          className="w-full rounded-xl border border-stone-300 py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        />
      </form>

      {loading ? (
        <Loader />
      ) : (
        <ul className="mt-4 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
          {(results?.results ?? []).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSlug(item.slug)}
                aria-pressed={slug === item.slug}
                className={`w-full rounded-xl p-3 text-left ring-1 transition ${
                  slug === item.slug ? 'bg-brand-50 ring-2 ring-brand-700' : 'ring-stone-200 hover:ring-stone-400'
                }`}
              >
                <span className="block text-xs font-semibold text-brand-700 uppercase">{item.brand}</span>
                <span className="block font-semibold text-ink">{item.name}</span>
                <span className="block text-sm text-stone-500">{formatPrice(item.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {product && (
        <div className="mt-5 border-t border-stone-100 pt-4">
          <p className="text-sm font-semibold text-ink">{t('till.pickSize', { name: product.name })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                disabled={variant.available === 0}
                onClick={() =>
                  onPick({
                    variant: variant.id,
                    label: `${product.name} · ${t('cart.variant', { size: variant.size, color: variant.color.name })}`,
                    price: product.price,
                    available: variant.available,
                  })
                }
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-stone-300 hover:ring-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through"
                aria-label={t('till.addVariant', {
                  size: variant.size,
                  color: variant.color.name,
                  count: variant.available,
                })}
              >
                <span
                  className="size-3 rounded-full ring-1 ring-stone-300"
                  style={{ backgroundColor: variant.color.hex_code }}
                  aria-hidden
                />
                {variant.size}
                <span className="text-xs font-normal text-stone-500">({variant.available})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
