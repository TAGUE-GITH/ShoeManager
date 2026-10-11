import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { catalogApi } from '../api/resources'
import ProductCard from '../components/ProductCard'
import { Alert, Button, Loader } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { catalogParams } from '../utils/format'

const SIZES = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45]

function FilterGroup({ title, children }) {
  return (
    <fieldset className="border-b border-stone-200 py-5 first:pt-0">
      <legend className="mb-3 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  )
}

// Filtres du catalogue : chaque choix met a jour l'adresse de la page (partageable, bouton retour du navigateur)
export function Filters({ params, onChange }) {
  const { t } = useTranslation()
  const { data: categories } = useFetch(catalogApi.categories, 'categories')
  const { data: brands } = useFetch(catalogApi.brands, 'brands')
  const { data: colors } = useFetch(catalogApi.colors, 'colors')
  const chip = (active) =>
    `rounded-lg px-2.5 py-1.5 text-sm font-medium ring-1 transition ${
      active ? 'bg-ink text-white ring-ink' : 'bg-white text-stone-700 ring-stone-300 hover:ring-stone-500'
    }`

  return (
    <div>
      <FilterGroup title={t('catalog.category')}>
        <ul className="space-y-1">
          <li>
            <button type="button" onClick={() => onChange({ category: null })} className={`text-sm ${!params.category ? 'font-semibold text-brand-700' : 'text-stone-600 hover:text-ink'}`}>
              {t('catalog.all')}
            </button>
          </li>
          {(categories ?? []).map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onChange({ category: category.slug })}
                aria-pressed={params.category === category.slug}
                className={`text-sm ${params.category === category.slug ? 'font-semibold text-brand-700' : 'text-stone-700 hover:text-ink'}`}
              >
                {category.name}
              </button>
              <ul className="mt-1 ml-3 space-y-1 border-l border-stone-200 pl-3">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => onChange({ category: child.slug })}
                      aria-pressed={params.category === child.slug}
                      className={`text-sm ${params.category === child.slug ? 'font-semibold text-brand-700' : 'text-stone-500 hover:text-ink'}`}
                    >
                      {child.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </FilterGroup>

      <FilterGroup title={t('catalog.size')}>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={params.size === String(size)}
              onClick={() => onChange({ size: params.size === String(size) ? null : String(size) })}
              className={chip(params.size === String(size))}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title={t('catalog.color')}>
        <div className="flex flex-wrap gap-2">
          {(colors ?? []).map((color) => {
            const active = params.color === String(color.id)
            return (
              <button
                key={color.id}
                type="button"
                title={color.name}
                aria-label={color.name}
                aria-pressed={active}
                onClick={() => onChange({ color: active ? null : String(color.id) })}
                className={`size-8 rounded-full ring-offset-2 transition ${active ? 'ring-2 ring-ink' : 'ring-1 ring-stone-300 hover:ring-stone-500'}`}
                style={{ backgroundColor: color.hex_code }}
              />
            )
          })}
        </div>
      </FilterGroup>

      <FilterGroup title={t('catalog.brand')}>
        <select
          value={params.brand ?? ''}
          onChange={(event) => onChange({ brand: event.target.value || null })}
          aria-label={t('catalog.brand')}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{t('catalog.allBrands')}</option>
          {(brands ?? []).map((brand) => (
            <option key={brand.id} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup title={t('catalog.price')}>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['min_price', t('catalog.min')],
            ['max_price', t('catalog.max')],
          ].map(([key, label]) => (
            <input
              key={key}
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              placeholder={label}
              aria-label={label}
              defaultValue={params[key] ?? ''}
              onBlur={(event) => onChange({ [key]: event.target.value || null })}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          ))}
        </div>
      </FilterGroup>
    </div>
  )
}

function Pagination({ page, count, onPage }) {
  const { t } = useTranslation()
  const pages = Math.ceil(count / 20)
  if (pages <= 1) return null
  return (
    <nav className="mt-10 flex items-center justify-center gap-3" aria-label={t('catalog.pagination')}>
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t('catalog.previous')}
      </Button>
      <span className="text-sm text-stone-600">{t('catalog.pageOf', { page, pages })}</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('catalog.next')}
      </Button>
    </nav>
  )
}

export default function CatalogPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const params = catalogParams(searchParams)
  const key = searchParams.toString()
  const { data, error, loading } = useFetch(() => catalogApi.products(params), key)
  const { data: categories } = useFetch(catalogApi.categories, 'categories')
  // Nom du rayon filtre (rayon principal ou sous-rayon) pour le titre de la page
  const category = (categories ?? [])
    .flatMap((parent) => [parent, ...parent.children.map((child) => ({ ...child, name: `${parent.name} › ${child.name}` }))])
    .find((item) => item.slug === params.category)
  const page = Number(params.page ?? 1)
  const activeFilters = Object.keys(params).filter((name) => name !== 'page').length

  // Un nouveau filtre ramene a la premiere page
  const update = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([name, value]) => (value ? next.set(name, value) : next.delete(name)))
    if (!('page' in changes)) next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {params.search ? t('catalog.searchTitle', { query: params.search }) : (category?.name ?? t('catalog.title'))}
          </h1>
          {data && <p className="mt-1 text-sm text-stone-500">{t('catalog.count', { count: data.count })}</p>}
        </div>
        <div className="flex gap-2">
          {activeFilters > 0 && (
            <Button variant="ghost" onClick={() => setSearchParams({})}>
              <X className="size-4" aria-hidden />
              {t('catalog.reset')}
            </Button>
          )}
          <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>
            <SlidersHorizontal className="size-4" aria-hidden />
            {t('catalog.filters')} {activeFilters > 0 && `(${activeFilters})`}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} rounded-2xl bg-white p-5 ring-1 ring-stone-200 lg:block lg:self-start`}>
          <Filters key={key} params={params} onChange={update} />
        </aside>

        <section aria-live="polite">
          {loading && <Loader />}
          <Alert>{error}</Alert>
          {data && data.results.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
              <p className="font-semibold text-ink">{t('catalog.emptyTitle')}</p>
              <p className="mt-1 text-sm text-stone-500">{t('catalog.emptyText')}</p>
            </div>
          )}
          {data && !loading && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-3">
                {data.results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={page} count={data.count} onPage={(next) => update({ page: String(next) })} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
