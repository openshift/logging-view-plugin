import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import httpBackend from 'i18next-http-backend';
import { getLanguage } from './language-utils';

i18n
  .use(httpBackend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    lng: getLanguage(),
    fallbackLng: 'en',
    load: 'languageOnly',
    debug: process.env.NODE_ENV === 'development',
    contextSeparator: '~',
    ns: ['plugin__logging-view-plugin'],
    defaultNS: 'public',
    nsSeparator: '~',
    keySeparator: false,
    react: {
      useSuspense: true,
      transSupportBasicHtmlNodes: true,
    },
    saveMissing: true,
    missingKeyHandler: function (lng, ns, key) {
      // eslint-disable-next-line no-console
      console.error(`Missing i18n key "${key}" in namespace "${ns}" and language "${lng}."`);
    },
  });

export default i18n;
