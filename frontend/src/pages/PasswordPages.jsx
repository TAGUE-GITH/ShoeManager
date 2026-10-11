import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage, fieldErrors } from '../api/client'
import { accountApi } from '../api/resources'
import { buttonClasses } from '../components/buttonStyles'
import { LogoMark } from '../components/Logo'
import { Alert, Button, Field } from '../components/ui'

function Card({ title, subtitle, children }) {
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

// US-03 : demande d'un lien de reinitialisation (meme message que le compte existe ou non)
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      setDone((await accountApi.requestReset(email)).detail)
    } catch (err) {
      setError(fieldErrors(err).email ?? errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Card title={t('password.forgotTitle')} subtitle={t('password.forgotSubtitle')}>
      {done ? (
        <Alert type="success">{done}</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Alert>{error}</Alert>
          <Field label={t('fields.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" loading={sending} className="w-full">
            {t('password.sendLink')}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/connexion" className="font-semibold text-brand-700 hover:text-brand-800">
          {t('password.backToLogin')}
        </Link>
      </p>
    </Card>
  )
}

// Lien recu par email (mot de passe oublie, ou nouveau vendeur qui choisit son mot de passe)
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setErrors({})
    if (password !== confirm) {
      setErrors({ confirm: t('password.mismatch') })
      return
    }
    setSending(true)
    try {
      const result = await accountApi.confirmReset({ uid: params.get('uid'), token: params.get('token'), password })
      setDone(result.detail)
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      setError(byField.password ? '' : (err.response?.data?.detail ?? errorMessage(err)))
    } finally {
      setSending(false)
    }
  }

  if (!params.get('uid') || !params.get('token')) {
    return (
      <Card title={t('password.invalidTitle')} subtitle={t('password.invalidText')}>
        <Link to="/mot-de-passe-oublie" className={buttonClasses('primary', 'w-full')}>
          {t('password.newRequest')}
        </Link>
      </Card>
    )
  }

  return (
    <Card title={t('password.resetTitle')} subtitle={t('password.resetSubtitle')}>
      {done ? (
        <div className="space-y-5">
          <Alert type="success">{done}</Alert>
          <Link to="/connexion" className={buttonClasses('primary', 'w-full')}>
            {t('auth.loginButton')}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Alert>
            {error}
            {error && (
              <>
                {' '}
                <Link to="/mot-de-passe-oublie" className="font-semibold underline">
                  {t('password.newRequest')}
                </Link>
              </>
            )}
          </Alert>
          <Field
            label={t('password.new')}
            type="password"
            autoComplete="new-password"
            placeholder={t('fields.passwordHint')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />
          <Field
            label={t('password.confirm')}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
            required
          />
          <Button type="submit" loading={sending} className="w-full">
            {t('password.save')}
          </Button>
        </form>
      )}
    </Card>
  )
}
