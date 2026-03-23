import React from 'react';

export const SplashScreen = () => (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center">
        <img
            src="/cavio-icon.png"
            alt="Cavio"
            className="w-20 h-20 rounded-full animate-pulse"
        />
    </div>
);
