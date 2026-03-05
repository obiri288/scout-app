import React from 'react';
import { btnPrimary } from '../lib/styles';

export const GuestFallback = ({ icon: Icon, title, text, onLogin }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-blue-900/30 ring-1 ring-white/10">
            <span className="font-black italic text-3xl tracking-tighter text-white select-none">XI</span>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>
        <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed text-sm">{text}</p>
        <button onClick={onLogin} className={`${btnPrimary} w-full max-w-xs`}>
            Join NextXI
        </button>
    </div>
);
