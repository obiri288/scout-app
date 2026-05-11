import React, { useRef, useState } from 'react';
import { Heart, Pin, Trash2 } from 'lucide-react';
import * as api from '../lib/api';

export const CommentText = ({ content }) => {
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

export const CommentItem = ({ comment, session, videoCreatorId, currentVideoId, isCreator, onDelete, onPin, onActionReq }) => {
    const timerRef = useRef(null);
    const [isPressing, setIsPressing] = useState(false);

    const handlePressStart = (e) => {
        // Only trigger if not already processing a long press
        if (timerRef.current) return;
        
        setIsPressing(true);
        timerRef.current = setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(50);
            if (onActionReq) onActionReq(comment);
            setIsPressing(false);
            timerRef.current = null;
        }, 800);
    };

    const handlePressEnd = () => {
        setIsPressing(false);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

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
        <div 
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className={`p-4 rounded-2xl border transition-all duration-300 relative select-none ${isPressing ? 'scale-[0.98] brightness-95' : ''} ${comment.is_pinned ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20' : 'bg-slate-50 dark:bg-zinc-800/50 border-border'}`}
        >
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
                                <button 
                                    onClick={() => onDelete(comment.id)} 
                                    className="text-muted-foreground hover:text-red-500 transition-all duration-200 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md"
                                    title="Kommentar löschen"
                                >
                                    <Trash2 size={14} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
