import { ShoppingBag } from 'lucide-react'
import { startTransition, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { accountApi } from '../api/resources'
import { useAuth } from '../context/AuthProvider'
import { Alert, Button } from './ui'

// US-22 : essayer la boutique sans creer de compte
export default function DemoButtons({ dark = false }) {
  const { t } = useTranslation()
  const { openSession } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  // Client uniquement : un vendeur ou un gerant public pourrait modifier la vraie boutique
  const roles = [{ role: 'CLIENT', Icon: ShoppingBag, to: '/catalogue' }]

  const start = async (role, to) => {
    setPending(role)
    setError('')
    try {
      const session = await accountApi.demo(role)
      // Session et changement de page dans le meme rendu : sinon la page de connexion renvoie vers le compte
      startTransition(() => {
        openSession(session)
        navigate(to)
      })
    } catch (err) {
      setError(errorMessage(err))
      setPending('')
    }
  }

  return (
    <div>
      <p className={`text-sm font-semibold ${dark ? 'text-stone-300' : 'text-stone-600'}`}>{t('demo.title')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {roles.map(({ role, Icon, to }) => (
          <Button
            key={role}
            variant="secondary"
            loading={pending === role}
            disabled={Boolean(pending)}
            onClick={() => start(role, to)}
          >
            <Icon className="size-4" aria-hidden />
            {t(`demo.as.${role}`)}
          </Button>
        ))}
      </div>
      {pending && <p className={`mt-2 text-xs ${dark ? 'text-stone-400' : 'text-stone-500'}`}>{t('demo.wakeUp')}</p>}
      <div className="mt-2">
        <Alert>{error}</Alert>
      </div>
    </div>
  )
}
