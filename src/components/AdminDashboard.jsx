import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, X, Check, XCircle, Search, Shield, Building, User, Flag, Eye, Clock, CheckCircle2, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

const TABS = [
    { id: 'claims', label: 'Verifizierungen', icon: Building },
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

export const AdminDashboard = ({ onClose, onUserClick }) => {
    const { currentUserProfile } = useUser();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('claims');

    // --- Claims State ---
    const [claims, setClaims] = useState([]);
    const [claimsLoading, setClaimsLoading] = useState(true);

    // --- Reports State ---
    const [reports, setReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [reportFilter, setReportFilter] = useState('all'); // 'all' | 'pending' | 'in_review' | 'resolved'

    // ==================== CLAIMS ====================
    useEffect(() => {
        if (currentUserProfile?.role === 'admin') {
            loadClaims();
            loadReports();
        } else {
            setClaimsLoading(false);
            setReportsLoading(false);
        }
    }, [currentUserProfile]);

    const loadClaims = async () => {
        try {
            const { data, error } = await supabase
                .from('club_claims')
                .select('*, club:clubs(name), user:players_master(full_name, username)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setClaims(data || []);
        } catch (error) {
            console.error('Error loading claims:', error);
            addToast('Fehler beim Laden der Anfragen', 'error');
        } finally {
            setClaimsLoading(false);
        }
    };

    const handleClaimAction = async (claim, action) => {
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

            setClaims((prev) => prev.filter((c) => c.id !== claim.id));
        } catch (error) {
            console.error(`Error processing action: ${action}`, error);
            addToast(`Fehler bei Aktion: ${error.message}`, 'error');
        }
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

            // Batch-resolve reporter profiles via user_id
            const reporterIds = [...new Set(reportsData.map(r => r.reporter_id).filter(Boolean))];
            let reporterMap = {};

            if (reporterIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('players_master')
                    .select('user_id, full_name, username, avatar_url')
                    .in('user_id', reporterIds);

                if (profiles) {
                    profiles.forEach(p => { reporterMap[p.user_id] = p; });
                }
            }

            // Attach reporter info to each report
            const enriched = reportsData.map(r => ({
                ...r,
                reporter: reporterMap[r.reporter_id] || null,
            }));

            setReports(enriched);
        } catch (error) {
            console.error('Error loading reports:', error);
            addToast('Fehler beim Laden der Meldungen', 'error');
        } finally {
            setReportsLoading(false);
        }
    };

    const handleReportStatusUpdate = async (reportId, newStatus) => {
        try {
            const { error } = await supabase
                .from('reports')
                .update({ status: newStatus })
                .eq('id', reportId);

            if (error) throw error;

            // Optimistic update
            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, status: newStatus } : r
            ));

            const label = STATUS_CONFIG[newStatus]?.label || newStatus;
            addToast(`Status geändert → ${label}`, 'success');
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

    // ==================== RENDER ====================
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-2xl h-[85vh] bg-card border border-border shadow-2xl flex flex-col sm:rounded-3xl animate-in slide-in-from-bottom-8">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-border bg-black/20">
                    <div className="flex items-center gap-3">
                        <Shield className="text-cyan-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" size={28} />
                        <h2 className="text-xl font-bold text-foreground">Admin Control Center</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-border px-4 bg-black/10">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all relative ${
                                activeTab === tab.id
                                    ? 'text-cyan-400'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {tab.id === 'reports' && pendingReportsCount > 0 && (
                                <span className="ml-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                    {pendingReportsCount}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ==================== CLAIMS TAB ==================== */}
                    {activeTab === 'claims' && (
                        <>
                            <h3 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-4">Offene Verifizierungsanfragen ({claims.length})</h3>

                            {claimsLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={24} className="text-cyan-500 animate-spin" />
                                </div>
                            ) : claims.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-2xl bg-black/10">
                                    <Check size={32} className="text-emerald-500 mb-3" />
                                    <p className="text-muted-foreground font-medium">Alle Anfragen wurden abgearbeitet!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {claims.map((claim) => (
                                        <div key={claim.id} className="bg-black/20 border border-border rounded-2xl p-4 transition-all hover:border-cyan-500/50">
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
                                                            {claim.user?.full_name} <span className="text-muted-foreground text-xs">(@{claim.user?.username})</span>
                                                        </span>
                                                    </div>

                                                    {claim.proof_text && (
                                                        <div className="text-sm text-muted-foreground bg-white/5 p-3 rounded-lg border border-white/5 italic">
                                                            "{claim.proof_text}"
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-row sm:flex-col gap-2">
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
                                                                Profil ansehen
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-foreground/80 bg-white/5 p-3 rounded-lg border border-white/5 italic leading-relaxed">
                                                        "{report.reason}"
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
                                                    <div className="flex gap-2 pt-2 border-t border-border">
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
                                                            onClick={() => handleReportStatusUpdate(report.id, 'resolved')}
                                                            className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all font-bold text-xs"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                            Erledigt
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
        </div>
    );
};
