import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreVertical, Flag, Play, User, Zap, Wind, Crosshair, ArrowUpRight, Swords, ShieldCheck, Gauge, CircleDot, Flame, Hand, VolumeX, Volume2, Bookmark, Archive, Trash2, EyeOff, AlertTriangle, Edit } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { ShareModal } from './ShareModal';
import TransferPostCard from './TransferPostCard';
import { TransferActionBar } from './TransferActionBar';
import { Card } from '@/components/ui/card';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { generateShareText } from '../lib/shareEngine';
import { getClubStyle, getClubDisplay } from '../lib/helpers';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useToast } from '../contexts/ToastContext';
import { useInteractionStatus } from '../hooks/useInteractionStatus';
import { useUser } from '../contexts/UserContext';

const ACTION_TAG_ICONS = { Traumpass: Zap, Dribbling: Wind, Abschluss: Crosshair, Flanke: ArrowUpRight, Zweikampf: Swords, Balleroberung: ShieldCheck, Speed: Gauge, Ballkontrolle: CircleDot, Einsatz: Flame, Parade: Hand };

export const FeedItem = React.memo(({ video, onClick, session, onLikeReq, onCommentClick, onUserClick, onReportReq }) => {
    const interactionType = video.post_type === 'transfer' ? 'post' : 'video';
    
    const { status: liked, count: likes, toggle: toggleLike, forceState: forceLikeState } = useInteractionStatus({
        type: `${interactionType}_like`,
        targetId: video.id,
        session,
        initialCount: video.likes_count || 0,
        initialStatus: false
    });
    
    const { status: saved, toggle: toggleSave, forceState: forceSaveState } = useInteractionStatus({
        type: `${interactionType}_save`,
        targetId: video.id,
        session,
        initialStatus: false
    });
    
    const { addToast } = useToast();
    
    const [commentCount, setCommentCount] = useState(video.comments_count || 0);
    const [shareData, setShareData] = useState({ text: '', url: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isShareOpen, setIsShareOpen] = useState(false);
    
    const { currentUserProfile } = useUser();
    const userRole = currentUserProfile?.role || 'scout';
    const videoCreatorId = video?.players_master?.user_id || video?.user_id;
    const isCreator = session?.user?.id === videoCreatorId;
    
    // Global listener for interaction updates from ImmersiveVideoPlayer
    useEffect(() => {
        const handleInteractionUpdate = (e) => {
            if (e.detail.videoId === video.id) {
                if (e.detail.newLikeState !== undefined) {
                    forceLikeState(e.detail.newLikeState, e.detail.newLikeCount);
                }
                if (e.detail.newSaveState !== undefined) {
                    forceSaveState(e.detail.newSaveState);
                }
            }
        };
        window.addEventListener('videoInteractionUpdate', handleInteractionUpdate);
        return () => window.removeEventListener('videoInteractionUpdate', handleInteractionUpdate);
    }, [video.id, forceLikeState, forceSaveState]);
    
    // Global listener for comment updates
    useEffect(() => {
        const handleCommentChange = (e) => {
            if (e.detail.videoId === video.id) {
                setCommentCount(prev => Math.max(0, prev + e.detail.delta));
            }
        };
        window.addEventListener('commentChange', handleCommentChange);
        return () => window.removeEventListener('commentChange', handleCommentChange);
    }, [video.id]);
    const videoRef = useRef(null);
    const { ref: observerRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

    // Force Initial State Fetching for Comment Count (Status/Likes now handled by hook)
    useEffect(() => {
        if (!video.id) return;
        let isMounted = true;

        const fetchCommentState = async () => {
            const table = video.post_type === 'transfer' ? 'post_comments' : 'media_comments';
            const idField = video.post_type === 'transfer' ? 'post_id' : 'video_id';
            
            const { count } = await supabase.from(table)
                .select('id', { count: 'exact', head: true })
                .eq(idField, video.id);
            
            if (isMounted && count !== null) {
                setCommentCount(count);
            }
        };

        fetchCommentState();
        return () => { isMounted = false; };
    }, [video.id, video.post_type]);

    // Intersection Observer driven play/pause
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (isIntersecting) {
            // Reset to start_time if needed
            if (video.start_time > 0 && videoEl.currentTime < video.start_time) {
                videoEl.currentTime = video.start_time;
            }
            videoEl.play().catch(() => { }); // Autoplay may be blocked
        } else {
            videoEl.pause();
        }
    }, [isIntersecting, video.start_time]);

    const handleTimeUpdate = (e) => {
        const videoEl = e.currentTarget;
        if (video.end_time && videoEl.currentTime >= video.end_time) {
            videoEl.currentTime = video.start_time || 0;
        }
    };

    const like = async (e) => {
        e.stopPropagation();
        if (!session) { onLikeReq(); return; }
        
        try {
            const wasLiked = liked;
            await toggleLike();

            // Side Effects (Notifications, XP) - only on Like action
            if (!wasLiked) {
                // Get my Profile ID for actor tracking
                const myProfileId = await api.getPlayerIdFromUserId(session.user.id);
                
                // Check for ego-trigger milestone (non-blocking)
                api.checkAndCreateLikeMilestone(video.id, video.players_master?.id, myProfileId);
                // Award XP to video owner
                if (video.players_master?.id) {
                    api.awardXP(video.players_master.id, 5, 'like', `${video.id}_${session.user.id}`);
                }
                // Manual Like Notification (Decoupled from interaction)
                if (video.players_master?.id && video.players_master?.id !== myProfileId) {
                    try {
                        await api.createNotification({
                            userId: video.players_master?.id,
                            actorId: myProfileId,
                            type: 'like',
                            message: 'hat dein Video gelikt.',
                            videoId: video.id
                        });
                    } catch (err) {
                        console.warn("Notification failed, but interaction saved", error);
                    }
                }
            }
            if (wasLiked) {
                addToast("Like entfernt", 'info');
            }
        } catch (err) {
            addToast(error?.message || "Like fehlgeschlagen.", 'error');
        }
    };

    const save = async (e) => {
        e.stopPropagation();
        if (!session) return;
        try {
            const wasSaved = saved;
            await toggleSave();
            if (!wasSaved) {
                addToast("In Watchlist gespeichert", 'success');
            } else {
                addToast("Aus Watchlist entfernt", 'info');
            }
        } catch (err) {
            addToast("Speichern fehlgeschlagen.", 'error');
        }
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsMuted(prev => !prev);
    };

    const handleArchive = async (e) => {
        e.stopPropagation();
        if (isArchiving) return;
        setIsArchiving(true);
        try {
            await api.archiveHighlight(video.id);
            addToast('Video archiviert. Es ist nun nur noch in deinem Profil-Archiv sichtbar.', 'success');
            setShowMenu(false);
            // Dispatch event to refresh feeds
            window.dispatchEvent(new CustomEvent('videoArchived', { detail: { videoId: video.id } }));
        } catch (err) {
            addToast('Archivieren fehlgeschlagen.', 'error');
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await api.deleteHighlight(video.id);
            addToast('Video gelöscht.', 'success');
            setShowDeleteConfirm(false);
            setShowMenu(false);
            // Dispatch event to refresh feeds
            window.dispatchEvent(new CustomEvent('videoDeleted', { detail: { videoId: video.id } }));
        } catch (err) {
            addToast('Löschen fehlgeschlagen.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        addToast('Bearbeitungs-Modus wird bald verfügbar sein.', 'info');
        setShowMenu(false);
    };

    const handleReport = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onReportReq(video.id, 'video');
    };

    const handleShareNative = async (e) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/#profile/${video.players_master?.slug || video.players_master?.user_id || video.id}`;
        const shareTitle = `CAVIO | Video von ${video.players_master?.full_name || 'einem Spieler'}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: generateShareText({
                        role: userRole,
                        isCreator: isCreator,
                        playerName: video.players_master?.full_name || 'ein Spieler',
                        tags: video.action_tags || []
                    }),
                    url: shareUrl,
                });
            } catch (err) {
                if (error.name !== 'AbortError') {
                    addToast('Teilen fehlgeschlagen.', 'error');
                }
            }
        } else {
            // Fallback to copy link
            try {
                await navigator.clipboard.writeText(shareUrl);
                addToast('Link in die Zwischenablage kopiert!', 'success');
            } catch (err) {
                addToast('Kopieren fehlgeschlagen.', 'error');
            }
        }
        setShowMenu(false);
    };

    return (
        <motion.div
            ref={observerRef}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
            <Card className={`bg-card overflow-hidden mb-5 shadow-lg shadow-black/40 transition-all duration-300 relative ${
                video.is_admin_boosted 
                    ? 'border border-amber-500/40 bg-gradient-to-b from-amber-500/[0.03] to-transparent shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'border-border'
            }`}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 cursor-pointer group min-w-0" onClick={() => video.players_master && onUserClick(video.players_master)}>
                        <div className={`w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden p-[1px] ${getClubStyle(video.players_master?.clubs?.is_icon_league)} shadow-inner shrink-0`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                                {video.players_master?.avatar_url ? (
                                    <img src={video.players_master.avatar_url} className="w-full h-full object-cover" alt={video.players_master?.full_name || 'Profil'} title={video.players_master?.full_name || 'Profil'} />
                                ) : (
                                    <img src="/cavio-icon.png" className="w-full h-full object-contain p-2 opacity-60" />
                                )}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="font-bold text-foreground text-sm flex items-center gap-1 group-hover:text-cyan-400 transition-colors truncate">
                                {video.players_master?.full_name || 'Unbekannter Spieler'} 
                                {(video.players_master?.verification_status && video.players_master?.verification_status !== 'unverified') || video.players_master?.is_official ? (
                                    <VerificationBadge 
                                        size={14} 
                                        status={video.players_master?.verification_status} 
                                        verificationStatus={video.players_master?.verification_status}
                                        isOfficial={video.players_master?.is_official}
                                    />
                                ) : null}
                            </div>
                            <div className="text-[11px] tracking-wider text-muted-foreground uppercase truncate">{getClubDisplay(video.players_master)}</div>
                        </div>
                    </div>

                    {/* Trending Badge for boosted content */}
                    {video.is_admin_boosted && (
                        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-wider animate-pulse mr-2 shrink-0">
                            <Flame size={12} className="fill-amber-500" />
                            Trending
                        </div>
                    )}

                    {/* Kebab Menu for Transfer/Post cards (header-level) */}
                    {video.post_type === 'transfer' && (
                        <div className="relative shrink-0">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                                className="p-2 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
                            >
                                <MoreVertical size={20} />
                            </button>
                            
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                                        className="absolute right-0 top-12 bg-zinc-900/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-[110] w-60 overflow-hidden"
                                    >
                                        <div className="p-1.5 space-y-1">
                                            {isCreator ? (
                                                <>
                                                    <div className="h-px bg-white/5 my-1" />
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setShowMenu(false); }}
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Trash2 size={18} /> 🗑️ Beitrag löschen
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={handleShareNative}
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Share2 size={18} className="text-blue-400" /> Beitrag teilen
                                                    </button>
                                                    <div className="h-px bg-white/5 my-1" />
                                                    <button 
                                                        onClick={handleReport} 
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Flag size={18} /> Melden
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Content: Video or Transfer Card */}
                {video.post_type === 'transfer' ? (
                    <TransferPostCard post={video} onUserClick={onUserClick} />
                ) : (
                    <div onClick={() => onClick({ ...video, initialIsLiked: liked, initialIsSaved: saved, initialLikeCount: likes })} className="aspect-[4/5] bg-background relative overflow-hidden group cursor-pointer">
                        <video
                            ref={videoRef}
                            src={video.video_url}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition duration-500"
                            muted={isMuted} loop={!video.end_time} playsInline
                            onTimeUpdate={handleTimeUpdate}
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
                )}

                {/* Overlays (Positioned relative to the Card to ensure visibility) */}
                {video.post_type !== 'transfer' && (
                    <>
                        <div className="absolute top-[80px] right-4 z-[100]">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                                className="bg-black/40 backdrop-blur-md p-2.5 rounded-full text-white hover:bg-black/70 transition-all duration-300 shadow-xl border border-white/20 active:scale-90"
                            >
                                <MoreVertical size={20} />
                            </button>
                            
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                                        className="absolute right-0 top-14 bg-zinc-900/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-[110] w-60 overflow-hidden"
                                    >
                                        <div className="p-1.5 space-y-1">
                                            {isCreator ? (
                                                <>
                                                    <button 
                                                        onClick={handleArchive}
                                                        disabled={isArchiving}
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors rounded-xl disabled:opacity-50"
                                                    >
                                                        <Archive size={18} className="text-blue-400" /> 
                                                        {isArchiving ? 'Archiviere...' : 'Im Profil verbergen'}
                                                    </button>
                                                    <button 
                                                        onClick={handleEdit}
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Edit size={18} className="text-cyan-400" /> Details bearbeiten
                                                    </button>
                                                    <div className="h-px bg-white/5 my-1" />
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setShowMenu(false); }}
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Trash2 size={18} /> Endgültig löschen
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={save}
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Bookmark size={18} className="text-cyan-400" /> In Watchlist speichern
                                                    </button>
                                                    <button 
                                                        onClick={handleShareNative}
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Share2 size={18} className="text-blue-400" /> Video teilen
                                                    </button>
                                                    <div className="h-px bg-white/5 my-1" />
                                                    <button 
                                                        onClick={handleReport} 
                                                        className="w-full text-left px-4 py-3.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors rounded-xl"
                                                    >
                                                        <Flag size={18} /> Melden
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mute Button (Positioned over video) */}
                        <button 
                            onClick={toggleMute}
                            className="absolute top-[80px] left-4 z-[100] bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/70 transition-all duration-300 border border-white/10 shadow-lg"
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </>
                )}

                {/* Actions Bar Selection */}
                {video.post_type === 'transfer' ? (
                    <TransferActionBar 
                        post={{ ...video, comments_count: commentCount }} 
                        session={session} 
                        onCommentClick={() => onCommentClick(video)}
                        onShareClick={() => {
                            const shareUrl = `${window.location.origin}/#profile/${video.players_master?.slug || video.players_master?.user_id || video.id}`;
                            const playerName = video.players_master?.full_name || 'ein Spieler';
                            setShareData({ text: generateShareText({ role: userRole, isCreator, playerName, tags: [] }), url: shareUrl });
                            setIsShareOpen(true);
                        }}
                    />
                ) : (
                    <div className="px-4 py-4 flex items-center gap-3">
                        <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={like}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${liked ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        >
                            <Heart size={20} className={liked ? 'fill-red-500 text-red-500' : ''} /> <span className="font-medium text-sm">{likes}</span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={save}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${saved ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        >
                            <Bookmark size={20} className={saved ? 'fill-cyan-400 text-cyan-400' : ''} />
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.92 }}
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(51,65,85,0.5)" }}
                            onClick={(e) => { e.stopPropagation(); onCommentClick(video); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-300"
                        >
                            <MessageCircle size={20} /> <span className="font-medium text-sm">{commentCount}</span>
                        </motion.button>
                        <div className="ml-auto">
                            <Share2 size={24} className="text-muted-foreground hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                const shareUrl = `${window.location.origin}/#profile/${video.players_master?.slug || video.players_master?.user_id || video.id}`;
                                const playerName = video.players_master?.full_name || 'ein Spieler';
                                const tags = video.action_tags || [];
                                
                                const text = generateShareText({
                                    role: userRole,
                                    isCreator: isCreator,
                                    playerName,
                                    tags
                                });
                                
                                setShareData({ text, url: shareUrl });
                                setIsShareOpen(true);
                            }} />
                        </div>
                    </div>
                )}

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

            <ShareModal 
                isOpen={isShareOpen}
                onClose={() => setIsShareOpen(false)}
                shareText={shareData.text}
                shareUrl={shareData.url}
                session={session}
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white">Beitrag löschen?</h3>
                                    <p className="text-zinc-500 text-sm leading-relaxed">
                                        Möchtest du diesen Beitrag wirklich unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                                    </p>
                                </div>
                                <div className="flex flex-col w-full gap-3">
                                    <button 
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition shadow-lg shadow-red-600/20 disabled:opacity-50"
                                    >
                                        {isDeleting ? 'Lösche...' : 'Endgültig löschen'}
                                    </button>
                                    <button 
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition"
                                    >
                                        Abbrechen
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});
