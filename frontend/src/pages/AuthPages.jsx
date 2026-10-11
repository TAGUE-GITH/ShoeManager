import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage, fieldErrors } from '../api/client'
import { LogoMark } from '../components/Logo'
import { Alert, Button, Field } from '../components/ui'
import { useAuth } from '../context/AuthProvider'
import { MyOrders } from './OrderPages'

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <LogoMark className="size-11" />
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  )
}

// Formulaire commun : valeurs, envoi, erreur generale et erreurs par champ renvoyees par l'API
function useAuthForm(initial, submit) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)

  const bind = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event) => setValues({ ...values, [name]: event.target.value }),
  })

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setErrors({})
    setSending(true)
    try {
      await submit(values)
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      setError(Object.keys(byField).length ? '' : errorMessage(err))
      setSending(false)
    }
  }

  return { bind, error, sending, onSubmit }
}

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/compte'
  const form = useAuthForm({ email: '', password: '' }, async (values) => {
    await login(values)
    navigate(from, { replace: true })
  })

  if (user) return <Navigate to="/compte" replace />

  return (
    <AuthCard title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={form.onSubmit} className="space-y-5" noValidate>
        <Alert>{form.error}</Alert>
        <Field label={t('fields.email')} type="email" autoComplete="email" required {...form.bind('email')} />
        <Field label={t('fields.password')} type="password" autoComplete="current-password" required {...form.bind('password')} />
        <Button type="submit" loading={form.sending} className="w-full">
          {t('auth.loginButton')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        {t('auth.noAccount')}{' '}
        <Link to="/inscription" className="font-semibold text-brand-700 hover:text-brand-800">
          {t('auth.createAccount')}
        </Link>
      </p>
    </AuthCard>
  )
}

export function RegisterPage() {
  const { t } = useTranslation()
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const form = useAuthForm({ first_name: '', last_name: '', email: '', phone: '', password: '' }, async (values) => {
    await register(values)
    navigate('/compte', { replace: true })
  })

  if (user) return <Navigate to="/compte" replace />

  return (
    <AuthCard title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form onSubmit={form.onSubmit} className="space-y-5" noValidate>
        <Alert>{form.error}</Alert>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('fields.firstName')} autoComplete="given-name" required {...form.bind('first_name')} />
          <Field label={t('fields.lastName')} autoComplete="family-name" required {...form.bind('last_name')} />
        </div>
        <Field label={t('fields.email')} type="email" autoComplete="email" required {...form.bind('email')} />
        <Field label={t('fields.phone')} type="tel" autoComplete="tel" placeholder="+237 6XX XX XX XX" {...form.bind('phone')} />
        <Field
          label={t('fields.password')}
          type="password"
          autoComplete="new-password"
          placeholder={t('fields.passwordHint')}
          required
          {...form.bind('password')}
        />
        <Button type="submit" loading={form.sending} className="w-full">
          {t('auth.registerButton')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-stone-600">
        {t('auth.hasAccount')}{' '}
        <Link to="/connexion" className="font-semibold text-brand-700 hover:text-brand-800">
          {t('auth.loginButton')}
        </Link>
      </p>
    </AuthCard>
  )
}

export function AccountPage() {
  const { t } = useTranslation()
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t('account.title', { name: user.first_name })}</h1>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
          <h2 className="font-semibold text-ink">{t('account.profile')}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">{t('fields.email')}</dt>
              <dd className="text-ink">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">{t('fields.phone')}</dt>
              <dd className="text-ink">{user.phone || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">{t('account.role')}</dt>
              <dd className="text-ink">{t(`roles.${user.role}`)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-2xl bg-ink p-6 text-white">
          <h2 className="font-semibold">{t('account.loyalty')}</h2>
          <p className="mt-3 text-4xl font-extrabold">{user.loyalty_points}</p>
          <p className="mt-1 text-sm text-stone-300">{t('account.loyaltyText')}</p>
        </section>
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">{t('orders.mine')}</h2>
        <div className="mt-4">
          <MyOrders />
        </div>
      </section>
      <Button variant="secondary" className="mt-8" onClick={logout}>
        {t('account.logout')}
      </Button>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ink">{t('notFound.title')}</h1>
      <Link to="/" className="mt-6 inline-block font-semibold text-brand-700">
        {t('notFound.back')}
      </Link>
    </div>
  )
}
