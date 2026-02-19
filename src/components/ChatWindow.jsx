import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export const ChatWindow = ({ partner, session, onClose, onUserClick }) => {
    const [messages, setMessages] = useState([]);
    const [txt, setTxt] = useState('');
    const endRef = useRef(null);
    const { addToast } = useToast();

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
            } catch (e) {
                console.error("Failed to load messages:", e);
            }
        };
        loadMessages();

        // Realtime subscription - replaces polling
        const channelName = [session.user.id, partner.user_id].sort().join('-');
        const channel = supabase
            .channel(`chat-${channelName}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'direct_messages',
            }, (payload) => {
                const msg = payload.new;
                // Only add messages that belong to this conversation
                if (
                    (msg.sender_id === session.user.id && msg.receiver_id === partner.user_id) ||
                    (msg.sender_id === partner.user_id && msg.receiver_id === session.user.id)
                ) {
                    setMessages(prev => {
                        // Avoid duplicates (from optimistic update)
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
            created_at: new Date().toISOString()
        };

        // Optimistic update
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
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 p-4 pt-12 pb-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-10">
                <button onClick={onClose}><ArrowLeft className="text-zinc-400 hover:text-white" /></button>
                <div onClick={() => { onClose(); onUserClick(partner); }} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10 group-hover:border-blue-500 transition">
                        {partner.avatar_url ? <img src={partner.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="m-2.5 text-zinc-500" />}
                    </div>
                    <div className="font-bold text-white">{partner.full_name}</div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-black to-zinc-950">
                {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_id === session.user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-5 py-3 rounded-2xl max-w-[75%] text-sm shadow-sm ${m.sender_id === session.user.id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none border border-white/5'}`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
            <form onSubmit={send} className="p-4 bg-zinc-900 border-t border-zinc-800 flex gap-3 pb-8 sm:pb-4">
                <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="Schreib eine Nachricht..." className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-full px-5 py-3 outline-none focus:border-blue-500 transition" />
                <button className="bg-blue-600 hover:bg-blue-500 p-3 rounded-full text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-90"><Send size={20} /></button>
            </form>
        </div>
    );
};
