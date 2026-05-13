import React, { useState, useEffect } from 'react';
import { 
    X, Loader2, Send, MessageCircle, Trash2, Heart, Pin, User 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { inputStyle, cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';
import { EmptyState } from './EmptyState';
import * as api from '../lib/api';

import { CommentItem } from './CommentItem';
import { CommentActionMenu } from './CommentActionMenu';
import { ReportModal } from './ReportModal';
import { useUser } from '../contexts/UserContext';

export const CommentsModal = ({ video, onClose, session, onLoginReq }) => {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addToast } = useToast();
    const isTransfer = video.post_type === 'transfer';
    const videoCreatorId = isTransfer ? video.user_id : (video.players_master?.user_id || video.user_id);
    const isCreator = session?.user?.id === videoCreatorId;
    const { currentUserProfile, hiddenUserIds } = useUser();

    const [actionComment, setActionComment] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);

    const loadComments = async () => {
        try {
            const data = isTransfer 
                ? await api.fetchPostComments(video.id)
                : await api.fetchComments(video.id);
            
            // Client-side filtering for hidden comments
            const hiddenComments = currentUserProfile?.hidden_comments || [];
            const hiddens = hiddenUserIds || [];
            const filteredData = (data || []).filter(c => !hiddenComments.includes(c.id) && !hiddens.includes(c.players_master?.id));

            // Smart Sorting: Pin first, then likes, then date
            const sorted = filteredData.sort((a, b) => {
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
    }, [video.id, currentUserProfile, video.post_type]);

    const sendComment = async (e) => {
        e.preventDefault();
        if (!session) return onLoginReq();
        if (!text.trim() || isSubmitting) return;

        const currentText = text.trim();
        setIsSubmitting(true);
        try {
            const newCommentData = isTransfer
                ? await api.addPostComment(video.id, session.user.id, currentText)
                : await api.addComment(video.id, session.user.id, currentText);
            
            // Standard Comment Notification
            const myProfileId = await api.getPlayerIdFromUserId(session.user.id);
            if (video.players_master?.id && video.players_master?.id !== myProfileId) {
                try {
                    await api.createNotification({
                        userId: video.players_master?.id,
                        actorId: myProfileId,
                        type: 'comment',
                        message: isTransfer ? 'hat deinen Transfer-Post kommentiert.' : 'hat dein Video kommentiert.',
                        videoId: isTransfer ? null : video.id,
                        entityId: isTransfer ? video.id : null
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
                    if (targetPlayer && targetPlayer.id !== myProfileId) {
                        try {
                            await api.createNotification({
                                userId: targetPlayer.id,
                                actorId: myProfileId,
                                type: 'mention',
                                message: 'hat dich in einem Kommentar markiert.',
                                videoId: video.id
                            });
                        } catch (error) {
                            console.warn("Notification failed, but interaction saved", error);
                        }
                    }
                }
            }

            setText('');
            await loadComments();
            window.dispatchEvent(new CustomEvent('commentChange', { detail: { videoId: video.id, delta: 1 } }));
            addToast("Kommentar erfasst", 'success');
        } catch (error) {
            console.error("Kommentar erstellen fehler:", error);
            addToast(`Fehler beim Senden: ${error?.message || 'Unbekannter Fehler'}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        const previousComments = [...comments];
        // Optimistic update
        setComments(prev => prev.filter(c => c.id !== commentId));
        
        try {
            await api.deleteComment(commentId);
            window.dispatchEvent(new CustomEvent('commentChange', { detail: { videoId: video.id, delta: -1 } }));
            addToast("Kommentar gelöscht", 'info');
        } catch (error) {
            // Rollback
            setComments(previousComments);
            addToast("Löschen fehlgeschlagen.", 'error');
        }
    };

    const handlePin = async (commentId, state) => {
        try {
            await api.toggleCommentPin(video.id, commentId, state, isTransfer ? 'post' : 'video');
            loadComments();
            addToast(state ? "Kommentar angepinnt 📌" : "Pin gelöst", 'success');
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
                                onActionReq={setActionComment}
                            />
                        ))
                    )}
                </div>

                {/* Comment Actions Menu (Long-press result) */}
                <CommentActionMenu 
                    comment={actionComment}
                    session={session}
                    videoCreatorId={videoCreatorId}
                    isOpen={!!actionComment}
                    onClose={() => setActionComment(null)}
                    onDelete={handleDelete}
                    onReport={(c) => setReportTarget({ id: c.id, type: 'comment' })}
                />

                {/* Shared Report Flow */}
                {reportTarget && (
                    <ReportModal 
                        targetId={reportTarget.id}
                        targetType={reportTarget.type}
                        session={session}
                        onClose={() => {
                            setReportTarget(null);
                            loadComments(); // Refresh to catch hidden/quarantined
                        }}
                    />
                )}

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
                            disabled={!text.trim() || isSubmitting} 
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                                text.trim() && !isSubmitting ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-90' : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
