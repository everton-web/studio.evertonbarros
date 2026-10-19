"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { translations, type Lang, type Dict } from "@/lib/i18n";

const STORAGE_KEY = "lang";
const LANG_EVENT = "langchange";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANG_EVENT, onChange);
  };
};

// Lido apenas no cliente; no servidor usamos "pt" (getServerSnapshot).
const getSnapshot = (): Lang => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "pt" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
};

const getServerSnapshot = (): Lang => "pt";

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
} | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore evita setState em effect e divergência de hidratação.
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    window.dispatchEvent(new Event(LANG_EVENT));
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] as Dict }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
