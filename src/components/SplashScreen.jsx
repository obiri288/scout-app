import React from 'react';

export const SplashScreen = () => (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center">
        <img
            src="/cavios-icon.png"
            alt="CAVIOS"
            className="w-24 h-24 object-contain animate-pulse"
        />
    </div>
);
