import { createContext, useContext, useMemo, useState } from "react";
import { translations } from "../translations";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "am", name: "Amharic" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
];

const LANGUAGE_STORAGE_KEY = "evangadi-language";
const LanguageContext = createContext(null);

function readLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return SUPPORTED_LANGUAGES.some(({ code }) => code === saved) ? saved : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readLanguage);

  function setLanguage(nextLanguage) {
    const code = SUPPORTED_LANGUAGES.some(({ code }) => code === nextLanguage)
      ? nextLanguage
      : "en";
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    setLanguageState(code);
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: SUPPORTED_LANGUAGES,
      t: (key) => translations[language][key] ?? translations.en[key] ?? key,
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
