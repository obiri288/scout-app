import React from 'react';
import { Building, ArrowLeft, Menu } from 'lucide-react';

const TeamsScreen = ({ currentUserProfile, onBack, onMenuOpen }) => {
    return (
        <div className="flex flex-col h-full bg-background min-h-screen pt-16 sm:pt-20 pb-24">
            <div className="px-4 py-4 sticky top-0 bg-background/90 backdrop-blur-md z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {currentUserProfile?.role === 'admin' && (
                        <button onClick={onMenuOpen} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-foreground">
                            <Menu size={20} />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-foreground">Meine Teams</h1>
                </div>
                <button onClick={onBack} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-muted-foreground">
                    <ArrowLeft size={20} />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-4">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-4">
                    <Building size={40} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-foreground">Demnächst verfügbar</h2>
                <p className="text-muted-foreground max-w-sm leading-relaxed">
                    Der Bereich "Meine Teams" befindet sich aktuell noch in der Entwicklung. Hier wirst du bald deine Vereinszugehörigkeiten verwalten können.
                </p>
                <button 
                    onClick={onBack}
                    className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 text-foreground font-bold rounded-xl transition"
                >
                    Zurück zur Startseite
                </button>
            </div>
        </div>
    );
};

export default TeamsScreen;
