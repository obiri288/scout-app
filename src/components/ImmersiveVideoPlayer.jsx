import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, User, VolumeX, Volume2, X } from 'lucide-react';
import { getClubStyle } from '../lib/helpers';

export const ImmersiveVideoPlayer = ({
    video,
    isActive = true, // parent controls if this is the currently viewed video
    isLiked = false,
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
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            {/* Video Element */}
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

            {/* Interaction Overlay */}
            <div 
                className="absolute inset-0 z-10" 
                onClick={handleOverlayClick}
            />

            {/* Double Tap Visual Feedback */}
            <AnimatePresence>
                {showHeartAnim && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                    >
                        <Heart className="w-32 h-32 fill-red-500 text-red-500 drop-shadow-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Action Bar (Right side) */}
            <div className="absolute bottom-10 right-4 flex flex-col gap-6 z-20 items-center">
                {/* Avatar Profile */}
                <div 
                    className={`w-12 h-12 rounded-full border-2 border-white bg-slate-800 overflow-hidden shadow-lg cursor-pointer ${getClubStyle(video?.players_master?.clubs?.is_icon_league)}`}
                    onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(video?.players_master); }}
                >
                    {video?.players_master?.avatar_url ? (
                        <img src={video.players_master.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <User className="text-white/60" size={24} />
                        </div>
                    )}
                </div>

                {/* Like Button */}
                <div className="flex flex-col items-center gap-1">
                    <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => { e.stopPropagation(); onLike && onLike(); }}
                        className="p-2 rounded-full drop-shadow-lg"
                    >
                        <Heart 
                            size={32} 
                            className={`drop-shadow-md transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-white fill-transparent'}`} 
                        />
                    </motion.button>
                    <span className="text-white text-xs font-bold drop-shadow-md">{likeCount}</span>
                </div>

                {/* Comment Button */}
                <div className="flex flex-col items-center gap-1">
                    <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={handleCommentOpen}
                        className="p-2 rounded-full drop-shadow-lg"
                    >
                        <MessageCircle size={32} className="text-white fill-white/20 drop-shadow-md" />
                    </motion.button>
                    <span className="text-white text-xs font-bold drop-shadow-md">{commentCount}</span>
                </div>

                {/* Exclusive Action (e.g. Bookmark) */}
                <div className="flex flex-col items-center gap-1">
                    <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={(e) => { e.stopPropagation(); onBookmark && onBookmark(); }}
                        className="p-2 rounded-full drop-shadow-lg"
                    >
                        <Bookmark size={28} className="text-white fill-transparent drop-shadow-md" />
                    </motion.button>
                </div>
            </div>

            {/* Bottom Info Section (Name, tags, etc.) - Optional but usually in TikToks */}
            <div className="absolute bottom-10 left-4 right-20 z-20 pointer-events-none">
                <h3 className="text-white font-bold text-lg drop-shadow-md">
                    {video?.players_master?.full_name || 'Unbekannter Spieler'}
                </h3>
                {video?.players_master?.clubs?.name && (
                    <p className="text-white/90 text-sm drop-shadow-md">
                        {video.players_master.clubs.name}
                    </p>
                )}
                {/* Skill tags */}
                {video?.skill_tags && video.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {video.skill_tags.slice(0, 3).map(tag => (
                            <span key={tag} className="bg-black/40 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md border border-white/10">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Non-Blocking Comments Bottom Sheet */}
            <AnimatePresence>
                {isCommentsOpen && (
                    <>
                        {/* Dim Overlay */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-black/50 z-30"
                            onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(false); }}
                        />
                        
                        {/* Sheet */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: "0%" }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 h-[60%] bg-card z-40 rounded-t-3xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col"
                            onClick={(e) => e.stopPropagation()} // prevent clicks inside from closing sheet
                        >
                            {/* Drag Handle / Header */}
                            <div className="p-4 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/30 backdrop-blur-md">
                                <div className="w-6" /> {/* Spacer for centering */}
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full mb-3" />
                                    <h3 className="font-bold text-sm">Kommentare ({commentCount})</h3>
                                </div>
                                <button 
                                    onClick={() => setIsCommentsOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <X size={16} className="text-foreground" />
                                </button>
                            </div>

                            {/* Comments Content Placeholder */}
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center opacity-50">
                                <MessageCircle size={48} className="mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground text-sm">Kommentare werden hier geladen...</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
