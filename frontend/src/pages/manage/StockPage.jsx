import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { errorMessage } from '../../api/client'
import { manageApi } from '../../api/resources'
import { Alert, Button, Loader } from '../../components/ui'
import { useFetch } from '../../hooks/useFetch'

// Reapprovisionnement d'une declinaison : on ajoute les paires recues au stock physique
function Restock({ row, onDone, idPrefix = '' }) {
  const { t } = useTranslation()
  const [quantity, setQuantity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    const added = Number(quantity)
    if (!added) return
    setBusy(true)
    setError('')
    try {
      await manageApi.updateVariant(row.variant, { stock: row.stock + added })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 md:justify-end">
      <label className="sr-only" htmlFor={`${idPrefix}restock-${row.variant}`}>
        {t('stock.received', { product: row.product, size: row.size })}
      </label>
      <input
        id={`${idPrefix}restock-${row.variant}`}
        type="number"
        min="1"
        inputMode="numeric"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        placeholder="+"
        className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
      />
      <Button type="submit" variant="secondary" loading={busy} disabled={!Number(quantity)}>
        {t('stock.add')}
      </Button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </form>
  )
}

// US-19 : alertes de stock (stock disponible sous le seuil choisi pour chaque produit)
export default function StockPage() {
  const { t } = useTranslation()
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useFetch(manageApi.stockAlerts, `alerts-${version}`)

  if (loading && !data) return <Loader />
  return (
    <>
      <h1 className="sr-only">{t('manage.tabs.stock')}</h1>
      <p className="text-sm text-stone-600">{t('stock.intro')}</p>
      <Alert>{error}</Alert>
      {data && data.length === 0 ? (
        <p className="mt-8 flex items-center justify-center gap-2 text-emerald-700">
          <CheckCircle2 className="size-5" aria-hidden />
          {t('stock.allGood')}
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-3 md:hidden">
            {(data ?? []).map((row) => (
              <li key={row.variant} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/gestion/catalogue/${row.product_id}`}
                      className="font-semibold text-ink hover:text-brand-700"
                    >
                      {row.product}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-stone-600">
                      <span
                        className="size-3 rounded-full ring-1 ring-stone-300"
                        style={{ backgroundColor: row.color_hex }}
                        aria-hidden
                      />
                      {t('cart.variant', { size: row.size, color: row.color })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {row.sku} · {t('stock.inShop')} : {row.stock}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.available === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {row.available === 0 ? t('stock.soldOut') : t('stock.left', { count: row.available })}
                  </span>
                </div>
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <Restock row={row} onDone={() => setVersion((v) => v + 1)} idPrefix="m-" />
                </div>
              </li>
            ))}
          </ul>
          <div className="relative mt-4 hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-stone-200 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs font-semibold text-stone-500 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    {t('stock.product')}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {t('stock.variant')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {t('stock.inShop')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {t('stock.available')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {t('stock.restock')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(data ?? []).map((row) => (
                  <tr key={row.variant}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/gestion/catalogue/${row.product_id}`}
                        className="font-semibold text-ink hover:text-brand-700"
                      >
                        {row.product}
                      </Link>
                      <p className="text-xs text-stone-500">{row.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-3 rounded-full ring-1 ring-stone-300"
                          style={{ backgroundColor: row.color_hex }}
                          aria-hidden
                        />
                        {t('cart.variant', { size: row.size, color: row.color })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.stock}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.available === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.available === 0 ? t('stock.soldOut') : t('stock.left', { count: row.available })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Restock row={row} onDone={() => setVersion((v) => v + 1)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
