import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import i18n from '../i18n'

// Les tests verifient les textes en francais, la langue par defaut de la boutique
beforeEach(() => i18n.changeLanguage('fr'))
afterEach(() => cleanup())
