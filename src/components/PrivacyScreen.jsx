import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Mail } from 'lucide-react';

const PrivacyScreen = () => {
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
                <h1 className="text-lg font-black tracking-tight uppercase text-muted-foreground/60">Datenschutz</h1>
            </div>

            {/* Content */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 px-6 py-12 flex flex-col items-center text-center max-w-2xl mx-auto"
            >
                <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mb-8 text-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                    <Shield size={40} />
                </div>
                
                <h2 className="text-2xl font-black text-foreground mb-4">Deine Privatsphäre</h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                    Wir arbeiten aktuell an der detaillierten Ausarbeitung unserer Datenschutzbestimmungen, 
                    um dir maximale Transparenz über deine Daten zu bieten. 
                    Hier werden in Kürze alle Informationen zu Datenerhebung und -verarbeitung aufgeführt.
                    <br /><br />
                    Bei dringenden Fragen wende dich an <span className="text-cyan-400 font-semibold">kontakt@cavio.me</span>.
                </p>

                <div className="w-full p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <div className="flex items-center gap-4 text-left">
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

export default PrivacyScreen;
