import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Share2, User, VolumeX, Volume2, X } from 'lucide-react';
import { getClubStyle } from '../lib/helpers';

export const ImmersiveVideoPlayer = ({
    video,
    isActive = true, // parent controls if this is the currently viewed video
    isLiked = false,
    isBookmarked = false,
    likeCount = 0,
    commentCount = 0,
    onLike,
    onCommentClick,
    onUserClick,
    onBookmark
}) => {
    const videoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);
    const [showHeartAnim, setShowHeartAnim] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    
    const clickTimeout = useRef(null);

    // Play/Pause based on active state (from parent VirtualList/Swiper)
    useEffect(() => {
        if (!videoRef.current) return;
        if (isActive && !isCommentsOpen) {
            videoRef.current.play().catch(() => {});
        } else if (!isActive) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0; // Reset when not active
        }
    }, [isActive, isCommentsOpen]);

    const handleSingleTap = () => {
        setIsMuted(prev => !prev);
    };

    const handleDoubleTap = () => {
        if (!isLiked && onLike) {
            onLike(); // Trigger like if not already liked
        } else if (isLiked && onLike) {
            // Optional: allow unliking via double tap, usually double tap only likes.
            // Let's assume onLike toggles it, or parent handles the toggle logic.
            onLike();
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
            }, 300);
        }
    };

    const handleCommentOpen = (e) => {
        e.stopPropagation();
        setIsCommentsOpen(true);
        if (onCommentClick) {
            onCommentClick(video);
        }
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center z-0">
            {/* Layer 0: Der Base Player (z-0) */}
            <video
                ref={videoRef}
                src={video?.video_url}
                className="w-full h-full object-cover"
                playsInline
                controls={false}
                loop
                muted={isMuted}
                poster={video?.thumbnail_url}
            />

            {/* Mute indicator brief popup could go here, or persistent if muted */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none drop-shadow-md text-white/70">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </div>

            {/* Layer 1: Das Tap-Overlay & Double Tap Action (z-10) */}
            <div 
                className="absolute inset-0 z-10" 
                onClick={handleOverlayClick}
            />

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
            <div className="absolute bottom-0 w-full px-4 pb-6 pt-12 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none">
                <div className="flex flex-row items-center justify-between pointer-events-auto">
                    {/* Profil/Info (Links) */}
                    <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(video?.players_master); }}
                    >
                        <div className={`w-11 h-11 rounded-full border border-white/50 bg-slate-800 overflow-hidden shadow-lg ${getClubStyle(video?.players_master?.clubs?.is_icon_league)}`}>
                            {video?.players_master?.avatar_url ? (
                                <img src={video.players_master.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                                    <User className="text-white/60" size={20} />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-white font-bold text-sm drop-shadow-md group-hover:text-cyan-400 transition-colors">
                                {video?.players_master?.full_name || 'Unbekannter Spieler'}
                            </h3>
                            {video?.players_master?.clubs?.name && (
                                <p className="text-white/80 text-xs drop-shadow-md">
                                    {video.players_master.clubs.name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Aktions-Gruppe (Rechts) */}
                    <div className="flex gap-6 items-center">
                        {/* Like */}
                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); onLike && onLike(); }}>
                            <Heart 
                                size={26} 
                                className={`drop-shadow-md transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-white fill-transparent hover:scale-110'}`} 
                            />
                            <span className="text-white text-xs font-bold drop-shadow-md">{likeCount}</span>
                        </div>

                        {/* Comments */}
                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={handleCommentOpen}>
                            <MessageCircle size={26} className="text-white fill-transparent hover:scale-110 drop-shadow-md transition-transform" />
                            <span className="text-white text-xs font-bold drop-shadow-md">{commentCount}</span>
                        </div>

                        {/* Watchlist */}
                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); onBookmark && onBookmark(); }}>
                            <Bookmark size={26} className={`drop-shadow-md transition-all ${isBookmarked ? 'fill-cyan-400 text-cyan-400' : 'text-white fill-transparent hover:scale-110 hover:text-cyan-400'}`} />
                        </div>

                        {/* Share */}
                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); /* implement share */ }}>
                            <Share2 size={24} className="text-white hover:scale-110 hover:text-cyan-400 drop-shadow-md transition-all" />
                        </div>
                    </div>
                </div>

                {/* Skill tags */}
                {video?.skill_tags && video.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pointer-events-auto">
                        {video.skill_tags.slice(0, 3).map(tag => (
                            <span key={tag} className="bg-black/40 backdrop-blur-md text-white text-[10px] font-medium tracking-wide px-2 py-1 rounded border border-white/10">
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
                                <h3 className="font-bold text-sm text-white">Kommentare ({commentCount})</h3>
                            </div>
                            <button 
                                onClick={() => setIsCommentsOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center opacity-50">
                            <MessageCircle size={48} className="mb-4 text-gray-500" />
                            <p className="text-gray-400 text-sm">Kommentare werden hier geladen...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
