import React, { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';
import { initializeAnalytics } from '../lib/analytics';

export const CookieConsent = () => {
    // Initialisiere State synchron aus localStorage
    const [consent, setConsent] = useState(() => localStorage.getItem('cavios_cookie_consent'));

    useEffect(() => {
        // Wenn bereits zugestimmt wurde, Analytics beim Mounten laden
        if (consent === 'accepted') {
            initializeAnalytics();
        }
    }, [consent]);

    // Wenn der Nutzer bereits eine Auswahl getroffen hat (accepted/rejected), nichts mehr rendern
    if (consent !== null) return null;

    const handleAccept = () => {
        localStorage.setItem('cavios_cookie_consent', 'accepted');
        setConsent('accepted'); // Löst den useEffect aus, der dann initializeAnalytics aufruft
    };

    const handleReject = () => {
        localStorage.setItem('cavios_cookie_consent', 'rejected');
        setConsent('rejected'); // Analytics wird nicht geladen
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[10000] p-4 animate-in slide-in-from-bottom duration-500">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 max-w-4xl mx-auto">
                <div className="flex-1 flex items-start gap-4">
                    <Cookie size={32} className="text-cyan-500 shrink-0" />
                    <div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            Wir verwenden Cookies für Analytics, um unsere App kontinuierlich für dich zu verbessern. 
                            Weitere Informationen findest du in unserer <a href="/datenschutz" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">Datenschutzerklärung</a>.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                    <button 
                        onClick={handleReject} 
                        className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-bold"
                    >
                        Ablehnen
                    </button>
                    <button 
                        onClick={handleAccept} 
                        className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-[0_0_15px_rgba(8,145,178,0.4)] text-sm font-bold"
                    >
                        Akzeptieren
                    </button>
                </div>
            </div>
        </div>
    );
};
