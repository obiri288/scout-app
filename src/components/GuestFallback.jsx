import React from 'react';
import { btnPrimary } from '../lib/styles';

export const GuestFallback = ({ icon: Icon, title, text, onLogin }) => (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6 animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-indigo-900/20 ring-1 ring-cyan-500/20">
            <div className="text-2xl tracking-tighter flex items-baseline"><span className="font-black text-white">PRO</span><span className="font-semibold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 ml-0.5">BASE</span></div>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>
        <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed text-sm">{text}</p>
        <button onClick={onLogin} className={`${btnPrimary} w-full max-w-xs`}>
            Enter the Base.
        </button>
    </div>
);
