import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { buttonClasses } from './buttonStyles'

// Petits composants d'interface partages (boutons, champs, messages, etats de chargement)

export function Button({ variant = 'primary', loading = false, className = '', children, ...props }) {
  return (
    <button className={buttonClasses(variant, className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Field({ label, error, className = '', ...props }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-4 ${
          error ? 'border-red-400 focus:ring-red-100' : 'border-stone-300 focus:border-brand-600 focus:ring-brand-100'
        }`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function Alert({ type = 'error', children }) {
  if (!children) return null
  const success = type === 'success'
  const Icon = success ? CheckCircle2 : AlertCircle
  return (
    <div
      role="alert"
      className={`flex gap-2.5 rounded-xl p-3.5 text-sm ring-1 ring-inset ${
        success ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-red-50 text-red-800 ring-red-200'
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export function Loader() {
  const { t } = useTranslation()
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="size-8 animate-spin text-brand-700" aria-label={t('common.loading')} />
    </div>
  )
}
