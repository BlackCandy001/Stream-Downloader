import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'
import vi from './locales/vi/translation.json'
import zh from './locales/zh/translation.json'

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  zh: { translation: zh },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ['navigator', 'htmlTag'],
    caches: ['localStorage'],
  },
})

export default i18n
