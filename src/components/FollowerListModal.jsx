import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';

export const FollowerListModal = ({ userId, onClose, onUserClick }) => {
    const [followers, setFollowers] = useState([]);
    useEffect(() => {
        const f = async () => {
            try {
                const { data } = await supabase.from('follows').select('follower_id').eq('following_id', userId);
                if (data?.length) {
                    const ids = data.map(f => f.follower_id);
                    const { data: u } = await supabase.from('players_master').select('*, clubs(*)').in('user_id', ids);
                    setFollowers(u || []);
                }
            } catch (e) {
                console.error("Failed loading followers:", e);
            }
        };
        f();
    }, [userId]);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md ${cardStyle} h-[70vh] p-4`}>
                <div className="flex justify-between mb-4">
                    <h2 className="font-bold text-white">Follower</h2>
                    <button onClick={onClose}><X className="text-zinc-400" /></button>
                </div>
                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
                    {followers.map(p => (
                        <div key={p.id} onClick={() => { onClose(); onUserClick(p); }} className="flex gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                                {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : <User className="m-2 text-zinc-500" />}
                            </div>
                            <div>
                                <div className="text-white font-bold">{p.full_name}</div>
                                <div className="text-zinc-500 text-xs">{p.clubs?.name}</div>
                            </div>
                        </div>
                    ))}
                    {followers.length === 0 && <p className="text-zinc-500 text-center text-sm py-8">Noch keine Follower.</p>}
                </div>
            </div>
        </div>
    );
};
