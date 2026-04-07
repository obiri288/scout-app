import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Flag, Play, User, Zap, Wind, Crosshair, ArrowUpRight, Swords, ShieldCheck, Gauge, CircleDot, Flame, Hand } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { Card } from '@/components/ui/card';
import { supabase } from '../lib/supabase';
import { checkAndCreateLikeMilestone } from '../lib/api';
import { getClubStyle } from '../lib/helpers';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useToast } from '../contexts/ToastContext';

const ACTION_TAG_ICONS = { Traumpass: Zap, Dribbling: Wind, Abschluss: Crosshair, Flanke: ArrowUpRight, Zweikampf: Swords, Balleroberung: ShieldCheck, Speed: Gauge, Ballkontrolle: CircleDot, Einsatz: Flame, Parade: Hand };

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
                // Check for ego-trigger milestone (non-blocking)
                checkAndCreateLikeMilestone(video.id, video.players_master?.user_id, session.user.id);
                // Award XP to video owner
                if (video.players_master?.id) {
                    import('../lib/api').then(api => api.awardXP(video.players_master.id, 5, 'like', `${video.id}_${session.user.id}`));
                }
            } else {
                const { error } = await supabase.from('media_likes').delete().match({ user_id: session.user.id, video_id: video.id });
                if (error) throw error;
            }
        } catch (error) {
            // Revert optimistic update
            setLiked(prev => !prev);
            setLikes(l => liked ? l + 1 : l - 1);
            addToast(error?.message || "Like fehlgeschlagen.", 'error');
        }
    };

    return (
        <motion.div
            ref={observerRef}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
            <Card className="bg-card border-border backdrop-blur-sm overflow-hidden mb-5 shadow-lg shadow-black/40">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onUserClick(video.players_master)}>
                        <div className={`w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden p-[1px] ${getClubStyle(video.players_master?.clubs?.is_icon_league)} shadow-inner`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                                {video.players_master?.avatar_url ? <img src={video.players_master.avatar_url} className="w-full h-full object-cover" /> : <User className="m-2 text-muted-foreground" />}
                            </div>
                        </div>
                        <div>
                            <div className="font-bold text-foreground text-sm flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
                                {video.players_master?.full_name} {video.players_master?.verification_status && video.players_master?.verification_status !== 'unverified' && <VerificationBadge size={14} status={video.players_master?.verification_status} verificationStatus={video.players_master?.verification_status} />}
                            </div>
                            <div className="text-[11px] tracking-wider text-muted-foreground uppercase">{video.players_master?.clubs?.name || "Vereinslos"}</div>
                        </div>
                    </div>
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="text-muted-foreground hover:text-foreground p-2 transition-colors duration-300"><MoreHorizontal size={20} /></button>
                        {showMenu && (
                            <div className="absolute right-0 top-full bg-card border border-border rounded-xl shadow-2xl backdrop-blur-xl z-20 w-36 overflow-hidden animate-in fade-in zoom-in-95">
                                <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); onReportReq(video.id, 'video'); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-colors duration-300"><Flag size={14} /> Melden</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video */}
                <div onClick={() => onClick(video)} className="aspect-[4/5] bg-background relative overflow-hidden group cursor-pointer">
                    <video
                        ref={videoRef}
                        src={video.video_url}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500"
                        muted loop playsInline
                        preload="none"
                        poster={video.thumbnail_url}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />
                    <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-xl border border-white/20 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium flex items-center gap-1.5"><Play size={10} fill="white" /> Watch</div>
                    {/* Skill tags overlay */}
                    {video.skill_tags && video.skill_tags.length > 0 && (
                        <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
                            {video.skill_tags.slice(0, 3).map(tag => (
                                <span key={tag} className="bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30 text-white text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full">{tag}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-4 py-4 flex items-center gap-3">
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={like}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${liked ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        <Heart size={20} className={liked ? 'fill-red-500' : ''} /> <span className="font-medium text-sm">{likes}</span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(51,65,85,0.5)" }}
                        onClick={(e) => { e.stopPropagation(); onCommentClick(video); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-300"
                    >
                        <MessageCircle size={20} /> <span className="font-medium text-sm">Chat</span>
                    </motion.button>
                    <div className="ml-auto">
                        <Share2 size={24} className="text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer" onClick={(e) => {
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

                {/* Action Tags (PlayStyles) */}
                {video.action_tags && video.action_tags.length > 0 && (
                    <div className="px-4 pb-4 -mt-1 flex flex-wrap gap-1.5">
                        {video.action_tags.slice(0, 2).map(tag => {
                            const TagIcon = ACTION_TAG_ICONS[tag];
                            return (
                                <span key={tag} className="bg-white/10 backdrop-blur-xl border border-white/20 text-cyan-400 text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full flex items-center gap-1">
                                    {TagIcon && <TagIcon size={10} />}
                                    {tag}
                                </span>
                            );
                        })}
                    </div>
                )}
            </Card>
        </motion.div>
    );
});
