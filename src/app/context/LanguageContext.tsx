import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { translations, Language } from "../../lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const defaultT = (key: keyof typeof translations.en) =>
  translations["ko"][key] || translations["en"][key] || key;

const defaultValue: LanguageContextType = {
  language: "ko",
  setLanguage: () => {},
  t: defaultT,
};

const LanguageContext = createContext<LanguageContextType>(defaultValue);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ko");

  const value = useMemo<LanguageContextType>(() => ({
    language,
    setLanguage,
    t: (key: keyof typeof translations.en) =>
      translations[language][key] || translations["en"][key] || key,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}