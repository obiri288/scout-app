import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

export const CookieBanner = () => {
    const [accepted, setAccepted] = useState(false);
    useEffect(() => {
        if (localStorage.getItem('cookie_consent') === 'true') setAccepted(true);
    }, []);
    if (accepted) return null;
    return (
        <div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-[100]">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <Cookie size={24} className="text-white" />
                    <div className="text-xs text-zinc-400">Wir nutzen technisch notwendige Cookies.</div>
                </div>
                <button onClick={() => { localStorage.setItem('cookie_consent', 'true'); setAccepted(true); }} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm">
                    Alles klar
                </button>
            </div>
        </div>
    );
};
