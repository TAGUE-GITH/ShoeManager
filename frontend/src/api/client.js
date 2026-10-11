import axios from 'axios'
import i18n from '../i18n'

const ACCESS_KEY = 'shoemanager_access'
const REFRESH_KEY = 'shoemanager_refresh'

// Jetons JWT : acces (30 min) et rafraichissement (7 jours)
export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  save({ access, refresh }) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

// En developpement VITE_API_URL est vide : Vite transmet /api a Django
export const API_URL = import.meta.env.VITE_API_URL ?? ''
export const api = axios.create({ baseURL: `${API_URL}/api` })

api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`
  return config
})

// Jeton d'acces expire : on le renouvelle une fois avec le jeton de rafraichissement, puis on rejoue la requete
let refreshing = null
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isAuthRoute = config?.url?.startsWith('/auth/')
    if (response?.status !== 401 || isAuthRoute || config._retried || !tokens.refresh) {
      if (response?.status === 401 && !isAuthRoute) {
        tokens.clear()
        window.dispatchEvent(new Event('auth:logout'))
      }
      return Promise.reject(error)
    }
    try {
      refreshing ??= axios.post(`${API_URL}/api/auth/refresh/`, { refresh: tokens.refresh })
      const { data } = await refreshing
      tokens.save(data)
      config._retried = true
      return api(config)
    } catch (refreshError) {
      tokens.clear()
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(refreshError)
    } finally {
      refreshing = null
    }
  },
)

// Message lisible a partir d'une erreur de l'API
export function errorMessage(error) {
  if (!error.response) return i18n.t('errors.network')
  return error.response.data?.detail ?? i18n.t('errors.generic')
}

// Erreurs par champ renvoyees par Django REST Framework : { email: ["..."] } -> { email: "..." }
export function fieldErrors(error) {
  const data = error.response?.data
  if (!data || typeof data !== 'object' || data.detail) return {}
  return Object.fromEntries(Object.entries(data).map(([field, messages]) => [field, [].concat(messages)[0]]))
}
