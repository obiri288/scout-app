import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Eye } from 'lucide-react';

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
};

export const WelcomeCard = ({ profile }) => {
    const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'Scout';
    const greeting = getGreeting();

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 px-4"
        >
            <Card className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 border-none text-white shadow-[0_8px_40px_rgba(99,102,241,0.25)] overflow-hidden relative">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                    <Sparkles size={90} />
                </div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

                <CardHeader className="pb-2 relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-white/15 text-cyan-200 border-none px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                            <Eye size={10} className="mr-1" /> Scout Mode
                        </Badge>
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight">
                        {greeting}, {firstName}!
                    </CardTitle>
                </CardHeader>

                <CardContent className="relative z-10">
                    <p className="text-indigo-100/80 text-sm mb-4 leading-relaxed">
                        Entdecke die neuesten Highlights, verfolge Talente und finde den nächsten Star für dein Team.
                    </p>

                    <motion.div
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 transition-colors px-4 py-2.5 rounded-xl cursor-pointer backdrop-blur-sm border border-white/10"
                    >
                        <TrendingUp size={14} className="text-cyan-300" />
                        Dein Status: Aktiv
                    </motion.div>
                </CardContent>
            </Card>
        </motion.div>
    );
};
