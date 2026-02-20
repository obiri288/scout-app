import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('scout_theme') || 'dark';
    });

    const isDark = theme === 'dark';

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('scout_theme', next);
            return next;
        });
    }, []);

    // Apply theme to DOM
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
