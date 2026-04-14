import React, { useEffect, useState } from 'react';
import { ShieldAlert, X, Check, XCircle, Search, Shield, Building, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';

export const AdminDashboard = ({ onClose }) => {
    const { currentUserProfile } = useUser();
    const { addToast } = useToast();
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUserProfile?.role === 'admin') {
            loadClaims();
        } else {
            setLoading(false);
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
            setLoading(false);
        }
    };

    const handleAction = async (claim, action) => {
        try {
            if (action === 'approved') {
                // 1. Update claim status
                const { error: claimError } = await supabase
                    .from('club_claims')
                    .update({ status: 'approved' })
                    .eq('id', claim.id);
                if (claimError) throw claimError;

                // 2. Update club verification & ownership
                const { error: clubError } = await supabase
                    .from('clubs')
                    .update({ is_verified: true, created_by: claim.user_id })
                    .eq('id', claim.club_id);
                if (clubError) throw clubError;

                addToast('Anfrage zugelassen & Verein verifiziert ✅', 'success');
            } else if (action === 'rejected') {
                // Update claim status
                const { error } = await supabase
                    .from('club_claims')
                    .update({ status: 'rejected' })
                    .eq('id', claim.id);
                if (error) throw error;

                addToast('Anfrage abgelehnt ❌', 'success');
            }

            // Optimistic UI update
            setClaims((prev) => prev.filter((c) => c.id !== claim.id));
        } catch (error) {
            console.error(`Error processing action: ${action}`, error);
            addToast(`Fehler bei Aktion: ${error.message}`, 'error');
        }
    };

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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-4">Offene Verifizierungsanfragen ({claims.length})</h3>

                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <span className="text-muted-foreground animate-pulse">Lade Anfragen...</span>
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
                                        
                                        {/* Info */}
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

                                        {/* Actions */}
                                        <div className="flex flex-row sm:flex-col gap-2">
                                            <button 
                                                onClick={() => handleAction(claim, 'approved')} 
                                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all font-bold text-sm"
                                            >
                                                Zulassen ✅
                                            </button>
                                            <button 
                                                onClick={() => handleAction(claim, 'rejected')} 
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
                </div>
            </div>
        </div>
    );
};
