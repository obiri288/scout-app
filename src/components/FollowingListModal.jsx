import React, { useState, useEffect } from 'react';
import { X, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';
import { EmptyState } from './EmptyState';

export const FollowingListModal = ({ userId, onClose, onUserClick }) => {
    const [following, setFollowing] = useState([]);
    
    useEffect(() => {
        const fetchFollowing = async () => {
            try {
                // Fetch IDs of users this user is following
                const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
                if (data?.length) {
                    const ids = data.map(f => f.following_id);
                    // Fetch profile details for those IDs
                    const { data: users } = await supabase.from('players_master').select('*, clubs(*)').in('id', ids);
                    setFollowing(users || []);
                }
            } catch (e) {
                console.error("Failed loading following:", e);
            }
        };
        fetchFollowing();
    }, [userId]);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md ${cardStyle} h-[70vh] p-4`}>
                <div className="flex justify-between mb-4">
                    <h2 className="font-bold text-foreground">Folgt</h2>
                    <button onClick={onClose}><X className="text-muted-foreground" /></button>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-[calc(70vh-60px)]">
                    {following.map(p => (
                        <div key={p.id} onClick={() => { onClose(); onUserClick(p); }} className="flex gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer transition">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 border border-border overflow-hidden">
                                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <User className="m-2 text-muted-foreground" />}
                            </div>
                            <div>
                                <div className="text-foreground font-bold">{p.full_name || p.username}</div>
                                <div className="text-muted-foreground text-xs">{p.clubs?.name}</div>
                            </div>
                        </div>
                    ))}
                    {following.length === 0 && (
                        <EmptyState 
                            icon={Users} 
                            title="Folgt niemandem" 
                            description="Entdecke neue Spieler und vereine dich mit deinem Team!" 
                            variant="subtle" 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
