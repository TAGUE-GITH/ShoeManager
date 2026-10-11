import { Ban, CheckCircle2, Search, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorMessage, fieldErrors } from '../../api/client'
import { manageApi } from '../../api/resources'
import { Alert, Button, Field, Loader } from '../../components/ui'
import { useAuth } from '../../context/AuthProvider'
import { useFetch } from '../../hooks/useFetch'

// US-04 : equipe de la boutique (gerant uniquement)
export function TeamPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [version, setVersion] = useState(0)
  const { data: members, loading, error } = useFetch(manageApi.team, `team-${version}`)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [sending, setSending] = useState(false)

  const add = async (event) => {
    event.preventDefault()
    setSending(true)
    setErrors({})
    setFeedback({ type: '', text: '' })
    try {
      const member = await manageApi.addMember(form)
      setFeedback({ type: 'success', text: t('team.added', { name: member.first_name, email: member.email }) })
      setForm({ first_name: '', last_name: '', email: '', phone: '' })
      setVersion((v) => v + 1)
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      if (!Object.keys(byField).length) setFeedback({ type: 'error', text: errorMessage(err) })
    } finally {
      setSending(false)
    }
  }

  const update = async (member, changes) => {
    setFeedback({ type: '', text: '' })
    try {
      await manageApi.updateMember(member.id, changes)
      setVersion((v) => v + 1)
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.detail ?? errorMessage(err) })
    }
  }

  const bind = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (e) => setForm({ ...form, [name]: e.target.value }),
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="sr-only">{t('manage.tabs.team')}</h1>
        <Alert type={feedback.type || 'error'}>{feedback.text}</Alert>
        {loading && !members && <Loader />}
        <Alert>{error}</Alert>
        <ul className="mt-2 divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
          {(members ?? []).map((member) => {
            const self = member.id === user.id
            return (
              <li
                key={member.id}
                className={`flex flex-wrap items-center gap-3 p-4 ${member.is_active ? '' : 'opacity-60'}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {member.first_name} {member.last_name}{' '}
                    {self && <span className="text-xs font-normal text-stone-500">({t('team.you')})</span>}
                  </p>
                  <p className="text-sm text-stone-500">{member.email}</p>
                </div>
                <select
                  value={member.role}
                  disabled={self}
                  onChange={(event) => update(member, { role: event.target.value })}
                  aria-label={t('team.roleOf', { name: member.first_name })}
                  className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm disabled:bg-stone-50"
                >
                  <option value="VENDEUR">{t('roles.VENDEUR')}</option>
                  <option value="GERANT">{t('roles.GERANT')}</option>
                </select>
                {!self && (
                  <Button variant="ghost" onClick={() => update(member, { is_active: !member.is_active })}>
                    {member.is_active ? t('team.deactivate') : t('team.reactivate')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <form onSubmit={add} className="h-fit space-y-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200" noValidate>
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <UserPlus className="size-5 text-brand-700" aria-hidden />
          {t('team.addTitle')}
        </h2>
        <p className="text-sm text-stone-500">{t('team.addHint')}</p>
        <Field label={t('fields.firstName')} {...bind('first_name')} required />
        <Field label={t('fields.lastName')} {...bind('last_name')} required />
        <Field label={t('fields.email')} type="email" {...bind('email')} required />
        <Field label={t('fields.phone')} type="tel" {...bind('phone')} />
        <Button type="submit" loading={sending} className="w-full">
          {t('team.add')}
        </Button>
      </form>
    </div>
  )
}

// Actions du gerant sur un compte client : role, blocage, suppression
function CustomerActions({ customer, onChange, onError }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const run = async (action) => {
    setBusy(true)
    onError('')
    try {
      await action()
      onChange()
    } catch (err) {
      onError(err.response?.data?.detail ?? errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const name = `${customer.first_name} ${customer.last_name}`
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end md:whitespace-nowrap">
      <select
        value={customer.role}
        disabled={busy}
        onChange={(event) => {
          const role = event.target.value
          if (window.confirm(t('customers.confirmRole', { name, role: t(`roles.${role}`) })))
            run(() => manageApi.updateCustomer(customer.id, { role }))
        }}
        aria-label={t('team.roleOf', { name: customer.first_name })}
        className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
      >
        {['CLIENT', 'VENDEUR', 'GERANT'].map((role) => (
          <option key={role} value={role}>
            {t(`roles.${role}`)}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() => run(() => manageApi.updateCustomer(customer.id, { is_active: !customer.is_active }))}
        className="px-3 py-1.5"
      >
        {customer.is_active ? <Ban className="size-4" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}
        {customer.is_active ? t('customers.block') : t('customers.unblock')}
      </Button>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() =>
          window.confirm(t('customers.confirmDelete', { name })) && run(() => manageApi.deleteCustomer(customer.id))
        }
        className="px-3 py-1.5 text-red-700 hover:bg-red-50"
        aria-label={t('customers.deleteOf', { name })}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  )
}

// US-21 : fiches clients (gerant et vendeurs) ; le gerant donne un role, bloque ou supprime un compte
export function CustomersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isManager = user.role === 'GERANT'
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [version, setVersion] = useState(0)
  const [actionError, setActionError] = useState('')
  const { data, loading, error } = useFetch(
    () => manageApi.customers(search ? { search } : {}),
    `customers-${search}-${version}`,
  )
  const since = (date) =>
    new Date(date).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' })

  return (
    <>
      <h1 className="sr-only">{t('manage.tabs.customers')}</h1>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(query.trim())
        }}
        className="relative max-w-md"
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('customers.searchPlaceholder')}
          aria-label={t('customers.search')}
          className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pr-3 pl-9 text-sm"
        />
      </form>
      {isManager && <p className="mt-3 text-sm text-stone-500">{t('customers.managerHint')}</p>}
      {loading && !data && <Loader />}
      <div className="mt-3">
        <Alert>{error || actionError}</Alert>
      </div>
      {data && (
        <ul className="mt-4 space-y-3 md:hidden">
          {data.results.map((customer) => (
            <li key={customer.id} className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <p className="font-semibold text-ink">
                {customer.first_name} {customer.last_name}{' '}
                {!customer.is_active && (
                  <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                    {t('customers.blocked')}
                  </span>
                )}
              </p>
              <p className="text-xs break-all text-stone-500">{customer.email}</p>
              {customer.phone && <p className="text-sm text-stone-600">{customer.phone}</p>}
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-stone-500">
                {[
                  [t('customers.orders'), customer.orders_count],
                  [t('customers.purchases'), customer.purchases_count],
                  [t('customers.points'), customer.loyalty_points],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-stone-50 py-2">
                    <dd className="text-base font-bold text-ink">{value}</dd>
                    <dt>{label}</dt>
                  </div>
                ))}
              </dl>
              {isManager && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <CustomerActions
                    customer={customer}
                    onChange={() => setVersion((v) => v + 1)}
                    onError={setActionError}
                  />
                </div>
              )}
            </li>
          ))}
          {data.results.length === 0 && <li className="p-6 text-center text-stone-500">{t('customers.none')}</li>}
        </ul>
      )}
      {data && (
        <div className="relative mt-4 hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-stone-200 md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs font-semibold text-stone-500 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {t('customers.customer')}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t('fields.phone')}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {t('customers.orders')}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {t('customers.purchases')}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {t('customers.points')}
                </th>
                {isManager && (
                  <th scope="col" className="px-4 py-3 text-right">
                    {t('catalogAdmin.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.results.map((customer) => (
                <tr key={customer.id} className={customer.is_active ? '' : 'bg-stone-50'}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">
                      {customer.first_name} {customer.last_name}{' '}
                      {!customer.is_active && (
                        <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          {t('customers.blocked')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      {customer.email} · {t('customers.since', { date: since(customer.date_joined) })}
                    </p>
                  </td>
                  <td className="px-4 py-3">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{customer.orders_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{customer.purchases_count}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{customer.loyalty_points}</td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <CustomerActions
                        customer={customer}
                        onChange={() => setVersion((v) => v + 1)}
                        onError={setActionError}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {data.results.length === 0 && <p className="p-6 text-center text-stone-500">{t('customers.none')}</p>}
        </div>
      )}
    </>
  )
}
