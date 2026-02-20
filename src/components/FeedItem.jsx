import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Flag, Play, User, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getClubStyle } from '../lib/helpers';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useToast } from '../contexts/ToastContext';

export const FeedItem = React.memo(({ video, onClick, session, onLikeReq, onCommentClick, onUserClick, onReportReq }) => {
    const [likes, setLikes] = useState(video.likes_count || 0);
    const [liked, setLiked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const videoRef = useRef(null);
    const { ref: observerRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });
    const { addToast } = useToast();

    // Intersection Observer driven play/pause
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (isIntersecting) {
            videoEl.play().catch(() => { }); // Autoplay may be blocked
        } else {
            videoEl.pause();
        }
    }, [isIntersecting]);

    const like = async (e) => {
        e.stopPropagation();
        if (!session) { onLikeReq(); return; }
        setLiked(!liked);
        setLikes(l => liked ? l - 1 : l + 1);
        try {
            if (!liked) {
                const { error } = await supabase.from('media_likes').insert({ user_id: session.user.id, video_id: video.id });
                if (error) throw error;
            } else {
                await supabase.from('media_likes').delete().match({ user_id: session.user.id, video_id: video.id });
            }
        } catch (e) {
            // Revert optimistic update
            setLiked(prev => !prev);
            setLikes(l => liked ? l + 1 : l - 1);
            addToast("Like fehlgeschlagen.", 'error');
        }
    };

    return (
        <div ref={observerRef} className="bg-black border-b border-zinc-900/50 pb-6 mb-2 last:mb-20">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onUserClick(video.players_master)}>
                    <div className={`w-10 h-10 rounded-full bg-zinc-800 overflow-hidden p-0.5 ${getClubStyle(video.players_master?.clubs?.is_icon_league)}`}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-black">
                            {video.players_master?.avatar_url ? <img src={video.players_master.avatar_url} className="w-full h-full object-cover" /> : <User className="m-2 text-zinc-500" />}
                        </div>
                    </div>
                    <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1 group-hover:text-blue-400 transition">
                            {video.players_master?.full_name} {video.players_master?.is_verified && <CheckCircle size={12} className="text-blue-500" />}
                        </div>
                        <div className="text-xs text-zinc-500">{video.players_master?.clubs?.name || "Vereinslos"}</div>
                    </div>
                </div>
                <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="text-zinc-500 hover:text-white p-2"><MoreHorizontal size={20} /></button>
                    {showMenu && (
                        <div className="absolute right-0 top-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 w-32 overflow-hidden animate-in fade-in">
                            <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onReportReq(video.id, 'video'); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-zinc-800 flex items-center gap-2"><Flag size={14} /> Melden</button>
                        </div>
                    )}
                </div>
            </div>
            <div onClick={() => onClick(video)} className="aspect-[4/5] bg-zinc-900 relative overflow-hidden group cursor-pointer">
                <video
                    ref={videoRef}
                    src={video.video_url}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500"
                    muted loop playsInline
                    preload="none"
                    poster={video.thumbnail_url}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none"></div>
                <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-white text-xs font-bold flex items-center gap-1"><Play size={10} fill="white" /> Watch</div>
                {/* Skill tags overlay */}
                {video.skill_tags && video.skill_tags.length > 0 && (
                    <div className="absolute bottom-4 left-4 flex flex-wrap gap-1">
                        {video.skill_tags.slice(0, 3).map(tag => (
                            <span key={tag} className="bg-blue-600/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
            <div className="px-4 pt-4 flex items-center gap-6">
                <button onClick={like} className={`flex items-center gap-2 transition-transform active:scale-90 ${liked ? 'text-red-500' : 'text-white hover:text-red-400'}`}>
                    <Heart size={26} className={liked ? 'fill-red-500' : ''} /> <span className="font-bold text-sm">{likes}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onCommentClick(video); }} className="flex items-center gap-2 text-white hover:text-blue-400 transition">
                    <MessageCircle size={26} /> <span className="font-bold text-sm">Chat</span>
                </button>
                <div className="ml-auto">
                    <Share2 size={24} className="text-zinc-500 hover:text-white transition cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = `${window.location.origin}/#profile/${video.players_master?.user_id}`;
                        if (navigator.share) {
                            navigator.share({ title: `${video.players_master?.full_name} – Highlight`, url: shareUrl }).catch(() => { });
                        } else {
                            navigator.clipboard.writeText(shareUrl);
                            addToast('Link kopiert!', 'success');
                        }
                    }} />
                </div>
            </div>
        </div>
    );
});
