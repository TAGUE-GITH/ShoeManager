import { Search, UserPlus } from 'lucide-react'
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

// US-21 : fiches clients (gerant et vendeurs)
export function CustomersPage() {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const { data, loading, error } = useFetch(() => manageApi.customers(search ? { search } : {}), `customers-${search}`)

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
      {loading && <Loader />}
      <Alert>{error}</Alert>
      {data && (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-stone-200">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.results.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">
                      {customer.first_name} {customer.last_name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {customer.email} ·{' '}
                      {t('customers.since', {
                        date: new Date(customer.date_joined).toLocaleDateString(
                          i18n.language === 'en' ? 'en-US' : 'fr-FR',
                          { month: 'long', year: 'numeric' },
                        ),
                      })}
                    </p>
                  </td>
                  <td className="px-4 py-3">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{customer.orders_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{customer.purchases_count}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{customer.loyalty_points}</td>
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
