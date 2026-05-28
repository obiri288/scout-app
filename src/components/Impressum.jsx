import React from 'react';
import { ArrowLeft } from 'lucide-react';

const Impressum = () => {
    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/waitlist';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col py-12 px-4 font-sans relative">
            <div className="max-w-4xl mx-auto p-8 my-10 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl text-slate-300 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
                        id="back-button-imprint"
                    >
                        <ArrowLeft size={20} />
                        <span className="text-xs pr-2 font-medium">Zurück</span>
                    </button>
                </div>

                <h1 className="text-slate-100 font-bold mt-8 mb-4 text-3xl">Impressum</h1>

                <h2 className="text-slate-100 font-bold mt-8 mb-4 text-xl">Angaben gemäß § 5 TMG</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                    trendtriebwerk - Obiri-Yeboah Bordom<br />
                    Georg-Blume-Straße 19<br />
                    22119 Hamburg
                </p>

                <h2 className="text-slate-100 font-bold mt-8 mb-4 text-xl">Kontakt</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                    E-Mail: <a href="mailto:kontakt@cavio.me" className="text-cyan-400 hover:underline">kontakt@cavio.me</a>
                </p>

                <h2 className="text-slate-100 font-bold mt-8 mb-4 text-xl">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                    Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
            </div>
        </div>
    );
};

export default Impressum;
