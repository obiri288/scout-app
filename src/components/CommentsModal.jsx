import React, { useState, useEffect } from 'react';
import { X, Loader2, Send, MessageCircle, Trash2, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, btnPrimary, cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';
import { EmptyState } from './EmptyState';
import * as api from '../lib/api';

const CommentItem = ({ comment, session, onDelete }) => {
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        let isMounted = true;
        api.getCommentLikes(comment.id, session?.user?.id).then(res => {
            if (isMounted) {
                setLikesCount(res.count);
                setIsLiked(res.isLiked);
            }
        });
        return () => { isMounted = false; };
    }, [comment.id, session?.user?.id]);

    const toggleLike = async () => {
        if (!session) return;
        const wasLiked = isLiked;
        setIsLiked(!wasLiked);
        setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

        try {
            await api.toggleCommentLike(session.user.id, comment.id, wasLiked);
        } catch (error) {
            console.error("Liking comment failed:", error);
            setIsLiked(wasLiked);
            setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
        }
    };

    return (
        <div className="bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-border text-sm text-foreground flex gap-3 items-start animate-in fade-in zoom-in-95">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                {comment.players_master?.avatar_url ? (
                    <img src={comment.players_master.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                        {comment.players_master?.full_name?.charAt(0) || '?'}
                    </div>
                )}
            </div>
            <div className="flex-1 break-words min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-muted-foreground mb-1">{comment.players_master?.full_name || 'User'}</div>
                        <div className="break-words">{comment.content}</div>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0 ml-2">
                        <button onClick={toggleLike} className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-red-500 transition-colors">
                            <Heart size={14} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
                            {likesCount > 0 ? (
                                <span className="text-[10px] font-medium">{likesCount}</span>
                            ) : (
                                <span className="text-[10px] font-medium opacity-0">0</span>
                            )}
                        </button>
                    </div>
                </div>
                {session?.user?.id === comment.user_id && (
                    <div className="mt-2 flex justify-start">
                         <button onClick={() => onDelete(comment.id)} className="text-muted-foreground hover:text-red-500 transition-colors inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100">
                             <Trash2 size={12} /> Löschen
                         </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const CommentsModal = ({ video, onClose, session, onLoginReq }) => {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const data = await api.fetchComments(video.id);
                setComments(data || []);
            } catch (error) {
                console.error("Fetch comments error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchComments();
    }, [video.id]);

    const sendComment = async (e) => {
        e.preventDefault();
        if (!session) return onLoginReq();
        if (!text.trim()) return;

        const currentText = text.trim();
        try {
            const newCommentData = await api.addComment(video.id, session.user.id, currentText);
            
            const optimisticComment = {
                ...newCommentData,
                players_master: {
                    full_name: session?.user?.user_metadata?.full_name || 'User',
                    avatar_url: session?.user?.user_metadata?.avatar_url || ''
                }
            };
            
            setComments(prev => [...prev, optimisticComment]);
            setText('');
            addToast("Kommentar gepostet!", 'success');
        } catch (error) {
            console.error("Kommentar erstellen fehler:", error);
            addToast(error?.message || "Kommentar konnte nicht gesendet werden.", 'error');
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await api.deleteComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            addToast("Kommentar gelöscht", 'success');
        } catch (error) {
            console.error("Kommentar löschen fehler:", error);
            addToast("Löschen fehlgeschlagen.", 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in slide-in-from-bottom">
            <div className={`w-full sm:max-w-md ${cardStyle} h-[60vh] flex flex-col border-t border-border rounded-t-3xl sm:rounded-2xl`}>
                <div className="p-4 border-b border-border flex justify-between items-center bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl">
                    <h3 className="text-foreground font-bold flex items-center gap-2">
                        <MessageCircle size={18} /> Kommentare
                    </h3>
                    <button onClick={onClose} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-cyan-500" />
                        </div>
                    ) : comments.length === 0 ? (
                        <EmptyState icon={MessageCircle} title="Sei der Erste!" description="Schreibe den ersten Kommentar für dieses Video." variant="subtle" />
                    ) : (
                        comments.map(c => (
                            <CommentItem key={c.id} comment={c} session={session} onDelete={handleDelete} />
                        ))
                    )}
                </div>
                <div className="p-3 border-t border-border bg-white dark:bg-zinc-900 flex flex-col gap-2">
                    <div className="flex justify-end px-1">
                        <span className={`text-[10px] font-medium ${text.length >= 200 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {text.length} / 200
                        </span>
                    </div>
                    <form onSubmit={sendComment} className="flex gap-2">
                        <input 
                            className={inputStyle} 
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            placeholder="Kommentar hinzufügen..." 
                            maxLength={200}
                        />
                        <button 
                            type="submit" 
                            disabled={!text.trim()} 
                            className={`w-auto px-4 flex items-center justify-center rounded-xl transition-all ${
                                text.trim() ? 'bg-cyan-500 text-white hover:bg-cyan-600 cursor-pointer shadow-lg shadow-cyan-500/20' : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
