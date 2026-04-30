import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Home, Search, Mail, User, Settings, 
    ShieldCheck, UserCheck, Trophy, Building, 
    Flag, Users, Info, Shield, LogOut
} from 'lucide-react';

const Sidebar = ({ 
    isOpen, 
    onClose, 
    activeTab, 
    onNavigate, 
    onLogout, 
    session,
    currentUserProfile 
}) => {
    
    const NAV_ITEMS = [
        { id: 'directory', label: 'Nutzer-Verzeichnis', icon: Users, category: 'PLATTFORM' },
        { id: 'teams', label: 'Meine Teams', icon: Building, category: 'PLATTFORM' },
        
        { id: 'admin_overview', label: 'Admin Übersicht', icon: Shield, category: 'VERWALTUNG', adminOnly: true },
        { id: 'admin_accounts', label: 'Status-Freigaben', icon: UserCheck, category: 'VERWALTUNG', adminOnly: true },
        { id: 'admin_active_users', label: 'Aktive Konten', icon: Users, category: 'VERWALTUNG', adminOnly: true },
        { id: 'admin_career', label: 'Karriere-Stationen', icon: Trophy, category: 'VERWALTUNG', adminOnly: true },
        { id: 'admin_claims', label: 'Vereins-Rechte', icon: Building, category: 'VERWALTUNG', adminOnly: true },
        { id: 'admin_reports', label: 'Meldungen', icon: Flag, category: 'VERWALTUNG', adminOnly: true },

        { id: 'profile', label: 'Mein Profil', icon: User, category: 'ACCOUNT' },
        { id: 'settings', label: 'Einstellungen', icon: Settings, category: 'ACCOUNT' },
    ];

    const isAdmin = currentUserProfile?.role === 'admin';

    const categories = ['VERWALTUNG', 'PLATTFORM', 'ACCOUNT'];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001]"
                    />

                    {/* Drawer */}
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 bottom-0 w-[280px] bg-zinc-900 border-r border-white/10 z-[10002] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                                    <Shield className="text-cyan-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-foreground tracking-tight">CAVIO</h2>
                                    <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Navigation</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-muted-foreground transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Navigation Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
                            {categories.map(category => {
                                const items = NAV_ITEMS.filter(item => item.category === category);
                                const visibleItems = items.filter(item => !item.adminOnly || isAdmin);
                                
                                if (visibleItems.length === 0) return null;

                                return (
                                    <div key={category} className="space-y-2">
                                        <h3 className="px-3 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">{category}</h3>
                                        <div className="space-y-1">
                                            {visibleItems.map(item => {
                                                const isActive = activeTab === item.id;
                                                
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => {
                                                            if (item.id === 'logout') {
                                                                onLogout();
                                                            } else {
                                                                onNavigate(item.id);
                                                            }
                                                            onClose();
                                                        }}
                                                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                                                            isActive 
                                                            ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)] border border-cyan-500/20' 
                                                            : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                            <item.icon size={20} className={isActive ? 'text-cyan-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                                                        </div>
                                                        <span className={`text-[15px] font-bold tracking-tight ${isActive ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                                            {item.label}
                                                        </span>
                                                        {isActive && (
                                                            <motion.div 
                                                                layoutId="active-pill"
                                                                className="ml-auto w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer / Logout */}
                        {session && (
                            <div className="p-4 border-t border-white/5 bg-black/20">
                                <button 
                                    onClick={() => { onLogout(); onClose(); }}
                                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all group"
                                >
                                    <LogOut size={20} />
                                    <span className="font-bold text-[15px]">Abmelden</span>
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Sidebar;
