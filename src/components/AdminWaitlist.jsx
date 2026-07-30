import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Loader2, Mail, CheckCircle, Clock, Send, ShieldAlert, Key } from 'lucide-react';
import { btnPrimary } from '../lib/styles';

const ADMIN_EMAILS = ['bordomobiri@gmail.com', 'kontakt@cavios.de'];

export const AdminWaitlist = () => {
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [adminSecret, setAdminSecret] = useState('');
    const [inviteLoadingId, setInviteLoadingId] = useState(null);
    const { addToast } = useToast();

    // 1. Auth & Role Guard
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session) {
                    window.location.replace('/');
                    return;
                }

                const email = (session.user.email || '').toLowerCase();
                let isAllowed = ADMIN_EMAILS.includes(email);

                if (!isAllowed) {
                    const { data: profile } = await supabase
                        .from('players_master')
                        .select('role')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (profile?.role === 'admin') {
                        isAllowed = true;
                    }
                }

                if (!isAllowed) {
                    window.location.replace('/');
                    return;
                }

                setAuthLoading(false);
                fetchWaitlist();
            } catch (err) {
                console.error('Auth check failed:', err);
                window.location.replace('/');
            }
        };

        checkAuth();
    }, []);

    // 2. Fetch Waitlist Data
    const fetchWaitlist = async () => {
        setDataLoading(true);
        try {
            const { data, error } = await supabase
                .from('waitlist')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('Error fetching waitlist:', error);
            addToast('Fehler beim Laden der Warteliste.', 'error');
        } finally {
            setDataLoading(false);
        }
    };

    // 3. Invite User Logic
    const handleInvite = async (id, email) => {
        setInviteLoadingId(id);
        try {
            // First, update waitlist database directly to 'approved'
            const { error: dbError } = await supabase
                .from('waitlist')
                .update({ status: 'approved' })
                .eq('id', id);

            if (dbError) throw dbError;

            // Update local state immediately
            setEntries(prev => prev.map(entry =>
                entry.id === id ? { ...entry, status: 'approved' } : entry
            ));

            // Next, if adminSecret is provided, invoke edge function for email invitation
            if (adminSecret) {
                try {
                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-invite-user`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${adminSecret}`
                        },
                        body: JSON.stringify({ email })
                    });
                    const result = await response.json();
                    if (!response.ok) {
                        console.warn('Edge function email warning:', result.error);
                    }
                } catch (edgeErr) {
                    console.warn('Edge function call failed:', edgeErr);
                }
            }

            addToast(`Zugang für ${email} erfolgreich freigeschaltet!`, 'success');
        } catch (error) {
            console.error('Invite Error:', error);
            addToast(error.message || 'Fehler beim Freischalten', 'error');
        } finally {
            setInviteLoadingId(null);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-cyan-500 w-12 h-12 mb-4" />
                <p className="text-muted-foreground font-medium animate-pulse">Sicherheitsprüfung läuft...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-foreground p-6 md:p-12 font-sans overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <ShieldAlert className="text-cyan-400" /> CAVIOS Waitlist Admin
                        </h1>
                        <p className="text-muted-foreground mt-1">Verwalte die Closed Beta Warteliste und lade Nutzer ein.</p>
                    </div>

                    {/* Secret Input */}
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                            <Key size={16} />
                        </div>
                        <input
                            type="password"
                            placeholder="Admin Secret"
                            value={adminSecret}
                            onChange={(e) => setAdminSecret(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none text-white transition-all placeholder:text-muted-foreground/50"
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-4 font-semibold text-muted-foreground text-sm tracking-wider uppercase">E-Mail</th>
                                    <th className="p-4 font-semibold text-muted-foreground text-sm tracking-wider uppercase">Datum</th>
                                    <th className="p-4 font-semibold text-muted-foreground text-sm tracking-wider uppercase">Status</th>
                                    <th className="p-4 font-semibold text-muted-foreground text-sm tracking-wider uppercase text-right">Aktion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2" />
                                            Lade Einträge...
                                        </td>
                                    </tr>
                                ) : entries.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-muted-foreground">
                                            Keine Einträge in der Warteliste gefunden.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-medium text-white flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                                    <Mail size={14} />
                                                </div>
                                                {entry.email}
                                            </td>
                                            <td className="p-4 text-muted-foreground text-sm">
                                                {new Date(entry.created_at).toLocaleDateString('de-DE', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="p-4">
                                                {entry.status === 'invited' || entry.status === 'approved' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
                                                        <CheckCircle size={12} /> Eingeladen
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                                                        <Clock size={12} /> Ausstehend
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {(entry.status === 'pending' || !entry.status) && (
                                                    <button
                                                        onClick={() => handleInvite(entry.id, entry.email)}
                                                        disabled={inviteLoadingId === entry.id}
                                                        className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white font-bold py-1.5 px-4 rounded-lg transition-colors text-sm shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                                                    >
                                                        {inviteLoadingId === entry.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Send size={14} />
                                                        )}
                                                        Einladen
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
