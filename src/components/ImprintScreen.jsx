import React from 'react';
import { ArrowLeft } from 'lucide-react';

const ImprintScreen = () => {
    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col py-12 px-4 font-sans relative">
            <div className="max-w-3xl w-full mx-auto p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl text-slate-300 space-y-6">
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={handleBack}
                        className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-black text-slate-100">Impressum</h1>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-100 mt-6">Angaben gemäß § 5 TMG</h2>
                    <p>
                        Max Mustermann<br/>
                        Musterstraße 1<br/>
                        12345 Musterstadt
                    </p>

                    <h2 className="text-xl font-bold text-slate-100 mt-6">Kontakt</h2>
                    <p>
                        Telefon: +49 (0) 123 44 55 66<br/>
                        E-Mail: kontakt@cavio.me
                    </p>

                    <h2 className="text-xl font-bold text-slate-100 mt-6">Haftung für Inhalte</h2>
                    <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
                </div>
            </div>
        </div>
    );
};

export default ImprintScreen;
