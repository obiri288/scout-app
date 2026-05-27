import React from 'react';
import { ArrowLeft } from 'lucide-react';

const PrivacyScreen = () => {
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
                    <h1 className="text-2xl font-black text-slate-100">Datenschutzerklärung</h1>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-100 mt-6">1. Datenschutz auf einen Blick</h2>
                    <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.</p>

                    <h2 className="text-xl font-bold text-slate-100 mt-6">2. Allgemeine Hinweise und Pflichtinformationen</h2>
                    <p>At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>

                    <h2 className="text-xl font-bold text-slate-100 mt-6">3. Datenerfassung auf dieser Website</h2>
                    <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyScreen;
