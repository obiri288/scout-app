import React, { createContext, useContext, useState } from 'react';

const EcosystemContext = createContext();

export const useEcosystem = () => {
    return useContext(EcosystemContext);
};

export const EcosystemProvider = ({ children }) => {
    // Default to 'all' — Visuelles Tagging statt globaler Plattform-Split
    const [activeEcosystem, setActiveEcosystem] = useState('all');

    // Ecosystem auto-switch removed — all content shown by default via badge-based visual tagging.

    const switchEcosystem = (eco) => {
        if (!['mens', 'womens', 'all'].includes(eco)) return;
        setActiveEcosystem(eco);
        window.dispatchEvent(new CustomEvent('ecosystemChanged', { detail: { ecosystem: eco } }));
    };

    // Unified theme colors — no longer switching between mens/womens
    const themeColors = {
        primaryText: 'text-cyan-500',
        primaryBg: 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20',
        primaryBorder: 'border-cyan-500',
        primaryRing: 'ring-cyan-500',
        gradientFrom: 'from-cyan-500',
        gradientTo: 'to-blue-500',
    };

    return (
        <EcosystemContext.Provider value={{
            activeEcosystem,
            setActiveEcosystem: switchEcosystem,
            isAll: true, // Always show all content by default
            themeColors
        }}>
            {children}
        </EcosystemContext.Provider>
    );
};
