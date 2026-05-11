import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Share2, User, VolumeX, Volume2, X, Send, MoreVertical, Archive, Trash2, Edit, Flag, AlertTriangle, Eye, EyeOff, Scan, Play, Pause, Maximize2 } from 'lucide-react';
import { inputStyle } from '../lib/styles';
import { getClubStyle } from '../lib/helpers';
import * as api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { Loader2 } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { CommentItem } from './CommentItem';
import { ShareModal } from './ShareModal';
import { useUser } from '../contexts/UserContext';
import { generateShareText } from '../lib/shareEngine';

export const ImmersiveVideoPlayer = ({
    video,
    isActive = true, // parent controls if this is the currently viewed video
    initialIsLiked = false,
    initialIsSaved = false,
    initialLikeCount = 0,
    commentCount = 0,
    session,
    onCommentClick,
    onUserClick,
    onInteractionUpdate,
    onReportReq
}) => {
    const { addToast } = useToast();
    const { currentUserProfile } = useUser();
    const userRole = currentUserProfile?.role || 'player';
    const videoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(video?.is_muted ?? true);
    const [showSpotlight, setShowSpotlight] = useState(false);
    const [showHeartAnim, setShowHeartAnim] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [comments, setComments] = useState([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [hasFetchedComments, setHasFetchedComments] = useState(false);
    const [liveCommentCount, setLiveCommentCount] = useState(commentCount || 0);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [shareData, setShareData] = useState({ text: '', url: '' });
    const [showMenu, setShowMenu] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [showSeekBar, setShowSeekBar] = useState(true);
    const [isUiVisible, setIsUiVisible] = useState(true);
    const [isPlaying, setIsPlaying] = useState(isActive);
    const [showPlayStatusAnim, setShowPlayStatusAnim] = useState(false);

    const videoCreatorId = video?.players_master?.user_id || video?.user_id;
    const isCreator = session?.user?.id === videoCreatorId;
    
    // Bidirectional State Sync
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [likeCount, setLikeCount] = useState(initialLikeCount);

    // Hydration state: true while fetching missing profile data on direct load
    const [isHydrating, setIsHydrating] = useState(!video?.players_master);
    // Resolved video data — merges prop with hydrated data
    const [resolvedVideo, setResolvedVideo] = useState(video);
    
    const clickTimeout = useRef(null);

    // Sync with parent when player unmounts or active state changes
    useEffect(() => {
        return () => {
            if (onInteractionUpdate && video?.id) {
                onInteractionUpdate({ 
                    videoId: video.id, 
                    newLikeState: isLiked, 
                    newSaveState: isSaved, 
                    newLikeCount: likeCount 
                });
            }
        };
    }, [isLiked, isSaved, likeCount, video?.id, onInteractionUpdate]);

    // When video prop already includes players_master, mark as resolved immediately.
    // When it's missing (e.g. opened from ProfileScreen highlights w/ old query or direct link),
    // fetch the full video data including the relational profile join.
    useEffect(() => {
        if (!video?.id) return;

        if (video?.players_master) {
            // Already hydrated — no fetch needed
            setResolvedVideo(video);
            setIsHydrating(false);
            return;
        }

        // Missing profile data — fetch it
        setIsHydrating(true);
        api.fetchVideoById(video.id)
            .then((fullVideo) => {
                if (fullVideo) {
                    setResolvedVideo(fullVideo);
                } else {
                    // Fallback: keep original, just stop spinner
                    setResolvedVideo(video);
                }
            })
            .catch(() => {
                setResolvedVideo(video);
            })
            .finally(() => {
                setIsHydrating(false);
            });
    }, [video?.id]);

    const handleArchive = async (e) => {
        e.stopPropagation();
        if (isArchiving) return;
        setIsArchiving(true);
        try {
            await api.archiveHighlight(resolvedVideo.id);
            addToast('Video archiviert.', 'success');
            setShowMenu(false);
            window.dispatchEvent(new CustomEvent('videoArchived', { detail: { videoId: resolvedVideo.id } }));
        } catch (error) {
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
            await api.deleteHighlight(resolvedVideo.id);
            addToast('Video gelöscht.', 'success');
            setShowDeleteConfirm(false);
            setShowMenu(false);
            window.dispatchEvent(new CustomEvent('videoDeleted', { detail: { videoId: resolvedVideo.id } }));
        } catch (error) {
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
        if (onReportReq) {
            onReportReq(video.id, 'video');
        } else {
            addToast('Meldung wurde gesendet.', 'success');
        }
    };

    const handleShareNative = async (e) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/#profile/${resolvedVideo.players_master?.slug || resolvedVideo.players_master?.user_id || resolvedVideo.id}`;
        const shareTitle = `CAVIO | Video von ${resolvedVideo.players_master?.full_name || 'einem Spieler'}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: generateShareText({
                        role: userRole,
                        isCreator: isCreator,
                        playerName: resolvedVideo.players_master?.full_name || 'ein Spieler',
                        tags: resolvedVideo.action_tags || []
                    }),
                    url: shareUrl,
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    addToast('Teilen fehlgeschlagen.', 'error');
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                addToast('Link kopiert!', 'success');
            } catch (err) {
                addToast('Kopieren fehlgeschlagen.', 'error');
            }
        }
        setShowMenu(false);
    };

    // Keep resolvedVideo in sync if the parent passes updated video data
    useEffect(() => {
        if (video?.players_master) {
            setResolvedVideo(video);
            setIsHydrating(false);
        }
    }, [video]);


    // Fetch live comment count once resolvedVideo is ready
    useEffect(() => {
        if (!resolvedVideo?.id) return;
        api.getCommentCount(resolvedVideo.id)
            .then(count => setLiveCommentCount(count))
            .catch(() => {});
    }, [resolvedVideo?.id]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isPlaying && isActive && !isCommentsOpen) {
            videoRef.current.play().catch(() => {});
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying, isActive, isCommentsOpen]);

    // Update isPlaying state if video is paused externally (e.g. by browser)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        
        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    useEffect(() => {
        if (!videoRef.current) return;
        if (isActive && !isCommentsOpen) {
            // Respect start_time if provided
            if (resolvedVideo?.start_time > 0 && videoRef.current.currentTime < resolvedVideo.start_time) {
                videoRef.current.currentTime = resolvedVideo.start_time;
            }
            if (isPlaying) {
                videoRef.current.play().catch(() => {});
            }
        } else if (!isActive) {
            videoRef.current.pause();
            videoRef.current.currentTime = resolvedVideo?.start_time || 0;
        }
    }, [isActive, isCommentsOpen, resolvedVideo?.start_time]);

    // Handle Metadata: Mute, Trim, Spotlight
    useEffect(() => {
        if (resolvedVideo) {
            setIsMuted(resolvedVideo.is_muted ?? true);
        }
    }, [resolvedVideo?.is_muted]);

    const handleTimeUpdate = (e) => {
        const videoEl = e.currentTarget;
        if (!isScrubbing) {
            setCurrentTime(videoEl.currentTime);
        }
        
        // 1. Trimming / Loop logic
        if (resolvedVideo?.end_time && videoEl.currentTime >= resolvedVideo.end_time) {
            videoEl.currentTime = resolvedVideo.start_time || 0;
        }

        // 2. Spotlight logic
        if (resolvedVideo?.spotlight_at) {
            const diff = Math.abs(videoEl.currentTime - resolvedVideo.spotlight_at);
            if (diff < 0.3 && !showSpotlight) {
                setShowSpotlight(true);
                setTimeout(() => setShowSpotlight(false), 2000);
            }
        }
    };

    const handleLoadedMetadata = (e) => {
        setDuration(e.currentTarget.duration);
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    useEffect(() => {
        if (isCommentsOpen && resolvedVideo?.id) {
            const loadComments = async () => {
                setIsLoadingComments(true);
                try {
                    const data = await api.fetchComments(resolvedVideo.id);
                    const sorted = (data || []).sort((a, b) => {
                        if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
                        const aLikes = a.comment_likes?.length || 0;
                        const bLikes = b.comment_likes?.length || 0;
                        if (aLikes !== bLikes) return bLikes - aLikes;
                        return new Date(b.created_at) - new Date(a.created_at);
                    });
                    setComments(sorted);
                    setHasFetchedComments(true);
                } catch (error) {
                    console.error("Fetch comments error:", error);
                } finally {
                    setIsLoadingComments(false);
                }
            };
            loadComments();
        }
    }, [isCommentsOpen, resolvedVideo?.id]);

    const handleLikeToggle = async () => {
        if (!session) return;
        const newStatus = !isLiked;
        const newCount = newStatus ? likeCount + 1 : Math.max(0, likeCount - 1);
        
        // Optimistic UI update
        setIsLiked(newStatus);
        setLikeCount(newCount);

        try {
            if (newStatus) {
                await api.likeVideo(session.user.id, resolvedVideo.id);
            } else {
                await api.unlikeVideo(session.user.id, resolvedVideo.id);
                addToast("Like entfernt", 'info');
            }
        } catch (e) {
            console.error("Like toggle failed", e);
            setIsLiked(!newStatus);
            setLikeCount(likeCount);
            addToast('Like fehlgeschlagen', 'error');
        }
    };

    const handleSaveToggle = async () => {
        if (!session) return;
        const newStatus = !isSaved;
        
        // Optimistic UI update
        setIsSaved(newStatus);

        try {
            if (newStatus) {
                await api.saveVideo(session.user.id, resolvedVideo.id);
                addToast("In Watchlist gespeichert", 'success');
            } else {
                await api.unsaveVideo(session.user.id, resolvedVideo.id);
                addToast("Aus Watchlist entfernt", 'info');
            }
        } catch (e) {
            console.error("Save toggle failed", e);
            setIsSaved(!newStatus);
            addToast('Speichern fehlgeschlagen', 'error');
        }
    };

    const handleSingleTap = () => {
        if (!isUiVisible) {
            setIsUiVisible(true);
            return;
        }

        const newPlayingState = !isPlaying;
        setIsPlaying(newPlayingState);
        setShowPlayStatusAnim(true);
        setTimeout(() => setShowPlayStatusAnim(false), 600);
    };

    const handleDoubleTap = () => {
        if (!isLiked) {
            handleLikeToggle();
        } else {
            handleLikeToggle();
        }
        
        // Trigger visual feedback
        setShowHeartAnim(true);
        setTimeout(() => setShowHeartAnim(false), 800);
    };

    const handleOverlayClick = (e) => {
        e.stopPropagation();
        
        // If bottom sheet is open, do not handle video taps
        if (isCommentsOpen) {
            setIsCommentsOpen(false);
            return;
        }

        if (clickTimeout.current !== null) {
            // Double tap
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;
            handleDoubleTap();
        } else {
            // Single tap pending
            clickTimeout.current = setTimeout(() => {
                clickTimeout.current = null;
                handleSingleTap();
            }, 200);
        }
    };

    const handleCommentOpen = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsCommentsOpen(true);
        // Do not call onCommentClick(video) to decouple the old modal.
    };

    const handleShare = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const playerName = resolvedVideo?.players_master?.full_name || resolvedVideo?.players_master?.username || 'ein Spieler';
        const tags = resolvedVideo?.action_tags || [];
        // Use direct video link so shared URL opens the exact video with full profile data
        const shareUrl = `${window.location.origin}/#video/${resolvedVideo?.id}`;
        
        const shareText = generateShareText({
            role: userRole,
            isCreator: isCreator,
            playerName,
            tags
        });

        setShareData({ text: shareText, url: shareUrl });
        setIsShareOpen(true);
    };

    const handleCommentSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!session) {
            onCommentClick && onCommentClick(resolvedVideo);
            return;
        }
        if (!commentText.trim() || isSubmittingComment) return;

        const text = commentText.trim();
        setIsSubmittingComment(true);
        try {
            await api.addComment(resolvedVideo.id, session.user.id, text);
            
            const myProfileId = await api.getPlayerIdFromUserId(session.user.id);
            if (videoCreatorId && videoCreatorId !== session.user.id) {
                try {
                    await api.createNotification({
                        userId: resolvedVideo.players_master?.id || resolvedVideo.user_id,
                        actorId: myProfileId,
                        type: 'comment',
                        message: 'hat dein Video kommentiert.',
                        videoId: resolvedVideo.id
                    });
                } catch (_) {}
            }

            setCommentText('');
            const data = await api.fetchComments(resolvedVideo.id);
            setComments(data || []);
            setLiveCommentCount(prev => prev + 1);
            window.dispatchEvent(new CustomEvent('commentChange', { detail: { videoId: resolvedVideo.id, delta: 1 } }));
            addToast("Kommentar erfasst", 'success');
        } catch (error) {
            addToast("Fehler beim Senden", 'error');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleCommentDelete = async (commentId) => {
        const previousComments = [...comments];
        const previousCount = liveCommentCount;
        
        // Optimistic UI
        setComments(prev => prev.filter(c => c.id !== commentId));
        setLiveCommentCount(prev => Math.max(0, prev - 1));

        try {
            await api.deleteComment(commentId);
            window.dispatchEvent(new CustomEvent('commentChange', { detail: { videoId: resolvedVideo.id, delta: -1 } }));
            addToast("Kommentar gelöscht", 'info');
        } catch (error) {
            setComments(previousComments);
            setLiveCommentCount(previousCount);
            console.error("Delete failed:", error);
            addToast("Löschen fehlgeschlagen.", 'error');
        }
    };

    const handleCommentPin = async (commentId, pinState) => {
        try {
            await api.toggleCommentPin(resolvedVideo.id, commentId, pinState);
            const data = await api.fetchComments(resolvedVideo.id);
            setComments(data || []);
            addToast(pinState ? "Kommentar angepinnt 📌" : "Pin gelöst", 'success');
        } catch (error) {
            addToast("Pin fehlgeschlagen", 'error');
        }
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center z-0">
            {/* Layer 0: Der Base Player (z-0) — uses original video.video_url for instant playback */}
            <video
                ref={videoRef}
                src={resolvedVideo?.video_url || video?.video_url}
                className="w-full h-full object-cover"
                playsInline
                controls={false}
                loop={!resolvedVideo?.end_time} // manual loop if end_time exists
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                poster={resolvedVideo?.thumbnail_url || video?.thumbnail_url}
            />

            {/* Spotlight Visual Pulse */}
            <AnimatePresence>
                {showSpotlight && resolvedVideo?.spotlight_x && resolvedVideo?.spotlight_y && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                        exit={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{ 
                            left: `${resolvedVideo.spotlight_x}%`, 
                            top: `${resolvedVideo.spotlight_y}%`,
                            position: 'absolute',
                            zIndex: 15
                        }}
                        className="-translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                        <div className="w-24 h-24 rounded-full border-4 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)]" />
                        <div className="absolute inset-0 w-24 h-24 rounded-full border border-white animate-ping opacity-20" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hydration loading overlay — prevents Unbekannter Spieler flash */}
            <AnimatePresence>
                {isHydrating && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                    >
                        <Loader2 className="animate-spin text-white/80" size={36} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mute indicator */}
            <div className={`absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 z-20 pointer-events-none drop-shadow-md text-white/70 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0'}`}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </div>

            {/* Role-Based Management Menu */}
            <div className={`absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-40 transition-opacity duration-300 ${isUiVisible ? 'opacity-100' : 'opacity-0'}`}>
                <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                    className="bg-black/30 backdrop-blur-md p-2.5 rounded-full text-white hover:bg-black/60 transition-all duration-300 shadow-xl border border-white/10"
                >
                    <MoreVertical size={20} />
                </button>
                
                <AnimatePresence>
                    {showMenu && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                            className="absolute right-0 top-14 bg-zinc-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-50 w-60 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-1.5 space-y-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsUiVisible(!isUiVisible); setShowMenu(false); if(isUiVisible) addToast('Fokus-Modus aktiv. Tippen zum Wiederherstellen.', 'info'); }}
                                    className="w-full text-left px-4 py-3.5 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors rounded-xl"
                                >
                                    {isUiVisible ? <EyeOff size={18} className="text-zinc-400" /> : <Eye size={18} className="text-cyan-400" />}
                                    {isUiVisible ? 'Fokus-Modus aktivieren' : 'Menüs einblenden'}
                                </button>
                                <div className="h-px bg-white/5 my-1" />
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
                                            onClick={(e) => { e.stopPropagation(); setIsSaved(!isSaved); addToast(isSaved ? 'Von Watchlist entfernt' : 'In Watchlist gespeichert', 'success'); setShowMenu(false); }}
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

            {/* Layer 1: Das Tap-Overlay & Double Tap Action (z-10) */}
            <div 
                className="absolute inset-0 z-10" 
                onClick={handleOverlayClick}
            />

            {/* Play/Pause Feedback Overlay */}
            <AnimatePresence>
                {showPlayStatusAnim && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                    >
                        <div className="bg-black/40 backdrop-blur-md p-6 rounded-full border border-white/20">
                            {isPlaying ? <Play size={40} className="text-white fill-white ml-1" /> : <Pause size={40} className="text-white fill-white" />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showHeartAnim && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                    >
                        <Heart className="w-32 h-32 fill-red-500 text-red-500 drop-shadow-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Layer 2: Das Bottom HUD (z-20) */}
            <div className={`absolute bottom-0 w-full px-4 pb-6 pt-12 bg-gradient-to-t from-black/80 to-transparent z-20 transition-all duration-300 ${isUiVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="flex flex-row items-center justify-between pointer-events-auto">
                    {/* Profil/Info (Links) */}
                    <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(resolvedVideo?.players_master); }}
                    >
                        <div className={`w-11 h-11 rounded-full border border-white/50 bg-slate-800 overflow-hidden shadow-lg ${getClubStyle(resolvedVideo?.players_master?.clubs?.is_icon_league)}`}>
                            {resolvedVideo?.players_master?.avatar_url ? (
                                <img src={resolvedVideo.players_master.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                    <img src="/cavio-icon.png" className="w-full h-full object-contain p-1.5 opacity-60" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-white font-bold text-sm drop-shadow-md group-hover:text-cyan-400 transition-colors">
                                {resolvedVideo?.players_master?.full_name || (isHydrating ? '' : 'Unbekannter Spieler')}
                            </h3>
                            {resolvedVideo?.players_master?.clubs?.name && (
                                <p className="text-white/80 text-xs drop-shadow-md">
                                    {resolvedVideo.players_master.clubs.name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Aktions-Gruppe (Rechts) */}
                    <div className="flex gap-6 items-center">
                        {/* Like */}
                        <motion.div whileTap={{ scale: 0.8 }} className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleLikeToggle(); }}>
                            <Heart 
                                size={26} 
                                className={`drop-shadow-md transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-white fill-transparent hover:scale-110'}`} 
                            />
                            <span className="text-white text-xs font-bold drop-shadow-md">{likeCount}</span>
                        </motion.div>

                        {/* Comments */}
                        <motion.div whileTap={{ scale: 0.8 }} className="flex items-center gap-1.5 cursor-pointer" onClick={handleCommentOpen}>
                            <MessageCircle size={26} className="text-white fill-transparent hover:scale-110 drop-shadow-md transition-transform" />
                            <span className="text-white text-xs font-bold drop-shadow-md">{liveCommentCount}</span>
                        </motion.div>

                        {/* Watchlist */}
                        <motion.div whileTap={{ scale: 0.8 }} className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleSaveToggle(); }}>
                            <Bookmark size={26} className={`drop-shadow-md transition-all ${isSaved ? 'fill-cyan-400 text-cyan-400' : 'text-white fill-transparent hover:scale-110 hover:text-cyan-400'}`} />
                        </motion.div>

                        {/* Clean Mode Toggle */}
                        <motion.div 
                            whileTap={{ scale: 0.8 }} 
                            className="flex items-center gap-1.5 cursor-pointer" 
                            onClick={(e) => { e.stopPropagation(); setIsUiVisible(false); addToast('Clean Mode aktiv. Tippen zum Wiederherstellen.', 'info'); }}
                        >
                            <Scan size={24} className="text-white hover:scale-110 hover:text-cyan-400 drop-shadow-md transition-all" />
                        </motion.div>

                        {/* Share */}
                        <motion.div whileTap={{ scale: 0.8 }} className="flex items-center gap-1.5 cursor-pointer" onClick={handleShare}>
                            <Share2 size={24} className="text-white hover:scale-110 hover:text-cyan-400 drop-shadow-md transition-all" />
                        </motion.div>
                    </div>
                </div>

                {/* Interactive Seek Bar */}
                <AnimatePresence>
                    {showSeekBar && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-8 pointer-events-auto"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-bold text-white/50 w-10">
                                    {new Date(currentTime * 1000).toISOString().substr(14, 5)}
                                </span>
                                <div className="relative flex-1 h-6 flex items-center group">
                                    <input 
                                        type="range"
                                        min={0}
                                        max={duration || 100}
                                        step={0.1}
                                        value={currentTime}
                                        onMouseDown={() => setIsScrubbing(true)}
                                        onMouseUp={() => setIsScrubbing(false)}
                                        onTouchStart={() => setIsScrubbing(true)}
                                        onTouchEnd={() => setIsScrubbing(false)}
                                        onChange={handleSeek}
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                    />
                                    {/* Track Background */}
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                        {/* Track Progress */}
                                        <motion.div 
                                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                            style={{ width: `${(currentTime / duration) * 100}%` }}
                                        />
                                    </div>
                                    {/* Handle Thumb */}
                                    <motion.div 
                                        className="absolute w-3 h-3 bg-white rounded-full shadow-lg border-2 border-cyan-500 z-0 pointer-events-none"
                                        style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
                                        animate={{ scale: isScrubbing ? 1.5 : 1 }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-white/50 w-10 text-right">
                                    {new Date(duration * 1000).toISOString().substr(14, 5)}
                                </span>
                            </div>

                            {/* Skill tags */}
                            {resolvedVideo?.skill_tags && resolvedVideo.skill_tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pointer-events-auto">
                                    {resolvedVideo.skill_tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="bg-white/10 backdrop-blur-md text-white text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-lg border border-white/10">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!showSeekBar && resolvedVideo?.skill_tags && resolvedVideo.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pointer-events-auto">
                        {resolvedVideo.skill_tags.slice(0, 3).map(tag => (
                            <span key={tag} className="bg-white/10 backdrop-blur-md text-white text-[10px] font-bold tracking-wide px-3 py-1.5 rounded-lg border border-white/10">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Layer 3: Non-Blocking Comments Sheet (z-50) */}
            <AnimatePresence>
                {isCommentsOpen && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 100) {
                                setIsCommentsOpen(false);
                            }
                        }}
                        className="absolute bottom-0 w-full h-2/3 bg-gray-900 rounded-t-3xl shadow-2xl flex flex-col z-50 pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle / Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-gray-900 rounded-t-3xl">
                            <div className="w-8" />
                            <div className="flex flex-col items-center cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-gray-600 rounded-full mb-3" />
                                <h3 className="font-bold text-sm text-white">Kommentare ({liveCommentCount})</h3>
                            </div>
                            <button 
                                onClick={() => setIsCommentsOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4 opacity-100 scrollbar-hide">
                            {isLoadingComments ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                    <span className="text-xs text-muted-foreground font-medium">Lade Kommentare...</span>
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <MessageCircle size={48} className="mb-4 text-gray-500" />
                                    <p className="text-gray-400 text-sm">Noch keine Kommentare. Schreibe den ersten!</p>
                                </div>
                            ) : (
                                comments.map(c => (
                                    <CommentItem 
                                        key={c.id} 
                                        comment={c} 
                                        session={session} 
                                        videoCreatorId={videoCreatorId}
                                        isCreator={isCreator}
                                        onDelete={handleCommentDelete} 
                                        onPin={handleCommentPin}
                                    />
                                ))
                            )}
                        </div>

                        {/* Comment Input at Bottom of Sheet */}
                        <div className="p-4 border-t border-white/10 bg-gray-900 shrink-0">
                            <form onSubmit={handleCommentSubmit} className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input 
                                        className={`${inputStyle} bg-gray-800 border-white/10 text-white h-12 pr-10`} 
                                        value={commentText} 
                                        onChange={e => setCommentText(e.target.value)} 
                                        placeholder="Kommentieren..." 
                                        maxLength={200}
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={!commentText.trim() || isSubmittingComment} 
                                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                                        commentText.trim() && !isSubmittingComment ? 'bg-blue-600 text-white shadow-lg active:scale-90' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isSubmittingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share Modal Bottom Sheet */}
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
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white mb-2">Endgültig löschen?</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        Bist du sicher? Das Video wird unwiderruflich gelöscht und kann nicht wiederhergestellt werden.
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
        </div>
    );
};
