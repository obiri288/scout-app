import React from 'react';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { AnimatePresence, motion } from 'framer-motion';

export const NetworkGuard = ({ children }) => {
    const isOnline = useNetworkStatus();

    return (
        <>
            <AnimatePresence>
                {!isOnline && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed top-0 left-0 right-0 z-[99999] bg-slate-900/90 backdrop-blur-xl border-b border-cyan-500/50 text-cyan-400 text-sm py-2 px-4 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(34,211,238,0.2)]"
                        style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
                    >
                        <WifiOff size={16} className="flex-shrink-0" />
                        <span className="font-medium text-center leading-tight">
                            Du bist offline. CAVIOS benötigt eine Internetverbindung.
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
            {children}
        </>
    );
};
