import React, { useState, useEffect } from 'react';
import { Mail, Bell, User, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle, glassHeader } from '../lib/styles';
import { GuestFallback } from './GuestFallback';

export const InboxScreen = ({ session, onSelectChat, onUserClick, onLoginReq }) => {
    const [subTab, setSubTab] = useState('notifications');
    const [notis, setNotis] = useState([]);
    const [chats, setChats] = useState([]);

    if (!session) return <div className="pt-20"><GuestFallback icon={Mail} title="Posteingang" text="Melde dich an, um mit Scouts und anderen Spielern zu chatten." onLogin={onLoginReq} /></div>;

    useEffect(() => {
        if (subTab === 'notifications') {
            supabase.from('notifications')
                .select('*, actor:players_master!actor_id(full_name, avatar_url)')
                .order('created_at', { ascending: false })
                .limit(20)
                .then(({ data }) => setNotis(data || []));
        } else if (subTab === 'messages' && session?.user?.id) {
            (async () => {
                try {
                    const { data } = await supabase.from('direct_messages')
                        .select('*')
                        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
                        .order('created_at', { ascending: false })
                        .limit(100);

                    const map = new Map();
                    (data || []).forEach(m => {
                        const pid = m.sender_id === session.user.id ? m.receiver_id : m.sender_id;
                        if (!map.has(pid)) map.set(pid, m);
                    });

                    if (map.size > 0) {
                        const { data: users } = await supabase.from('players_master').select('*').in('user_id', [...map.keys()]);
                        setChats((users || []).map(u => ({
                            ...u,
                            lastMsg: map.get(u.user_id)?.content,
                            time: map.get(u.user_id)?.created_at
                        })).sort((a, b) => new Date(b.time) - new Date(a.time)));
                    }
                } catch (e) {
                    console.error("Failed to load chats:", e);
                }
            })();
        }
    }, [subTab, session]);

    return (
        <div className="pb-24 max-w-md mx-auto min-h-screen bg-black">
            <div className={glassHeader}><h2 className="text-2xl font-black text-white">Inbox</h2></div>
            <div className="px-4 mt-4">
                <div className="flex bg-zinc-900/50 rounded-xl p-1 mb-6 border border-white/5 relative">
                    <button onClick={() => setSubTab('notifications')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab === 'notifications' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Mitteilungen</button>
                    <button onClick={() => setSubTab('messages')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab === 'messages' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Nachrichten</button>
                </div>
                <div className="space-y-3">
                    {subTab === 'notifications' && (notis.length > 0 ? notis.map(n => (
                        <div key={n.id} className={`flex items-start gap-4 p-4 ${cardStyle}`}>
                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10 shrink-0 mt-1">{n.actor?.avatar_url ? <img src={n.actor.avatar_url} className="w-full h-full object-cover" /> : <User size={16} className="text-zinc-500 m-2.5" />}</div>
                            <div className="flex-1 text-sm text-white pt-1"><span className="font-bold">{n.actor?.full_name || "Jemand"}</span> <span className="text-zinc-400">{n.type === 'like' ? 'hat dein Video geliked.' : n.type === 'follow' ? 'folgt dir jetzt.' : 'hat kommentiert.'}</span></div>
                            {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>}
                        </div>
                    )) : <div className="text-center text-zinc-500 py-20 flex flex-col items-center"><Bell size={40} className="mb-4 opacity-20" /><p>Alles ruhig hier.</p></div>)}
                    {subTab === 'messages' && (chats.length > 0 ? chats.map(c => (
                        <div key={c.id} onClick={() => onSelectChat(c)} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition ${cardStyle}`}>
                            <div onClick={(e) => { e.stopPropagation(); onUserClick(c); }} className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition border border-white/10">{c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <User size={24} className="text-zinc-500" />}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1"><h4 className="text-base font-bold text-white truncate">{c.full_name}</h4><span className="text-[10px] text-zinc-500">{new Date(c.time).toLocaleDateString()}</span></div>
                                <p className="text-sm text-zinc-400 truncate">{c.lastMsg}</p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-600" />
                        </div>
                    )) : <div className="text-center text-zinc-500 py-20 flex flex-col items-center"><Mail size={40} className="mb-4 opacity-20" /><p>Keine Chats vorhanden.</p></div>)}
                </div>
            </div>
        </div>
    );
};
