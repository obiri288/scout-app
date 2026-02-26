import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight } from 'lucide-react';

export const WelcomeCard = ({ profile }) => {
    const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'User';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-6 px-4"
        >
            <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 border-none text-white shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12">
                    <Sparkles size={80} />
                </div>

                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-none px-2 py-0">
                            Willkommen zurück
                        </Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold">Hallo, {firstName}!</CardTitle>
                </CardHeader>

                <CardContent>
                    <p className="text-indigo-100 text-sm mb-4 leading-relaxed">
                        Schön, dass du wieder da bist. Schau dir die neuesten Highlights deiner gefolgten Spieler an oder entdecke neue Talente.
                    </p>

                    <motion.button whileHover={{ scale: 1.04, backgroundColor: "rgba(255,255,255,0.25)" }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/10 transition-colors px-4 py-2 rounded-lg">
                        Dein Status: Aktiv <ArrowRight size={14} className="text-emerald-400" />
                    </motion.button>
                </CardContent>
            </Card>
        </motion.div>
    );
};
