import { useEffect, useState } from 'react'
import { errorMessage } from '../api/client'

// Charge des donnees de l'API et se relance quand la cle change (ex. filtres du catalogue)
export function useFetch(load, key) {
  const [state, setState] = useState({ data: null, error: '', loading: true })

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, loading: true, error: '' }))
    load()
      .then((data) => active && setState({ data, error: '', loading: false }))
      .catch((error) => active && setState({ data: null, error: errorMessage(error), loading: false }))
    return () => {
      active = false
    }
    // La fonction de chargement change a chaque rendu : seule la cle declenche un rechargement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state
}
