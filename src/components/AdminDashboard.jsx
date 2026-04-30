import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, X, Check, XCircle, Search, Shield, Building, User, Flag, Eye, Clock, CheckCircle2, AlertTriangle, ExternalLink, Loader2, UserCheck, Trophy, Trash2, Edit, ShieldCheck, Menu, Undo, Bell, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { sendTestNotification } from '../lib/api';

const TABS = [
    { id: 'overview', label: 'Übersicht', icon: Shield },
    { id: 'accounts', label: 'Status-Freigaben', icon: UserCheck },
    { id: 'career', label: 'Karriere-Stationen', icon: Trophy },
    { id: 'claims', label: 'Vereins-Rechte', icon: Building },
    { id: 'reports', label: 'Meldungen', icon: Flag },
];

const STATUS_CONFIG = {
    pending: { label: 'Ausstehend', color: 'amber', icon: Clock },
    in_review: { label: 'In Bearbeitung', color: 'blue', icon: Eye },
    resolved: { label: 'Erledigt', color: 'emerald', icon: CheckCircle2 },
};

const TARGET_TYPE_LABELS = {
    profile: 'Profil',
    video: 'Video',
    comment: 'Kommentar',
    message: 'Nachricht',
    user: 'Benutzer',
};

const AdminDashboard = ({ onClose, onUserClick, activeTab: externalActiveTab, onMenuOpen }) => {
    const { currentUserProfile, session } = useUser();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState(externalActiveTab || 'overview');
    const [subTab, setSubTab] = useState('pending'); // 'pending' | 'recent'
    const [isSendingTest, setIsSendingTest] = useState(false);

    // --- KPI Metrics ---
    const [metrics, setMetrics] = useState({
        pendingApprovals: 0,
        pendingReports: 0,
        pendingClaims: 0,
        newUsers24h: 0
    });
    const [metricsLoading, setMetricsLoading] = useState(true);

    // Update internal tab when external tab changes
    useEffect(() => {
        if (externalActiveTab) {
            // Map special IDs to internal tab names
            const TAB_MAP = {
                'admin_overview': 'overview',
                'admin_accounts': 'accounts',
                'admin_career': 'career',
                'admin_claims': 'claims',
                'admin_reports': 'reports',
            };
            const mapped = TAB_MAP[externalActiveTab] || externalActiveTab.replace('admin_', '');
            setActiveTab(mapped);
        }
    }, [externalActiveTab]);


    // --- Pending Accounts State ---
    const [pendingAccounts, setPendingAccounts] = useState([]);
    const [recentAccounts, setRecentAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [recentAccountsLoading, setRecentAccountsLoading] = useState(false);

    // --- Claims State ---
    const [claims, setClaims] = useState([]);
    const [recentClaims, setRecentClaims] = useState([]);
    const [claimsLoading, setClaimsLoading] = useState(true);
    const [recentClaimsLoading, setRecentClaimsLoading] = useState(false);

    // --- Career Requests State ---
    const [careerRequests, setCareerRequests] = useState([]);
    const [recentCareerRequests, setRecentCareerRequests] = useState([]);
    const [careerLoading, setCareerLoading] = useState(true);
    const [recentCareerLoading, setRecentCareerLoading] = useState(false);

    // --- Reports State ---
    const [reports, setReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [reportFilter, setReportFilter] = useState('all'); // 'all' | 'pending' | 'in_review' | 'resolved'

    // --- Confirmation Modal State ---
    const [confirmAction, setConfirmAction] = useState(null); // { title: string, message: string, onConfirm: function }

    const loadMetrics = useCallback(async () => {
        setMetricsLoading(true);
        try {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            const [approvals, rpts, clms, newUsers] = await Promise.all([
                supabase.from('players_master').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
                supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('club_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('players_master').select('*', { count: 'exact', head: true }).gte('created_at', yesterday)
            ]);

            setMetrics({
                pendingApprovals: approvals.count || 0,
                pendingReports: rpts.count || 0,
                pendingClaims: clms.count || 0,
                newUsers24h: newUsers.count || 0
            });
        } catch (error) {
            console.error("Error loading metrics:", error);
        } finally {
            setMetricsLoading(false);
        }
    }, []);

    const loadAllData = useCallback(() => {
        if (currentUserProfile?.role === 'admin') {
            loadMetrics();
            loadPendingAccounts();
            loadClaims();
            loadReports();
            loadCareerRequests();
        } else {
            setMetricsLoading(false);
            setAccountsLoading(false);
            setClaimsLoading(false);
            setReportsLoading(false);
            setCareerLoading(false);
        }
    }, [currentUserProfile, loadMetrics]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Lazy load recent items based on tab + subTab
    useEffect(() => {
        if (subTab === 'recent') {
            if (activeTab === 'accounts' && recentAccounts.length === 0) loadRecentAccounts();
            if (activeTab === 'career' && recentCareerRequests.length === 0) loadRecentCareerRequests();
            if (activeTab === 'claims' && recentClaims.length === 0) loadRecentClaims();
        }
    }, [activeTab, subTab]);

    // ==================== PENDING ACCOUNTS (Scout/Coach) ====================
    const loadPendingAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('players_master')
                .select('id, full_name, username, email, role, avatar_url, created_at')
                .in('role', ['scout', 'coach'])
                .eq('verification_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendingAccounts(data || []);
        } catch (error) {
            console.error("Supabase Admin Fetch Error (Accounts):", error);
            addToast(`Konten-Fehler: ${error?.message || 'Unbekannter Fehler'}`, 'error');
        } finally {
            setAccountsLoading(false);
        }
    };

    const handleAccountAction = async (account, action) => {
        const title = action === 'approved' ? 'Account verifizieren?' : 'Anfrage ablehnen?';
        const message = action === 'approved' 
            ? `Bist du sicher, dass du ${account.full_name} als ${account.role === 'scout' ? 'Scout' : 'Trainer'} verifizieren möchtest?`
            : `Bist du sicher, dass du die Anfrage von ${account.full_name} ablehnen möchtest?`;

        setConfirmAction({
            title,
            message,
            confirmText: action === 'approved' ? 'Ja, verifizieren' : 'Ja, ablehnen',
            confirmClass: action === 'approved' ? 'bg-emerald-600' : 'bg-red-600',
            onConfirm: async () => {
                const newStatus = action === 'approved' ? 'approved' : 'rejected';
                try {
                    const { error } = await supabase
                        .from('players_master')
                        .update({ 
                            verification_status: newStatus,
                            is_verified: action === 'approved'
                        })
                        .eq('id', account.id);
                    if (error) throw error;

                    // 1. Instant UI Refresh (Local Update)
                    setPendingAccounts(prev => prev.filter(a => String(a.id) !== String(account.id)));
                    
                    addToast(
                        action === 'approved'
                            ? `${account.full_name} wurde verifiziert ✅`
                            : `${account.full_name} wurde abgelehnt ❌`,
                        'success'
                    );
                } catch (error) {
                    console.error('Error processing account action:', error);
                    addToast(`Fehler: ${error.message}`, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    const loadRecentAccounts = async () => {
        setRecentAccountsLoading(true);
        try {
            const timeLimit = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from('players_master')
                .select('id, full_name, username, email, role, avatar_url, created_at, updated_at, verification_status')
                .in('role', ['scout', 'coach'])
                .in('verification_status', ['approved', 'rejected'])
                .gte('updated_at', timeLimit)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setRecentAccounts(data || []);
        } catch (error) {
            console.error("Supabase Admin Fetch Error (Recent Accounts):", error);
        } finally {
            setRecentAccountsLoading(false);
        }
    };

    const handleUndoAccount = async (account) => {
        setConfirmAction({
            title: 'Entscheidung rückgängig machen?',
            message: `Möchtest du die Entscheidung für ${account.full_name} rückgängig machen? Der Account wird wieder als ausstehend markiert.`,
            confirmText: 'Ja, rückgängig',
            confirmClass: 'bg-amber-600',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('players_master')
                        .update({ 
                            verification_status: 'pending',
                            is_verified: false
                        })
                        .eq('id', account.id);
                    if (error) throw error;

                    // Remove from recent, add back to pending locally
                    setRecentAccounts(prev => prev.filter(a => String(a.id) !== String(account.id)));
                    setPendingAccounts(prev => [{...account, verification_status: 'pending', is_verified: false}, ...prev]);
                    
                    addToast(`Entscheidung für ${account.full_name} wurde rückgängig gemacht`, 'success');
                } catch (error) {
                    console.error('Error undoing account action:', error);
                    addToast(`Fehler: ${error.message}`, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    const loadClaims = async () => {
        try {
            const { data, error } = await supabase
                .from('club_claims')
                .select('*, club:clubs(name), user:players_master(full_name, username, avatar_url)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setClaims(data || []);
        } catch (error) {
            console.error("Supabase Admin Fetch Error (Claims):", error);
            addToast(`Anfragen-Fehler: ${error?.message || 'Unbekannter Fehler'}`, 'error');
        } finally {
            setClaimsLoading(false);
        }
    };

    const handleClaimAction = async (claim, action) => {
        setConfirmAction({
            title: action === 'approved' ? 'Vereins-Claim zulassen?' : 'Anfrage ablehnen?',
            message: action === 'approved'
                ? `Möchtest du ${claim.user?.full_name} als Administrator für ${claim.club?.name} zulassen?`
                : `Möchtest du den Claim von ${claim.user?.full_name} für ${claim.club?.name} ablehnen?`,
            confirmText: action === 'approved' ? 'Ja, zulassen' : 'Ja, ablehnen',
            confirmClass: action === 'approved' ? 'bg-emerald-600' : 'bg-red-600',
            onConfirm: async () => {
                try {
                    if (action === 'approved') {
                        const { error: claimError } = await supabase
                            .from('club_claims')
                            .update({ status: 'approved' })
                            .eq('id', claim.id);
                        if (claimError) throw claimError;

                        const { error: clubError } = await supabase
                            .from('clubs')
                            .update({ is_verified: true, created_by: claim.user_id })
                            .eq('id', claim.club_id);
                        if (clubError) throw clubError;

                        addToast('Anfrage zugelassen & Verein verifiziert ✅', 'success');
                    } else if (action === 'rejected') {
                        const { error } = await supabase
                            .from('club_claims')
                            .update({ status: 'rejected' })
                            .eq('id', claim.id);
                        if (error) throw error;

                        addToast('Anfrage abgelehnt ❌', 'success');
                    }
                    
                    // Instant UI Refresh (Local Update)
                    setClaims(prev => prev.filter(c => String(c.id) !== String(claim.id)));
                } catch (error) {
                    console.error('Error processing claim action:', error);
                    addToast(`Fehler: ${error.message}`, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    const loadRecentClaims = async () => {
        setRecentClaimsLoading(true);
        try {
            const timeLimit = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from('club_claims')
                .select('*, club:clubs(name), user:players_master(full_name, username, avatar_url)')
                .in('status', ['approved', 'rejected'])
                .gte('updated_at', timeLimit)
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            setRecentClaims(data || []);
        } catch (error) {
            console.error("Supabase Admin Fetch Error (Recent Claims):", error);
        } finally {
            setRecentClaimsLoading(false);
        }
    };

    const handleUndoClaim = async (claim) => {
        setConfirmAction({
            title: 'Claim-Entscheidung rückgängig machen?',
            message: `Möchtest du die Entscheidung für ${claim.club?.name} rückgängig machen? Die Anfrage wird wieder als ausstehend markiert.`,
            confirmText: 'Ja, rückgängig',
            confirmClass: 'bg-amber-600',
            onConfirm: async () => {
                try {
                    const { error: claimError } = await supabase
                        .from('club_claims')
                        .update({ status: 'pending' })
                        .eq('id', claim.id);
                    if (claimError) throw claimError;

                    if (claim.status === 'approved') {
                        // Revert club status
                        const { error: clubError } = await supabase
                            .from('clubs')
                            .update({ is_verified: false, created_by: null })
                            .eq('id', claim.club_id);
                        if (clubError) throw clubError;
                    }

                    // Remove from recent, add back to pending locally
                    setRecentClaims(prev => prev.filter(c => String(c.id) !== String(claim.id)));
                    setClaims(prev => [{...claim, status: 'pending'}, ...prev]);

                    addToast('Entscheidung wurde rückgängig gemacht', 'success');
                } catch (error) {
                    console.error('Error undoing claim action:', error);
                    addToast(`Fehler: ${error.message}`, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    // ==================== CAREER REQUESTS ====================
    const loadCareerRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('career_history')
                .select('*, players_master(full_name, username, avatar_url)')
                .eq('is_premium', true)
                .eq('verification_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCareerRequests(data || []);
        } catch (error) {
            console.error("Supabase Admin Fetch Error (Career):", error);
            addToast(`Karriere-Fehler: ${error?.message || 'Unbekannter Fehler'}`, 'error');
        } finally {
            setCareerLoading(false);
        }
    };

    const handleCareerAction = async (req, action) => {
        setConfirmAction({
            title: action === 'approved' ? 'Karriere bestätigen?' : 'Eintrag ablehnen?',
            message: action === 'approved'
                ? `Möchtest du die Station bei ${req.club_name} für ${req.players_master?.full_name || 'Unbekannter Spieler'} als verifiziert markieren?`
                : `Möchtest du den Karriere-Eintrag bei ${req.club_name} ablehnen? Er wird aus dem Profil entfernt.`,
            confirmText: action === 'approved' ? 'Ja, bestätigen' : 'Ja, ablehnen',
            confirmClass: action === 'approved' ? 'bg-emerald-600' : 'bg-red-600',
            onConfirm: async () => {
                try {
                    if (action === 'approved') {
                        const { error } = await supabase
                            .from('career_history')
                            .update({ 
                                is_verified: true,
                                verification_status: 'approved'
                            })
                            .eq('id', req.id);
                        if (error) throw error;
                        addToast('Station bestätigt! ✅', 'success');
                    } else {
                        const { error } = await supabase
                            .from('career_history')
                            .update({ 
                                is_verified: false,
                                verification_status: 'rejected'
                            })
                            .eq('id', req.id);
                        if (error) throw error;
                        addToast('Eintrag abgelehnt ❌', 'success');
                    }

                    // Instant UI Refresh (Local Update)
                    setCareerRequests(prev => prev.filter(r => String(r.id) !== String(req.id)));
                } catch (error) {
                    console.error('Career Action Error:', error);
                    addToast(`Fehler: ${error.message}`, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    const loadRecentCareerRequests = async () => {
        setRecentCareerLoading(true);
        try {
            const timeLimit = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from('career_history')
                .select('*, players_master(full_name, username, avatar_url)')
                .eq('is_premium', true)
                .in('verification_status', ['approved', 'rejected'])
                .gte('updated_at', timeLimit)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setRecentCareerRequests(data || []);
        } catch (error) {
            console.error("Supabase Admin Fetch Error (Recent Career):", error);
        } finally {
            setRecentCareerLoading(false);
        }
    };

    const handleUndoCareer = async (req) => {
        setConfirmAction({
            title: 'Karriere-Entscheidung rückgängig machen?',
            message: `Möchtest du die Entscheidung für ${req.club_name} rückgängig machen? Der Eintrag wird wieder als ausstehend markiert.`,
            confirmText: 'Ja, rückgängig',
            confirmClass: 'bg-amber-600',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('career_history')
                        .update({ 
                            verification_status: 'pending',
                            is_verified: false
                        })
                        .eq('id', req.id);
                    if (error) throw error;

                    // Remove from recent, add back to pending locally
                    setRecentCareerRequests(prev => prev.filter(r => String(r.id) !== String(req.id)));
                    setCareerRequests(prev => [{...req, verification_status: 'pending', is_verified: false}, ...prev]);

                    addToast('Entscheidung wurde rückgängig gemacht', 'success');
                } catch (error) {
                    console.error('Error undoing career action:', error);
                    addToast(`Fehler: ${error.message}`, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    // ==================== REPORTS ====================
    const loadReports = async () => {
        setReportsLoading(true);
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const reportsData = data || [];

            // Batch-resolve both reporter AND target profiles
            const reporterIds = [...new Set(reportsData.map(r => r.reporter_id).filter(Boolean))];
            const targetIds = [...new Set(reportsData
                .filter(r => r.target_type === 'profile' || r.target_type === 'user')
                .map(r => r.target_id).filter(Boolean))];

            let reporterMap = {};
            let targetMap = {};

            const fetches = [];
            if (reporterIds.length > 0) {
                fetches.push(
                    supabase.from('players_master')
                        .select('user_id, id, full_name, username, avatar_url')
                        .in('user_id', reporterIds)
                        .then(({ data: profiles }) => {
                            if (profiles) profiles.forEach(p => { reporterMap[p.user_id] = p; });
                        })
                );
            }
            if (targetIds.length > 0) {
                fetches.push(
                    supabase.from('players_master')
                        .select('id, full_name, username, avatar_url, is_banned')
                        .in('id', targetIds)
                        .then(({ data: targets }) => {
                            if (targets) targets.forEach(t => { targetMap[t.id] = t; });
                        })
                );
            }
            await Promise.all(fetches);

            const enriched = reportsData.map(r => ({
                ...r,
                reporter: reporterMap[r.reporter_id] || null,
                targetProfile: targetMap[r.target_id] || null,
            }));

            setReports(enriched);
        } catch (error) {
            console.error("Supabase Admin Fetch Error (Reports):", error);
            addToast(`Meldungen-Fehler: ${error?.message || 'Unbekannter Fehler'}`, 'error');
        } finally {
            setReportsLoading(false);
        }
    };

    const handleReportAction = async (report, action) => {
        const title = action === 'delete' ? 'Inhalt löschen?' : 'Meldung verwerfen?';
        const message = action === 'delete' 
            ? `Möchtest du diesen gemeldeten Inhalt (${TARGET_TYPE_LABELS[report.target_type] || report.target_type}) wirklich löschen und den Nutzer verwarnen?`
            : `Möchtest du diese Meldung wirklich verwerfen? Es werden keine weiteren Schritte eingeleitet.`;

        setConfirmAction({
            title,
            message,
            confirmText: action === 'delete' ? 'Inhalt löschen' : 'Verwerfen',
            confirmClass: action === 'delete' ? 'bg-red-600' : 'bg-zinc-600',
            onConfirm: async () => {
                try {
                    if (action === 'delete') {
                        // 1. Delete target content
                        let deleteTable = '';
                        if (report.target_type === 'video') deleteTable = 'media_highlights';
                        else if (report.target_type === 'comment') deleteTable = 'media_comments';
                        else if (report.target_type === 'message') deleteTable = 'direct_messages';

                        if (deleteTable) {
                            const { error: deleteError } = await supabase
                                .from(deleteTable)
                                .delete()
                                .eq('id', report.target_id);
                            if (deleteError) throw deleteError;
                        } else if (report.target_type === 'profile' || report.target_type === 'user') {
                            // For profiles, we ban the user
                            const { error: banError } = await supabase
                                .from('players_master')
                                .update({ is_banned: true })
                                .eq('id', report.target_id);
                            if (banError) throw banError;
                        }

                        addToast("Inhalt wurde gelöscht und User verwarnt", "success");
                    }

                    // 2. Resolve the report
                    const { error } = await supabase
                        .from('reports')
                        .update({ status: 'resolved' })
                        .eq('id', report.id);
                    if (error) throw error;

                    setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
                    if (action === 'dismiss') addToast("Meldung wurde verworfen", "success");
                    
                    // Refresh metrics
                    loadMetrics();
                } catch (error) {
                    console.error('Error handling report action:', error);
                    addToast(`Fehler: ${error.message}`, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    };

    const handleReportStatusUpdate = async (reportId, newStatus) => {
        try {
            const { error } = await supabase
                .from('reports')
                .update({ status: newStatus })
                .eq('id', reportId);
            if (error) throw error;

            setReports(prev => prev.map(r => 
                r.id === reportId ? { ...r, status: newStatus } : r
            ));

            const label = STATUS_CONFIG[newStatus]?.label || newStatus;
            addToast(`Status geändert → ${label}`, 'success');
            loadMetrics();
        } catch (error) {
            console.error('Error updating report status:', error);
            addToast(`Fehler: ${error.message}`, 'error');
        }
    };

    const handleDeepLink = useCallback((targetId, targetType) => {
        if (!targetId) return;

        if (targetType === 'profile' || targetType === 'user') {
            // Navigate to the reported user's profile
            if (onUserClick) {
                onUserClick({ user_id: targetId, id: targetId });
            } else {
                window.location.hash = `profile/${targetId}`;
            }
            onClose?.();
        }
        // For video/comment/message, we can't deep link directly yet
    }, [onUserClick, onClose]);

    const filteredReports = reportFilter === 'all'
        ? reports
        : reports.filter(r => r.status === reportFilter);

    const pendingReportsCount = reports.filter(r => r.status === 'pending').length;

    // ==================== GUARDS ====================
    if (currentUserProfile?.role !== 'admin') {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md">
                <div className="bg-card border border-red-500/30 p-8 rounded-3xl flex flex-col items-center">
                    <ShieldAlert size={48} className="text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-foreground">Zugriff verweigert</h2>
                    <p className="text-muted-foreground mt-2 mb-6">Dieser Bereich ist nur für Administratoren.</p>
                    <button onClick={onClose} className="px-6 py-2 bg-muted text-foreground rounded-full hover:bg-muted/80 transition">Schließen</button>
                </div>
            </div>
        );
    }

    const renderSubNavigation = () => (
        <div className="flex bg-black/30 p-1 rounded-xl mb-6 border border-white/5">
            <button
                onClick={() => setSubTab('pending')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                    subTab === 'pending'
                        ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
            >
                Offene Anfragen
            </button>
            <button
                onClick={() => setSubTab('recent')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                    subTab === 'recent'
                        ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`}
            >
                Kürzlich bearbeitet
            </button>
        </div>
    );

    // ==================== RENDER ====================
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-2xl h-[85vh] bg-card border border-border shadow-2xl flex flex-col sm:rounded-3xl animate-in slide-in-from-bottom-8">
                
                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 bg-black/20 shrink-0 border-b border-border">
                    <div className="flex items-center gap-3">
                        {currentUserProfile?.role === 'admin' && (
                            <button 
                                onClick={onMenuOpen}
                                className="p-2 -ml-2 bg-black/20 hover:bg-black/40 rounded-xl transition text-foreground hover:text-cyan-400"
                            >
                                <Menu size={22} />
                            </button>
                        )}
                        <Shield className="text-cyan-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" size={24} />
                        <h2 className="text-lg font-bold text-foreground truncate">
                            {TABS.find(t => t.id === activeTab)?.label || 'Admin Center'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition text-muted-foreground hover:text-foreground shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ==================== OVERVIEW TAB ==================== */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => setActiveTab('accounts')}
                                    className="p-5 bg-black/20 border border-border rounded-2xl text-left hover:border-cyan-500/50 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
                                            <UserCheck size={24} />
                                        </div>
                                        <span className="text-2xl font-black text-foreground">{metrics.pendingApprovals}</span>
                                    </div>
                                    <h3 className="font-bold text-foreground">Offene Freigaben</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Scouts & Trainer warten auf Verifizierung</p>
                                </button>

                                <button 
                                    onClick={() => setActiveTab('reports')}
                                    className="p-5 bg-black/20 border border-border rounded-2xl text-left hover:border-red-500/50 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:scale-110 transition-transform">
                                            <Flag size={24} />
                                        </div>
                                        <span className="text-2xl font-black text-foreground">{metrics.pendingReports}</span>
                                    </div>
                                    <h3 className="font-bold text-foreground">Meldungen</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Gemeldete Inhalte prüfen</p>
                                </button>

                                <div className="p-5 bg-black/20 border border-border rounded-2xl">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-500">
                                            <User size={24} />
                                        </div>
                                        <span className="text-2xl font-black text-foreground">{metrics.newUsers24h}</span>
                                    </div>
                                    <h3 className="font-bold text-foreground">Neue User (24h)</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Anmeldungen in den letzten 24 Stunden</p>
                                </div>

                                <button 
                                    onClick={() => setActiveTab('claims')}
                                    className="p-5 bg-black/20 border border-border rounded-2xl text-left hover:border-emerald-500/50 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                                            <Building size={24} />
                                        </div>
                                        <span className="text-2xl font-black text-foreground">{metrics.pendingClaims}</span>
                                    </div>
                                    <h3 className="font-bold text-foreground">Vereins-Claims</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Anfragen für Club-Management</p>
                                </button>
                            </div>

                            {/* Test-Notification Button */}
                            <div className="p-5 bg-black/20 border border-dashed border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                                        <Zap size={20} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground text-sm">Echtzeit-Test</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Feuert eine Benachrichtigung via Supabase Realtime — die Glocke muss sofort reagieren.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!currentUserProfile?.id) return;
                                        setIsSendingTest(true);
                                        try {
                                            await sendTestNotification(currentUserProfile.id);
                                            addToast('Test-Benachrichtigung gesendet! Sieh die Glocke oben rechts.', 'success');
                                        } catch (e) {
                                            addToast(`Fehler: ${e?.message || 'Unbekannt'}`, 'error');
                                        } finally {
                                            setIsSendingTest(false);
                                        }
                                    }}
                                    disabled={isSendingTest}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-sm rounded-xl transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isSendingTest ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                                    {isSendingTest ? 'Sende...' : 'Test-Benachrichtigung feuern'}
                                </button>
                            </div>

                        </div>
                    )}

                    {/* ==================== ACCOUNTS TAB ==================== */}
                    {activeTab === 'accounts' && (
                        <>
                            {renderSubNavigation()}
                            <h3 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-4">
                                {subTab === 'pending' ? `Ausstehende Konten-Verifizierungen (${pendingAccounts.length})` : `Kürzlich bearbeitet (${recentAccounts.length})`}
                            </h3>
                            
                            {(subTab === 'pending' ? accountsLoading : recentAccountsLoading) ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={24} className="text-cyan-500 animate-spin" />
                                </div>
                            ) : (subTab === 'pending' ? pendingAccounts : recentAccounts).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-2xl bg-black/10">
                                    <Check size={32} className="text-emerald-500 mb-3" />
                                    <p className="text-muted-foreground font-medium">
                                        {subTab === 'pending' ? 'Keine ausstehenden Konten!' : 'Keine kürzlich bearbeiteten Konten.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(subTab === 'pending' ? pendingAccounts : recentAccounts).map((account) => (
                                        <div key={account.id} className={`bg-black/20 border rounded-2xl p-4 transition-all ${subTab === 'pending' ? 'border-amber-500/20 hover:border-amber-500/40' : 'border-border hover:border-cyan-500/30'}`}>
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 overflow-hidden flex items-center justify-center shrink-0">
                                                            {account.avatar_url
                                                                ? <img src={account.avatar_url} className="w-full h-full object-cover" alt="" />
                                                                : <User size={18} className="text-amber-400" />
                                                            }
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground">{account.full_name || 'Unbekannt'}</div>
                                                            <div className="text-xs text-muted-foreground">@{account.username || '–'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
                                                            account.role === 'scout'
                                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                        }`}>
                                                            {account.role === 'scout' ? '🔍 Scout' : '🎯 Trainer'}
                                                        </span>
                                                        <span className="text-muted-foreground">{account.email || 'Keine E-Mail'}</span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {subTab === 'pending' 
                                                            ? `Registriert: ${new Date(account.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                            : `Bearbeitet: ${new Date(account.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                        }
                                                    </div>
                                                    
                                                    {subTab === 'recent' && (
                                                        <div className="mt-2">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                                account.verification_status === 'approved' 
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                            }`}>
                                                                {account.verification_status === 'approved' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                                                                {account.verification_status === 'approved' ? 'Zugestimmt' : 'Abgelehnt'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-row sm:flex-col gap-2">
                                                    {subTab === 'pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleAccountAction(account, 'approved')}
                                                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all font-bold text-sm"
                                                            >
                                                                Zulassen ✅
                                                            </button>
                                                            <button
                                                                onClick={() => handleAccountAction(account, 'rejected')}
                                                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all font-bold text-sm"
                                                            >
                                                                Ablehnen ❌
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUndoAccount(account)}
                                                            className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all font-bold text-sm"
                                                        >
                                                            <Undo size={16} /> Rückgängig
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ==================== CAREER TAB ==================== */}
                    {activeTab === 'career' && (
                        <>
                            {renderSubNavigation()}
                            <h3 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-4">
                                {subTab === 'pending' ? `Offene Karriere-Prüfungen (${careerRequests.length})` : `Kürzlich bearbeitet (${recentCareerRequests.length})`}
                            </h3>

                            {(subTab === 'pending' ? careerLoading : recentCareerLoading) ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={24} className="text-cyan-500 animate-spin" />
                                </div>
                            ) : (subTab === 'pending' ? careerRequests : recentCareerRequests).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-2xl bg-black/10">
                                    <Trophy size={32} className="text-emerald-500 mb-3" />
                                    <p className="text-muted-foreground font-medium">
                                        {subTab === 'pending' ? 'Alle Karriere-Daten sind verifiziert!' : 'Keine kürzlich bearbeiteten Karriere-Stationen.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(subTab === 'pending' ? careerRequests : recentCareerRequests).map((req) => (
                                        <div key={req.id} className={`bg-black/20 border rounded-2xl p-4 transition-all ${subTab === 'pending' ? 'border-border hover:border-cyan-500/50' : 'border-border hover:border-cyan-500/30'}`}>
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 overflow-hidden">
                                                            {req.players_master?.avatar_url 
                                                                ? <img src={req.players_master.avatar_url} className="w-full h-full object-cover" />
                                                                : <User size={20} className="text-cyan-400" />
                                                            }
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground">{req.players_master?.full_name || 'Unbekannter Spieler'}</div>
                                                            <div className="text-xs text-muted-foreground">@{req.players_master?.username || '–'}</div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/5 border border-white/5 p-3 rounded-xl space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Shield size={14} className="text-amber-400" />
                                                            <span className="font-bold text-sm text-foreground">{req.club_name}</span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground ml-6">
                                                            {req.league && `${req.league} • `}
                                                            {req.start_date ? new Date(req.start_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '?'}
                                                            {' – '}
                                                            {req.end_date ? new Date(req.end_date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : 'Heute'}
                                                        </div>
                                                    </div>

                                                    {req.proof_url && (
                                                        <a 
                                                            href={req.proof_url} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition font-bold"
                                                        >
                                                            <ExternalLink size={14} />
                                                            Beweis-Link öffnen
                                                        </a>
                                                    )}

                                                    {subTab === 'recent' && (
                                                        <div className="mt-2">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                                req.verification_status === 'approved' 
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                            }`}>
                                                                {req.verification_status === 'approved' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                                                                {req.verification_status === 'approved' ? 'Zugestimmt' : 'Abgelehnt'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                                                    {subTab === 'pending' ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handleCareerAction(req, 'approved')} 
                                                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all font-bold text-sm"
                                                            >
                                                                Bestätigen ✅
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCareerAction(req, 'rejected')} 
                                                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all font-bold text-sm"
                                                            >
                                                                Entfernen ❌
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUndoCareer(req)}
                                                            className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all font-bold text-sm"
                                                        >
                                                            <Undo size={16} /> Rückgängig
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ==================== CLAIMS TAB ==================== */}
                    {activeTab === 'claims' && (
                        <>
                            {renderSubNavigation()}
                            <h3 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-4">
                                {subTab === 'pending' ? `Offene Vereins-Claims (${claims.length})` : `Kürzlich bearbeitet (${recentClaims.length})`}
                            </h3>

                            {(subTab === 'pending' ? claimsLoading : recentClaimsLoading) ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={24} className="text-cyan-500 animate-spin" />
                                </div>
                            ) : (subTab === 'pending' ? claims : recentClaims).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-2xl bg-black/10">
                                    <Check size={32} className="text-emerald-500 mb-3" />
                                    <p className="text-muted-foreground font-medium">
                                        {subTab === 'pending' ? 'Alle Anfragen wurden abgearbeitet!' : 'Keine kürzlich bearbeiteten Vereins-Claims.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(subTab === 'pending' ? claims : recentClaims).map((claim) => (
                                        <div key={claim.id} className={`bg-black/20 border rounded-2xl p-4 transition-all ${subTab === 'pending' ? 'border-border hover:border-cyan-500/50' : 'border-border hover:border-cyan-500/30'}`}>
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                                                            <Building size={20} className="text-cyan-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground">{claim.club?.name || 'Unbekannter Verein'}</div>
                                                            <div className="text-xs text-muted-foreground">Club ID: {claim.club_id}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg">
                                                        <User size={14} className="text-slate-400" />
                                                        <span className="text-sm font-medium text-slate-300">
                                                            {claim.user?.full_name || 'Unbekannter Spieler'} <span className="text-muted-foreground text-xs">(@{claim.user?.username || '–'})</span>
                                                        </span>
                                                    </div>

                                                    {claim.proof_text && (
                                                        <div className="text-sm text-muted-foreground bg-white/5 p-3 rounded-lg border border-white/5 italic">
                                                            "{claim.proof_text}"
                                                        </div>
                                                    )}

                                                    {subTab === 'recent' && (
                                                        <div className="mt-2">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                                claim.status === 'approved' 
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                            }`}>
                                                                {claim.status === 'approved' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                                                                {claim.status === 'approved' ? 'Zugestimmt' : 'Abgelehnt'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-row sm:flex-col gap-2">
                                                    {subTab === 'pending' ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handleClaimAction(claim, 'approved')} 
                                                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all font-bold text-sm"
                                                            >
                                                                Zulassen ✅
                                                            </button>
                                                            <button 
                                                                onClick={() => handleClaimAction(claim, 'rejected')} 
                                                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all font-bold text-sm"
                                                            >
                                                                Ablehnen ❌
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUndoClaim(claim)}
                                                            className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all font-bold text-sm"
                                                        >
                                                            <Undo size={16} /> Rückgängig
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ==================== REPORTS TAB ==================== */}
                    {activeTab === 'reports' && (
                        <>
                            {/* Filter Pills */}
                            <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
                                {[
                                    { id: 'all', label: 'Alle', count: reports.length },
                                    { id: 'pending', label: 'Ausstehend', count: reports.filter(r => r.status === 'pending').length },
                                    { id: 'in_review', label: 'In Bearbeitung', count: reports.filter(r => r.status === 'in_review').length },
                                    { id: 'resolved', label: 'Erledigt', count: reports.filter(r => r.status === 'resolved').length },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setReportFilter(f.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                                            reportFilter === f.id
                                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                                : 'bg-black/20 text-muted-foreground border border-border hover:bg-black/30'
                                        }`}
                                    >
                                        {f.label}
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                            reportFilter === f.id ? 'bg-cyan-500/30' : 'bg-white/5'
                                        }`}>{f.count}</span>
                                    </button>
                                ))}
                            </div>

                            {reportsLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={24} className="text-cyan-500 animate-spin" />
                                </div>
                            ) : filteredReports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-2xl bg-black/10">
                                    <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
                                    <p className="text-muted-foreground font-medium">
                                        {reportFilter === 'all' ? 'Keine Meldungen vorhanden.' : 'Keine Meldungen mit diesem Status.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredReports.map((report) => {
                                        const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                                        const StatusIcon = statusConf.icon;
                                        const typeLabel = TARGET_TYPE_LABELS[report.target_type] || report.target_type || 'Unbekannt';
                                        const isLinkable = report.target_type === 'profile' || report.target_type === 'user';

                                        return (
                                            <div
                                                key={report.id}
                                                className={`bg-black/20 border rounded-2xl p-4 transition-all hover:border-cyan-500/30 ${
                                                    report.status === 'pending'
                                                        ? 'border-amber-500/30'
                                                        : report.status === 'in_review'
                                                            ? 'border-blue-500/30'
                                                            : 'border-border'
                                                }`}
                                            >
                                                {/* Top Row: Reporter + Status Badge */}
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                                                            <Flag size={16} className="text-red-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-foreground text-sm truncate">
                                                                {report.reporter?.full_name || 'Unbekannt'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {report.reporter?.username ? `@${report.reporter.username}` : 'Gelöschter Account'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border
                                                        ${statusConf.color === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : ''}
                                                        ${statusConf.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : ''}
                                                        ${statusConf.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : ''}
                                                    `}>
                                                        <StatusIcon size={12} />
                                                        {statusConf.label}
                                                    </span>
                                                </div>

                                                {/* Details */}
                                                <div className="space-y-2 mb-3">
                                                    <div className="flex items-center gap-3 text-xs">
                                                        <span className="text-muted-foreground">Typ:</span>
                                                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md font-bold text-foreground/80">{typeLabel}</span>
                                                        {isLinkable && (
                                                            <button
                                                                onClick={() => handleDeepLink(report.target_id, report.target_type)}
                                                                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition font-bold"
                                                            >
                                                                <ExternalLink size={12} />
                                                                {report.targetProfile?.full_name ? `@${report.targetProfile.username || report.targetProfile.full_name}` : 'Profil ansehen'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-foreground/80 bg-white/5 p-3 rounded-lg border border-white/5 italic leading-relaxed">
                                                        &ldquo;{report.reason}&rdquo;
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {new Date(report.created_at).toLocaleDateString('de-DE', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                {report.status !== 'resolved' && (
                                                    <div className="flex flex-col gap-2 pt-3 border-t border-border">
                                                        <div className="flex gap-2">
                                                            {report.status !== 'in_review' && (
                                                                <button
                                                                    onClick={() => handleReportStatusUpdate(report.id, 'in_review')}
                                                                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all font-bold text-xs"
                                                                >
                                                                    <Eye size={14} />
                                                                    In Bearbeitung
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleReportAction(report, 'dismiss')}
                                                                className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-zinc-500/10 text-muted-foreground border border-zinc-500/30 rounded-xl hover:bg-zinc-500/20 transition-all font-bold text-xs"
                                                            >
                                                                <XCircle size={14} />
                                                                Meldung verwerfen
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => handleReportAction(report, 'delete')}
                                                            className="w-full flex justify-center items-center gap-1.5 px-3 py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl hover:bg-red-500/20 transition-all font-bold text-xs"
                                                        >
                                                            <Trash2 size={14} />
                                                            Inhalt löschen & User verwarnen
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 border border-border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                <AlertTriangle className="text-amber-500" size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground tracking-tight">{confirmAction.title}</h3>
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{confirmAction.message}</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setConfirmAction(null)}
                                    className="flex-1 py-3 px-4 rounded-xl border border-border font-bold text-sm hover:bg-black/5 dark:hover:bg-white/5 transition"
                                >
                                    Abbrechen
                                </button>
                                <button 
                                    onClick={confirmAction.onConfirm}
                                    className={`flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition active:scale-95 ${confirmAction.confirmClass}`}
                                >
                                    {confirmAction.confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
