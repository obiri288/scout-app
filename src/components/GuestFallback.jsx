import React from 'react';
import { btnPrimary } from '../lib/styles';

export const GuestFallback = ({ icon: Icon, title, text, onLogin }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 border border-border shadow-2xl shadow-blue-900/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent"></div>
            <Icon size={40} className="text-zinc-500 relative z-10" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>
        <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed text-sm">{text}</p>
        <button onClick={onLogin} className={`${btnPrimary} w-full max-w-xs`}>
            Jetzt anmelden / registrieren
        </button>
    </div>
);
