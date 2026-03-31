import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Send, Check, CheckCheck, MoreVertical, Flag, ShieldOff } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export const ChatWindow = ({ partner, session, onClose, onUserClick, onReport, onBlock }) => {
    const [messages, setMessages] = useState([]);
    const [txt, setTxt] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const endRef = useRef(null);
    const { addToast } = useToast();

    // Mark all unread messages from partner as read
    const markAsRead = async (msgs) => {
        const unread = (msgs || []).filter(m =>
            m.sender_id === partner.user_id &&
            m.receiver_id === session.user.id &&
            !m.is_read
        );
        if (unread.length === 0) return;

        const ids = unread.map(m => m.id).filter(id => !String(id).startsWith('temp-'));
        if (ids.length === 0) return;

        try {
            await supabase.from('direct_messages')
                .update({ is_read: true })
                .in('id', ids);

            // Update local state
            setMessages(prev => prev.map(m =>
                ids.includes(m.id) ? { ...m, is_read: true } : m
            ));
        } catch (e) {
            console.warn("Failed to mark as read:", e);
        }
    };

    useEffect(() => {
        // Initial message load
        const loadMessages = async () => {
            try {
                const { data } = await supabase.from('direct_messages')
                    .select('*')
                    .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
                    .or(`sender_id.eq.${partner.user_id},receiver_id.eq.${partner.user_id}`)
                    .order('created_at', { ascending: true });
                const filtered = (data || []).filter(m =>
                    (m.sender_id === session.user.id && m.receiver_id === partner.user_id) ||
                    (m.sender_id === partner.user_id && m.receiver_id === session.user.id)
                );
                setMessages(filtered);
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

                // Mark incoming messages as read
                markAsRead(filtered);
            } catch (e) {
                console.error("Failed to load messages:", e);
            }
        };
        loadMessages();

        // Realtime subscription for new messages AND read status updates
        const channelName = [session.user.id, partner.user_id].sort().join('-');
        const channel = supabase
            .channel(`chat-${channelName}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'direct_messages',
            }, (payload) => {
                const msg = payload.new;
                if (
                    (msg.sender_id === session.user.id && msg.receiver_id === partner.user_id) ||
                    (msg.sender_id === partner.user_id && msg.receiver_id === session.user.id)
                ) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

                    // If incoming message, mark as read immediately
                    if (msg.sender_id === partner.user_id) {
                        markAsRead([msg]);
                    }
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'direct_messages',
            }, (payload) => {
                const updated = payload.new;
                // Update local message state with new is_read status
                if (
                    (updated.sender_id === session.user.id && updated.receiver_id === partner.user_id) ||
                    (updated.sender_id === partner.user_id && updated.receiver_id === session.user.id)
                ) {
                    setMessages(prev => prev.map(m =>
                        m.id === updated.id ? { ...m, is_read: updated.is_read } : m
                    ));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [partner.user_id, session.user.id]);

    const send = async (e) => {
        e.preventDefault();
        if (!txt.trim()) return;

        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            sender_id: session.user.id,
            receiver_id: partner.user_id,
            content: txt,
            created_at: new Date().toISOString(),
            is_read: false
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setTxt('');
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        try {
            const { error } = await supabase.from('direct_messages').insert({
                sender_id: session.user.id,
                receiver_id: partner.user_id,
                content: optimisticMsg.content
            });
            if (error) throw error;
        } catch (e) {
            addToast("Nachricht konnte nicht gesendet werden.", 'error');
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        }
    };

    // Format time
    const formatTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-background flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 p-4 pt-12 pb-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border sticky top-0 z-10">
                <button onClick={onClose}><ArrowLeft className="text-muted-foreground hover:text-foreground" /></button>
                <div onClick={() => { onClose(); onUserClick(partner); }} className="flex items-center gap-3 cursor-pointer group flex-1">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden border border-border group-hover:border-blue-500 transition">
                        {partner.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="m-2.5 text-muted-foreground" />}
                    </div>
                    <div className="font-bold text-foreground flex items-center gap-1.5">{partner.full_name} {partner.verification_status && partner.verification_status !== 'unverified' && <VerificationBadge size={16} status={partner.verification_status} />}</div>
                </div>
                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                        <MoreVertical size={20} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-border rounded-xl shadow-2xl overflow-hidden min-w-[180px] animate-in fade-in slide-in-from-top-2 z-20">
                            <button onClick={() => { setShowMenu(false); onReport?.({ id: partner.user_id, type: 'user' }); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition">
                                <Flag size={16} className="text-amber-400" /> Nutzer melden
                            </button>
                            <button onClick={() => { setShowMenu(false); onBlock?.(partner); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition border-t border-border">
                                <ShieldOff size={16} /> Nutzer blockieren
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-background to-slate-50 dark:from-black dark:to-zinc-950">
                {messages.map((m, i) => {
                    const isMine = m.sender_id === session.user.id;
                    const showTime = i === 0 || (new Date(m.created_at) - new Date(messages[i - 1].created_at)) > 300000;

                    return (
                        <React.Fragment key={m.id}>
                            {showTime && (
                                <div className="text-center text-[10px] text-muted-foreground/60 py-2 font-medium">
                                    {formatTime(m.created_at)}
                                </div>
                            )}
                            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`relative max-w-[75%] ${isMine ? '' : ''}`}>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMine
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-slate-100 dark:bg-zinc-800 text-foreground rounded-bl-sm border border-border'
                                        }`}>
                                        {m.content}
                                    </div>
                                    {/* Read receipt for own messages */}
                                    {isMine && (
                                        <div className="flex justify-end mt-0.5 mr-1">
                                            {m.is_read ? (
                                                <CheckCheck size={14} className="text-blue-400" />
                                            ) : (
                                                <Check size={14} className="text-muted-foreground" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={endRef} />
            </div>
            <form onSubmit={send} className="p-4 bg-white dark:bg-zinc-900 border-t border-border flex gap-3 pb-8 sm:pb-4">
                <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="Schreib eine Nachricht..." className="flex-1 bg-slate-100 dark:bg-zinc-950 border border-border text-foreground rounded-full px-5 py-3 outline-none focus:border-blue-500 transition" />
                <button className="bg-blue-600 hover:bg-blue-500 p-3 rounded-full text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-90"><Send size={20} /></button>
            </form>
        </div>
    );
};
