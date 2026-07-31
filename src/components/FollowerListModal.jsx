import React, { useState, useEffect } from 'react';
import { X, User, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';
import { EmptyState } from './EmptyState';
import { SafeErrorBoundary } from './SafeErrorBoundary';

export const FollowerListModalContent = ({ userId, onClose, onUserClick }) => {
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchFollowers = async () => {
            if (!userId) {
                if (isMounted) setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
                if (error) throw error;
                if (data?.length) {
                    const ids = data.map(f => f.follower_id).filter(Boolean);
                    if (ids.length > 0) {
                        const { data: users, error: userError } = await supabase.from('players_master').select('*, clubs(*)').in('id', ids);
                        if (userError) throw userError;
                        if (isMounted) setFollowers(users || []);
                    } else {
                        if (isMounted) setFollowers([]);
                    }
                } else {
                    if (isMounted) setFollowers([]);
                }
            } catch (e) {
                console.error("Failed loading followers:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchFollowers();

        return () => {
            isMounted = false;
        };
    }, [userId]);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md ${cardStyle} h-[70vh] p-4 flex flex-col`}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                        <Users size={18} className="text-blue-500" /> Follower
                    </h2>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition"><X size={20} /></button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(70vh-60px)]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="animate-spin text-blue-500" size={28} />
                            <span className="text-xs text-muted-foreground font-medium">Lade Follower...</span>
                        </div>
                    ) : (followers || []).length === 0 ? (
                        <EmptyState icon={Users} title="Noch keine Follower" description="Teile dein Profil und zeig was du kannst!" variant="subtle" />
                    ) : (
                        (followers || []).map(p => (
                            <div 
                                key={p?.id || Math.random()} 
                                onClick={() => { 
                                    onClose?.(); 
                                    if (p && onUserClick) onUserClick(p); 
                                }} 
                                className="flex items-center gap-3 p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl cursor-pointer transition"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 border border-border overflow-hidden shrink-0">
                                    {p?.avatar_url ? (
                                        <img src={p.avatar_url} alt={p?.full_name || 'User'} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src="/cavios-icon.png" alt="CAVIOS" className="w-full h-full object-contain p-2 opacity-60" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-foreground font-bold text-sm truncate">{p?.full_name || p?.username || 'Unbekannt'}</div>
                                    {!(p?.email === 'kontakt@cavios.de' || p?.is_official || p?.role === 'system') && (
                                        <div className="text-muted-foreground text-xs truncate">{p?.clubs?.name || 'Kein Verein'}</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export const FollowerListModal = (props) => (
    <SafeErrorBoundary>
        <FollowerListModalContent {...props} />
    </SafeErrorBoundary>
);
