import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Mail } from 'lucide-react';

const ImprintScreen = () => {
    const handleBack = () => {
        // Force back to settings support view
        window.location.hash = 'settings/support';
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center gap-4">
                <button 
                    onClick={handleBack}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-foreground"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-black tracking-tight uppercase text-muted-foreground/60">Impressum</h1>
            </div>

            {/* Content */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 px-6 py-12 flex flex-col items-center text-center max-w-2xl mx-auto"
            >
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-8 text-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                    <FileText size={40} />
                </div>
                
                <h2 className="text-2xl font-black text-foreground mb-4">Impressum</h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                    Hier entsteht das offizielle Impressum der CAVIO Plattform. 
                    Wir bereiten alle rechtlichen Informationen sorgfältig für dich vor.
                </p>

                <div className="w-full p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner space-y-4">
                    <div className="flex items-center gap-4 text-left border-b border-white/5 pb-4">
                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-0.5">Verantwortlich</p>
                            <p className="text-sm font-semibold text-foreground">CAVIO Plattform / [Dein Name/Firma]</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-left pt-2">
                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center shrink-0">
                            <Mail size={18} className="text-cyan-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-0.5">Kontakt</p>
                            <p className="text-sm font-semibold text-foreground">kontakt@cavio.me</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ImprintScreen;
