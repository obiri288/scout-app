import React, { useState, useEffect } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, btnPrimary, cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';

export const CommentsModal = ({ video, onClose, session, onLoginReq }) => {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchComments = async () => {
            const { data } = await supabase.from('media_comments')
                .select('*, users:auth.users(id)')
                .eq('video_id', video.id)
                .order('created_at', { ascending: true });
            setComments(data || []);
            setLoading(false);
        };
        fetchComments();

        // Realtime Subscription for new comments
        const channel = supabase
            .channel(`comments-${video.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'media_comments',
                filter: `video_id=eq.${video.id}`
            }, payload => {
                setComments(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [video.id]);

    const sendComment = async (e) => {
        e.preventDefault();
        if (!session) return onLoginReq();
        if (!text.trim()) return;

        try {
            const { error } = await supabase.from('media_comments').insert({
                video_id: video.id,
                user_id: session.user.id,
                content: text
            });
            if (error) throw error;
            setText('');
        } catch (e) {
            addToast("Kommentar konnte nicht gesendet werden.", 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in slide-in-from-bottom">
            <div className={`w-full sm:max-w-md ${cardStyle} h-[60vh] flex flex-col border-t border-zinc-700 rounded-t-3xl sm:rounded-2xl`}>
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900">
                    <h3 className="text-white font-bold">Kommentare</h3>
                    <button onClick={onClose}><X className="text-zinc-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? <Loader2 className="animate-spin mx-auto text-zinc-500" /> : comments.length === 0 ? <p className="text-zinc-500 text-center text-sm">Noch keine Kommentare.</p> :
                        comments.map(c => (
                            <div key={c.id} className="bg-zinc-800/50 p-2 rounded-lg border border-white/5 text-sm text-white break-words">
                                {c.content}
                            </div>
                        ))}
                </div>
                <form onSubmit={sendComment} className="p-4 border-t border-white/5 bg-zinc-900 flex gap-2">
                    <input className={inputStyle} value={text} onChange={e => setText(e.target.value)} placeholder="Kommentar..." />
                    <button className={`${btnPrimary} w-auto px-4`}><Send size={18} /></button>
                </form>
            </div>
        </div>
    );
};
