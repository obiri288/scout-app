import React, { createContext, useContext, useState, useCallback } from 'react';
import { de } from '../lib/i18n/de';
import { en } from '../lib/i18n/en';

const translations = { de, en };
const LanguageContext = createContext(null);

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
    return ctx;
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('scout_lang');
        if (saved && translations[saved]) return saved;
        // Auto-detect from browser
        const browserLang = navigator.language?.substring(0, 2);
        return browserLang === 'en' ? 'en' : 'de';
    });

    const t = useCallback((key) => {
        return translations[lang]?.[key] || translations.de[key] || key;
    }, [lang]);

    const switchLanguage = useCallback((newLang) => {
        if (translations[newLang]) {
            setLang(newLang);
            localStorage.setItem('scout_lang', newLang);
        }
    }, []);

    const toggleLanguage = useCallback(() => {
        switchLanguage(lang === 'de' ? 'en' : 'de');
    }, [lang, switchLanguage]);

    return (
        <LanguageContext.Provider value={{ lang, t, switchLanguage, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};
