import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, X, Heart, UserPlus, Eye, Star, Trophy, Zap, 
    MessageSquare, CheckCheck, AlertTriangle, Loader2, Users, Shield 
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import * as api from '../lib/api';
import { AppealModal } from './AppealModal';
import { useToast } from '../contexts/ToastContext';

// ── German relative time ────────────────────────────────────
const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`;
    const days = Math.floor(diff / 86400);
    if (days < 7) return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    if (days < 30) { const w = Math.floor(days / 7); return `vor ${w} Woche${w !== 1 ? 'n' : ''}`; }
    if (days < 365) { const m = Math.floor(days / 30); return `vor ${m} Monat${m !== 1 ? 'en' : ''}`; }
    const y = Math.floor(days / 365); return `vor ${y} Jahr${y !== 1 ? 'en' : ''}`;
};

// ── Type → icon + colors ───────────────────────────────────
const TYPE_CONFIG = {
    like:            { icon: Heart,         color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-l-red-400' },
    follow:          { icon: UserPlus,      color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-l-blue-400' },
    watchlist_add:   { icon: Eye,           color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-l-amber-400' },
    endorsement:     { icon: Star,          color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-l-purple-400' },
    likes_milestone: { icon: Trophy,        color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-l-yellow-400' },
    comment:         { icon: MessageSquare, color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-l-green-400' },
    video_removed:   { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-l-orange-400' },
    verification_success: { icon: CheckCheck, color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-l-green-400' },
    assist_tag:      { icon: Zap,           color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   border: 'border-l-cyan-400' },
    team_join:       { icon: Users,         color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-l-emerald-400' },
    club_roster_update: { icon: Shield,     color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  border: 'border-l-indigo-400' },
};
const cfg = (type) => TYPE_CONFIG[type] || { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-l-cyan-400' };

const getText = (n) => {
    const name = n.actor?.full_name || n.actor?.username || 'Ein Nutzer';
    
    // For standard types, we prefer a constructed message with the actor's name
    // especially if the stored message is generic or missing.
    switch (n.type) {
        case 'like':            return `${name} hat dein Video geliked`;
        case 'follow':          return `${name} folgt dir jetzt`;
        case 'watchlist_add':   return `${name} hat dich auf die Watchlist gesetzt`;
        case 'endorsement':     return `${name} hat deine Skills bestätigt`;
        case 'likes_milestone': return 'Dein Video hat einen Meilenstein erreicht! 🎉';
        case 'comment':         return `${name} hat dein Video kommentiert`;
        case 'video_removed':   return 'Dein Video wurde aufgrund von Nutzer-Meldungen entfernt.';
        case 'verification_success': return n.message || 'Deine Karriere-Station wurde erfolgreich verifiziert! 🎉';
        case 'assist_tag':      return `${name} ${n.message || 'hat dich in einem Video markiert.'}`;
        case 'team_join':       return n.message || '⚡ Ein neuer Athlet hat sich für dein Team verifiziert.';
        case 'club_roster_update': return n.message || '📡 Kader-Erweiterung in deinem Verein.';
    }

    // Fallback to the stored message if available, otherwise generic
    if (n.message) return n.message;
    return 'Neue Aktivität in deinem Profil';
};

// ═════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════
export const NotificationBell = () => {
    const { session, currentUserProfile, unreadCount, resetUnreadCount, liveNotifications, setLiveNotifications } = useUser();
    const { addToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [appealVideoId, setAppealVideoId] = useState(null);
    const [showDoneDealModal, setShowDoneDealModal] = useState(false);
    const [selectedCareer, setSelectedCareer] = useState(null);
    const [posting, setPosting] = useState(false);

    const { supabase } = api; // Assuming api exports supabase or it's available globally via imports if I add it


    // Merge live real-time items into the panel list when they arrive
    // This makes the bell panel update without needing to close and reopen
    useEffect(() => {
        if (liveNotifications.length === 0) return;
        setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newItems = liveNotifications.filter(n => !existingIds.has(n.id));
            if (newItems.length === 0) return prev;
            return [...newItems, ...prev];
        });
    }, [liveNotifications]);

    /* ── Open panel ───────────────────────────────────────── */
    const open = useCallback(async () => {
        if (!currentUserProfile?.id) return;
        setIsOpen(true);
        setLoading(true);
        try {
            const data = await api.fetchNotifications(currentUserProfile.id);
            setNotifications(prev => {
                // Merge fetched with any live items already in local state, dedup by id
                const fetchedIds = new Set(data.map(n => n.id));
                const liveOnly = prev.filter(n => !fetchedIds.has(n.id));
                return [...liveOnly, ...data].sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );
            });
        } catch (e) { console.error('Notification fetch failed:', e); }
        finally { setLoading(false); }

        // Mark all as read (optimistic) and clear live queue
        if (unreadCount > 0) {
            resetUnreadCount();
            setLiveNotifications([]);
        }
    }, [currentUserProfile?.id, unreadCount, resetUnreadCount, setLiveNotifications]);

    /* ── Mark single read ────────────────────────────────── */
    const markOne = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        try { await api.markNotificationRead(id); } catch (_) {}
    };

    /* ── Delete single notification (Optimistic) ─────────── */
    const deleteOne = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        api.deleteNotification(id).catch(e => console.error("Notification delete failed:", e));
    };

    const handleNotificationClick = async (n) => {
        if (!n.is_read) markOne(n.id);
        
        if (n.type === 'verification_success' && n.entity_id) {
            try {
                setLoading(true);
                const { data: career, error } = await api.supabase
                    .from('career_history')
                    .select('*, profile:players_master(id, full_name, avatar_url, role)')
                    .eq('id', n.entity_id)
                    .single();
                
                if (error) throw error;
                setSelectedCareer(career);
                setShowDoneDealModal(true);
                setIsOpen(false); // Close the notification panel
            } catch (err) {
                console.error("Error fetching career for modal:", err);
                addToast("Fehler beim Laden der Station", "error");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDoneDealConfirm = async () => {
        if (!selectedCareer) return;
        setPosting(true);
        try {
            // Fetch previous approved station for "from" club
            const { data: previousStations } = await api.supabase
                .from('career_history')
                .select('club_name')
                .eq('user_id', selectedCareer.user_id)
                .eq('verification_status', 'approved')
                .neq('id', selectedCareer.id)
                .order('start_date', { ascending: false })
                .limit(1);

            const oldClubName = previousStations?.[0]?.club_name || 'Vereinslos';

            const { error } = await api.supabase.from('posts').insert({
                user_id: currentUserProfile.id,
                type: 'transfer',
                content: '',
                career_station_id: selectedCareer.id,
                metadata: {
                    old_club_name: oldClubName,
                    new_club_name: selectedCareer.club_name,
                    league: selectedCareer.league,
                    role: selectedCareer.profile?.role === 'player' ? 'Spieler' : 'Staff',
                    start_date: selectedCareer.start_date,
                    end_date: selectedCareer.end_date,
                    is_current: selectedCareer.is_current,
                    player_name: selectedCareer.profile?.full_name || 'Ein Spieler',
                    player_avatar: selectedCareer.profile?.avatar_url
                }
            });

            if (error) throw error;
            addToast("Done Deal erfolgreich geteilt! 🚀", "success");
            setShowDoneDealModal(false);
        } catch (err) {
            console.error("Done Deal Error:", err);
            addToast("Fehler beim Teilen: " + err.message, "error");
        } finally {
            setPosting(false);
        }
    };

    if (!session) return null;

    return (
        <>
            {/* ── Bell Button ─────────────────────────────── */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={open}
                className="relative w-11 h-11 flex items-center justify-center rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg transition-all duration-300 hover:bg-white/20 dark:hover:bg-white/10"
                aria-label="Benachrichtigungen"
            >
                <Bell size={20} className="text-foreground/80" />

                {/* Badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)] border-2 border-background"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Ping ring */}
                {unreadCount > 0 && (
                    <span className="absolute inset-0 rounded-full border-2 border-red-400/40 animate-ping pointer-events-none" />
                )}
            </motion.button>

            {/* ── Full-screen Panel ───────────────────────── */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[30000] flex items-end sm:items-center justify-center">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%', opacity: 0.5 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="relative w-full max-w-md bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl sm:h-[70vh] h-[85vh] flex flex-col shadow-2xl border border-border overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-border flex justify-between items-center bg-white dark:bg-zinc-900 rounded-t-2xl">
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Bell size={18} className="text-cyan-400" />
                                    Benachrichtigungen
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Drag handle (mobile) */}
                            <div className="flex justify-center py-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-white/10" />
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto overscroll-contain">
                                {loading ? (
                                    <div className="flex items-center justify-center py-24">
                                        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <Bell size={28} className="text-muted-foreground/40" />
                                        </div>
                                        <p className="font-medium">Keine Benachrichtigungen</p>
                                        <p className="text-sm text-muted-foreground/60 mt-1">Du bist auf dem neuesten Stand!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/40">
                                        <AnimatePresence mode="popLayout">
                                            {notifications.map((n, i) => {
                                                const c = cfg(n.type);
                                                const Icon = c.icon;
                                                const unread = !n.is_read;
                                                return (
                                                    <motion.div
                                                        key={n.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        onClick={() => handleNotificationClick(n)}
                                                        className={`relative flex items-start gap-3 px-4 py-3.5 transition-colors cursor-pointer hover:bg-white/5 border-l-2 ${unread ? 'bg-cyan-500/5 ' + c.border : 'border-l-transparent'}`}
                                                    >
                                                        {/* Icon / Avatar */}
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${n.actor?.avatar_url ? '' : c.bg}`}>
                                                            {n.actor?.avatar_url ? (
                                                                <img src={n.actor.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                            ) : (
                                                                <Icon size={18} className={c.color} />
                                                            )}
                                                        </div>

                                                        {/* Text */}
                                                        <div className="flex-1 min-w-0 pr-6">
                                                            <p className={`text-sm leading-snug ${unread ? 'text-foreground font-medium' : 'text-foreground/70'}`}>
                                                                {getText(n)}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
                                                            
                                                            {n.type === 'video_removed' && n.video_id && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setIsOpen(false);
                                                                        setAppealVideoId(n.video_id);
                                                                    }}
                                                                    className="mt-2 text-xs font-bold bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded-lg border border-orange-500/20 transition-colors"
                                                                >
                                                                    Widerspruch einlegen
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Delete Button (X) */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteOne(n.id);
                                                            }}
                                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                            className="absolute top-3 right-3 p-1.5 text-muted-foreground/40 hover:text-rose-500 transition-colors z-20"
                                                            title="Löschen"
                                                        >
                                                            <X size={14} />
                                                        </button>

                                                        {/* Unread dot */}
                                                        {unread && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0 mt-1.5 shadow-[0_0_8px_rgba(0,200,255,0.5)]" />
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {/* Footer: mark-all button */}
                            {notifications.length > 0 && notifications.some(n => !n.is_read) && (
                                <div className="p-3 border-t border-border bg-white dark:bg-zinc-900">
                                    <button
                                        onClick={() => {
                                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                                            resetUnreadCount();
                                        }}
                                        className="w-full py-2.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition flex items-center justify-center gap-2 rounded-xl hover:bg-cyan-500/5"
                                    >
                                        <CheckCheck size={16} /> Alle als gelesen markieren
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Appeal Modal ───────────────────────── */}
            <AnimatePresence>
                {appealVideoId && (
                    <AppealModal
                        videoId={appealVideoId}
                        session={session}
                        onClose={() => setAppealVideoId(null)}
                        onAppealSubmitted={() => {
                            addToast("Dein Widerspruch wurde erfolgreich eingereicht.", "success");
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ── Done Deal Modal ───────────────────────── */}
            <AnimatePresence>
                {showDoneDealModal && selectedCareer && (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-card w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-green-500/30 text-center flex flex-col items-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                <Trophy className="text-green-500 w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-foreground">Glückwunsch! 🎊</h3>
                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                                Deine Station bei <strong>{selectedCareer.club_name}</strong> wurde verifiziert. 
                                Möchtest du diesen "Done Deal" jetzt mit deinem Netzwerk teilen?
                            </p>
                            
                            <div className="w-full space-y-3">
                                <button
                                    onClick={handleDoneDealConfirm}
                                    disabled={posting}
                                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-900/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {posting ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                                    Jetzt posten
                                </button>
                                <button
                                    onClick={() => setShowDoneDealModal(false)}
                                    disabled={posting}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-muted-foreground font-bold rounded-2xl transition-all"
                                >
                                    Vielleicht später
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
