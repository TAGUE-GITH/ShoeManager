import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './en'
import fr from './fr'

export const LANGUAGES = [
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'en', label: 'English', short: 'EN' },
]

// Francais par defaut ; choix memorise dans le navigateur
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    supportedLngs: ['fr', 'en'],
    fallbackLng: 'fr',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'shoemanager_language',
      caches: ['localStorage'],
      convertDetectedLanguage: (language) => language.split('-')[0],
    },
    interpolation: { escapeValue: false },
  })

const syncDocument = (language) => {
  document.documentElement.lang = language === 'en' ? 'en' : 'fr'
}
syncDocument(i18n.language)
i18n.on('languageChanged', syncDocument)

export default i18n
