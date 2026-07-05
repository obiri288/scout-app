import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext';

const EcosystemContext = createContext();

export const useEcosystem = () => {
    return useContext(EcosystemContext);
};

export const EcosystemProvider = ({ children }) => {
    const { currentUserProfile } = useUser();
    
    // Initialize state from localStorage or default to 'mens'
    const [activeEcosystem, setActiveEcosystem] = useState(() => {
        const saved = localStorage.getItem('CAVIOS_ecosystem');
        return saved || 'mens';
    });

    useEffect(() => {
        if (currentUserProfile) {
            const userEco = currentUserProfile.ecosystem;
            if (userEco === 'womens') {
                setActiveEcosystem('womens');
                localStorage.setItem('CAVIOS_ecosystem', 'womens');
            } else if (userEco === 'mens') {
                setActiveEcosystem('mens');
                localStorage.setItem('CAVIOS_ecosystem', 'mens');
            } else if (userEco === 'all') {
                // Keep the current activeEcosystem (either from localStorage or default)
                // But ensure it's valid
                if (activeEcosystem !== 'mens' && activeEcosystem !== 'womens') {
                    setActiveEcosystem('mens');
                    localStorage.setItem('CAVIOS_ecosystem', 'mens');
                }
            }
        }
    }, [currentUserProfile]);

    const switchEcosystem = (eco) => {
        if (eco !== 'mens' && eco !== 'womens') return;
        setActiveEcosystem(eco);
        localStorage.setItem('CAVIOS_ecosystem', eco);
        // Optional: Dispatch event to trigger refresh in specific components
        window.dispatchEvent(new CustomEvent('ecosystemChanged', { detail: { ecosystem: eco } }));
    };

    // Theming helper: Violet for womens, default (cyan/blue) for mens
    const themeColors = {
        primaryText: activeEcosystem === 'womens' ? 'text-violet-500' : 'text-cyan-500',
        primaryBg: activeEcosystem === 'womens' ? 'bg-violet-500 hover:bg-violet-400 shadow-violet-500/20' : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20',
        primaryBorder: activeEcosystem === 'womens' ? 'border-violet-500' : 'border-cyan-500',
        primaryRing: activeEcosystem === 'womens' ? 'ring-violet-500' : 'ring-cyan-500',
        gradientFrom: activeEcosystem === 'womens' ? 'from-violet-500' : 'from-cyan-500',
        gradientTo: activeEcosystem === 'womens' ? 'to-fuchsia-500' : 'to-blue-500',
    };

    return (
        <EcosystemContext.Provider value={{
            activeEcosystem,
            setActiveEcosystem: switchEcosystem,
            isAll: currentUserProfile?.ecosystem === 'all',
            themeColors
        }}>
            {children}
        </EcosystemContext.Provider>
    );
};
