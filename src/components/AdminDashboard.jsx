import React, { useState, useEffect } from 'react';
import { Database, ShieldAlert, Trash2, X, Users, CheckCircle, XCircle, Loader2, Mail, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';

const ROLE_LABELS = {
    scout: { label: 'Scout', emoji: '🔍', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    coach: { label: 'Trainer', emoji: '🎯', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

export const AdminDashboard = ({ session }) => {
    const [tab, setTab] = useState('accounts');
    const [pendingClubs, setPendingClubs] = useState([]);
    const [reports, setReports] = useState([]);
    const [pendingAccounts, setPendingAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // ID of account being acted on
    const [editingClub, setEditingClub] = useState(null);
    const [editForm, setEditForm] = useState({ logo_url: '', league: '' });
    const { addToast } = useToast();

    // --- Data Fetching ---

    const fetchPending = async () => {
        try {
            const { data } = await supabase.from('clubs').select('*').eq('is_verified', false);
            setPendingClubs(data || []);
        } catch (e) {
            addToast("Fehler beim Laden der Vereine.", 'error');
        }
    };

    const fetchReports = async () => {
        try {
            const { data } = await supabase.from('reports').select('*').eq('status', 'pending');
            setReports(data || []);
        } catch (e) {
            addToast("Fehler beim Laden der Meldungen.", 'error');
        }
    };

    const fetchPendingAccounts = async () => {
        setAccountsLoading(true);
        try {
            const { data, error } = await supabase.from('players_master')
                .select('id, full_name, username, role, verification_status, email, created_at, avatar_url')
                .eq('verification_status', 'pending')
                .not('role', 'in', '("player","admin")')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPendingAccounts(data || []);
        } catch (e) {
            console.error('Fetch pending accounts error:', e);
            addToast("Fehler beim Laden der Accounts.", 'error');
        } finally {
            setAccountsLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
        fetchReports();
        fetchPendingAccounts();
    }, []);

    // --- Club Handlers ---

    const handleVerify = async (club) => {
        if (!editForm.logo_url || !editForm.league) {
            addToast("Bitte Logo und Liga ausfüllen.", 'error');
            return;
        }
        try {
            const { error } = await supabase.from('clubs').update({ is_verified: true, logo_url: editForm.logo_url, league: editForm.league }).eq('id', club.id);
            if (error) throw error;
            setEditingClub(null);
            addToast(`${club.name} verifiziert! ✅`, 'success');
            fetchPending();
        } catch (e) {
            addToast(e.message, 'error');
        }
    };

    const handleDelete = async (clubId) => {
        try {
            const { error } = await supabase.from('clubs').delete().eq('id', clubId);
            if (error) throw error;
            addToast("Verein gelöscht.", 'success');
            fetchPending();
        } catch (e) {
            addToast("Fehler beim Löschen.", 'error');
        }
    };

    // --- Report Handlers ---

    const handleResolveReport = async (id) => {
        try {
            const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
            if (error) throw error;
            addToast("Meldung als erledigt markiert.", 'success');
            fetchReports();
        } catch (e) {
            addToast(e.message, 'error');
        }
    };

    // --- Account Verification Handlers ---

    const handleApproveAccount = async (account) => {
        setActionLoading(account.id);
        try {
            const { error } = await supabase.from('players_master')
                .update({ verification_status: 'approved' })
                .eq('id', account.id);
            if (error) throw error;
            addToast(`${account.full_name || account.username} als ${ROLE_LABELS[account.role]?.label || account.role} freigegeben! ✅`, 'success');
            fetchPendingAccounts();
        } catch (e) {
            console.error('Approve error:', e);
            addToast(e.message || 'Fehler beim Freischalten.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectAccount = async (account) => {
        setActionLoading(account.id);
        try {
            const { error } = await supabase.from('players_master')
                .update({ verification_status: 'rejected' })
                .eq('id', account.id);
            if (error) throw error;
            addToast(`${account.full_name || account.username} wurde abgelehnt.`, 'info');
            fetchPendingAccounts();
        } catch (e) {
            console.error('Reject error:', e);
            addToast(e.message || 'Fehler beim Ablehnen.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // --- Tab Counts ---
    const tabCounts = {
        accounts: pendingAccounts.length,
        clubs: pendingClubs.length,
        reports: reports.length,
    };

    return (
        <div className="pb-32 pt-8 px-4 max-w-md mx-auto min-h-screen">
            <h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3"><Database className="text-blue-500" /> Admin</h2>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-xl border border-border">
                {[
                    { key: 'accounts', label: 'Accounts', icon: Users },
                    { key: 'clubs', label: 'Vereine', icon: ShieldAlert },
                    { key: 'reports', label: 'Meldungen', icon: ShieldAlert },
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex-1 text-xs font-bold py-2.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                            tab === key
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {label}
                        {tabCounts[key] > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                tab === key ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}>{tabCounts[key]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ============= ACCOUNTS TAB ============= */}
            {tab === 'accounts' && (
                <div className="space-y-4">
                    {accountsLoading ? (
                        <div className="text-center py-16">
                            <Loader2 className="animate-spin text-blue-500 mx-auto mb-3" size={28} />
                            <p className="text-zinc-500 text-sm">Lade ausstehende Accounts...</p>
                        </div>
                    ) : pendingAccounts.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                <CheckCircle size={28} className="text-emerald-400" />
                            </div>
                            <p className="text-zinc-500 text-sm">Keine ausstehenden Accounts. Alles erledigt! 🧹</p>
                        </div>
                    ) : (
                        pendingAccounts.map((account) => {
                            const roleInfo = ROLE_LABELS[account.role] || { label: account.role, emoji: '❓', color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' };
                            const isActing = actionLoading === account.id;

                            return (
                                <div key={account.id} className={`${cardStyle} p-4 border-l-4 ${account.role === 'scout' ? 'border-l-amber-500/50' : 'border-l-emerald-500/50'}`}>
                                    {/* Header */}
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${roleInfo.bg} border ${roleInfo.border}`}>
                                            {account.avatar_url
                                                ? <img src={account.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                                                : roleInfo.emoji
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm truncate">{account.full_name || '(Kein Name)'}</p>
                                            {account.username && (
                                                <p className="text-cyan-500 text-xs font-medium">@{account.username}</p>
                                            )}
                                            {account.email && (
                                                <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1 truncate">
                                                    <Mail size={10} /> {account.email}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${roleInfo.bg} ${roleInfo.color} border ${roleInfo.border}`}>
                                            {roleInfo.label}
                                        </span>
                                    </div>

                                    {/* Meta */}
                                    <div className="text-xs text-zinc-600 mb-4 flex items-center gap-3">
                                        <span>Registriert: {new Date(account.created_at).toLocaleDateString('de-DE')}</span>
                                        <span className="text-zinc-700">•</span>
                                        <span className="font-mono text-zinc-600">ID: {account.id.slice(0, 8)}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApproveAccount(account)}
                                            disabled={isActing}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-1.5"
                                        >
                                            {isActing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                            Zulassen
                                        </button>
                                        <button
                                            onClick={() => handleRejectAccount(account)}
                                            disabled={isActing}
                                            className="flex-1 bg-rose-900/30 hover:bg-rose-900/50 disabled:opacity-50 text-rose-400 text-xs font-bold py-3 rounded-xl border border-rose-500/20 transition flex items-center justify-center gap-1.5"
                                        >
                                            {isActing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                            Ablehnen
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ============= CLUBS TAB ============= */}
            {tab === 'clubs' && (
                <div className="space-y-4">
                    {pendingClubs.length === 0 && <div className="text-zinc-500 text-center py-10">Keine offenen Vereine. Gute Arbeit! 🧹</div>}
                    {pendingClubs.map(c => (
                        <div key={c.id} className={`p-4 ${cardStyle}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="font-bold text-white">{c.name}</h3><span className="text-xs text-zinc-500 font-mono">ID: {c.id.slice(0, 8)}</span></div>
                                <ShieldAlert className="text-amber-500" size={20} />
                            </div>
                            {editingClub === c.id ? (
                                <div className="space-y-3">
                                    <input placeholder="Logo URL" value={editForm.logo_url} onChange={e => setEditForm({ ...editForm, logo_url: e.target.value })} className={inputStyle} />
                                    <select value={editForm.league} onChange={e => setEditForm({ ...editForm, league: e.target.value })} className={inputStyle}>
                                        <option value="">Liga wählen...</option>
                                        <option>1. Bundesliga</option><option>2. Bundesliga</option><option>3. Liga</option>
                                        <option>Regionalliga</option><option>Oberliga</option><option>Verbandsliga</option>
                                        <option>Landesliga</option><option>Bezirksliga</option><option>Kreisliga</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleVerify(c)} className="bg-green-600 text-white text-xs font-bold px-3 py-3 rounded-xl flex-1 flex items-center justify-center gap-1">Verifizieren</button>
                                        <button onClick={() => setEditingClub(null)} className="bg-zinc-700 text-white text-xs px-3 py-3 rounded-xl">Abbruch</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingClub(c.id); setEditForm({ logo_url: c.logo_url || '', league: c.league || '' }); }} className="bg-blue-600 text-white text-xs font-bold px-4 py-3 rounded-xl flex-1">Bearbeiten</button>
                                    <button onClick={() => handleDelete(c.id)} className="bg-red-900/30 text-red-500 text-xs font-bold px-3 py-3 rounded-xl border border-red-500/20"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ============= REPORTS TAB ============= */}
            {tab === 'reports' && (
                <div className="space-y-4">
                    {reports.length === 0 && <div className="text-zinc-500 text-center py-10">Keine offenen Meldungen. 🧹</div>}
                    {reports.map(r => (
                        <div key={r.id} className={`p-4 border-red-900/30 ${cardStyle}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-red-400 text-xs font-bold uppercase bg-red-900/20 px-2 py-1 rounded-md border border-red-500/20">{r.reason}</span>
                                <span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-white text-sm mb-4">Gemeldetes Objekt: <span className="font-mono text-zinc-400 bg-black/30 px-1 rounded">{r.target_type} {r.target_id.slice(0, 6)}...</span></p>
                            <div className="flex gap-2">
                                <button onClick={() => handleResolveReport(r.id)} className="flex-1 bg-zinc-800 text-white text-xs font-bold py-3 rounded-xl hover:bg-zinc-700">Als erledigt markieren</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
