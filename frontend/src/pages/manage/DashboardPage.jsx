import { AlertTriangle, BarChart3, CalendarClock, ClipboardList, Table2, Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { manageApi } from '../../api/resources'
import { Alert, Loader } from '../../components/ui'
import { useFetch } from '../../hooks/useFetch'
import { formatPrice } from '../../utils/format'

// Palette validee pour les daltoniens (meme ordre partout : boutique puis en ligne)
const SERIES = { store: '#2a78d6', online: '#eb6834' }

const compact = (value, language) =>
  new Intl.NumberFormat(language === 'en' ? 'en-US' : 'fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

function ChartCard({ title, subtitle, table, children }) {
  const { t } = useTranslation()
  const [view, setView] = useState('chart')
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
        </div>
        <div className="flex rounded-lg bg-stone-100 p-0.5" role="group" aria-label={t('dashboard.display', { title })}>
          {[
            ['chart', BarChart3, t('dashboard.chart')],
            ['table', Table2, t('dashboard.table')],
          ].map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`rounded-md p-1.5 ${view === value ? 'bg-white text-ink shadow-sm' : 'text-stone-500'}`}
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {view === 'chart' ? (
          children
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr>
                {table.columns.map((column, index) => (
                  <th key={column} scope="col" className={`py-1.5 font-medium ${index ? 'text-right' : ''}`}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index} className={`py-1.5 ${index ? 'text-right tabular-nums' : ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

function RevenueTile({ label, values }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{formatPrice(values.total)}</p>
      <ul className="mt-2 space-y-0.5 text-xs text-stone-600">
        {['store', 'online'].map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ backgroundColor: SERIES[key] }} aria-hidden />
            {t(`dashboard.${key}`)} : {formatPrice(values[key])}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ToHandle({ data }) {
  const { t } = useTranslation()
  const items = [
    {
      count: data.orders,
      label: t('dashboard.toHandle.orders', { count: data.orders }),
      to: '/gestion/commandes',
      Icon: ClipboardList,
    },
    {
      count: data.reservations,
      label: t('dashboard.toHandle.reservations', { count: data.reservations }),
      to: '/gestion/reservations',
      Icon: CalendarClock,
    },
    {
      count: data.low_stock,
      label: t('dashboard.toHandle.lowStock', { count: data.low_stock }),
      to: '/gestion/stock',
      Icon: AlertTriangle,
      alert: data.low_stock > 0,
    },
  ]
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {items.map(({ count, label, to, Icon, alert }) => (
        <li key={to}>
          <Link
            to={to}
            className={`flex items-center gap-3 rounded-2xl p-4 ring-1 transition hover:shadow-md ${
              alert ? 'bg-red-50 text-red-900 ring-red-200' : 'bg-white text-ink ring-stone-200'
            }`}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="text-2xl font-extrabold">{count}</span>
            <span className="text-sm">{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// Barres horizontales simples (une seule serie) : meilleures ventes et pointures
function BarList({ rows, value, label, format = (v) => v }) {
  const max = Math.max(1, ...rows.map(value))
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={label(row)}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-stone-700">{label(row)}</span>
            <span className="font-semibold text-ink tabular-nums">{format(row)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-stone-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(value(row) / max) * 100}%`, backgroundColor: SERIES.store }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

// US-20 : tableau de bord du gerant
export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useFetch(manageApi.dashboard, 'dashboard')
  if (loading) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const day = (iso, long = false) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(
      locale,
      long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' },
    )
  const daily = data.daily.map((row) => ({
    ...row,
    label: day(row.date),
    store: Number(row.store),
    online: Number(row.online),
  }))
  const empty = (rows) =>
    rows.length === 0 && <p className="py-6 text-center text-sm text-stone-500">{t('dashboard.noSales')}</p>

  return (
    <div className="space-y-6">
      <h1 className="sr-only">{t('manage.tabs.dashboard')}</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <RevenueTile label={t('dashboard.today')} values={data.revenue.today} />
        <RevenueTile label={t('dashboard.week')} values={data.revenue.week} />
        <RevenueTile label={t('dashboard.month')} values={data.revenue.month} />
      </div>

      {data.in_progress.count > 0 && (
        <Link
          to="/gestion/commandes"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200 hover:shadow-md"
        >
          <Truck className="size-5 shrink-0" aria-hidden />
          <span className="font-semibold">
            {t('dashboard.inProgress', { count: data.in_progress.count, total: formatPrice(data.in_progress.total) })}
          </span>
          <span className="text-sky-800">{t('dashboard.inProgressHint')}</span>
        </Link>
      )}

      <ToHandle data={data.to_handle} />

      <ChartCard
        title={t('dashboard.dailyTitle')}
        subtitle={t('dashboard.dailySubtitle')}
        table={{
          columns: [t('dashboard.day'), t('dashboard.store'), t('dashboard.online')],
          rows: daily.map((row) => [day(row.date, true), formatPrice(row.store), formatPrice(row.online)]),
        }}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e7e5e4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#78716c' }}
              tickLine={false}
              axisLine={{ stroke: '#d6d3d1' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => compact(value, i18n.language)}
              tick={{ fontSize: 11, fill: '#78716c' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              formatter={(value, name) => [formatPrice(value), name]}
              labelFormatter={(_label, payload) => (payload?.[0] ? day(payload[0].payload.date, true) : '')}
              cursor={{ fill: '#f5f5f4' }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 13, paddingBottom: 8 }}
              formatter={(value) => <span style={{ color: '#44403c' }}>{value}</span>}
            />
            <Bar
              dataKey="store"
              name={t('dashboard.store')}
              stackId="ca"
              fill={SERIES.store}
              stroke="#ffffff"
              maxBarSize={28}
              isAnimationActive={false}
            />
            <Bar
              dataKey="online"
              name={t('dashboard.online')}
              stackId="ca"
              fill={SERIES.online}
              stroke="#ffffff"
              maxBarSize={28}
              isAnimationActive={false}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('dashboard.bestSellers')}
          subtitle={t('dashboard.last30')}
          table={{
            columns: [t('dashboard.model'), t('dashboard.pairs'), t('dashboard.revenue')],
            rows: data.best_sellers.map((row) => [row.name, row.quantity, formatPrice(row.revenue)]),
          }}
        >
          {empty(data.best_sellers) || (
            <BarList
              rows={data.best_sellers}
              value={(row) => row.quantity}
              label={(row) => row.name}
              format={(row) => `${t('dashboard.pairsCount', { count: row.quantity })} · ${formatPrice(row.revenue)}`}
            />
          )}
        </ChartCard>
        <ChartCard
          title={t('dashboard.sizes')}
          subtitle={t('dashboard.last30')}
          table={{
            columns: [t('dashboard.size'), t('dashboard.pairs')],
            rows: data.sizes.map((row) => [row.size, row.quantity]),
          }}
        >
          {empty(data.sizes) || (
            <BarList
              rows={data.sizes.slice(0, 8)}
              value={(row) => row.quantity}
              label={(row) => t('dashboard.sizeLabel', { size: row.size })}
              format={(row) => t('dashboard.pairsCount', { count: row.quantity })}
            />
          )}
        </ChartCard>
      </div>
    </div>
  )
}
