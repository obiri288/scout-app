import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, X, Shield, Flag, CheckCircle, AlertTriangle, Loader2, Trash2, Menu, Video, MessageSquare, TrendingUp, Users, AlertOctagon, UserCheck, Trophy, Building, User, Check, ShieldCheck, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { NotificationBell } from './NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../lib/api';

const TARGET_TYPE_LABELS = {
    profile: 'Profil',
    video: 'Video',
    comment: 'Kommentar',
    message: 'Nachricht',
    user: 'Benutzer',
};

// Premium Skeleton Loader Component
const SkeletonBlock = ({ className }) => (
    <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

// Premium Empty State Component
const PremiumEmptyState = ({ icon: Icon, title, message }) => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
        <div className="w-20 h-20 bg-zinc-900 text-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Icon size={40} />
        </div>
        <h3 className="text-lg font-black text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 font-medium max-w-xs">{message}</p>
    </div>
);

const AdminDashboard = ({ onClose, onMenuOpen }) => {
    const { currentUserProfile, adminUnreadCountGlobal } = useUser();
    const { addToast } = useToast();

    // --- CRITICAL DATA-FIRST RULE ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('dashboard');
    
    const [stats, setStats] = useState({
        openReports: 0,
        newUsers24h: 0,
        newVideos24h: 0,
        pendingAccounts: 0,
        pendingClaims: 0,
        pendingCareers: 0
    });
    
    const [reports, setReports] = useState([]);
    const [pendingAccountsList, setPendingAccountsList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReportGroup, setSelectedReportGroup] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const loadData = useCallback(async () => {
        if (currentUserProfile?.role !== 'admin') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            // 1. Fetch Metrics & Pending Data
            const [usersRes, videosRes, reportsRes, accountsRes, claimsRes] = await Promise.all([
                supabase.from('players_master').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
                supabase.from('media_highlights').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
                supabase.from('reports').select('*').order('created_at', { ascending: false }),
                supabase.from('players_master').select('id, full_name, username, role, avatar_url, created_at').eq('verification_status', 'pending').order('created_at', { ascending: false }),
                supabase.from('club_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending')
            ]);

            const allReports = reportsRes.data || [];
            
            // Group reports by target
            const groups = {};
            allReports.forEach(r => {
                if (!groups[r.target_id]) {
                    groups[r.target_id] = {
                        target_id: r.target_id,
                        target_type: r.target_type,
                        reports: [],
                        status: r.status,
                        targetData: null,
                        report_count: 0
                    };
                }
                groups[r.target_id].reports.push(r);
                if (r.status === 'pending') groups[r.target_id].status = 'pending';
            });

            const groupedList = Object.values(groups);
            const pendingGroups = groupedList.filter(g => g.status === 'pending');

            const fetchedAccounts = accountsRes.data || [];
            setPendingAccountsList(fetchedAccounts);

            // Update Stats including Notification Badges
            setStats({
                openReports: pendingGroups.length,
                newUsers24h: usersRes.count || 0,
                newVideos24h: videosRes.count || 0,
                pendingAccounts: fetchedAccounts.length,
                pendingClaims: claimsRes.count || 0,
                pendingCareers: 0 // Will implement career logic when career table exists
            });

            // Fetch target details for pending groups
            const videoIds = pendingGroups.filter(g => g.target_type === 'video').map(g => g.target_id);
            const commentIds = pendingGroups.filter(g => g.target_type === 'comment').map(g => g.target_id);
            const profileIds = pendingGroups.filter(g => g.target_type === 'profile' || g.target_type === 'user').map(g => g.target_id);

            const [videos, comments, profiles] = await Promise.all([
                videoIds.length > 0 ? supabase.from('media_highlights').select('id, description, video_url, thumbnail_url, player_id, report_count').in('id', videoIds) : Promise.resolve({ data: [] }),
                commentIds.length > 0 ? supabase.from('media_comments').select('id, content, video_id, user_id, report_count').in('id', commentIds) : Promise.resolve({ data: [] }),
                profileIds.length > 0 ? supabase.from('players_master').select('id, full_name, username, avatar_url, report_count').in('id', profileIds) : Promise.resolve({ data: [] })
            ]);

            const videoMap = (videos.data || []).reduce((acc, v) => ({ ...acc, [v.id]: v }), {});
            const commentMap = (comments.data || []).reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
            const profileMap = (profiles.data || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

            const enrichedGroups = pendingGroups.map(group => {
                let targetData = null;
                if (group.target_type === 'video') targetData = videoMap[group.target_id];
                else if (group.target_type === 'comment') targetData = commentMap[group.target_id];
                else if (group.target_type === 'profile' || group.target_type === 'user') targetData = profileMap[group.target_id];

                return {
                    ...group,
                    targetData,
                    report_count: targetData?.report_count || group.reports.length
                };
            });

            setReports(enrichedGroups);
        } catch (error) {
            console.error("Admin Command Center Fetch Error:", error);
            addToast(`Fehler beim Laden: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentUserProfile, addToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleReportAction = async (e, reportGroup, action) => {
        e.stopPropagation();

        let title = '', message = '', confirmText = '', confirmClass = '';

        if (action === 'dismiss') {
            title = 'Meldungen verwerfen?';
            message = 'Alle Meldungen für diesen Inhalt werden als erledigt markiert.';
            confirmText = 'Verwerfen';
            confirmClass = 'bg-blue-600';
        } else if (action === 'delete') {
            title = 'Inhalt endgültig löschen?';
            message = 'Möchtest du diesen Inhalt unwiderruflich löschen?';
            confirmText = 'Löschen';
            confirmClass = 'bg-red-600';
        }

        setConfirmAction({
            title, message, confirmText, confirmClass,
            onConfirm: async () => {
                // Optimistic UI Update
                setReports(prev => prev.filter(g => g.target_id !== reportGroup.target_id));
                setStats(prev => ({ ...prev, openReports: Math.max(0, prev.openReports - 1) }));
                setConfirmAction(null);

                try {
                    const targetTable = reportGroup.target_type === 'video' ? 'media_highlights' : 
                                      reportGroup.target_type === 'comment' ? 'media_comments' : 'players_master';

                    if (action === 'delete') {
                        await supabase.from(targetTable).delete().eq('id', reportGroup.target_id);
                        
                        // Send notification to the user whose video was removed
                        if (targetTable === 'media_highlights' && reportGroup.targetData?.player_id) {
                            try {
                                await api.createNotification({
                                    userId: reportGroup.targetData.player_id,
                                    actorId: currentUserProfile?.id,
                                    type: 'video_removed',
                                    message: 'Dein Video wurde aufgrund von Community-Meldungen entfernt.',
                                    videoId: reportGroup.target_id
                                });
                            } catch (e) {
                                console.warn('Could not send removal notification', e);
                            }
                        }
                    } else if (action === 'dismiss') {
                        await supabase.from(targetTable).update({ is_under_review: false, report_count: 0 }).eq('id', reportGroup.target_id);
                    }

                    await supabase.from('reports').update({ status: 'resolved' }).eq('target_id', reportGroup.target_id);
                    addToast(action === 'dismiss' ? 'Meldungen verworfen' : 'Inhalt gelöscht', 'success');
                } catch (error) {
                    addToast(`Fehler: ${error.message}`, 'error');
                    loadData(); // Revert optimistic update on failure
                }
            }
        });
    };

    const handleAccountAction = async (account, action) => {
        // Optimistic UI Update
        setPendingAccountsList(prev => prev.filter(a => a.id !== account.id));
        setStats(prev => ({ ...prev, pendingAccounts: Math.max(0, prev.pendingAccounts - 1) }));

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        
        try {
            const { error } = await supabase
                .from('players_master')
                .update({ 
                    verification_status: newStatus,
                    is_verified: action === 'approve'
                })
                .eq('id', account.id);
            
            if (error) throw error;
            addToast(`Anfrage erfolgreich ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`, 'success');
        } catch (error) {
            addToast(`Fehler: ${error.message}`, 'error');
            loadData(); // Revert optimistic update on failure
        }
    };

    if (currentUserProfile?.role !== 'admin') {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md">
                <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-3xl flex flex-col items-center">
                    <ShieldAlert size={48} className="text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-white">Zugriff verweigert</h2>
                    <button onClick={onClose} className="px-6 py-2 bg-white/10 text-white rounded-full mt-6">Schließen</button>
                </div>
            </div>
        );
    }

    const MENU_ITEMS = [
        { id: 'dashboard', label: 'Übersicht', icon: Shield, badge: 0 },
        { id: 'status-freigaben', label: 'Status-Freigaben', icon: UserCheck, badge: stats.pendingAccounts },
        { id: 'karriere-stationen', label: 'Karriere-Stationen', icon: Trophy, badge: stats.pendingCareers },
        { id: 'vereins-rechte', label: 'Vereins-Rechte', icon: Building, badge: stats.pendingClaims },
    ];

    const renderSkeletonList = () => (
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-[#111] border border-white/5 rounded-2xl">
                    <SkeletonBlock className="w-12 h-12" />
                    <div className="flex-1 space-y-2">
                        <SkeletonBlock className="w-24 h-3" />
                        <SkeletonBlock className="w-48 h-4" />
                        <SkeletonBlock className="w-32 h-3" />
                    </div>
                </div>
            ))}
        </div>
    );

    // --- Sub-Views ---
    const renderDashboardView = () => (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="col-span-2 md:col-span-1 bg-[#111] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center mb-4">
                        <AlertOctagon size={20} />
                    </div>
                    <p className="text-4xl font-black text-white mb-1">
                        {isLoading ? <SkeletonBlock className="w-12 h-8" /> : stats.openReports}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Offene Meldungen</p>
                </div>

                <div className="col-span-1 bg-[#111] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                        <Users size={20} />
                    </div>
                    <p className="text-4xl font-black text-white mb-1">
                        {isLoading ? <SkeletonBlock className="w-16 h-8" /> : `+${stats.newUsers24h}`}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Neuanmeldungen 24h</p>
                </div>

                <div className="col-span-1 bg-[#111] border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                        <TrendingUp size={20} />
                    </div>
                    <p className="text-4xl font-black text-white mb-1">
                        {isLoading ? <SkeletonBlock className="w-16 h-8" /> : `+${stats.newVideos24h}`}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Video-Uploads 24h</p>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Flag size={16} className="text-red-500" />
                    Dringende Fälle
                </h3>

                {isLoading ? (
                    renderSkeletonList()
                ) : reports.length === 0 ? (
                    <PremiumEmptyState 
                        icon={ShieldCheck} 
                        title="Plattform ist sauber" 
                        message="Es gibt aktuell keine offenen Meldungen. Alle Inhalte wurden geprüft." 
                    />
                ) : (
                    <div className="space-y-3">
                        {reports.map(group => {
                            const isQuarantine = group.report_count >= 5;
                            return (
                                <div 
                                    key={group.target_id} 
                                    onClick={() => setSelectedReportGroup(group)}
                                    className="group relative flex items-center gap-4 p-4 bg-[#111] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-colors"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 shrink-0 overflow-hidden flex items-center justify-center border border-white/5">
                                        {group.target_type === 'video' && group.targetData?.thumbnail_url ? (
                                            <img src={group.targetData.thumbnail_url} className="w-full h-full object-cover" />
                                        ) : group.target_type === 'video' ? (
                                            <Video size={18} className="text-zinc-600" />
                                        ) : group.target_type === 'comment' ? (
                                            <MessageSquare size={18} className="text-zinc-600" />
                                        ) : (
                                            <User size={18} className="text-zinc-600" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                                                {TARGET_TYPE_LABELS[group.target_type]}
                                            </span>
                                            {isQuarantine && (
                                                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded border border-red-500/20">
                                                    Quarantäne
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-sm text-white truncate">
                                            {group.target_type === 'comment' ? group.targetData?.content : (group.targetData?.description || group.targetData?.full_name || 'Unbekannter Inhalt')}
                                        </h4>
                                        <p className="text-xs text-zinc-400 truncate">
                                            {group.reports.length} Meldung{group.reports.length > 1 ? 'en' : ''}: "{group.reports[0]?.reason}"
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => handleReportAction(e, group, 'dismiss')}
                                            className="p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-lg transition-colors border border-blue-600/20"
                                            title="Verwerfen"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleReportAction(e, group, 'delete')}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                                            title="Löschen"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );

    const renderAccountsView = () => (
        <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserCheck size={16} className="text-blue-500" />
                Ausstehende Verifizierungen
            </h3>

            {isLoading ? (
                renderSkeletonList()
            ) : pendingAccountsList.length === 0 ? (
                <PremiumEmptyState 
                    icon={ShieldCheck} 
                    title="Keine offenen Freigaben" 
                    message="Alle Scouts und Trainer wurden verifiziert. Aktuell gibt es keine neuen Anfragen." 
                />
            ) : (
                <div className="space-y-3">
                    {pendingAccountsList.map(account => (
                        <div key={account.id} className="group relative flex items-center gap-4 p-4 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                            <div className="w-12 h-12 rounded-full bg-zinc-900 shrink-0 overflow-hidden flex items-center justify-center border border-white/5">
                                {account.avatar_url ? (
                                    <img src={account.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm font-black text-zinc-500">
                                        {account.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                        {account.role === 'scout' ? 'Scout-Anfrage' : 'Trainer-Anfrage'}
                                    </span>
                                </div>
                                <h4 className="font-bold text-sm text-white truncate">{account.full_name}</h4>
                                <p className="text-xs text-zinc-400 truncate">@{account.username}</p>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleAccountAction(account, 'approve')}
                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors border border-emerald-500/20 flex items-center gap-1.5 px-3"
                                    title="Freigeben"
                                >
                                    <Check size={16} />
                                    <span className="text-xs font-bold">Freigeben</span>
                                </button>
                                <button 
                                    onClick={() => handleAccountAction(account, 'reject')}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20 flex items-center gap-1.5 px-3"
                                    title="Ablehnen"
                                >
                                    <X size={16} />
                                    <span className="text-xs font-bold">Ablehnen</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderPlaceholderView = (title) => (
        <PremiumEmptyState 
            icon={ShieldCheck} 
            title={title} 
            message="Aktuell keine Daten vorhanden. Alles ist auf dem neuesten Stand." 
        />
    );

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505]/95 backdrop-blur-xl">
            <div className="w-full max-w-3xl h-[90vh] bg-[#0A0A0A] border border-white/10 shadow-2xl flex flex-col sm:rounded-3xl relative overflow-hidden font-inter">
                
                {/* 1. Header (Hamburger Menu integration) */}
                <div className="relative flex justify-between items-center px-4 py-4 sm:px-6 sm:py-5 bg-[#050505] shrink-0 border-b border-white/5 z-20">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-zinc-400 hover:text-white"
                        >
                            <Menu size={22} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black text-white leading-tight">
                                {MENU_ITEMS.find(i => i.id === activeView)?.label || 'Übersicht'}
                            </h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Command Center 2.0</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <NotificationBell />
                            {adminUnreadCountGlobal > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            )}
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-zinc-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 2. Content Area with Routing */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative z-10">
                    {activeView === 'dashboard' && renderDashboardView()}
                    {activeView === 'status-freigaben' && renderAccountsView()}
                    {activeView === 'karriere-stationen' && renderPlaceholderView('Karriere-Stationen')}
                    {activeView === 'vereins-rechte' && renderPlaceholderView('Vereins-Rechte')}
                </div>

                {/* 3. Off-Canvas Sidebar */}
                <AnimatePresence>
                    {isSidebarOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                onClick={() => setIsSidebarOpen(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[40000]" 
                            />
                            
                            {/* Sidebar Menu */}
                            <motion.div 
                                initial={{ x: '-100%' }} 
                                animate={{ x: 0 }} 
                                exit={{ x: '-100%' }} 
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="absolute top-0 left-0 bottom-0 w-64 bg-[#0A0A0A] border-r border-white/10 shadow-2xl z-[50000] flex flex-col"
                            >
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Shield className="text-blue-600" size={24} />
                                        <h3 className="font-black text-white text-lg">Admin Menü</h3>
                                    </div>
                                    <button onClick={() => setIsSidebarOpen(false)}>
                                        <X size={20} className="text-zinc-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto space-y-1">
                                    {MENU_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = activeView === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setActiveView(item.id);
                                                    setIsSidebarOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition-all ${
                                                    isActive 
                                                    ? 'bg-blue-600/10 text-blue-500 border border-blue-600/20' 
                                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon size={18} />
                                                    <span className="text-sm">{item.label}</span>
                                                </div>
                                                {item.badge > 0 && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                        isActive ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'
                                                    }`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedReportGroup && (
                        <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedReportGroup(null)} className="absolute inset-0 bg-[#050505]/90 backdrop-blur-sm" />
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#050505]">
                                    <h3 className="font-black text-white">Details prüfen</h3>
                                    <button onClick={() => setSelectedReportGroup(null)}><X size={20} className="text-zinc-500 hover:text-white" /></button>
                                </div>
                                <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-2 tracking-widest">Inhalts-Vorschau</h4>
                                        {selectedReportGroup.target_type === 'video' ? (
                                            <video src={selectedReportGroup.targetData?.video_url} controls className="w-full aspect-video rounded-xl bg-black border border-white/10" />
                                        ) : <p className="text-zinc-300 text-sm p-3 bg-black/50 rounded-xl border border-white/5">"{selectedReportGroup.targetData?.content || selectedReportGroup.targetData?.full_name}"</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-1 tracking-widest">Meldungen ({selectedReportGroup.reports.length})</h4>
                                        {selectedReportGroup.reports.map((r, i) => (
                                            <div key={i} className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                <p className="text-sm text-zinc-300 font-medium">{r.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Confirmation Modal */}
                {confirmAction && (
                    <div className="fixed inset-0 z-[70000] flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-[#111] border border-white/10 p-6 rounded-3xl shadow-2xl text-center">
                            <AlertTriangle className="mx-auto text-blue-500 mb-4" size={40} />
                            <h3 className="text-xl font-black text-white mb-2">{confirmAction.title}</h3>
                            <p className="text-zinc-400 text-sm mb-6">{confirmAction.message}</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">Abbrechen</button>
                                <button onClick={confirmAction.onConfirm} className={`flex-1 py-3 text-white font-black rounded-xl transition-all ${confirmAction.confirmClass}`}>{confirmAction.confirmText}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
