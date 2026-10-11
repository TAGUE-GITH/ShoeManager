import { ImagePlus, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { errorMessage, fieldErrors } from '../../api/client'
import { manageApi } from '../../api/resources'
import { buttonClasses } from '../../components/buttonStyles'
import { Alert, Button, Field, Loader } from '../../components/ui'
import { useFetch } from '../../hooks/useFetch'
import { formatPrice } from '../../utils/format'

const selectClasses = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm'

// US-06 : liste des produits, y compris ceux masques de la boutique
export function ManageCatalogPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const { data, loading, error } = useFetch(
    () => manageApi.products({ page_size: 100, ...(search ? { search } : {}) }),
    `products-${search}`,
  )

  return (
    <>
      <h1 className="sr-only">{t('manage.tabs.catalog')}</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(query.trim())
          }}
          className="relative w-full max-w-md"
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('catalogAdmin.searchPlaceholder')}
            aria-label={t('catalogAdmin.search')}
            className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pr-3 pl-9 text-sm"
          />
        </form>
        <Link to="/gestion/catalogue/nouveau" className={buttonClasses('primary')}>
          <Plus className="size-4" aria-hidden />
          {t('catalogAdmin.new')}
        </Link>
      </div>
      {loading && <Loader />}
      <Alert>{error}</Alert>
      {data && (
        <ul className="mt-4 divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
          {data.results.map((product) => (
            <li key={product.id}>
              <Link to={`/gestion/catalogue/${product.id}`} className="flex items-center gap-4 p-3 hover:bg-stone-50">
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {product.images[0] && (
                    <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{product.name}</p>
                  <p className="text-sm text-stone-500">{formatPrice(product.price)}</p>
                </div>
                {!product.is_published && (
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-700">
                    {t('catalogAdmin.hidden')}
                  </span>
                )}
              </Link>
            </li>
          ))}
          {data.results.length === 0 && <li className="p-6 text-center text-stone-500">{t('catalogAdmin.none')}</li>}
        </ul>
      )}
    </>
  )
}

const emptyProduct = {
  name: '',
  description: '',
  category: '',
  brand: '',
  price: '',
  low_stock_threshold: 3,
  is_published: true,
}

function ProductForm({ product, onSaved }) {
  const { t } = useTranslation()
  const [version, setVersion] = useState(0)
  const { data: options } = useFetch(
    () => Promise.all([manageApi.categories(), manageApi.brands()]),
    `options-${version}`,
  )
  const [form, setForm] = useState(() =>
    product ? Object.fromEntries(Object.keys(emptyProduct).map((key) => [key, product[key] ?? ''])) : emptyProduct,
  )
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [newBrand, setNewBrand] = useState('')

  const [categories, brands] = options ?? [[], []]
  // Seules les sous-categories recoivent des produits (Hommes > Baskets)
  const parents = Object.fromEntries(categories.map((category) => [category.id, category.name]))
  const leaves = categories.filter((category) => category.parent)

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setFeedback({ type: '', text: '' })
    try {
      const saved = await manageApi.saveProduct(product?.id, form)
      setFeedback({ type: 'success', text: t('catalogAdmin.saved') })
      onSaved(saved)
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      if (!Object.keys(byField).length) setFeedback({ type: 'error', text: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const addBrand = async () => {
    if (!newBrand.trim()) return
    try {
      const brand = await manageApi.addBrand(newBrand.trim())
      setForm((current) => ({ ...current, brand: brand.id }))
      setNewBrand('')
      setVersion((v) => v + 1)
    } catch (err) {
      setFeedback({ type: 'error', text: errorMessage(err) })
    }
  }

  const bind = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (e) => setForm({ ...form, [name]: e.target.value }),
  })

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200" noValidate>
      <Alert type={feedback.type || 'error'}>{feedback.text}</Alert>
      <Field label={t('catalogAdmin.name')} {...bind('name')} required />
      <div>
        <label htmlFor="product-description" className="mb-1.5 block text-sm font-medium text-stone-700">
          {t('catalogAdmin.description')}
        </label>
        <textarea id="product-description" rows={4} className={selectClasses} {...bind('description')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="product-category" className="mb-1.5 block text-sm font-medium text-stone-700">
            {t('catalogAdmin.category')}
          </label>
          <select id="product-category" className={selectClasses} {...bind('category')}>
            <option value="">—</option>
            {leaves.map((category) => (
              <option key={category.id} value={category.id}>
                {parents[category.parent]} › {category.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1.5 text-sm text-red-700">{errors.category}</p>}
        </div>
        <div>
          <label htmlFor="product-brand" className="mb-1.5 block text-sm font-medium text-stone-700">
            {t('catalogAdmin.brand')}
          </label>
          <select id="product-brand" className={selectClasses} {...bind('brand')}>
            <option value="">—</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          {errors.brand && <p className="mt-1.5 text-sm text-red-700">{errors.brand}</p>}
          <div className="mt-2 flex gap-2">
            <input
              value={newBrand}
              onChange={(event) => setNewBrand(event.target.value)}
              placeholder={t('catalogAdmin.newBrand')}
              aria-label={t('catalogAdmin.newBrand')}
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm"
            />
            <Button type="button" variant="ghost" onClick={addBrand}>
              {t('catalogAdmin.addBrand')}
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('catalogAdmin.price')} type="number" min="1" inputMode="numeric" {...bind('price')} required />
        <Field
          label={t('catalogAdmin.threshold')}
          type="number"
          min="0"
          inputMode="numeric"
          {...bind('low_stock_threshold')}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={form.is_published}
          onChange={(event) => setForm({ ...form, is_published: event.target.checked })}
          className="size-4 accent-brand-700"
        />
        {t('catalogAdmin.published')}
      </label>
      <Button type="submit" loading={saving}>
        {product ? t('catalogAdmin.save') : t('catalogAdmin.create')}
      </Button>
    </form>
  )
}

function Photos({ product, onChange }) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (event) => {
    const files = [...event.target.files]
    event.target.value = ''
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      for (const file of files) await manageApi.uploadImage(product.id, file)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
      onChange()
    }
  }

  const remove = async (image) => {
    if (!window.confirm(t('catalogAdmin.confirmDeletePhoto'))) return
    await manageApi.deleteImage(image.id)
    onChange()
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <h2 className="font-bold text-ink">{t('catalogAdmin.photos')}</h2>
      <p className="text-sm text-stone-500">{t('catalogAdmin.photosHint')}</p>
      <div className="mt-3">
        <Alert>{error}</Alert>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-3">
        {product.images.map((image) => (
          <li key={image.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100">
            <img src={image.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(image)}
              className="absolute top-1.5 right-1.5 rounded-lg bg-white/90 p-1.5 text-red-700 shadow"
              aria-label={t('catalogAdmin.deletePhoto')}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        <li>
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-center text-xs font-semibold text-stone-600 hover:border-brand-600 hover:text-brand-700">
            <ImagePlus className={`size-6 ${uploading ? 'animate-pulse' : ''}`} aria-hidden />
            {uploading ? t('catalogAdmin.uploading') : t('catalogAdmin.addPhoto')}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={upload} disabled={uploading} />
          </label>
        </li>
      </ul>
    </section>
  )
}

function Variants({ product }) {
  const { t } = useTranslation()
  const [version, setVersion] = useState(0)
  const { data } = useFetch(
    () => Promise.all([manageApi.variants(product.id), manageApi.colors()]),
    `variants-${product.id}-${version}`,
  )
  const [form, setForm] = useState({ size: '', color: '', stock: '' })
  const [error, setError] = useState('')
  const reload = () => setVersion((v) => v + 1)

  if (!data) return <Loader />
  const [variants, colors] = data
  const colorById = Object.fromEntries(colors.map((color) => [color.id, color]))

  const run = async (action) => {
    setError('')
    try {
      await action()
      reload()
      return true
    } catch (err) {
      const byField = fieldErrors(err)
      setError(Object.values(byField)[0] ?? errorMessage(err))
      return false
    }
  }

  const add = async (event) => {
    event.preventDefault()
    const ok = await run(() => manageApi.addVariant({ ...form, product: product.id, stock: Number(form.stock || 0) }))
    if (ok) setForm({ ...form, size: '', stock: '' })
  }

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <h2 className="font-bold text-ink">{t('catalogAdmin.variants')}</h2>
      <p className="text-sm text-stone-500">{t('catalogAdmin.variantsHint')}</p>
      <div className="mt-3">
        <Alert>{error}</Alert>
      </div>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs text-stone-500 uppercase">
          <tr>
            <th scope="col" className="py-2">
              {t('stock.variant')}
            </th>
            <th scope="col" className="py-2 text-right">
              {t('stock.inShop')}
            </th>
            <th scope="col" className="py-2">
              <span className="sr-only">{t('catalogAdmin.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {variants.map((variant) => {
            const color = colorById[variant.color]
            return (
              <tr key={variant.id}>
                <td className="py-2">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-3 rounded-full ring-1 ring-stone-300"
                      style={{ backgroundColor: color?.hex_code }}
                      aria-hidden
                    />
                    {t('cart.variant', { size: variant.size, color: color?.name })}
                  </span>
                  <span className="block text-xs text-stone-400">{variant.sku}</span>
                </td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    min="0"
                    defaultValue={variant.stock}
                    aria-label={t('catalogAdmin.stockOf', { size: variant.size, color: color?.name })}
                    onBlur={(event) => {
                      const stock = Number(event.target.value)
                      if (stock !== variant.stock) run(() => manageApi.updateVariant(variant.id, { stock }))
                    }}
                    className="w-20 rounded-lg border border-stone-300 px-2 py-1 text-right text-sm"
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      window.confirm(t('catalogAdmin.confirmDeleteVariant')) &&
                      run(() => manageApi.deleteVariant(variant.id))
                    }
                    className="rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-700"
                    aria-label={t('catalogAdmin.deleteVariant', { size: variant.size, color: color?.name })}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {variants.length === 0 && (
        <p className="py-4 text-center text-sm text-stone-500">{t('catalogAdmin.noVariants')}</p>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4">
        <Field
          label={t('catalogAdmin.size')}
          type="number"
          step="0.5"
          min="15"
          value={form.size}
          onChange={(event) => setForm({ ...form, size: event.target.value })}
          className="w-24"
          required
        />
        <div className="min-w-32 flex-1">
          <label htmlFor="variant-color" className="mb-1.5 block text-sm font-medium text-stone-700">
            {t('catalogAdmin.color')}
          </label>
          <select
            id="variant-color"
            value={form.color}
            onChange={(event) => setForm({ ...form, color: event.target.value })}
            className={selectClasses}
            required
          >
            <option value="">—</option>
            {colors.map((color) => (
              <option key={color.id} value={color.id}>
                {color.name}
              </option>
            ))}
          </select>
        </div>
        <Field
          label={t('stock.inShop')}
          type="number"
          min="0"
          value={form.stock}
          onChange={(event) => setForm({ ...form, stock: event.target.value })}
          className="w-24"
        />
        <Button type="submit" variant="secondary">
          <Plus className="size-4" aria-hidden />
          {t('catalogAdmin.addVariant')}
        </Button>
      </form>
    </section>
  )
}

// US-06 : creation et modification d'un produit (infos, photos, pointures et stock)
export function ProductEditorPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'nouveau'
  const [version, setVersion] = useState(0)
  const [deleteError, setDeleteError] = useState('')
  const {
    data: product,
    loading,
    error,
  } = useFetch(() => (isNew ? Promise.resolve(null) : manageApi.product(id)), `product-${id}-${version}`)

  if (error) return <Alert>{error}</Alert>
  // Juste apres la creation, l'adresse change avant que le produit ne soit charge
  if ((loading || !isNew) && !product) return <Loader />

  const remove = async () => {
    if (!window.confirm(t('catalogAdmin.confirmDelete', { name: product.name }))) return
    setDeleteError('')
    try {
      await manageApi.deleteProduct(product.id)
      navigate('/gestion/catalogue', { replace: true })
    } catch (err) {
      setDeleteError(err.response?.data?.detail ?? errorMessage(err))
    }
  }

  return (
    <>
      <Link to="/gestion/catalogue" className="text-sm font-semibold text-brand-700 hover:underline">
        ← {t('catalogAdmin.back')}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {isNew ? t('catalogAdmin.new') : product.name}
        </h1>
        {product && (
          <Button variant="ghost" onClick={remove} className="text-red-700 hover:bg-red-50">
            <Trash2 className="size-4" aria-hidden />
            {t('catalogAdmin.delete')}
          </Button>
        )}
      </div>
      {deleteError && (
        <div className="mt-3">
          <Alert>{deleteError}</Alert>
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProductForm
          key={product?.id ?? 'new'}
          product={product}
          onSaved={(saved) =>
            isNew ? navigate(`/gestion/catalogue/${saved.id}`, { replace: true }) : setVersion((v) => v + 1)
          }
        />
        {product ? (
          <div className="space-y-6">
            <Photos product={product} onChange={() => setVersion((v) => v + 1)} />
            <Variants product={product} />
          </div>
        ) : (
          <p className="text-sm text-stone-500">{t('catalogAdmin.afterCreate')}</p>
        )}
      </div>
    </>
  )
}
