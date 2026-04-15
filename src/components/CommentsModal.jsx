import React, { useState, useEffect } from 'react';
import { X, Loader2, Send, MessageCircle, Trash2, Heart, Pin, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';
import { EmptyState } from './EmptyState';
import * as api from '../lib/api';

const CommentText = ({ content }) => {
    const parts = content.split(/(@[\w.-]+)/g);
    return (
        <div className="break-words leading-relaxed">
            {parts.map((part, i) => 
                part.startsWith('@') ? (
                    <span key={i} className="text-blue-500 font-bold cursor-pointer hover:underline">{part}</span>
                ) : part
            )}
        </div>
    );
};

const CommentItem = ({ comment, session, videoCreatorId, currentVideoId, isCreator, onDelete, onPin }) => {
    const likesCount = comment.comment_likes?.length || 0;
    const isLiked = comment.comment_likes?.some(l => l.user_id === session?.user?.id);
    const creatorLiked = comment.comment_likes?.some(l => l.user_id === videoCreatorId);

    const toggleLike = async () => {
        if (!session) return;
        const wasLiked = isLiked;
        try {
            await api.toggleCommentLike(session.user.id, comment.id, wasLiked);
            // Parent handles state refresh or local update
            window.dispatchEvent(new CustomEvent('commentLikeUpdate', { detail: { commentId: comment.id, wasLiked } }));
        } catch (error) {
            console.error("Liking comment failed:", error);
        }
    };

    return (
        <div className={`p-4 rounded-2xl border transition-all duration-300 relative ${comment.is_pinned ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20' : 'bg-slate-50 dark:bg-zinc-800/50 border-border'}`}>
            {comment.is_pinned && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">
                    <Pin size={10} className="fill-blue-500" /> Angepinnt
                </div>
            )}
            
            <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-border">
                    {comment.players_master?.avatar_url ? (
                        <img src={comment.players_master.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">
                            {comment.players_master?.full_name?.charAt(0) || '?'}
                        </div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-xs text-foreground">
                                    {comment.players_master?.full_name || 'User'}
                                </span>
                                {comment.user_id === videoCreatorId && (
                                    <span className="bg-zinc-200 dark:bg-zinc-700 text-[9px] px-1.5 py-0.5 rounded text-zinc-500 font-bold uppercase">Ersteller</span>
                                )}
                            </div>
                            <CommentText content={comment.content} />
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 shrink-0 ml-3">
                            <button onClick={toggleLike} className="flex flex-col items-center gap-0.5 group transition-colors">
                                <Heart size={18} className={isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground group-hover:text-red-400'} />
                                <span className={`text-[10px] font-bold ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}>{likesCount}</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4">
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {new Date(comment.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </span>
                        
                        {creatorLiked && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500/80 bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/10">
                                <Heart size={8} className="fill-red-500" /> Vom Ersteller gelikt
                            </div>
                        )}

                        <div className="ml-auto flex items-center gap-3">
                            {isCreator && (
                                <button 
                                    onClick={() => onPin(comment.id, !comment.is_pinned)} 
                                    className={`text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 transition-colors ${comment.is_pinned ? 'text-blue-500 hover:text-blue-600' : 'text-muted-foreground hover:text-blue-400'}`}
                                >
                                    <Pin size={10} /> {comment.is_pinned ? 'Lösen' : 'Anpinnen'}
                                </button>
                            )}
                            
                            {(session?.user?.id === comment.user_id || isCreator) && (
                                <button onClick={() => onDelete(comment.id)} className="text-muted-foreground hover:text-red-500 transition-colors opacity-60 hover:opacity-100">
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CommentsModal = ({ video, onClose, session, onLoginReq }) => {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const videoCreatorId = video.players_master?.user_id || video.user_id;
    const isCreator = session?.user?.id === videoCreatorId;

    const loadComments = async () => {
        try {
            const data = await api.fetchComments(video.id);
            // Smart Sorting: Pin first, then likes, then date
            const sorted = (data || []).sort((a, b) => {
                if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
                const aLikes = a.comment_likes?.length || 0;
                const bLikes = b.comment_likes?.length || 0;
                if (aLikes !== bLikes) return bLikes - aLikes;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setComments(sorted);
        } catch (error) {
            console.error("Fetch comments error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadComments();
        
        const handleLikeUpdate = () => loadComments();
        window.addEventListener('commentLikeUpdate', handleLikeUpdate);
        return () => window.removeEventListener('commentLikeUpdate', handleLikeUpdate);
    }, [video.id]);

    const sendComment = async (e) => {
        e.preventDefault();
        if (!session) return onLoginReq();
        if (!text.trim()) return;

        const currentText = text.trim();
        try {
            const newCommentData = await api.addComment(video.id, session.user.id, currentText);
            
            // Standard Comment Notification
            if (videoCreatorId && videoCreatorId !== session.user.id) {
                try {
                    await api.createNotification({
                        userId: videoCreatorId,
                        actorId: session.user.id,
                        type: 'comment',
                        message: 'hat dein Video kommentiert.',
                        videoId: video.id
                    });
                } catch (error) {
                    console.warn("Notification failed, but interaction saved", error);
                }
            }

            // @Mention Logic
            const mentions = currentText.match(/@[\w.-]+/g);
            if (mentions) {
                for (let m of mentions) {
                    const username = m.substring(1).toLowerCase();
                    const targetPlayer = await api.fetchPlayerByUsername(username);
                    if (targetPlayer && targetPlayer.user_id !== session.user.id) {
                        try {
                            await supabase.from('notifications').insert({
                                user_id: targetPlayer.user_id,
                                type: 'mention',
                                message: `${session.user.user_metadata?.full_name || 'Jemand'} hat dich in einem Kommentar markiert.`,
                                related_id: video.id,
                                is_read: false
                            });
                        } catch (error) {
                            console.warn("Notification failed, but interaction saved", error);
                        }
                    }
                }
            }

            setText('');
            loadComments();
            window.dispatchEvent(new CustomEvent('commentChange', { detail: { videoId: video.id, delta: 1 } }));
            addToast("Kommentar gepostet!", 'success');
        } catch (error) {
            console.error("Kommentar erstellen fehler:", error);
            addToast("Fehler beim Senden.", 'error');
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await api.deleteComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            window.dispatchEvent(new CustomEvent('commentChange', { detail: { videoId: video.id, delta: -1 } }));
        } catch (error) {
            addToast("Löschen fehlgeschlagen.", 'error');
        }
    };

    const handlePin = async (commentId, pinState) => {
        try {
            await api.toggleCommentPin(video.id, commentId, pinState);
            loadComments();
            addToast(pinState ? "Kommentar angepinnt 📌" : "Pin gelöst", 'success');
        } catch (error) {
            addToast("Pin fehlgeschlagen", 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
            <div className={`w-full sm:max-w-md ${cardStyle} h-[75vh] sm:h-[600px] flex flex-col border-t border-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl`}>
                <div className="p-4 border-b border-border flex justify-between items-center bg-white dark:bg-zinc-900/80 backdrop-blur-md">
                    <h3 className="text-foreground font-bold flex items-center gap-2">
                        <MessageCircle size={18} className="text-blue-500" /> 
                        Kommentare <span className="bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground">{comments.length}</span>
                    </h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain scrollbar-hide">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <span className="text-xs text-muted-foreground font-medium">Lade Kommentare...</span>
                        </div>
                    ) : comments.length === 0 ? (
                        <EmptyState icon={MessageCircle} title="Noch keine Kommentare" description="Schreibe den ersten Kommentar für dieses Video." variant="subtle" />
                    ) : (
                        comments.map(c => (
                            <CommentItem 
                                key={c.id} 
                                comment={c} 
                                session={session} 
                                videoCreatorId={videoCreatorId}
                                isCreator={isCreator}
                                onDelete={handleDelete} 
                                onPin={handlePin}
                            />
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-border bg-white dark:bg-zinc-900/80 backdrop-blur-md flex flex-col gap-3">
                    <form onSubmit={sendComment} className="flex gap-2">
                        <div className="flex-1 relative">
                            <input 
                                className={`${inputStyle} pr-12`} 
                                value={text} 
                                onChange={e => setText(e.target.value)} 
                                placeholder="Kommentar hinzufügen... @markieren" 
                                maxLength={200}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                <span className={`text-[10px] font-bold ${text.length >= 180 ? 'text-amber-500' : 'text-muted-foreground/40'}`}>
                                    {200 - text.length}
                                </span>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={!text.trim()} 
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                                text.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-90' : 'bg-muted text-muted-foreground cursor-not-allowed'
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
