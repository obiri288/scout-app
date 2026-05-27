import React from 'react';

export const Footer = () => {
    return (
        <div className="w-full text-xs text-slate-500 flex justify-center gap-6 py-6 border-t border-slate-800/50 mt-auto z-20 relative">
            <a href="/impressum" className="hover:text-cyan-400 transition-colors">Impressum</a>
            <a href="/datenschutz" className="hover:text-cyan-400 transition-colors">Datenschutz</a>
        </div>
    );
};
